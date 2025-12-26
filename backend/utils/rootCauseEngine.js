/**
 * Root-Cause Analysis Engine
 *
 * Analyzes month-over-month changes and provides plain-English explanations
 * for why revenue/performance changed.
 *
 * This is deterministic logic - no ML needed.
 */

import Report from "../models/Report.js";
import Order from "../models/Order.js";

/**
 * Calculate deltas between current and previous month
 */
function calculateDeltas(currentData, previousData) {
  if (!previousData) {
    return null; // No previous month to compare
  }

  const deltas = {
    revenue: currentData.revenue - previousData.revenue,
    orders: 0, // Will be calculated separately
    aov: currentData.aov - previousData.aov,
    returningCustomerRate: currentData.returningCustomerRate - previousData.returningCustomerRate,
    conversionRate: currentData.conversionRate - (previousData.conversionRate || 0),
    avgShippingTime: currentData.avgShippingTime - (previousData.avgShippingTime || 0)
  };

  return deltas;
}

/**
 * Calculate percentage change
 */
function calculatePercentChange(current, previous) {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Determine impact level based on percentage change and metric weight
 */
function determineImpact(percentChange, metricWeight) {
  const absChange = Math.abs(percentChange);
  const weightedChange = absChange * metricWeight;

  if (weightedChange >= 15) return "High";
  if (weightedChange >= 7) return "Medium";
  return "Low";
}

/**
 * Generate explanation based on metric and change
 */
function generateExplanation(metric, change, percentChange, currentData, previousData) {
  const direction = change > 0 ? "up" : "down";
  const absPercent = Math.abs(percentChange).toFixed(1);

  const explanations = {
    revenue: {
      up: `Revenue increased by ${absPercent}% compared to last month`,
      down: `Revenue dropped by ${absPercent}% compared to last month`
    },
    orders: {
      up: `Order volume increased by ${absPercent}%`,
      down: `Fewer orders received - order count decreased by ${absPercent}%`
    },
    aov: {
      up: `Average order value increased by ${absPercent}% - customers spending more per purchase`,
      down: `Average order value declined by ${absPercent}% - customers spending less per order`
    },
    returningCustomerRate: {
      up: `More repeat customers - returning customer rate improved by ${absPercent}%`,
      down: `Fewer repeat customers - returning customer rate fell by ${absPercent}%`
    },
    conversionRate: {
      up: `Conversion rate improved by ${absPercent}% - more visitors becoming customers`,
      down: `Conversion rate declined by ${absPercent}% - fewer visitors completing purchases`
    },
    avgShippingTime: {
      up: `Shipping time increased by ${absPercent}% - orders taking longer to fulfill`,
      down: `Shipping time decreased by ${absPercent}% - faster order fulfillment`
    }
  };

  return explanations[metric]?.[direction] || `${metric} changed by ${percentChange.toFixed(1)}%`;
}

/**
 * Analyze root causes for a report
 */
export async function analyzeRootCauses(storeId, currentMonth, currentYear) {
  try {
    // Get current month report
    const currentReport = await Report.findOne({
      store: storeId,
      month: currentMonth,
      year: currentYear
    });

    if (!currentReport) {
      return { rootCauses: [], deltas: null };
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
      // First month - no comparison possible
      return { rootCauses: [], deltas: null };
    }

    const currentData = currentReport.data;
    const previousData = previousReport.data;

    // Calculate order count for both months
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

    // Calculate deltas
    const deltas = calculateDeltas(currentData, previousData);
    deltas.orders = currentOrderCount - previousOrderCount;

    // Metric weights (how much each metric contributes to overall performance)
    const metricWeights = {
      revenue: 1.0,      // Direct impact
      orders: 0.9,       // High impact - volume driver
      aov: 0.8,          // High impact - value driver
      returningCustomerRate: 0.85, // High impact - retention
      conversionRate: 0.7,         // Medium-high impact
      avgShippingTime: 0.5         // Medium impact - operational
    };

    // Calculate root causes
    const rootCauses = [];

    // Revenue change (always include if significant)
    const revenuePercentChange = calculatePercentChange(currentData.revenue, previousData.revenue);
    if (Math.abs(revenuePercentChange) >= 5) {
      rootCauses.push({
        metric: "Revenue",
        change: deltas.revenue,
        changePercent: revenuePercentChange,
        impact: determineImpact(revenuePercentChange, metricWeights.revenue),
        explanation: generateExplanation("revenue", deltas.revenue, revenuePercentChange, currentData, previousData),
        direction: deltas.revenue > 0 ? "up" : "down"
      });
    }

    // Orders change
    const ordersPercentChange = calculatePercentChange(currentOrderCount, previousOrderCount);
    if (Math.abs(ordersPercentChange) >= 5) {
      rootCauses.push({
        metric: "Orders",
        change: deltas.orders,
        changePercent: ordersPercentChange,
        impact: determineImpact(ordersPercentChange, metricWeights.orders),
        explanation: generateExplanation("orders", deltas.orders, ordersPercentChange, currentData, previousData),
        direction: deltas.orders > 0 ? "up" : "down"
      });
    }

    // AOV change
    const aovPercentChange = calculatePercentChange(currentData.aov, previousData.aov);
    if (Math.abs(aovPercentChange) >= 5) {
      rootCauses.push({
        metric: "Average Order Value",
        change: deltas.aov,
        changePercent: aovPercentChange,
        impact: determineImpact(aovPercentChange, metricWeights.aov),
        explanation: generateExplanation("aov", deltas.aov, aovPercentChange, currentData, previousData),
        direction: deltas.aov > 0 ? "up" : "down"
      });
    }

    // Returning customer rate change
    const returningPercentChange = calculatePercentChange(
      currentData.returningCustomerRate,
      previousData.returningCustomerRate
    );
    if (Math.abs(returningPercentChange) >= 5) {
      rootCauses.push({
        metric: "Returning Customers",
        change: deltas.returningCustomerRate,
        changePercent: returningPercentChange,
        impact: determineImpact(returningPercentChange, metricWeights.returningCustomerRate),
        explanation: generateExplanation("returningCustomerRate", deltas.returningCustomerRate, returningPercentChange, currentData, previousData),
        direction: deltas.returningCustomerRate > 0 ? "up" : "down"
      });
    }

    // Conversion rate change (if available)
    if (previousData.conversionRate && currentData.conversionRate) {
      const conversionPercentChange = calculatePercentChange(
        currentData.conversionRate,
        previousData.conversionRate
      );
      if (Math.abs(conversionPercentChange) >= 5) {
        rootCauses.push({
          metric: "Conversion Rate",
          change: deltas.conversionRate,
          changePercent: conversionPercentChange,
          impact: determineImpact(conversionPercentChange, metricWeights.conversionRate),
          explanation: generateExplanation("conversionRate", deltas.conversionRate, conversionPercentChange, currentData, previousData),
          direction: deltas.conversionRate > 0 ? "up" : "down"
        });
      }
    }

    // Shipping time change (if available)
    if (previousData.avgShippingTime && currentData.avgShippingTime) {
      const shippingPercentChange = calculatePercentChange(
        currentData.avgShippingTime,
        previousData.avgShippingTime
      );
      if (Math.abs(shippingPercentChange) >= 10) { // Higher threshold for shipping
        rootCauses.push({
          metric: "Shipping Time",
          change: deltas.avgShippingTime,
          changePercent: shippingPercentChange,
          impact: determineImpact(shippingPercentChange, metricWeights.avgShippingTime),
          explanation: generateExplanation("avgShippingTime", deltas.avgShippingTime, shippingPercentChange, currentData, previousData),
          direction: deltas.avgShippingTime > 0 ? "up" : "down"
        });
      }
    }

    // Sort by impact: High > Medium > Low, then by absolute percent change
    const impactPriority = { High: 3, Medium: 2, Low: 1 };
    rootCauses.sort((a, b) => {
      if (impactPriority[a.impact] !== impactPriority[b.impact]) {
        return impactPriority[b.impact] - impactPriority[a.impact];
      }
      return Math.abs(b.changePercent) - Math.abs(a.changePercent);
    });

    // Return top 5 most impactful root causes
    return {
      rootCauses: rootCauses.slice(0, 5),
      deltas
    };

  } catch (error) {
    console.error("Error analyzing root causes:", error);
    return { rootCauses: [], deltas: null };
  }
}

/**
 * Update existing report with root cause analysis
 */
export async function updateReportWithRootCauses(reportId) {
  try {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    const { rootCauses, deltas } = await analyzeRootCauses(
      report.store,
      report.month,
      report.year
    );

    report.rootCauses = rootCauses;
    report.deltas = deltas;
    await report.save();

    return report;
  } catch (error) {
    console.error("Error updating report with root causes:", error);
    throw error;
  }
}
