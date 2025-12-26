/**
 * AI System Type Definitions
 * Defines the contract between deterministic analytics and AI layers
 */

/**
 * @typedef {Object} StoreMeta
 * @property {string} [industry] - Store industry (e.g., "fashion", "electronics")
 * @property {"small"|"medium"|"large"} size - Store size based on order volume
 * @property {number} ageMonths - How long the store has been tracked
 * @property {string} currency - Currency code (e.g., "USD", "CAD")
 */

/**
 * @typedef {Object} PeriodInfo
 * @property {string} start - ISO date string
 * @property {string} end - ISO date string
 * @property {string} label - Human-readable label (e.g., "March 2024")
 */

/**
 * @typedef {Object} Period
 * @property {PeriodInfo} current - Current period
 * @property {PeriodInfo} previous - Previous period for comparison
 */

/**
 * @typedef {Object} MetricSnapshot
 * @property {number} revenue - Total revenue
 * @property {number} orders - Number of orders
 * @property {number} aov - Average order value
 * @property {number} returningCustomerRate - Percentage of returning customers
 * @property {number} conversionRate - Conversion rate
 * @property {number} [avgShippingTime] - Average shipping time in days
 */

/**
 * @typedef {Object} MetricDelta
 * @property {number} absolute - Absolute change
 * @property {number} percent - Percentage change
 */

/**
 * @typedef {Object} MetricDeltas
 * @property {MetricDelta} revenue
 * @property {MetricDelta} orders
 * @property {MetricDelta} aov
 * @property {MetricDelta} returningCustomerRate
 * @property {MetricDelta} conversionRate
 * @property {MetricDelta} [avgShippingTime]
 */

/**
 * @typedef {Object} RootCause
 * @property {string} metric - Metric name (e.g., "Returning Customer Rate")
 * @property {number} change - Absolute change
 * @property {number} changePercent - Percentage change
 * @property {"critical"|"high"|"medium"|"low"} impact - Impact level
 * @property {string} explanation - Plain-English explanation from deterministic engine
 * @property {"up"|"down"|"neutral"} direction - Direction of change
 * @property {string} [segment] - Optional segment (e.g., "Fashion > Dresses")
 */

/**
 * @typedef {Object} Opportunity
 * @property {"recovery"|"growth"|"efficiency"} type - Opportunity type
 * @property {string} title - Short title
 * @property {number} estimatedImpact - Estimated dollar impact
 * @property {"low"|"medium"|"high"} effort - Implementation effort
 * @property {string} dataBasis - Explanation of how this was calculated
 */

/**
 * @typedef {Object} Risk
 * @property {string} metric - Metric name
 * @property {"critical"|"high"|"medium"} severity - Risk severity
 * @property {string} description - Risk description
 * @property {"worsening"|"stable"} trend - Trend direction
 */

/**
 * @typedef {Object} SeasonalPattern
 * @property {"high"|"medium"|"low"|"none"} strength - Seasonality strength
 * @property {string[]} peakMonths - Peak months (e.g., ["November", "December"])
 * @property {string[]} slowMonths - Slow months
 * @property {number} confidence - Confidence score (0-1)
 */

/**
 * @typedef {Object} Analysis
 * @property {RootCause[]} rootCauses - Top 3-5 root causes of change
 * @property {Opportunity[]} opportunities - Quantified improvement opportunities
 * @property {Risk[]} risks - Identified risks
 * @property {SeasonalPattern} [seasonality] - Seasonal patterns if applicable
 */

/**
 * @typedef {Object} HistoricalContext
 * @property {"improving"|"stable"|"declining"} trend3Month - 3-month trend
 * @property {"high"|"medium"|"low"} volatility - Metric volatility
 * @property {string} [peakMonth] - Best performing month
 */

/**
 * Main AI Context - The single source of truth passed to AI
 * @typedef {Object} AIContext
 * @property {string} schemaVersion - Schema version for future compatibility
 * @property {StoreMeta} storeMeta - Store metadata
 * @property {Period} period - Time periods being analyzed
 * @property {Object} metrics - Core metrics
 * @property {MetricSnapshot} metrics.current - Current period metrics
 * @property {MetricSnapshot} metrics.previous - Previous period metrics
 * @property {MetricDeltas} metrics.deltas - Calculated deltas
 * @property {Analysis} analysis - Deterministic analysis results
 * @property {HistoricalContext} [historical] - Historical context (optional)
 * @property {Date} createdAt - When this context was generated
 */

/**
 * AI-Generated Insight
 * @typedef {Object} AIInsight
 * @property {string} title - Insight title
 * @property {string} explanation - Detailed explanation
 * @property {"critical"|"high"|"medium"|"low"} severity - Severity level
 * @property {string[]} [relatedMetrics] - Related metrics
 */

/**
 * AI-Generated Action
 * @typedef {Object} AIAction
 * @property {string} action - Action description
 * @property {string} reason - Why this action is recommended
 * @property {string} impact - Expected impact (e.g., "$6,200", "15% increase")
 * @property {"low"|"medium"|"high"} effort - Implementation effort
 * @property {"immediate"|"short-term"|"long-term"} timeframe - When to implement
 */

/**
 * AI-Generated Report Output
 * @typedef {Object} AIReport
 * @property {string} summary - Executive summary (max 150 words)
 * @property {AIInsight[]} insights - Top 3-5 insights
 * @property {AIAction[]} actions - Top 3-5 recommended actions
 * @property {string} [marketingTip] - Optional marketing-specific tip
 * @property {string} [seasonalNote] - Optional seasonal observation
 */

/**
 * Evaluator Assessment
 * @typedef {Object} EvaluatorResult
 * @property {number} score - Overall score (0-10)
 * @property {boolean} pass - Whether the output passes quality threshold
 * @property {string[]} issues - List of issues found (empty if none)
 * @property {string} reason - Explanation of the score
 * @property {Object} breakdown - Detailed scoring breakdown
 * @property {number} breakdown.accuracy - Accuracy score (0-10)
 * @property {number} breakdown.specificity - Specificity score (0-10)
 * @property {number} breakdown.actionability - Actionability score (0-10)
 * @property {number} breakdown.businessValue - Business value score (0-10)
 */

/**
 * AI Generation Result (with metadata)
 * @typedef {Object} AIGenerationResult
 * @property {AIReport} report - The generated report
 * @property {EvaluatorResult} evaluation - Evaluator's assessment
 * @property {Object} metadata - Generation metadata
 * @property {string} metadata.generatorModel - Model used for generation
 * @property {string} metadata.evaluatorModel - Model used for evaluation
 * @property {number} metadata.attemptNumber - Which attempt (1 = first try, 2 = retry)
 * @property {number} metadata.tokensUsed - Approximate tokens used
 * @property {number} metadata.durationMs - Generation time in milliseconds
 * @property {Date} metadata.createdAt - When this was generated
 */

// Export for use in other modules
export const AI_SCHEMA_VERSION = "1.0.0";

// Quality thresholds
export const QUALITY_THRESHOLDS = {
  PASS_SCORE: 8.0,      // Minimum score to accept output
  RETRY_SCORE: 6.0,     // Below this, use fallback (don't retry)
  MAX_RETRIES: 1        // Maximum number of retries (cost control)
};

// Model configuration
export const MODEL_CONFIG = {
  generator: {
    // Use environment variables with fallbacks
    model: process.env.OPENAI_MODEL_GENERATOR || "gpt-4o",
    temperature: 0.3,  // Low temperature for consistency
    maxTokens: 1000
  },
  evaluator: {
    // Smaller, faster model for evaluation
    model: process.env.OPENAI_MODEL_EVALUATOR || "gpt-4o-mini",
    temperature: 0.1,  // Very low for consistent evaluation
    maxTokens: 500
  }
};
