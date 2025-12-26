/**
 * AI Orchestration Layer
 * Coordinates the Generator + Evaluator + Retry Logic
 * This is the main entry point for AI report generation
 */

import { buildAIContext } from "./contextBuilder.js";
import { generateInsights, generateInsightsRetry, generateFallbackReport } from "./generator.js";
import { evaluateReport, quickValidation, shouldRetry } from "./evaluator.js";
import { QUALITY_THRESHOLDS, MODEL_CONFIG } from "./types.js";

/**
 * Generate AI-enhanced report with quality control
 * Main orchestration function
 *
 * @param {string} storeId - Store ID
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Promise<AIGenerationResult>}
 */
export async function generateAIReport(storeId, month, year) {
  const startTime = Date.now();
  let attemptNumber = 1;
  let totalTokens = 0;

  console.log(`\n🚀 Starting AI report generation for store ${storeId}, ${month}/${year}\n`);

  try {
    // STEP 1: Build AI Context from deterministic analytics
    console.log("📊 STEP 1: Building AI context from analytics...");
    const context = await buildAIContext(storeId, month, year);
    console.log(`✓ Context built successfully`);
    console.log(`  Revenue: $${context.metrics.current.revenue.toLocaleString()} (${context.metrics.deltas.revenue.percent.toFixed(1)}% change)`);
    console.log(`  Root causes: ${context.analysis.rootCauses.length}`);
    console.log(`  Opportunities: ${context.analysis.opportunities.length}`);

    // STEP 2: Generate insights using Generator LLM
    console.log("\n🤖 STEP 2: Generating AI insights...");
    let generationResult = await generateInsights(context);
    totalTokens += generationResult.tokensUsed;

    let report = generationResult.report;

    // STEP 3: Quick validation (rule-based, no LLM)
    console.log("\n✅ STEP 3: Quick validation...");
    const quickCheck = quickValidation(context, report);

    if (!quickCheck.valid) {
      console.log("⚠️  Quick validation failed:");
      quickCheck.issues.forEach(issue => console.log(`   - ${issue}`));

      // If quick validation fails badly, skip to fallback
      if (quickCheck.issues.length > 3) {
        console.log("⚠️  Too many issues, using fallback...");
        return buildFallbackResult(context, startTime);
      }
    } else {
      console.log("✓ Quick validation passed");
    }

    // STEP 4: Evaluate with Evaluator LLM
    console.log("\n🔍 STEP 4: Evaluating with LLM judge...");
    let evaluation = await evaluateReport(context, report);

    // STEP 5: Retry logic (if needed)
    if (!evaluation.pass && shouldRetry(evaluation.score)) {
      console.log(`\n🔄 STEP 5: Retry (score ${evaluation.score} is below threshold ${QUALITY_THRESHOLDS.PASS_SCORE})`);

      attemptNumber = 2;
      const retryResult = await generateInsightsRetry(context, evaluation.issues);
      totalTokens += retryResult.tokensUsed;

      report = retryResult.report;

      // Re-evaluate
      console.log("\n🔍 Re-evaluating retry attempt...");
      evaluation = await evaluateReport(context, report);
    }

    // STEP 6: Fallback if still failing
    if (!evaluation.pass) {
      console.log(`\n⚠️  STEP 6: Evaluation still failing (score: ${evaluation.score})`);
      console.log("   Using deterministic fallback instead of AI report");
      return buildFallbackResult(context, startTime);
    }

    // SUCCESS - Return AI-generated report
    const totalDuration = Date.now() - startTime;

    console.log(`\n✅ AI Report Generated Successfully!`);
    console.log(`   Final Score: ${evaluation.score}/10`);
    console.log(`   Attempts: ${attemptNumber}`);
    console.log(`   Total Tokens: ~${totalTokens}`);
    console.log(`   Duration: ${totalDuration}ms`);

    return {
      report,
      evaluation,
      metadata: {
        generatorModel: MODEL_CONFIG.generator.model,
        evaluatorModel: MODEL_CONFIG.evaluator.model,
        attemptNumber,
        tokensUsed: totalTokens,
        durationMs: totalDuration,
        createdAt: new Date()
      }
    };

  } catch (error) {
    console.error("\n❌ AI Report Generation Failed:", error);

    // Always fall back to deterministic report on error
    try {
      const context = await buildAIContext(storeId, month, year);
      return buildFallbackResult(context, startTime);
    } catch (fallbackError) {
      console.error("❌ Even fallback failed:", fallbackError);
      throw new Error("Complete failure: Unable to generate any report");
    }
  }
}

/**
 * Build fallback result (deterministic only, no AI)
 * @param {AIContext} context - AI context
 * @param {number} startTime - Start timestamp
 * @returns {AIGenerationResult}
 */
function buildFallbackResult(context, startTime) {
  const report = generateFallbackReport(context);

  return {
    report,
    evaluation: {
      score: 0,
      pass: false,
      breakdown: {
        accuracy: 10, // Fallback is always accurate (deterministic)
        specificity: 6,
        actionability: 6,
        businessValue: 6
      },
      issues: ["AI generation failed or quality too low - using deterministic fallback"],
      reason: "Deterministic fallback used instead of AI"
    },
    metadata: {
      generatorModel: "deterministic-fallback",
      evaluatorModel: "none",
      attemptNumber: 0,
      tokensUsed: 0,
      durationMs: Date.now() - startTime,
      createdAt: new Date()
    }
  };
}

/**
 * Batch generate AI reports for multiple months
 * Useful for backfilling or bulk regeneration
 *
 * @param {string} storeId - Store ID
 * @param {Array<{month: number, year: number}>} periods - Periods to generate
 * @returns {Promise<Array<AIGenerationResult>>}
 */
export async function batchGenerateReports(storeId, periods) {
  console.log(`\n📦 Batch generating ${periods.length} reports for store ${storeId}\n`);

  const results = [];

  for (const period of periods) {
    try {
      console.log(`\n--- Generating report for ${period.month}/${period.year} ---`);
      const result = await generateAIReport(storeId, period.month, period.year);
      results.push({
        ...result,
        period
      });

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`Failed to generate report for ${period.month}/${period.year}:`, error);
      results.push({
        period,
        error: error.message
      });
    }
  }

  console.log(`\n✅ Batch generation complete: ${results.length} reports processed\n`);

  return results;
}

/**
 * Check if a report should be regenerated
 * @param {Object} existingAIReport - Existing AI report from DB
 * @param {number} maxAgeDays - Maximum age in days
 * @returns {boolean}
 */
export function shouldRegenerateReport(existingAIReport, maxAgeDays = 30) {
  if (!existingAIReport) return true;

  // Check age
  const ageInDays = (Date.now() - new Date(existingAIReport.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays > maxAgeDays) return true;

  // Check if it was a fallback (always regenerate fallbacks)
  if (existingAIReport.metadata?.generatorModel === "deterministic-fallback") return true;

  // Check if score was low
  if (existingAIReport.evaluation?.score < QUALITY_THRESHOLDS.PASS_SCORE) return true;

  return false;
}

/**
 * Get cost estimate for generating a report
 * @param {AIContext} context - AI context
 * @returns {Object} Cost estimate
 */
export function estimateCost(context) {
  // Rough token estimation
  const contextSize = JSON.stringify(context).length;
  const estimatedInputTokens = Math.ceil(contextSize / 3); // Conservative estimate
  const estimatedOutputTokens = 800; // Typical output size

  // Pricing (as of 2024 - update with current rates)
  // GPT-4o: $0.005/1k input, $0.015/1k output
  // GPT-4o-mini: $0.0001/1k input, $0.0004/1k output

  const generatorCost =
    (estimatedInputTokens / 1000) * 0.005 +
    (estimatedOutputTokens / 1000) * 0.015;

  const evaluatorCost =
    (estimatedInputTokens / 1000) * 0.0001 +
    (300 / 1000) * 0.0004; // Evaluator output is smaller

  const totalCost = generatorCost + evaluatorCost;

  // Account for potential retry (multiply by 1.5)
  const maxCost = totalCost * 1.5;

  return {
    estimatedTokens: estimatedInputTokens + estimatedOutputTokens,
    estimatedCost: totalCost,
    maxCostWithRetry: maxCost,
    breakdown: {
      generator: generatorCost,
      evaluator: evaluatorCost
    }
  };
}
