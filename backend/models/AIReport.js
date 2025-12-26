/**
 * AI Report Model
 * Stores AI-generated insights and recommendations
 */

import mongoose from "mongoose";

const aiInsightSchema = new mongoose.Schema({
  title: { type: String, required: true },
  explanation: { type: String, required: true },
  severity: {
    type: String,
    enum: ["critical", "high", "medium", "low"],
    required: true
  },
  relatedMetrics: [String]
}, { _id: false });

const aiActionSchema = new mongoose.Schema({
  action: { type: String, required: true },
  reason: { type: String, required: true },
  impact: { type: String, required: true },
  effort: {
    type: String,
    enum: ["low", "medium", "high"],
    required: true
  },
  timeframe: {
    type: String,
    enum: ["immediate", "short-term", "long-term"],
    required: true
  }
}, { _id: false });

const evaluationBreakdownSchema = new mongoose.Schema({
  accuracy: { type: Number, min: 0, max: 10 },
  specificity: { type: Number, min: 0, max: 10 },
  actionability: { type: Number, min: 0, max: 10 },
  businessValue: { type: Number, min: 0, max: 10 }
}, { _id: false });

const evaluationSchema = new mongoose.Schema({
  score: { type: Number, required: true, min: 0, max: 10 },
  pass: { type: Boolean, required: true },
  breakdown: evaluationBreakdownSchema,
  issues: [String],
  reason: String
}, { _id: false });

const metadataSchema = new mongoose.Schema({
  generatorModel: { type: String, required: true },
  evaluatorModel: { type: String, required: true },
  attemptNumber: { type: Number, required: true },
  tokensUsed: { type: Number, required: true },
  durationMs: { type: Number, required: true },
  createdAt: { type: Date, required: true }
}, { _id: false });

const aiReportSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true
    },

    // Which period this report is for
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },

    // The AI-generated report
    report: {
      summary: { type: String, required: true },
      insights: [aiInsightSchema],
      actions: [aiActionSchema],
      marketingTip: String,
      seasonalNote: String
    },

    // Evaluation results
    evaluation: evaluationSchema,

    // Generation metadata
    metadata: metadataSchema,

    // For versioning - allows multiple AI reports for the same month
    version: { type: Number, default: 1 },

    // User feedback (future feature)
    userFeedback: {
      helpful: Boolean,
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      submittedAt: Date
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient queries
aiReportSchema.index({ store: 1, year: -1, month: -1 });

// Index for finding latest version
aiReportSchema.index({ store: 1, month: 1, year: 1, version: -1 });

/**
 * Get the latest AI report for a specific month
 * @param {string} storeId - Store ID
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Promise<AIReport|null>}
 */
aiReportSchema.statics.getLatestForMonth = async function(storeId, month, year) {
  return this.findOne({ store: storeId, month, year })
    .sort({ version: -1 })
    .exec();
};

/**
 * Get all AI reports for a store, sorted by date
 * @param {string} storeId - Store ID
 * @param {number} limit - Maximum number to return
 * @returns {Promise<Array<AIReport>>}
 */
aiReportSchema.statics.getRecentForStore = async function(storeId, limit = 12) {
  return this.aggregate([
    { $match: { store: mongoose.Types.ObjectId(storeId) } },
    // Group by month/year to get only latest version
    {
      $sort: { version: -1 }
    },
    {
      $group: {
        _id: { month: "$month", year: "$year" },
        doc: { $first: "$$ROOT" }
      }
    },
    { $replaceRoot: { newRoot: "$doc" } },
    { $sort: { year: -1, month: -1 } },
    { $limit: limit }
  ]);
};

/**
 * Create a new version of an AI report
 * @param {string} storeId - Store ID
 * @param {number} month - Month
 * @param {number} year - Year
 * @param {Object} reportData - Report data
 * @returns {Promise<AIReport>}
 */
aiReportSchema.statics.createNewVersion = async function(storeId, month, year, reportData) {
  // Find the highest version number for this month
  const latest = await this.findOne({ store: storeId, month, year })
    .sort({ version: -1 })
    .select('version')
    .exec();

  const newVersion = latest ? latest.version + 1 : 1;

  return this.create({
    store: storeId,
    month,
    year,
    version: newVersion,
    ...reportData
  });
};

/**
 * Get statistics about AI report quality
 * @param {string} storeId - Store ID
 * @returns {Promise<Object>}
 */
aiReportSchema.statics.getQualityStats = async function(storeId) {
  const reports = await this.find({ store: storeId });

  if (reports.length === 0) {
    return {
      totalReports: 0,
      averageScore: 0,
      passRate: 0,
      fallbackRate: 0
    };
  }

  const totalReports = reports.length;
  const totalScore = reports.reduce((sum, r) => sum + (r.evaluation?.score || 0), 0);
  const passed = reports.filter(r => r.evaluation?.pass).length;
  const fallbacks = reports.filter(r => r.metadata?.generatorModel === "deterministic-fallback").length;

  return {
    totalReports,
    averageScore: (totalScore / totalReports).toFixed(2),
    passRate: ((passed / totalReports) * 100).toFixed(1) + '%',
    fallbackRate: ((fallbacks / totalReports) * 100).toFixed(1) + '%'
  };
};

export default mongoose.model("AIReport", aiReportSchema);
