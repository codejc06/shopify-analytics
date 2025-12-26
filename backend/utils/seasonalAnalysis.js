/**
 * Seasonal Trend Analysis Utilities
 * Implements multiplicative decomposition for time-series analysis
 */

/**
 * Calculate moving average for trend detection
 * @param {Array<number>} arr - Array of values
 * @param {number} window - Window size (default 12 for monthly data)
 * @returns {Array<number|null>} Moving averages
 */
function movingAverage(arr, window = 12) {
  const out = [];
  const halfWindow = Math.floor(window / 2);

  for (let i = 0; i < arr.length; i++) {
    if (i < halfWindow || i >= arr.length - halfWindow) {
      out.push(null);
      continue;
    }

    const slice = arr.slice(i - halfWindow, i + halfWindow);
    const avg = slice.reduce((a, b) => a + b, 0) / window;
    out.push(avg);
  }

  return out;
}

/**
 * Calculate variance of an array
 * @param {Array<number>} arr - Array of values
 * @returns {number} Variance
 */
function variance(arr) {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
}

/**
 * Compute seasonal decomposition and strength
 * @param {Array<{date: Date|string, units: number}>} monthlySales - Monthly sales data
 * @returns {Object} Seasonality analysis results
 */
export function computeSeasonality(monthlySales) {
  if (!monthlySales || monthlySales.length < 12) {
    return {
      seasonalityIndex: Array(12).fill(1),
      seasonalityStrength: 0,
      trend: [],
      hasEnoughData: false
    };
  }

  // STEP 1: Sort by date
  const sorted = [...monthlySales].sort((a, b) =>
    new Date(a.date) - new Date(b.date)
  );

  const sales = sorted.map(s => s.units);

  // STEP 2: Calculate trend via moving average
  const trend = movingAverage(sales, 12);

  // STEP 3: Calculate seasonal ratios (detrended data)
  const ratios = sales.map((v, i) =>
    trend[i] && trend[i] > 0 ? v / trend[i] : null
  );

  // STEP 4: Group ratios by month and calculate monthly averages
  const monthBuckets = Array.from({ length: 12 }, () => []);

  sorted.forEach((row, i) => {
    const monthIndex = new Date(row.date).getMonth(); // 0-11
    if (ratios[i] !== null && !isNaN(ratios[i])) {
      monthBuckets[monthIndex].push(ratios[i]);
    }
  });

  // Calculate average for each month
  let seasonIndex = monthBuckets.map(bucket => {
    if (bucket.length === 0) return 1;
    return bucket.reduce((a, b) => a + b, 0) / bucket.length;
  });

  // Normalize so average = 1
  const mean = seasonIndex.reduce((a, b) => a + b, 0) / 12;
  if (mean > 0) {
    seasonIndex = seasonIndex.map(v => v / mean);
  }

  // STEP 5: Calculate seasonality strength
  const noise = sales.map((v, i) => {
    const monthIndex = new Date(sorted[i].date).getMonth();
    if (trend[i] && trend[i] > 0 && seasonIndex[monthIndex]) {
      return v / (trend[i] * seasonIndex[monthIndex]);
    }
    return null;
  });

  const validNoise = noise.filter(n => n !== null && !isNaN(n));
  const validRatios = ratios.filter(r => r !== null && !isNaN(r));

  let strength = 0;
  if (validNoise.length > 0 && validRatios.length > 0) {
    const varNoise = variance(validNoise);
    const varSeasonPlusNoise = variance(validRatios);

    if (varSeasonPlusNoise > 0) {
      strength = Math.max(0, Math.min(1, 1 - (varNoise / varSeasonPlusNoise)));
    }
  }

  return {
    seasonalityIndex: seasonIndex,
    seasonalityStrength: strength,
    trend,
    hasEnoughData: true
  };
}

/**
 * Get seasonal insights and recommendations
 * @param {Array<number>} seasonalityIndex - Monthly seasonal indices (0-11)
 * @param {number} seasonalityStrength - Strength score (0-1)
 * @returns {Object} Insights and recommendations
 */
export function getSeasonalInsights(seasonalityIndex, seasonalityStrength) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calculate percentage changes
  const monthlyData = seasonalityIndex.map((index, i) => ({
    month: monthNames[i],
    index: index,
    change: ((index - 1) * 100).toFixed(1),
    monthNumber: i
  }));

  // Sort by performance
  const sortedByPerformance = [...monthlyData].sort((a, b) => b.index - a.index);

  // Get top and bottom performers
  const topMonths = sortedByPerformance.slice(0, 3);
  const bottomMonths = sortedByPerformance.slice(-3).reverse();

  // Determine strength category
  let strengthCategory = 'Low';
  let strengthDescription = 'Weak seasonal pattern';
  if (seasonalityStrength > 0.7) {
    strengthCategory = 'High';
    strengthDescription = 'Strong seasonal pattern';
  } else if (seasonalityStrength > 0.4) {
    strengthCategory = 'Medium';
    strengthDescription = 'Moderate seasonal pattern';
  }

  // Generate actionable recommendations
  const recommendations = [];

  if (seasonalityStrength > 0.4) {
    // Strong seasonal pattern
    const bestMonth = topMonths[0];
    const worstMonth = bottomMonths[0];

    recommendations.push({
      type: 'inventory',
      priority: 'high',
      title: `Stock ${Math.abs(parseFloat(bestMonth.change))}% more for ${bestMonth.month}`,
      description: `${bestMonth.month} historically performs ${bestMonth.change}% above average. Increase inventory by late ${monthNames[(bestMonth.monthNumber - 1 + 12) % 12]}.`
    });

    recommendations.push({
      type: 'marketing',
      priority: 'medium',
      title: `Reduce ad spend in ${worstMonth.month}`,
      description: `${worstMonth.month} shows ${worstMonth.change}% below average sales. Consider shifting budget to peak months.`
    });

    if (seasonalityStrength > 0.6) {
      recommendations.push({
        type: 'promotion',
        priority: 'high',
        title: 'Launch pre-season campaigns',
        description: `Start marketing campaigns 2-3 weeks before ${topMonths.map(m => m.month).join(', ')} to capture early demand.`
      });
    }
  } else {
    recommendations.push({
      type: 'general',
      priority: 'low',
      title: 'Consistent year-round performance',
      description: 'This product shows stable demand throughout the year. Maintain consistent inventory and marketing.'
    });
  }

  return {
    topMonths,
    bottomMonths,
    strengthCategory,
    strengthDescription,
    recommendations,
    monthlyData
  };
}

/**
 * Format seasonal data for display
 * @param {Object} analysis - Result from computeSeasonality
 * @returns {Object} Formatted data for UI
 */
export function formatSeasonalDisplay(analysis) {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const monthlyPerformance = analysis.seasonalityIndex.map((index, i) => ({
    month: monthNames[i],
    fullMonth: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ][i],
    index: index,
    percentage: ((index - 1) * 100).toFixed(1),
    trend: index >= 1.05 ? 'up' : index <= 0.95 ? 'down' : 'neutral'
  }));

  return {
    strength: analysis.seasonalityStrength,
    strengthLabel: analysis.seasonalityStrength > 0.7 ? 'High' :
                   analysis.seasonalityStrength > 0.4 ? 'Medium' : 'Low',
    monthlyPerformance,
    hasEnoughData: analysis.hasEnoughData
  };
}
