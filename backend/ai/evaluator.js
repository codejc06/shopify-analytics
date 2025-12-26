/**
 * AI Evaluator Service (LLM-as-Judge)
 * Evaluates AI-generated outputs for quality, accuracy, and hallucination
 * This is the quality control layer
 */

import { MODEL_CONFIG, QUALITY_THRESHOLDS } from "./types.js";

/**
 * Build evaluator system prompt
 */
function buildEvaluatorSystemPrompt() {
  return `You are an expert AI output evaluator. Your job is to assess whether AI-generated business insights are accurate, specific, actionable, and free from hallucination.

EVALUATION CRITERIA:

1. ACCURACY (0-10)
   - Are all numbers and metrics directly from the provided data?
   - No invented statistics or figures?
   - No unsupported claims?
   Score 10: Perfect accuracy, all claims backed by data
   Score 0: Hallucinated numbers or false claims

2. SPECIFICITY (0-10)
   - Are insights concrete and specific?
   - Avoids vague language like "consider", "might", "possibly"?
   - Provides exact numbers when available?
   Score 10: Highly specific with concrete details
   Score 0: Vague and generic

3. ACTIONABILITY (0-10)
   - Are recommendations clear and implementable?
   - Tied to specific data points?
   - Realistic and practical?
   Score 10: Clear, specific actions with reasoning
   Score 0: Vague suggestions without clear steps

4. BUSINESS VALUE (0-10)
   - Are insights meaningful for business decisions?
   - Prioritized correctly?
   - Focus on high-impact areas?
   Score 10: Highly valuable strategic insights
   Score 0: Trivial or irrelevant observations

REJECTION CRITERIA (Automatic Fail):
- Any number not present in the original data
- Generic advice that could apply to any business
- Unsupported speculation
- Vague recommendations without clear reasoning

Your output MUST be valid JSON only. No markdown, no explanation outside the JSON.`;
}

/**
 * Build evaluator user prompt
 * @param {AIContext} context - Original AI context
 * @param {Object} generatedReport - AI-generated report to evaluate
 */
function buildEvaluatorUserPrompt(context, generatedReport) {
  return `Evaluate this AI-generated business report for a Shopify store.

ORIGINAL DATA PROVIDED TO THE AI:
Period: ${context.period.current.label} vs ${context.period.previous.label}

Metrics:
- Revenue: $${context.metrics.current.revenue.toLocaleString()} (${context.metrics.deltas.revenue.percent.toFixed(1)}% change)
- Orders: ${context.metrics.current.orders} (${context.metrics.deltas.orders.percent.toFixed(1)}% change)
- AOV: $${context.metrics.current.aov.toFixed(2)} (${context.metrics.deltas.aov.percent.toFixed(1)}% change)
- Returning Customer Rate: ${(context.metrics.current.returningCustomerRate * 100).toFixed(1)}% (${context.metrics.deltas.returningCustomerRate.percent.toFixed(1)}% change)

Root Causes Provided:
${context.analysis.rootCauses.map(c => `- ${c.metric}: ${c.explanation}`).join('\n')}

Opportunities Provided:
${context.analysis.opportunities.map(o => `- ${o.title}: $${o.estimatedImpact.toLocaleString()} (${o.dataBasis})`).join('\n')}

AI-GENERATED REPORT TO EVALUATE:
${JSON.stringify(generatedReport, null, 2)}

EVALUATION TASK:
Score the report on the 4 criteria (0-10 each). Check for:
1. Are all numbers in the report present in the original data?
2. Does it make any claims not supported by the provided data?
3. Is the language specific and actionable?
4. Are the insights valuable for business decisions?

Respond in this JSON format (ONLY JSON, no markdown):
{
  "score": 8.5,
  "pass": true,
  "breakdown": {
    "accuracy": 9,
    "specificity": 8,
    "actionability": 9,
    "businessValue": 8
  },
  "issues": [],
  "reason": "Brief explanation of the overall assessment"
}

If you find issues, list them in the "issues" array. Examples:
- "Summary mentions '20% growth' but data shows 15.3% growth"
- "Recommendation lacks specific action steps"
- "Insight uses vague language: 'consider improving'"`;
}

/**
 * Parse evaluator response
 * @param {string} response - Raw evaluator response
 * @returns {Object}
 */
function parseEvaluatorResponse(response) {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const parsed = JSON.parse(cleaned);

    // Validate required fields
    if (typeof parsed.score !== 'number' || typeof parsed.pass !== 'boolean') {
      throw new Error("Missing required fields: score and pass");
    }

    if (!parsed.breakdown) {
      throw new Error("Missing breakdown field");
    }

    return parsed;
  } catch (error) {
    console.error("Failed to parse evaluator response:", error);
    console.error("Raw response:", response);
    throw new Error(`Invalid evaluator response: ${error.message}`);
  }
}

/**
 * Call OpenAI API for evaluation (mock implementation)
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @param {Object} config - Model configuration
 * @returns {Promise<string>}
 */
async function callOpenAIEvaluator(systemPrompt, userPrompt, config) {
  // MOCK IMPLEMENTATION - Does not make real API calls
  // In production, replace with actual OpenAI API call

  console.log("🔍 [MOCK] Evaluator LLM would be called with:");
  console.log("  Model:", config.model);
  console.log("  Temperature:", config.temperature);

  // Return mock evaluation response
  // In real implementation, this would be more sophisticated
  return JSON.stringify({
    score: 8.7,
    pass: true,
    breakdown: {
      accuracy: 9,
      specificity: 8,
      actionability: 9,
      businessValue: 9
    },
    issues: [],
    reason: "Report is well-grounded in the provided data, offers specific and actionable recommendations, and provides valuable business insights. All metrics referenced are accurate. Language is appropriately directive and specific."
  });
}

/**
 * Evaluate AI-generated report
 * @param {AIContext} context - Original AI context
 * @param {Object} generatedReport - AI-generated report
 * @returns {Promise<EvaluatorResult>}
 */
export async function evaluateReport(context, generatedReport) {
  try {
    console.log("🔍 Evaluating AI-generated report...");

    const systemPrompt = buildEvaluatorSystemPrompt();
    const userPrompt = buildEvaluatorUserPrompt(context, generatedReport);

    const rawResponse = await callOpenAIEvaluator(
      systemPrompt,
      userPrompt,
      MODEL_CONFIG.evaluator
    );

    const evaluation = parseEvaluatorResponse(rawResponse);

    // Determine pass/fail based on threshold
    evaluation.pass = evaluation.score >= QUALITY_THRESHOLDS.PASS_SCORE;

    console.log(`   Score: ${evaluation.score}/10 (${evaluation.pass ? 'PASS' : 'FAIL'})`);
    console.log(`   Breakdown: Accuracy=${evaluation.breakdown.accuracy}, Specificity=${evaluation.breakdown.specificity}, Actionability=${evaluation.breakdown.actionability}, Business Value=${evaluation.breakdown.businessValue}`);

    if (evaluation.issues.length > 0) {
      console.log(`   Issues found:`, evaluation.issues);
    }

    return evaluation;

  } catch (error) {
    console.error("Error evaluating report:", error);

    // Return a failing evaluation if evaluator itself fails
    return {
      score: 0,
      pass: false,
      breakdown: {
        accuracy: 0,
        specificity: 0,
        actionability: 0,
        businessValue: 0
      },
      issues: [`Evaluator failed: ${error.message}`],
      reason: "Evaluation process encountered an error"
    };
  }
}

/**
 * Perform rule-based validation (no LLM needed)
 * This runs before LLM evaluation as a quick sanity check
 * @param {AIContext} context - Original context
 * @param {Object} report - Generated report
 * @returns {Object} Validation result
 */
export function quickValidation(context, report) {
  const issues = [];

  // Check required fields
  if (!report.summary || report.summary.length === 0) {
    issues.push("Missing summary");
  }

  if (!report.insights || report.insights.length === 0) {
    issues.push("Missing insights");
  }

  if (!report.actions || report.actions.length === 0) {
    issues.push("Missing actions");
  }

  // Check for suspiciously long output
  if (report.summary && report.summary.length > 1000) {
    issues.push("Summary exceeds reasonable length");
  }

  // Check for empty insights
  if (report.insights) {
    report.insights.forEach((insight, i) => {
      if (!insight.title || !insight.explanation) {
        issues.push(`Insight ${i + 1} missing title or explanation`);
      }
    });
  }

  // Check for empty actions
  if (report.actions) {
    report.actions.forEach((action, i) => {
      if (!action.action || !action.reason || !action.impact) {
        issues.push(`Action ${i + 1} missing required fields`);
      }
    });
  }

  // Basic hallucination check - look for suspiciously high numbers
  const revenueMax = Math.max(
    context.metrics.current.revenue,
    context.metrics.previous.revenue
  ) * 2;

  const summaryText = JSON.stringify(report);
  const numberMatches = summaryText.match(/\$[\d,]+/g);

  if (numberMatches) {
    numberMatches.forEach(match => {
      const num = parseInt(match.replace(/[$,]/g, ''));
      if (num > revenueMax) {
        issues.push(`Suspiciously high number found: ${match}`);
      }
    });
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Check if retry is worthwhile based on score
 * @param {number} score - Evaluation score
 * @returns {boolean}
 */
export function shouldRetry(score) {
  return score >= QUALITY_THRESHOLDS.RETRY_SCORE && score < QUALITY_THRESHOLDS.PASS_SCORE;
}
