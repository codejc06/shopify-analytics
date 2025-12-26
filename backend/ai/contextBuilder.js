/**
 * AI Context Builder
 * Transforms deterministic analytics data into AI-ready context
 * This is the bridge between your analytics engine and the AI layer
 */

import Report from "../models/Report.js";
import Order from "../models/Order.js";
import Store from "../models/Store.js";
import { AI_SCHEMA_VERSION } from "./types.js";

/**
 * Determine store size based on order volume
 * @param {number} orderCount - Number of orders in current month
 * @returns {"small"|"medium"|"large"}
 */
function determineStoreSize(orderCount) {
  if (orderCount < 100) return "small";
  if (orderCount < 500) return "medium";
  return "large";
}

/**
 * Calculate 3-month trend
 * @param {Array} recentReports - Last 3 months of reports
 * @returns {"improving"|"stable"|"declining"}
 */
function calculate3MonthTrend(recentReports) {
  if (recentReports.length < 3) return "stable";

  const revenues = recentReports.map(r => r.data.revenue);

  // Simple linear trend
  const firstHalf = revenues[0];
  const secondHalf = revenues[revenues.length - 1];

  const change = ((secondHalf - firstHalf) / firstHalf) * 100;

  if (change > 10) return "improving";
  if (change < -10) return "declining";
  return "stable";
}

/**
 * Calculate volatility
 * @param {Array} recentReports - Recent reports
 * @returns {"high"|"medium"|"low"}
 */
function calculateVolatility(recentReports) {
  if (recentReports.length < 3) return "low";

  const revenues = recentReports.map(r => r.data.revenue);
  const mean = revenues.reduce((a, b) => a + b, 0) / revenues.length;

  const variance = revenues.reduce((sum, val) => {
    return sum + Math.pow(val - mean, 2);
  }, 0) / revenues.length;

  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = (stdDev / mean) * 100;

  if (coefficientOfVariation > 30) return "high";
  if (coefficientOfVariation > 15) return "medium";
  return "low";
}

/**
 * Extract opportunities from report recommendations and abandoned carts
 * @param {Object} currentReport - Current month's report
 * @returns {Array<Opportunity>}
 */
function extractOpportunities(currentReport) {
  const opportunities = [];

  // Abandoned cart recovery
  if (currentReport.data.abandonedCarts?.potentialRevenue > 0) {
    const potentialRevenue = currentReport.data.abandonedCarts.potentialRevenue;
    const recoveryRate = currentReport.data.abandonedCarts.recoveryRate || 0.2;
    const estimatedImpact = Math.round(potentialRevenue * recoveryRate);

    if (estimatedImpact > 500) {
      opportunities.push({
        type: "recovery",
        title: "Recover abandoned carts",
        estimatedImpact,
        effort: "low",
        dataBasis: `Based on ${currentReport.data.abandonedCarts.count} abandoned carts worth $${potentialRevenue.toLocaleString()}`
      });
    }
  }

  // Top product opportunity
  if (currentReport.data.topProduct?.revenue > 0) {
    const topProductRevenue = currentReport.data.topProduct.revenue;
    const totalRevenue = currentReport.data.revenue;
    const percentage = (topProductRevenue / totalRevenue) * 100;

    if (percentage > 20) {
      opportunities.push({
        type: "growth",
        title: `Focus on top performer: ${currentReport.data.topProduct.name}`,
        estimatedImpact: Math.round(topProductRevenue * 0.15), // 15% growth potential
        effort: "medium",
        dataBasis: `${currentReport.data.topProduct.name} generates ${percentage.toFixed(1)}% of total revenue`
      });
    }
  }

  // Seasonal opportunities
  if (currentReport.data.seasonalAnalysis?.seasonalRecommendations) {
    currentReport.data.seasonalAnalysis.seasonalRecommendations
      .filter(rec => rec.priority === "high")
      .slice(0, 1) // Take top seasonal recommendation
      .forEach(rec => {
        opportunities.push({
          type: "growth",
          title: rec.title,
          estimatedImpact: Math.round(currentReport.data.revenue * 0.1), // Estimate 10% impact
          effort: "medium",
          dataBasis: rec.description
        });
      });
  }

  return opportunities.slice(0, 3); // Top 3 opportunities
}

/**
 * Extract risks from alerts and root causes
 * @param {Object} currentReport - Current month's report
 * @returns {Array<Risk>}
 */
function extractRisks(currentReport) {
  const risks = [];

  // Check critical/warning alerts
  if (currentReport.alerts) {
    currentReport.alerts
      .filter(alert => alert.type === "critical" || alert.type === "warning")
      .slice(0, 2)
      .forEach(alert => {
        risks.push({
          metric: alert.metric,
          severity: alert.severity === "high" ? "high" : "medium",
          description: alert.message,
          trend: alert.changePercent < 0 ? "worsening" : "stable"
        });
      });
  }

  // Check root causes for declining metrics
  if (currentReport.rootCauses) {
    currentReport.rootCauses
      .filter(cause => cause.direction === "down" && cause.impact === "High")
      .slice(0, 2)
      .forEach(cause => {
        // Avoid duplicates
        if (!risks.some(r => r.metric === cause.metric)) {
          risks.push({
            metric: cause.metric,
            severity: "high",
            description: cause.explanation,
            trend: "worsening"
          });
        }
      });
  }

  return risks.slice(0, 3); // Top 3 risks
}

/**
 * Extract seasonal pattern from report
 * @param {Object} currentReport - Current month's report
 * @returns {SeasonalPattern|null}
 */
function extractSeasonalPattern(currentReport) {
  const seasonal = currentReport.data.seasonalAnalysis;

  if (!seasonal || !seasonal.seasonalityStrength) {
    return null;
  }

  let strength = "none";
  if (seasonal.seasonalityStrength > 0.7) strength = "high";
  else if (seasonal.seasonalityStrength > 0.4) strength = "medium";
  else if (seasonal.seasonalityStrength > 0.2) strength = "low";

  return {
    strength,
    peakMonths: seasonal.topMonths?.map(m => m.month) || [],
    slowMonths: seasonal.bottomMonths?.map(m => m.month) || [],
    confidence: seasonal.seasonalityStrength
  };
}

/**
 * Get month label
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {string}
 */
function getMonthLabel(month, year) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${monthNames[month - 1]} ${year}`;
}

/**
 * Build AI Context from Reports
 * This is the main function that creates the AI input
 *
 * @param {string} storeId - Store ID
 * @param {number} currentMonth - Current month (1-12)
 * @param {number} currentYear - Current year
 * @returns {Promise<AIContext>}
 */
export async function buildAIContext(storeId, currentMonth, currentYear) {
  try {
    // Get current month report
    const currentReport = await Report.findOne({
      store: storeId,
      month: currentMonth,
      year: currentYear
    }).populate('store');

    if (!currentReport) {
      throw new Error(`No report found for ${currentMonth}/${currentYear}`);
    }

    // Get previous month report
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = currentYear - 1;
    }

    const previousReport = await Report.findOne({
      store: storeId,
      month: prevMonth,
      year: prevYear
    });

    if (!previousReport) {
      throw new Error("No previous report available for comparison");
    }

    // Get store info
    const store = await Store.findById(storeId);
    if (!store) {
      throw new Error("Store not found");
    }

    // Calculate how long store has been tracked
    const oldestReport = await Report.findOne({ store: storeId })
      .sort({ year: 1, month: 1 });

    const ageMonths = oldestReport
      ? (currentYear - oldestReport.year) * 12 + (currentMonth - oldestReport.month)
      : 1;

    // Get order counts
    const currentOrderCount = await Order.countDocuments({
      store: storeId,
      createdAt: {
        $gte: new Date(currentYear, currentMonth - 1, 1),
        $lt: new Date(currentYear, currentMonth, 1)
      }
    });

    const previousOrderCount = await Order.countDocuments({
      store: storeId,
      createdAt: {
        $gte: new Date(prevYear, prevMonth - 1, 1),
        $lt: new Date(prevYear, prevMonth, 1)
      }
    });

    // Get recent reports for historical context
    const recentReports = await Report.find({ store: storeId })
      .sort({ year: -1, month: -1 })
      .limit(3);

    // Build metric snapshots
    const currentMetrics = {
      revenue: currentReport.data.revenue,
      orders: currentOrderCount,
      aov: currentReport.data.aov,
      returningCustomerRate: currentReport.data.returningCustomerRate,
      conversionRate: currentReport.data.conversionRate,
      avgShippingTime: currentReport.data.avgShippingTime
    };

    const previousMetrics = {
      revenue: previousReport.data.revenue,
      orders: previousOrderCount,
      aov: previousReport.data.aov,
      returningCustomerRate: previousReport.data.returningCustomerRate,
      conversionRate: previousReport.data.conversionRate,
      avgShippingTime: previousReport.data.avgShippingTime
    };

    // Build deltas
    const deltas = {
      revenue: {
        absolute: currentReport.deltas?.revenue || (currentMetrics.revenue - previousMetrics.revenue),
        percent: ((currentMetrics.revenue - previousMetrics.revenue) / previousMetrics.revenue) * 100
      },
      orders: {
        absolute: currentOrderCount - previousOrderCount,
        percent: ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100
      },
      aov: {
        absolute: currentMetrics.aov - previousMetrics.aov,
        percent: ((currentMetrics.aov - previousMetrics.aov) / previousMetrics.aov) * 100
      },
      returningCustomerRate: {
        absolute: currentMetrics.returningCustomerRate - previousMetrics.returningCustomerRate,
        percent: ((currentMetrics.returningCustomerRate - previousMetrics.returningCustomerRate) / previousMetrics.returningCustomerRate) * 100
      },
      conversionRate: {
        absolute: currentMetrics.conversionRate - previousMetrics.conversionRate,
        percent: previousMetrics.conversionRate > 0
          ? ((currentMetrics.conversionRate - previousMetrics.conversionRate) / previousMetrics.conversionRate) * 100
          : 0
      }
    };

    if (currentMetrics.avgShippingTime && previousMetrics.avgShippingTime) {
      deltas.avgShippingTime = {
        absolute: currentMetrics.avgShippingTime - previousMetrics.avgShippingTime,
        percent: ((currentMetrics.avgShippingTime - previousMetrics.avgShippingTime) / previousMetrics.avgShippingTime) * 100
      };
    }

    // Build AI Context
    const aiContext = {
      schemaVersion: AI_SCHEMA_VERSION,

      storeMeta: {
        industry: store.industry,
        size: determineStoreSize(currentOrderCount),
        ageMonths,
        currency: "USD" // Could be extracted from store settings
      },

      period: {
        current: {
          start: new Date(currentYear, currentMonth - 1, 1).toISOString(),
          end: new Date(currentYear, currentMonth, 0).toISOString(),
          label: getMonthLabel(currentMonth, currentYear)
        },
        previous: {
          start: new Date(prevYear, prevMonth - 1, 1).toISOString(),
          end: new Date(prevYear, prevMonth, 0).toISOString(),
          label: getMonthLabel(prevMonth, prevYear)
        }
      },

      metrics: {
        current: currentMetrics,
        previous: previousMetrics,
        deltas
      },

      analysis: {
        rootCauses: currentReport.rootCauses || [],
        opportunities: extractOpportunities(currentReport),
        risks: extractRisks(currentReport),
        seasonality: extractSeasonalPattern(currentReport)
      },

      historical: recentReports.length >= 3 ? {
        trend3Month: calculate3MonthTrend(recentReports.reverse()),
        volatility: calculateVolatility(recentReports),
        peakMonth: recentReports.reduce((max, r) =>
          r.data.revenue > (max?.data.revenue || 0) ? r : max
        ).month
      } : undefined,

      createdAt: new Date()
    };

    return aiContext;

  } catch (error) {
    console.error("Error building AI context:", error);
    throw error;
  }
}

/**
 * Check if AI context should be regenerated
 * @param {AIContext} oldContext - Previously generated context
 * @param {string} storeId - Store ID
 * @param {number} month - Month
 * @param {number} year - Year
 * @returns {Promise<boolean>}
 */
export async function shouldRegenerateContext(oldContext, storeId, month, year) {
  // Always regenerate if no old context
  if (!oldContext) return true;

  // Regenerate if more than 30 days old
  const daysSince = (Date.now() - new Date(oldContext.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > 30) return true;

  // Regenerate if report data changed
  const currentReport = await Report.findOne({
    store: storeId,
    month,
    year
  });

  if (!currentReport) return false;

  // Check if metrics changed
  const metricsChanged =
    currentReport.data.revenue !== oldContext.metrics.current.revenue ||
    currentReport.rootCauses?.length !== oldContext.analysis.rootCauses.length;

  return metricsChanged;
}
