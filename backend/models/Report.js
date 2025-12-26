import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema({
  type: String,
  title: String,
  description: String,
  impact: String,
  actionText: String,
  actionUrl: String,
  priority: Number
}, { _id: false });

const seasonalRecommendationSchema = new mongoose.Schema({
  type: String,
  priority: String,
  title: String,
  description: String
}, { _id: false });

const rootCauseSchema = new mongoose.Schema({
  metric: String,
  change: Number,
  changePercent: Number,
  impact: String, // "High", "Medium", "Low"
  explanation: String,
  direction: String // "up", "down", "neutral"
}, { _id: false });

const alertSchema = new mongoose.Schema({
  type: String, // "success", "warning", "critical", "info", "opportunity"
  severity: String, // "high", "medium", "low"
  metric: String,
  change: Number,
  changePercent: Number,
  message: String,
  icon: String,
  link: String,
  actionable: Boolean,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const reportSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true
    },

    month: { type: Number, required: true },
    year: { type: Number, required: true },

    data: {
      revenue: Number,
      aov: Number,
      returningCustomerRate: Number,
      topProduct: {
        name: String,
        unitsSold: Number,
        revenue: Number
      },
      growth: Number,
      previousMonthRevenue: Number,
      totalUnitsSold: Number,
      conversionRate: Number,
      avgShippingTime: Number,
      topCategories: [
        {
          name: String,
          revenue: Number,
          percentage: Number
        }
      ],
      recommendations: [recommendationSchema],
      abandonedCarts: {
        count: Number,
        potentialRevenue: Number,
        recoveryRate: Number
      },
      seasonalAnalysis: {
        seasonalityIndex: [Number],
        seasonalityStrength: Number,
        topMonths: [
          {
            month: String,
            index: Number,
            change: String
          }
        ],
        bottomMonths: [
          {
            month: String,
            index: Number,
            change: String
          }
        ],
        strengthCategory: String,
        seasonalRecommendations: [seasonalRecommendationSchema]
      }
    },

    // Root-cause analysis for month-over-month changes
    rootCauses: [rootCauseSchema],

    // Deltas from previous month
    deltas: {
      revenue: Number,
      orders: Number,
      aov: Number,
      returningCustomerRate: Number,
      conversionRate: Number,
      avgShippingTime: Number
    },

    // Smart alerts for this month
    alerts: [alertSchema]
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
