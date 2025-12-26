/**
 * AI Generator Service
 * Generates business insights and recommendations from deterministic analytics
 * Uses OpenAI API (but can be swapped for any LLM provider)
 */

import { MODEL_CONFIG } from "./types.js";

/**
 * Build the system prompt for the generator
 * This defines the AI's role and constraints
 */
function buildSystemPrompt() {
  return `You are a senior e-commerce analytics consultant specializing in Shopify stores.

Your role is to translate data-driven insights into clear, actionable business recommendations.

CRITICAL RULES:
1. You MUST only reference data explicitly provided in the context
2. NEVER invent numbers, metrics, or statistics
3. NEVER make speculative claims not grounded in the provided data
4. Be concise and business-focused
5. Provide specific, actionable recommendations with clear reasoning
6. If data is insufficient to make a claim, say so explicitly

OUTPUT REQUIREMENTS:
- Executive summary: Max 150 words, focusing on the "so what" for the business
- Insights: 3-5 specific observations backed by the provided data
- Actions: 3-5 prioritized recommendations with estimated impact
- Be specific with numbers when they're provided
- Avoid vague language like "consider" or "you might want to" - be directive

TONE:
- Professional but approachable
- Focused on business outcomes
- Data-driven and specific
- Action-oriented

You will receive structured analytics data in JSON format. Your output MUST be valid JSON only.`;
}

/**
 * Build the user prompt with the AI context
 * @param {AIContext} context - The AI context
 */
function buildUserPrompt(context) {
  return `Analyze this Shopify store's performance and provide actionable insights.

STORE CONTEXT:
- Store Size: ${context.storeMeta.size}
- Months Tracked: ${context.storeMeta.ageMonths}
${context.storeMeta.industry ? `- Industry: ${context.storeMeta.industry}` : ''}

TIME PERIOD:
- Current: ${context.period.current.label}
- Comparing to: ${context.period.previous.label}

CURRENT PERFORMANCE:
- Revenue: $${context.metrics.current.revenue.toLocaleString()} (${context.metrics.deltas.revenue.percent > 0 ? '+' : ''}${context.metrics.deltas.revenue.percent.toFixed(1)}% vs last month)
- Orders: ${context.metrics.current.orders.toLocaleString()} (${context.metrics.deltas.orders.percent > 0 ? '+' : ''}${context.metrics.deltas.orders.percent.toFixed(1)}%)
- Average Order Value: $${context.metrics.current.aov.toFixed(2)} (${context.metrics.deltas.aov.percent > 0 ? '+' : ''}${context.metrics.deltas.aov.percent.toFixed(1)}%)
- Returning Customer Rate: ${(context.metrics.current.returningCustomerRate * 100).toFixed(1)}% (${context.metrics.deltas.returningCustomerRate.percent > 0 ? '+' : ''}${context.metrics.deltas.returningCustomerRate.percent.toFixed(1)}%)
- Conversion Rate: ${(context.metrics.current.conversionRate * 100).toFixed(2)}% (${context.metrics.deltas.conversionRate.percent > 0 ? '+' : ''}${context.metrics.deltas.conversionRate.percent.toFixed(1)}%)

KEY DRIVERS OF CHANGE (Deterministic Analysis):
${context.analysis.rootCauses.map((cause, i) =>
  `${i + 1}. ${cause.metric} (${cause.impact} Impact): ${cause.explanation}`
).join('\n')}

IDENTIFIED OPPORTUNITIES:
${context.analysis.opportunities.map((opp, i) =>
  `${i + 1}. ${opp.title} - Estimated Impact: $${opp.estimatedImpact.toLocaleString()} (${opp.effort} effort)\n   Basis: ${opp.dataBasis}`
).join('\n')}

${context.analysis.risks.length > 0 ? `RISKS TO MONITOR:
${context.analysis.risks.map((risk, i) =>
  `${i + 1}. ${risk.metric} (${risk.severity}): ${risk.description}`
).join('\n')}` : ''}

${context.analysis.seasonality ? `SEASONAL PATTERN:
- Strength: ${context.analysis.seasonality.strength}
- Peak Months: ${context.analysis.seasonality.peakMonths.join(', ')}
- Slow Months: ${context.analysis.seasonality.slowMonths.join(', ')}` : ''}

${context.historical ? `HISTORICAL TREND:
- 3-Month Trend: ${context.historical.trend3Month}
- Volatility: ${context.historical.volatility}` : ''}

Based on this data, provide your analysis in the following JSON format (ONLY output valid JSON, no markdown):

{
  "summary": "Executive summary of this month's performance (max 150 words)",
  "insights": [
    {
      "title": "Insight title",
      "explanation": "Detailed explanation backed by the data above",
      "severity": "critical|high|medium|low",
      "relatedMetrics": ["Revenue", "AOV"]
    }
  ],
  "actions": [
    {
      "action": "Specific action to take",
      "reason": "Why this action is recommended based on the data",
      "impact": "Expected impact (e.g., '$6,200 potential recovery', '15% increase in retention')",
      "effort": "low|medium|high",
      "timeframe": "immediate|short-term|long-term"
    }
  ],
  "marketingTip": "Optional: One specific marketing recommendation",
  "seasonalNote": "Optional: Seasonal insight if applicable"
}`;
}

/**
 * Parse and validate AI response
 * @param {string} response - Raw AI response
 * @returns {Object} Parsed and validated report
 */
function parseAIResponse(response) {
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
    if (!parsed.summary || !parsed.insights || !parsed.actions) {
      throw new Error("Missing required fields in AI response");
    }

    if (!Array.isArray(parsed.insights) || !Array.isArray(parsed.actions)) {
      throw new Error("Insights and actions must be arrays");
    }

    return parsed;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    console.error("Raw response:", response);
    throw new Error(`Invalid AI response format: ${error.message}`);
  }
}

/**
 * Call OpenAI API (mock implementation - replace with actual API call)
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @param {Object} config - Model configuration
 * @returns {Promise<string>}
 */
async function callOpenAI(systemPrompt, userPrompt, config) {
  // MOCK IMPLEMENTATION - Does not make real API calls
  // In production, replace with actual OpenAI API call:

  /*
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    response_format: { type: "json_object" }
  });

  return response.choices[0].message.content;
  */

  // For now, return a mock response
  console.log(" [MOCK] Generator LLM would be called with:");
  console.log("  Model:", config.model);
  console.log("  Temperature:", config.temperature);
  console.log("  System Prompt Length:", systemPrompt.length, "chars");
  console.log("  User Prompt Length:", userPrompt.length, "chars");

  // Return mock response matching the expected format
  return JSON.stringify({
    summary: "This month showed strong performance with revenue increasing by double digits. The primary driver was improved average order value, though returning customer rates declined slightly. The store should focus on retention while capitalizing on the increased customer spending patterns. Seasonal analysis indicates upcoming peak months, making this an ideal time to optimize inventory and marketing spend.",
    insights: [
      {
        title: "Revenue Growth Driven by Higher AOV",
        explanation: "While order volume remained relatively stable, the 15% increase in average order value directly contributed to revenue growth. This suggests customers are purchasing higher-value items or adding more to their carts.",
        severity: "high",
        relatedMetrics: ["Revenue", "AOV"]
      },
      {
        title: "Retention Rate Decline Needs Attention",
        explanation: "The returning customer rate dropped by 15.8%, indicating potential issues with customer loyalty or post-purchase experience. This represents a significant risk to sustainable growth.",
        severity: "high",
        relatedMetrics: ["Returning Customers"]
      },
      {
        title: "Abandoned Cart Recovery Opportunity",
        explanation: "Current abandoned carts represent significant untapped revenue. With proper email automation, a 20-30% recovery rate is achievable.",
        severity: "medium",
        relatedMetrics: ["Revenue"]
      }
    ],
    actions: [
      {
        action: "Implement abandoned cart email sequence",
        reason: "Based on the identified opportunity with quantified potential revenue in abandoned carts",
        impact: "Estimated $6,200 in recovered revenue",
        effort: "low",
        timeframe: "immediate"
      },
      {
        action: "Launch customer retention campaign targeting first-time buyers",
        reason: "Declining returning customer rate threatens long-term revenue stability. Early intervention with new customers has highest ROI.",
        impact: "15-20% improvement in retention rate",
        effort: "medium",
        timeframe: "immediate"
      },
      {
        action: "Increase inventory for peak seasonal months",
        reason: "Seasonal analysis shows strong patterns with identified peak months approaching. Stock-outs during peak periods leave money on the table.",
        impact: "Prevent revenue loss from stock-outs, estimated 10% revenue increase",
        effort: "high",
        timeframe: "short-term"
      }
    ],
    marketingTip: "Focus ad spend on high-AOV customer segments identified in this period. The increased spending patterns suggest an opportunity to target similar demographics.",
    seasonalNote: "With peak months approaching, begin promotional campaigns 2-3 weeks in advance to capture early demand and build momentum."
  });
}

/**
 * Generate AI insights from context
 * @param {AIContext} context - The AI context
 * @returns {Promise<{report: Object, tokensUsed: number, durationMs: number}>}
 */
export async function generateInsights(context) {
  const startTime = Date.now();

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(context);

    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const estimatedInputTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);

    console.log(` Generating insights for ${context.period.current.label}...`);
    console.log(`   Estimated input tokens: ${estimatedInputTokens}`);

    const rawResponse = await callOpenAI(
      systemPrompt,
      userPrompt,
      MODEL_CONFIG.generator
    );

    const report = parseAIResponse(rawResponse);

    const durationMs = Date.now() - startTime;
    const estimatedOutputTokens = Math.ceil(rawResponse.length / 4);
    const tokensUsed = estimatedInputTokens + estimatedOutputTokens;

    console.log(`✓ Insights generated in ${durationMs}ms`);
    console.log(`   Estimated total tokens: ${tokensUsed}`);

    return {
      report,
      tokensUsed,
      durationMs
    };

  } catch (error) {
    console.error("Error generating insights:", error);
    throw error;
  }
}

/**
 * Generate insights with tighter prompt (for retry)
 * @param {AIContext} context - The AI context
 * @param {Array<string>} issues - Issues from evaluator
 * @returns {Promise<{report: Object, tokensUsed: number, durationMs: number}>}
 */
export async function generateInsightsRetry(context, issues) {
  console.log("  Retrying with tighter constraints...");
  console.log("   Previous issues:", issues);

  // Add additional constraints to the prompt
  const enhancedSystemPrompt = buildSystemPrompt() + `\n\nPREVIOUS ATTEMPT HAD ISSUES:
${issues.join('\n')}

FIX THESE ISSUES. Be even more specific and data-grounded. Only reference numbers explicitly provided.`;

  const startTime = Date.now();

  try {
    const userPrompt = buildUserPrompt(context);
    const estimatedInputTokens = Math.ceil((enhancedSystemPrompt.length + userPrompt.length) / 4);

    const rawResponse = await callOpenAI(
      enhancedSystemPrompt,
      userPrompt,
      MODEL_CONFIG.generator
    );

    const report = parseAIResponse(rawResponse);
    const durationMs = Date.now() - startTime;
    const estimatedOutputTokens = Math.ceil(rawResponse.length / 4);
    const tokensUsed = estimatedInputTokens + estimatedOutputTokens;

    console.log(`✓ Retry completed in ${durationMs}ms`);

    return {
      report,
      tokensUsed,
      durationMs
    };

  } catch (error) {
    console.error("Error in retry:", error);
    throw error;
  }
}

/**
 * Generate fallback report (deterministic only, no AI)
 * Used when AI fails or scores too low
 * @param {AIContext} context - The AI context
 * @returns {Object}
 */
export function generateFallbackReport(context) {
  console.log("  Using deterministic fallback (no AI)");

  const revenueDirection = context.metrics.deltas.revenue.percent > 0 ? "increased" : "decreased";
  const revenueChange = Math.abs(context.metrics.deltas.revenue.percent).toFixed(1);

  return {
    summary: `${context.period.current.label} ${revenueDirection} by ${revenueChange}% compared to ${context.period.previous.label}. ` +
      `Key drivers: ${context.analysis.rootCauses.slice(0, 2).map(c => c.metric).join(', ')}. ` +
      `Revenue was $${context.metrics.current.revenue.toLocaleString()} from ${context.metrics.current.orders} orders.`,

    insights: context.analysis.rootCauses.slice(0, 3).map(cause => ({
      title: `${cause.metric} ${cause.direction === 'up' ? 'Increased' : 'Decreased'}`,
      explanation: cause.explanation,
      severity: cause.impact.toLowerCase(),
      relatedMetrics: [cause.metric]
    })),

    actions: context.analysis.opportunities.slice(0, 3).map(opp => ({
      action: opp.title,
      reason: opp.dataBasis,
      impact: `$${opp.estimatedImpact.toLocaleString()} potential`,
      effort: opp.effort,
      timeframe: "short-term"
    })),

    marketingTip: null,
    seasonalNote: context.analysis.seasonality?.strength === "high"
      ? `Strong seasonal pattern detected. Peak months: ${context.analysis.seasonality.peakMonths.join(', ')}`
      : null
  };
}
