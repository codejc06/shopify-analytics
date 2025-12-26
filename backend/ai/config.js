/**
 * AI System Configuration
 * Centralized configuration for model selection, cost control, and feature flags
 */

/**
 * Feature flags for AI system
 */
export const AI_FEATURES = {
  // Enable/disable AI report generation globally
  enabled: process.env.AI_ENABLED !== "false", // Default: enabled

  // Enable automatic generation on report creation
  autoGenerate: process.env.AI_AUTO_GENERATE === "true", // Default: disabled (manual only)

  // Enable batch generation endpoints
  batchGeneration: process.env.AI_BATCH_ENABLED === "true", // Default: disabled

  // Enable user feedback collection
  collectFeedback: process.env.AI_COLLECT_FEEDBACK !== "false", // Default: enabled

  // Use fallback if AI fails (vs throwing error)
  useFallbackOnError: process.env.AI_USE_FALLBACK !== "false" // Default: enabled
};

/**
 * Model selection configuration
 * Supports OpenAI, Anthropic, or custom providers
 */
export const MODEL_PROVIDERS = {
  // Generator model
  generator: {
    provider: process.env.AI_GENERATOR_PROVIDER || "openai", // "openai", "anthropic", "custom"
    model: process.env.AI_GENERATOR_MODEL || "gpt-4o",
    apiKey: process.env.OPENAI_API_KEY,
    temperature: parseFloat(process.env.AI_GENERATOR_TEMPERATURE || "0.3"),
    maxTokens: parseInt(process.env.AI_GENERATOR_MAX_TOKENS || "1000")
  },

  // Evaluator model (smaller/cheaper)
  evaluator: {
    provider: process.env.AI_EVALUATOR_PROVIDER || "openai",
    model: process.env.AI_EVALUATOR_MODEL || "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
    temperature: parseFloat(process.env.AI_EVALUATOR_TEMPERATURE || "0.1"),
    maxTokens: parseInt(process.env.AI_EVALUATOR_MAX_TOKENS || "500")
  }
};

/**
 * Cost control settings
 */
export const COST_CONTROL = {
  // Maximum cost per report generation (in USD)
  maxCostPerReport: parseFloat(process.env.AI_MAX_COST_PER_REPORT || "0.10"),

  // Maximum monthly AI spend (in USD)
  maxMonthlyCost: parseFloat(process.env.AI_MAX_MONTHLY_COST || "100"),

  // Maximum retries per generation
  maxRetries: parseInt(process.env.AI_MAX_RETRIES || "1"),

  // Rate limiting: max reports per hour
  maxReportsPerHour: parseInt(process.env.AI_MAX_REPORTS_PER_HOUR || "60"),

  // Alert threshold for monthly spend (percentage)
  alertThresholdPercent: parseFloat(process.env.AI_ALERT_THRESHOLD || "80")
};

/**
 * Quality thresholds
 */
export const QUALITY_SETTINGS = {
  // Minimum score to accept (0-10)
  passScore: parseFloat(process.env.AI_PASS_SCORE || "8.0"),

  // Minimum score to retry (below this = fallback immediately)
  retryScore: parseFloat(process.env.AI_RETRY_SCORE || "6.0"),

  // Maximum age of cached report (days)
  cacheMaxAgeDays: parseInt(process.env.AI_CACHE_MAX_AGE_DAYS || "30"),

  // Minimum report age before regeneration (days)
  minRegenerationDays: parseInt(process.env.AI_MIN_REGENERATION_DAYS || "7")
};

/**
 * Regeneration triggers
 */
export const REGENERATION_TRIGGERS = {
  // Regenerate if fallback was used
  onFallback: true,

  // Regenerate if score below threshold
  onLowScore: true,
  lowScoreThreshold: 7.0,

  // Regenerate if report is old
  onAge: true,
  maxAgeDays: QUALITY_SETTINGS.cacheMaxAgeDays,

  // Regenerate if underlying data changed
  onDataChange: true
};

/**
 * Logging and monitoring
 */
export const MONITORING = {
  // Log all AI requests
  logRequests: process.env.AI_LOG_REQUESTS !== "false",

  // Log token usage
  logTokenUsage: process.env.AI_LOG_TOKENS !== "false",

  // Log costs
  logCosts: process.env.AI_LOG_COSTS !== "false",

  // Send alerts for failures
  alertOnFailure: process.env.AI_ALERT_ON_FAILURE === "true"
};

/**
 * Prompt customization
 */
export const PROMPT_SETTINGS = {
  // Tone: "professional", "casual", "technical"
  tone: process.env.AI_TONE || "professional",

  // Output length preference
  summaryMaxWords: parseInt(process.env.AI_SUMMARY_MAX_WORDS || "150"),

  // Number of insights to generate
  insightCount: parseInt(process.env.AI_INSIGHT_COUNT || "5"),

  // Number of actions to generate
  actionCount: parseInt(process.env.AI_ACTION_COUNT || "5")
};

/**
 * Rate limiter for cost control
 */
class AIRateLimiter {
  constructor() {
    this.requests = [];
    this.monthlyCost = 0;
    this.monthStart = new Date();
  }

  /**
   * Check if request is allowed
   * @returns {boolean}
   */
  canMakeRequest() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Clean old requests
    this.requests = this.requests.filter(r => r > oneHourAgo);

    // Check hourly limit
    if (this.requests.length >= COST_CONTROL.maxReportsPerHour) {
      console.warn(`⚠️  Rate limit exceeded: ${this.requests.length} requests in the last hour`);
      return false;
    }

    // Check monthly cost
    if (this.monthlyCost >= COST_CONTROL.maxMonthlyCost) {
      console.warn(`⚠️  Monthly cost limit exceeded: $${this.monthlyCost.toFixed(2)}`);
      return false;
    }

    return true;
  }

  /**
   * Record a request
   * @param {number} cost - Cost in USD
   */
  recordRequest(cost = 0) {
    this.requests.push(Date.now());
    this.addCost(cost);
  }

  /**
   * Add cost to monthly total
   * @param {number} cost - Cost in USD
   */
  addCost(cost) {
    // Reset if new month
    const now = new Date();
    if (now.getMonth() !== this.monthStart.getMonth() ||
        now.getFullYear() !== this.monthStart.getFullYear()) {
      this.monthlyCost = 0;
      this.monthStart = now;
    }

    this.monthlyCost += cost;

    // Alert if approaching limit
    const percentUsed = (this.monthlyCost / COST_CONTROL.maxMonthlyCost) * 100;
    if (percentUsed >= COST_CONTROL.alertThresholdPercent && MONITORING.alertOnFailure) {
      console.warn(`⚠️  AI cost alert: ${percentUsed.toFixed(1)}% of monthly budget used ($${this.monthlyCost.toFixed(2)} / $${COST_CONTROL.maxMonthlyCost})`);
    }

    if (MONITORING.logCosts) {
      console.log(`💰 AI cost tracked: +$${cost.toFixed(4)} (Monthly total: $${this.monthlyCost.toFixed(2)})`);
    }
  }

  /**
   * Get current stats
   * @returns {Object}
   */
  getStats() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentRequests = this.requests.filter(r => r > oneHourAgo).length;

    return {
      requestsThisHour: recentRequests,
      costThisMonth: this.monthlyCost,
      monthlyBudget: COST_CONTROL.maxMonthlyCost,
      percentUsed: ((this.monthlyCost / COST_CONTROL.maxMonthlyCost) * 100).toFixed(1) + '%',
      requestsRemaining: COST_CONTROL.maxReportsPerHour - recentRequests,
      budgetRemaining: (COST_CONTROL.maxMonthlyCost - this.monthlyCost).toFixed(2)
    };
  }
}

// Singleton instance
export const rateLimiter = new AIRateLimiter();

/**
 * Validate configuration on startup
 */
export function validateConfig() {
  const errors = [];

  // Check API keys - allow fake keys for testing
  if (AI_FEATURES.enabled) {
    if (MODEL_PROVIDERS.generator.provider === "openai" && !MODEL_PROVIDERS.generator.apiKey) {
      errors.push("OPENAI_API_KEY not set but AI is enabled");
    } else if (MODEL_PROVIDERS.generator.apiKey &&
               (MODEL_PROVIDERS.generator.apiKey.includes("fake") ||
                MODEL_PROVIDERS.generator.apiKey.includes("replace"))) {
      // Fake key detected - warn but don't error (allows testing)
      console.warn("⚠️  Mock mode: OPENAI_API_KEY appears to be a placeholder");
      console.warn("   System will use mock responses (no API calls, no costs)");
    }
  }

  // Check thresholds
  if (QUALITY_SETTINGS.retryScore > QUALITY_SETTINGS.passScore) {
    errors.push("AI_RETRY_SCORE must be less than AI_PASS_SCORE");
  }

  // Check cost limits
  if (COST_CONTROL.maxCostPerReport > COST_CONTROL.maxMonthlyCost) {
    errors.push("AI_MAX_COST_PER_REPORT exceeds AI_MAX_MONTHLY_COST");
  }

  if (errors.length > 0) {
    console.error("❌ AI Configuration Errors:");
    errors.forEach(err => console.error(`   - ${err}`));
    return false;
  }

  console.log("✅ AI Configuration validated successfully");
  return true;
}

/**
 * Print current configuration
 */
export function printConfig() {
  console.log("\n🤖 AI System Configuration:");
  console.log("─".repeat(50));
  console.log(`Features:`);
  console.log(`  Enabled: ${AI_FEATURES.enabled}`);
  console.log(`  Auto-generate: ${AI_FEATURES.autoGenerate}`);
  console.log(`  Batch generation: ${AI_FEATURES.batchGeneration}`);
  console.log(`\nModels:`);
  console.log(`  Generator: ${MODEL_PROVIDERS.generator.model}`);
  console.log(`  Evaluator: ${MODEL_PROVIDERS.evaluator.model}`);
  console.log(`\nCost Control:`);
  console.log(`  Max per report: $${COST_CONTROL.maxCostPerReport}`);
  console.log(`  Max monthly: $${COST_CONTROL.maxMonthlyCost}`);
  console.log(`  Max retries: ${COST_CONTROL.maxRetries}`);
  console.log(`  Max reports/hour: ${COST_CONTROL.maxReportsPerHour}`);
  console.log(`\nQuality:`);
  console.log(`  Pass score: ${QUALITY_SETTINGS.passScore}/10`);
  console.log(`  Retry score: ${QUALITY_SETTINGS.retryScore}/10`);
  console.log(`  Cache max age: ${QUALITY_SETTINGS.cacheMaxAgeDays} days`);
  console.log("─".repeat(50) + "\n");
}
