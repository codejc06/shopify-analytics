import Report from "../models/Report.js";

/**
 * Alert Rules Engine
 * Detects significant changes and generates actionable alerts
 * Pure logic-based, no ML/AI guessing
 */

// Alert thresholds (configurable)
const THRESHOLDS = {
  revenue: {
    warning: 10,  // 10% change triggers warning
    critical: 20  // 20% change triggers critical
  },
  aov: {
    warning: 15,
    critical: 25
  },
  returningCustomerRate: {
    warning: 5,
    critical: 10
  },
  conversionRate: {
    warning: 15,
    critical: 30
  },
  shippingTime: {
    warning: 1,   // 1 day increase
    critical: 2   // 2 days increase
  }
};

/**
 * Generate alerts by comparing current report to previous report
 * @param {Object} currentReport - Current month's report
 * @param {Object} previousReport - Previous month's report
 * @returns {Array} Array of alert objects
 */
export function generateAlerts(currentReport, previousReport) {
  if (!previousReport) {
    // First month - no alerts, just a welcome message
    return [{
      type: 'info',
      severity: 'low',
      metric: 'Welcome',
      message: 'This is your baseline month. Alerts will appear next month when we can compare data.',
      icon: '',
      link: null,
      actionable: false
    }];
  }

  const alerts = [];
  const current = currentReport.data;
  const previous = previousReport.data;

  // 1. Revenue Change Alert
  const revenueChange = current.revenue - previous.revenue;
  const revenueChangePercent = previous.revenue > 0 ? (revenueChange / previous.revenue) * 100 : 0;

  if (Math.abs(revenueChangePercent) >= THRESHOLDS.revenue.critical) {
    alerts.push({
      type: revenueChange > 0 ? 'success' : 'critical',
      severity: 'high',
      metric: 'Revenue',
      change: revenueChange,
      changePercent: revenueChangePercent,
      message: revenueChange > 0
        ? `Revenue surged by $${Math.abs(revenueChange).toLocaleString()} (${revenueChangePercent.toFixed(1)}%) - your best month yet!`
        : `Revenue dropped by $${Math.abs(revenueChange).toLocaleString()} (${Math.abs(revenueChangePercent).toFixed(1)}%) - immediate attention needed`,
      icon: revenueChange > 0 ? '' : '',
      link: '#root-causes',
      actionable: true
    });
  } else if (Math.abs(revenueChangePercent) >= THRESHOLDS.revenue.warning) {
    alerts.push({
      type: revenueChange > 0 ? 'success' : 'warning',
      severity: 'medium',
      metric: 'Revenue',
      change: revenueChange,
      changePercent: revenueChangePercent,
      message: revenueChange > 0
        ? `Revenue up $${Math.abs(revenueChange).toLocaleString()} (${revenueChangePercent.toFixed(1)}%)`
        : `Revenue down $${Math.abs(revenueChange).toLocaleString()} (${Math.abs(revenueChangePercent).toFixed(1)}%)`,
      icon: revenueChange > 0 ? '' : '',
      link: '#root-causes',
      actionable: true
    });
  }

  // 2. Average Order Value Alert
  const aovChange = current.aov - previous.aov;
  const aovChangePercent = previous.aov > 0 ? (aovChange / previous.aov) * 100 : 0;

  if (Math.abs(aovChangePercent) >= THRESHOLDS.aov.critical) {
    alerts.push({
      type: aovChange > 0 ? 'success' : 'warning',
      severity: aovChange > 0 ? 'high' : 'medium',
      metric: 'AOV',
      change: aovChange,
      changePercent: aovChangePercent,
      message: aovChange > 0
        ? `AOV hit a ${Math.floor(previousReport.month || 6)}-month high at $${current.aov.toFixed(2)} (up ${aovChangePercent.toFixed(1)}%)`
        : `AOV dropped to $${current.aov.toFixed(2)} (down ${Math.abs(aovChangePercent).toFixed(1)}%)`,
      icon: aovChange > 0 ? '' : '',
      link: '#root-causes',
      actionable: true
    });
  }

  // 3. Returning Customer Rate Alert
  const returningRateChange = current.returningCustomerRate - previous.returningCustomerRate;
  const returningRateChangePercent = previous.returningCustomerRate > 0
    ? (returningRateChange / previous.returningCustomerRate) * 100
    : 0;

  if (returningRateChange < 0 && Math.abs(returningRateChangePercent) >= THRESHOLDS.returningCustomerRate.warning) {
    alerts.push({
      type: 'warning',
      severity: 'medium',
      metric: 'Returning Customers',
      change: returningRateChange,
      changePercent: returningRateChangePercent,
      message: `Returning customers dropped sharply (${Math.abs(returningRateChangePercent).toFixed(1)}% decrease) - consider a win-back campaign`,
      icon: '',
      link: '#recommendations',
      actionable: true
    });
  } else if (returningRateChange > 0 && returningRateChangePercent >= THRESHOLDS.returningCustomerRate.warning) {
    alerts.push({
      type: 'success',
      severity: 'medium',
      metric: 'Returning Customers',
      change: returningRateChange,
      changePercent: returningRateChangePercent,
      message: `Customer loyalty improving - returning rate up ${returningRateChangePercent.toFixed(1)}%`,
      icon: '',
      link: null,
      actionable: false
    });
  }

  // 4. Conversion Rate Alert
  if (current.conversionRate && previous.conversionRate) {
    const conversionChange = current.conversionRate - previous.conversionRate;
    const conversionChangePercent = previous.conversionRate > 0
      ? (conversionChange / previous.conversionRate) * 100
      : 0;

    if (conversionChange < 0 && Math.abs(conversionChangePercent) >= THRESHOLDS.conversionRate.warning) {
      alerts.push({
        type: 'warning',
        severity: 'medium',
        metric: 'Conversion Rate',
        change: conversionChange,
        changePercent: conversionChangePercent,
        message: `Conversion rate down ${Math.abs(conversionChangePercent).toFixed(1)}% - check your funnel`,
        icon: '',
        link: null,
        actionable: true
      });
    }
  }

  // 5. Shipping Time Alert
  if (current.avgShippingTime && previous.avgShippingTime) {
    const shippingChange = current.avgShippingTime - previous.avgShippingTime;

    if (shippingChange >= THRESHOLDS.shippingTime.critical) {
      alerts.push({
        type: 'critical',
        severity: 'high',
        metric: 'Shipping Time',
        change: shippingChange,
        changePercent: null,
        message: `Shipping times increased by ${shippingChange.toFixed(1)} days - customers are waiting longer`,
        icon: '',
        link: null,
        actionable: true
      });
    } else if (shippingChange >= THRESHOLDS.shippingTime.warning) {
      alerts.push({
        type: 'warning',
        severity: 'medium',
        metric: 'Shipping Time',
        change: shippingChange,
        changePercent: null,
        message: `Shipping times up ${shippingChange.toFixed(1)} days - monitor fulfillment`,
        icon: '',
        link: null,
        actionable: true
      });
    } else if (shippingChange < -1) {
      alerts.push({
        type: 'success',
        severity: 'low',
        metric: 'Shipping Time',
        change: shippingChange,
        changePercent: null,
        message: `Shipping times improved by ${Math.abs(shippingChange).toFixed(1)} days - great work!`,
        icon: '',
        link: null,
        actionable: false
      });
    }
  }

  // 6. Abandoned Cart Alert (if significant revenue is being lost)
  if (current.abandonedCarts && current.abandonedCarts.potentialRevenue > 1000) {
    const potentialRecovery = current.abandonedCarts.potentialRevenue * (current.abandonedCarts.recoveryRate || 0.2);

    if (potentialRecovery > 500) {
      alerts.push({
        type: 'opportunity',
        severity: 'medium',
        metric: 'Cart Recovery',
        change: potentialRecovery,
        changePercent: null,
        message: `$${potentialRecovery.toLocaleString()} sitting in abandoned carts - quick wins available`,
        icon: '',
        link: '#recommendations',
        actionable: true
      });
    }
  }

  // Sort by severity: high > medium > low
  const severityOrder = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Limit to top 5 most important alerts
  return alerts.slice(0, 5);
}

/**
 * Generate alerts for a specific store and month
 * @param {String} storeId - Store ID
 * @param {Number} month - Month (1-12)
 * @param {Number} year - Year
 * @returns {Promise<Array>} Array of alerts
 */
export async function generateAlertsForMonth(storeId, month, year) {
  // Get current month report
  const currentReport = await Report.findOne({
    store: storeId,
    month: month,
    year: year
  });

  if (!currentReport) {
    return [];
  }

  // Get previous month report
  let prevMonth = month - 1;
  let prevYear = year;

  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }

  const previousReport = await Report.findOne({
    store: storeId,
    month: prevMonth,
    year: prevYear
  });

  return generateAlerts(currentReport, previousReport);
}
