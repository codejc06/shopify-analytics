/**
 * AI Routes
 * API endpoints for AI-generated insights and reports
 */

import express from "express";
import { generateAIReport, batchGenerateReports, shouldRegenerateReport, estimateCost } from "../ai/orchestrator.js";
import { buildAIContext } from "../ai/contextBuilder.js";
import AIReport from "../models/AIReport.js";
import Report from "../models/Report.js";
import Store from "../models/Store.js";

const router = express.Router();

/**
 * GET /api/ai/report/:storeId/:year/:month
 * Get AI report for a specific month
 * Returns cached report if available and fresh, otherwise generates new one
 */
router.get("/report/:storeId/:year/:month", async (req, res) => {
  try {
    const { storeId, year, month } = req.params;
    const forceRegenerate = req.query.force === "true";

    // Validate parameters
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: "Invalid month (must be 1-12)" });
    }

    // Check if user has access to this store
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // TODO: Add authentication check
    // if (store.user.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({ error: "Access denied" });
    // }

    // Check for existing AI report
    const existingReport = await AIReport.getLatestForMonth(storeId, monthNum, yearNum);

    if (existingReport && !forceRegenerate && !shouldRegenerateReport(existingReport)) {
      console.log(`📋 Returning cached AI report for ${month}/${year}`);
      return res.json({
        cached: true,
        report: existingReport.report,
        evaluation: existingReport.evaluation,
        metadata: existingReport.metadata,
        createdAt: existingReport.createdAt
      });
    }

    // Check if base report exists
    const baseReport = await Report.findOne({
      store: storeId,
      month: monthNum,
      year: yearNum
    });

    if (!baseReport) {
      return res.status(404).json({
        error: "No analytics report found for this period",
        message: "Generate base analytics first"
      });
    }

    // Generate new AI report
    console.log(`🚀 Generating new AI report for ${month}/${year}...`);
    const result = await generateAIReport(storeId, monthNum, yearNum);

    // Save to database
    const savedReport = await AIReport.createNewVersion(
      storeId,
      monthNum,
      yearNum,
      {
        report: result.report,
        evaluation: result.evaluation,
        metadata: result.metadata
      }
    );

    res.json({
      cached: false,
      report: savedReport.report,
      evaluation: savedReport.evaluation,
      metadata: savedReport.metadata,
      createdAt: savedReport.createdAt
    });

  } catch (error) {
    console.error("Error getting AI report:", error);
    res.status(500).json({
      error: "Failed to generate AI report",
      message: error.message
    });
  }
});

/**
 * POST /api/ai/regenerate/:storeId/:year/:month
 * Force regenerate AI report for a specific month
 */
router.post("/regenerate/:storeId/:year/:month", async (req, res) => {
  try {
    const { storeId, year, month } = req.params;

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Validate access
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Generate new report
    console.log(`🔄 Force regenerating AI report for ${month}/${year}...`);
    const result = await generateAIReport(storeId, monthNum, yearNum);

    // Save new version
    const savedReport = await AIReport.createNewVersion(
      storeId,
      monthNum,
      yearNum,
      {
        report: result.report,
        evaluation: result.evaluation,
        metadata: result.metadata
      }
    );

    res.json({
      regenerated: true,
      report: savedReport.report,
      evaluation: savedReport.evaluation,
      metadata: savedReport.metadata,
      version: savedReport.version
    });

  } catch (error) {
    console.error("Error regenerating AI report:", error);
    res.status(500).json({
      error: "Failed to regenerate AI report",
      message: error.message
    });
  }
});

/**
 * GET /api/ai/reports/:storeId
 * Get all AI reports for a store
 */
router.get("/reports/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const limit = parseInt(req.query.limit) || 12;

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const reports = await AIReport.getRecentForStore(storeId, limit);

    res.json({
      count: reports.length,
      reports: reports.map(r => ({
        month: r.month,
        year: r.year,
        summary: r.report.summary,
        insightCount: r.report.insights.length,
        actionCount: r.report.actions.length,
        score: r.evaluation.score,
        passed: r.evaluation.pass,
        createdAt: r.createdAt
      }))
    });

  } catch (error) {
    console.error("Error fetching AI reports:", error);
    res.status(500).json({
      error: "Failed to fetch AI reports",
      message: error.message
    });
  }
});

/**
 * POST /api/ai/batch-generate/:storeId
 * Batch generate AI reports for multiple months
 * Body: { periods: [{month: 1, year: 2024}, ...] }
 */
router.post("/batch-generate/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const { periods } = req.body;

    if (!Array.isArray(periods) || periods.length === 0) {
      return res.status(400).json({
        error: "Invalid request",
        message: "Provide an array of periods: [{month, year}, ...]"
      });
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Limit batch size to prevent abuse
    if (periods.length > 12) {
      return res.status(400).json({
        error: "Batch too large",
        message: "Maximum 12 periods per batch"
      });
    }

    console.log(`📦 Batch generating ${periods.length} AI reports...`);

    const results = await batchGenerateReports(storeId, periods);

    // Save all successful results
    const saved = [];
    for (const result of results) {
      if (!result.error) {
        const savedReport = await AIReport.createNewVersion(
          storeId,
          result.period.month,
          result.period.year,
          {
            report: result.report,
            evaluation: result.evaluation,
            metadata: result.metadata
          }
        );
        saved.push(savedReport);
      }
    }

    res.json({
      totalRequested: periods.length,
      successful: saved.length,
      failed: results.filter(r => r.error).length,
      results: results.map(r => ({
        period: r.period,
        success: !r.error,
        error: r.error,
        score: r.evaluation?.score
      }))
    });

  } catch (error) {
    console.error("Error in batch generation:", error);
    res.status(500).json({
      error: "Batch generation failed",
      message: error.message
    });
  }
});

/**
 * GET /api/ai/stats/:storeId
 * Get AI quality statistics for a store
 */
router.get("/stats/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const stats = await AIReport.getQualityStats(storeId);

    res.json(stats);

  } catch (error) {
    console.error("Error fetching AI stats:", error);
    res.status(500).json({
      error: "Failed to fetch statistics",
      message: error.message
    });
  }
});

/**
 * GET /api/ai/estimate/:storeId/:year/:month
 * Get cost estimate for generating a report
 */
router.get("/estimate/:storeId/:year/:month", async (req, res) => {
  try {
    const { storeId, year, month } = req.params;

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Build context to estimate cost
    const context = await buildAIContext(storeId, monthNum, yearNum);
    const estimate = estimateCost(context);

    res.json({
      period: `${month}/${year}`,
      estimate: {
        tokens: estimate.estimatedTokens,
        cost: `$${estimate.estimatedCost.toFixed(4)}`,
        maxCostWithRetry: `$${estimate.maxCostWithRetry.toFixed(4)}`,
        breakdown: {
          generator: `$${estimate.breakdown.generator.toFixed(4)}`,
          evaluator: `$${estimate.breakdown.evaluator.toFixed(4)}`
        }
      }
    });

  } catch (error) {
    console.error("Error estimating cost:", error);
    res.status(500).json({
      error: "Failed to estimate cost",
      message: error.message
    });
  }
});

/**
 * POST /api/ai/feedback/:reportId
 * Submit user feedback on an AI report
 * Body: { helpful: true, rating: 5, comment: "Great insights!" }
 */
router.post("/feedback/:reportId", async (req, res) => {
  try {
    const { reportId } = req.params;
    const { helpful, rating, comment } = req.body;

    const report = await AIReport.findById(reportId);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    report.userFeedback = {
      helpful,
      rating,
      comment,
      submittedAt: new Date()
    };

    await report.save();

    res.json({
      success: true,
      message: "Feedback submitted"
    });

  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({
      error: "Failed to submit feedback",
      message: error.message
    });
  }
});

export default router;
