/**
 * AI System Test Script
 * Demonstrates the AI report generation flow without making real API calls
 */

import { generateAIReport } from "./orchestrator.js";
import { buildAIContext } from "./contextBuilder.js";
import { estimateCost } from "./orchestrator.js";
import { rateLimiter, validateConfig, printConfig } from "./config.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Test AI context builder
 */
async function testContextBuilder(storeId, month, year) {
  console.log("\n🧪 TEST 1: AI Context Builder\n");
  console.log("─".repeat(60));

  try {
    const context = await buildAIContext(storeId, month, year);

    console.log("✅ Context built successfully!");
    console.log("\nContext Summary:");
    console.log(`  Store Size: ${context.storeMeta.size}`);
    console.log(`  Store Age: ${context.storeMeta.ageMonths} months`);
    console.log(`  Period: ${context.period.current.label} vs ${context.period.previous.label}`);
    console.log(`\nMetrics:`);
    console.log(`  Revenue: $${context.metrics.current.revenue.toLocaleString()} (${context.metrics.deltas.revenue.percent.toFixed(1)}%)`);
    console.log(`  Orders: ${context.metrics.current.orders} (${context.metrics.deltas.orders.percent.toFixed(1)}%)`);
    console.log(`  AOV: $${context.metrics.current.aov.toFixed(2)} (${context.metrics.deltas.aov.percent.toFixed(1)}%)`);
    console.log(`\nAnalysis:`);
    console.log(`  Root Causes: ${context.analysis.rootCauses.length}`);
    console.log(`  Opportunities: ${context.analysis.opportunities.length}`);
    console.log(`  Risks: ${context.analysis.risks.length}`);

    if (context.analysis.seasonality) {
      console.log(`\nSeasonality:`);
      console.log(`  Strength: ${context.analysis.seasonality.strength}`);
      console.log(`  Peak Months: ${context.analysis.seasonality.peakMonths.join(', ')}`);
    }

    console.log("\n─".repeat(60));
    return context;

  } catch (error) {
    console.error("❌ Context building failed:", error.message);
    throw error;
  }
}

/**
 * Test cost estimation
 */
async function testCostEstimation(context) {
  console.log("\n🧪 TEST 2: Cost Estimation\n");
  console.log("─".repeat(60));

  try {
    const estimate = estimateCost(context);

    console.log("💰 Cost Estimate:");
    console.log(`  Estimated Tokens: ${estimate.estimatedTokens}`);
    console.log(`  Estimated Cost: $${estimate.estimatedCost.toFixed(4)}`);
    console.log(`  Max Cost (with retry): $${estimate.maxCostWithRetry.toFixed(4)}`);
    console.log(`\nBreakdown:`);
    console.log(`  Generator: $${estimate.breakdown.generator.toFixed(4)}`);
    console.log(`  Evaluator: $${estimate.breakdown.evaluator.toFixed(4)}`);

    console.log("\n─".repeat(60));

  } catch (error) {
    console.error("❌ Cost estimation failed:", error.message);
  }
}

/**
 * Test full AI report generation
 */
async function testReportGeneration(storeId, month, year) {
  console.log("\n🧪 TEST 3: Full AI Report Generation\n");
  console.log("─".repeat(60));

  try {
    const result = await generateAIReport(storeId, month, year);

    console.log("\n✅ AI Report Generated!");
    console.log("\n📊 Report Summary:");
    console.log(`  ${result.report.summary}`);

    console.log(`\n💡 Insights (${result.report.insights.length}):`);
    result.report.insights.forEach((insight, i) => {
      console.log(`\n  ${i + 1}. ${insight.title} [${insight.severity}]`);
      console.log(`     ${insight.explanation}`);
    });

    console.log(`\n🎯 Actions (${result.report.actions.length}):`);
    result.report.actions.forEach((action, i) => {
      console.log(`\n  ${i + 1}. ${action.action}`);
      console.log(`     Reason: ${action.reason}`);
      console.log(`     Impact: ${action.impact}`);
      console.log(`     Effort: ${action.effort} | Timeframe: ${action.timeframe}`);
    });

    if (result.report.marketingTip) {
      console.log(`\n📢 Marketing Tip:`);
      console.log(`  ${result.report.marketingTip}`);
    }

    if (result.report.seasonalNote) {
      console.log(`\n📅 Seasonal Note:`);
      console.log(`  ${result.report.seasonalNote}`);
    }

    console.log(`\n🔍 Evaluation:`);
    console.log(`  Overall Score: ${result.evaluation.score}/10`);
    console.log(`  Passed: ${result.evaluation.pass ? '✅' : '❌'}`);
    console.log(`  Breakdown:`);
    console.log(`    - Accuracy: ${result.evaluation.breakdown.accuracy}/10`);
    console.log(`    - Specificity: ${result.evaluation.breakdown.specificity}/10`);
    console.log(`    - Actionability: ${result.evaluation.breakdown.actionability}/10`);
    console.log(`    - Business Value: ${result.evaluation.breakdown.businessValue}/10`);

    if (result.evaluation.issues.length > 0) {
      console.log(`\n⚠️  Issues Found:`);
      result.evaluation.issues.forEach(issue => console.log(`    - ${issue}`));
    }

    console.log(`\n⚙️  Metadata:`);
    console.log(`  Generator Model: ${result.metadata.generatorModel}`);
    console.log(`  Evaluator Model: ${result.metadata.evaluatorModel}`);
    console.log(`  Attempt Number: ${result.metadata.attemptNumber}`);
    console.log(`  Tokens Used: ${result.metadata.tokensUsed}`);
    console.log(`  Duration: ${result.metadata.durationMs}ms`);

    console.log("\n─".repeat(60));

    return result;

  } catch (error) {
    console.error("❌ Report generation failed:", error.message);
    throw error;
  }
}

/**
 * Test rate limiter
 */
function testRateLimiter() {
  console.log("\n🧪 TEST 4: Rate Limiter\n");
  console.log("─".repeat(60));

  const stats = rateLimiter.getStats();

  console.log("📊 Rate Limiter Stats:");
  console.log(`  Requests This Hour: ${stats.requestsThisHour}`);
  console.log(`  Cost This Month: $${stats.costThisMonth}`);
  console.log(`  Monthly Budget: $${stats.monthlyBudget}`);
  console.log(`  Budget Used: ${stats.percentUsed}`);
  console.log(`  Requests Remaining: ${stats.requestsRemaining}`);
  console.log(`  Budget Remaining: $${stats.budgetRemaining}`);

  console.log(`\n🚦 Can Make Request: ${rateLimiter.canMakeRequest() ? '✅ Yes' : '❌ No'}`);

  // Simulate recording a request
  rateLimiter.recordRequest(0.025);
  console.log("\n  → Recorded mock request ($0.025)");

  const newStats = rateLimiter.getStats();
  console.log(`  New cost this month: $${newStats.costThisMonth}`);

  console.log("\n─".repeat(60));
}

/**
 * Main test runner
 */
async function runTests() {
  console.log("\n");
  console.log("═".repeat(60));
  console.log("  AI SYSTEM TEST SUITE");
  console.log("═".repeat(60));

  // Validate configuration
  console.log("\n📋 Validating Configuration...\n");
  if (!validateConfig()) {
    console.error("\n❌ Configuration validation failed. Please fix errors before proceeding.\n");
    process.exit(1);
  }

  printConfig();

  // Connect to database
  try {
    console.log("🔌 Connecting to MongoDB...\n");
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/shopify-analytics");
    console.log("✅ Connected to database\n");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.log("\n⚠️  Tests will fail without database connection.\n");
    process.exit(1);
  }

  // You need to provide actual store ID and period
  // Find the most recent report in your database
  const Report = (await import("../models/Report.js")).default;
  const recentReport = await Report.findOne().sort({ year: -1, month: -1 });

  if (!recentReport) {
    console.error("\n❌ No reports found in database. Please run analytics generation first.\n");
    await mongoose.disconnect();
    process.exit(1);
  }

  const storeId = recentReport.store;
  const month = recentReport.month;
  const year = recentReport.year;

  console.log(`📍 Using test data: Store ${storeId}, ${month}/${year}\n`);

  try {
    // Run tests
    const context = await testContextBuilder(storeId, month, year);
    await testCostEstimation(context);
    await testReportGeneration(storeId, month, year);
    testRateLimiter();

    console.log("\n");
    console.log("═".repeat(60));
    console.log("  ✅ ALL TESTS COMPLETED SUCCESSFULLY");
    console.log("═".repeat(60));
    console.log("\n");

    console.log("📝 Next Steps:");
    console.log("  1. Set your OPENAI_API_KEY in .env");
    console.log("  2. Replace mock callOpenAI() with real API call in generator.js");
    console.log("  3. Replace mock callOpenAIEvaluator() with real API call in evaluator.js");
    console.log("  4. Test with real API calls");
    console.log("  5. Add AI routes to your Express server");
    console.log("  6. Test via API endpoints");
    console.log("\n");

  } catch (error) {
    console.error("\n❌ Tests failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from database\n");
  }
}

// Run tests
runTests().catch(console.error);
