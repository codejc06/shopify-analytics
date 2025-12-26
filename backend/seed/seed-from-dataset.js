import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import csv from "csv-parser";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from "../models/User.js";
import Store from "../models/Store.js";
import Order from "../models/Order.js";
import Report from "../models/Report.js";
import { computeSeasonality, getSeasonalInsights } from "../utils/seasonalAnalysis.js";
import { analyzeRootCauses } from "../utils/rootCauseEngine.js";
import { generateAlerts } from "../utils/alertEngine.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(" Connected to MongoDB");
  } catch (err) {
    console.error(" MongoDB connection error:", err);
    process.exit(1);
  }
};

// Helper function to read CSV file
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

const seed = async () => {
  await connectDB();

  console.log(" Clearing old data...");
  await User.deleteMany({});
  await Store.deleteMany({});
  await Order.deleteMany({});
  await Report.deleteMany({});
  console.log(" Old data cleared\n");

  // Create user
  const user = await User.create({
    name: "Alex Johnson",
    email: "alex@shopifyanalytics.com",
    password: "12345",
  });
  console.log(` User created: ${user.name} (${user.email})\n`);

  const datasets = [
    { name: "TechGear Pro", domain: "techgear-pro.myshopify.com", folder: "tech" },
    { name: "Beauty Haven", domain: "beauty-haven.myshopify.com", folder: "beauty" },
    { name: "Fashion Forward", domain: "fashion-forward.myshopify.com", folder: "fashion" },
    { name: "Wellness Store", domain: "wellness-store.myshopify.com", folder: "food_supplements" },
  ];

  const stores = [];

  for (const dataset of datasets) {
    console.log(` Processing ${dataset.name}...`);

    // Create store
    const store = await Store.create({
      user: user._id,
      storeName: dataset.name,
      shopifyDomain: dataset.domain,
      accessToken: `shpat_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      lastSync: new Date(),
    });

    stores.push(store);
    user.stores.push(store._id);

    // Read CSV files
    const datasetPath = join(__dirname, '../../dataset', dataset.folder);
    const ordersData = await readCSV(join(datasetPath, 'orders.csv'));
    const customersData = await readCSV(join(datasetPath, 'customers.csv'));
    const productsData = await readCSV(join(datasetPath, 'products.csv'));

    console.log(`    Loaded ${ordersData.length} orders, ${customersData.length} customers, ${productsData.length} products`);

    // Create orders from CSV
    const orders = [];
    for (const orderRow of ordersData) {
      try {
        // Parse line_items if it's a string
        let lineItemsCount;
        if (typeof orderRow.line_items === 'string') {
          const parsed = JSON.parse(orderRow.line_items.replace(/'/g, '"'));
          lineItemsCount = Array.isArray(parsed) ? parsed.length : 1;
        } else {
          lineItemsCount = 1;
        }

        const order = await Order.create({
          store: store._id,
          orderId: `#${orderRow.order_id}`,
          totalPrice: parseFloat(orderRow.total_price),
          lineItems: lineItemsCount,
          customerId: `gid://shopify/Customer/${orderRow.customer_id}`,
          createdAt: new Date(orderRow.created_at),
        });

        orders.push(order);
      } catch (error) {
        console.error(`     Error creating order ${orderRow.order_id}:`, error.message);
      }
    }

    console.log(`    Created ${orders.length} orders`);

    // Calculate metrics
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate returning customer rate
    const customerIds = orders.map(o => o.customerId);
    const uniqueCustomers = new Set(customerIds);

    // Count how many customers made more than 1 purchase
    const customerOrderCounts = {};
    customerIds.forEach(id => {
      customerOrderCounts[id] = (customerOrderCounts[id] || 0) + 1;
    });
    const returningCustomers = Object.values(customerOrderCounts).filter(count => count > 1).length;
    const returningCustomerRate = uniqueCustomers.size > 0 ? returningCustomers / uniqueCustomers.size : 0;

    console.log(`    Customer metrics: ${uniqueCustomers.size} unique customers, ${returningCustomers} returning customers (${(returningCustomerRate * 100).toFixed(1)}% rate)`);

    // Compute seasonal analysis from order history
    const monthlySales = [];
    const months = new Set();

    // Group orders by month
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });

    // Sort months and create monthly data
    const sortedMonths = Array.from(months).sort();
    sortedMonths.forEach(monthKey => {
      const [year, month] = monthKey.split('-').map(Number);
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getFullYear() === year && orderDate.getMonth() === month - 1;
      });

      monthlySales.push({
        date: new Date(year, month - 1, 1),
        units: monthOrders.reduce((sum, order) => sum + order.lineItems, 0)
      });
    });

    const seasonalAnalysis = computeSeasonality(monthlySales);
    const seasonalInsights = getSeasonalInsights(
      seasonalAnalysis.seasonalityIndex,
      seasonalAnalysis.seasonalityStrength
    );

    // Generate recommendations based on current data
    const topProductName = productsData.length > 0 ? productsData[Math.floor(Math.random() * productsData.length)].title : "Top Product";
    const topProductUnits = Math.floor(Math.random() * 50) + 20;
    const topProductRevenue = parseFloat((topProductUnits * (Math.random() * 100 + 30)).toFixed(2));

    const previousMonthRevenue = parseFloat((totalRevenue * (0.7 + Math.random() * 0.5)).toFixed(2));
    const growth = previousMonthRevenue > 0 ? parseFloat(((totalRevenue - previousMonthRevenue) / previousMonthRevenue).toFixed(2)) : 0;

    const conversionRate = parseFloat((Math.random() * 0.04 + 0.01).toFixed(3));
    const avgShippingTime = parseFloat((Math.random() * 3 + 2).toFixed(1));

    // Generate recommendations
    const recommendations = [];
    const abandonedCartCount = Math.floor(Math.random() * 30) + 20;
    const abandonedCartRevenue = parseFloat((abandonedCartCount * avgOrderValue * 0.8).toFixed(2));
    const recoveryRate = 0.20;

    if (abandonedCartCount > 0) {
      const potentialRecovery = parseFloat((abandonedCartRevenue * recoveryRate).toFixed(2));
      recommendations.push({
        type: 'opportunity',
        title: `Recover $${potentialRecovery.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from abandoned carts`,
        description: `You lost $${abandonedCartRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from ${abandonedCartCount} abandoned carts this month. Recovering just 20% adds $${potentialRecovery.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to your revenue.`,
        impact: `+$${potentialRecovery.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        actionText: 'Set up cart recovery emails',
        actionUrl: '/dashboard/settings/cart-recovery',
        priority: 1
      });
    }

    if (returningCustomerRate < 0.15) {
      const emailCampaignImpact = parseFloat((totalRevenue * 0.08).toFixed(2));
      recommendations.push({
        type: 'action',
        title: 'Win back one-time customers',
        description: `${((1 - returningCustomerRate) * 100).toFixed(0)}% of your customers only bought once. A post-purchase email campaign can bring back 8% of them.`,
        impact: `+$${emailCampaignImpact.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} potential revenue`,
        actionText: 'Set up win-back campaign',
        actionUrl: '/dashboard/marketing/winback',
        priority: 1
      });
    }

    recommendations.sort((a, b) => a.priority - b.priority);

    // Top categories
    const categories = ["Electronics", "Accessories", "Featured", "New Arrivals", "Best Sellers"];
    const topCategories = [];
    let remainingPercentage = 100;

    for (let c = 0; c < 3; c++) {
      const percentage = c === 2 ? remainingPercentage : Math.floor(Math.random() * (remainingPercentage - 10) + 10);
      const catRevenue = parseFloat((totalRevenue * (percentage / 100)).toFixed(2));
      topCategories.push({
        name: categories[c],
        revenue: catRevenue,
        percentage: percentage
      });
      remainingPercentage -= percentage;
    }

    // Create reports for each month with root-cause analysis
    console.log(`    Generating monthly reports with root-cause analysis...`);

    for (const monthKey of sortedMonths) {
      const [year, month] = monthKey.split('-').map(Number);

      // Filter orders for this month
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getFullYear() === year && orderDate.getMonth() === month - 1;
      });

      if (monthOrders.length === 0) continue;

      const monthRevenue = monthOrders.reduce((sum, order) => sum + order.totalPrice, 0);
      const monthAOV = monthRevenue / monthOrders.length;

      // Calculate month's returning customer rate
      const monthCustomerIds = monthOrders.map(o => o.customerId);
      const monthUniqueCustomers = new Set(monthCustomerIds);
      const monthCustomerCounts = {};
      monthCustomerIds.forEach(id => {
        monthCustomerCounts[id] = (monthCustomerCounts[id] || 0) + 1;
      });
      const monthReturningCustomers = Object.values(monthCustomerCounts).filter(count => count > 1).length;
      const monthReturningRate = monthUniqueCustomers.size > 0 ? monthReturningCustomers / monthUniqueCustomers.size : 0;

      // Get previous month for growth calculation
      let prevMonthRevenue = 0;
      let growthRate = 0;
      const prevMonthIndex = sortedMonths.indexOf(monthKey) - 1;

      if (prevMonthIndex >= 0) {
        const prevMonthKey = sortedMonths[prevMonthIndex];
        const [prevYear, prevMonth] = prevMonthKey.split('-').map(Number);
        const prevMonthOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate.getFullYear() === prevYear && orderDate.getMonth() === prevMonth - 1;
        });
        prevMonthRevenue = prevMonthOrders.reduce((sum, order) => sum + order.totalPrice, 0);
        if (prevMonthRevenue > 0) {
          growthRate = (monthRevenue - prevMonthRevenue) / prevMonthRevenue;
        }
      }

      const report = await Report.create({
        store: store._id,
        month: month,
        year: year,
        data: {
          revenue: parseFloat(monthRevenue.toFixed(2)),
          aov: parseFloat(monthAOV.toFixed(2)),
          returningCustomerRate: parseFloat(monthReturningRate.toFixed(2)),
          topProduct: {
            name: topProductName,
            unitsSold: topProductUnits,
            revenue: topProductRevenue
          },
          growth: parseFloat(growthRate.toFixed(2)),
          previousMonthRevenue: parseFloat(prevMonthRevenue.toFixed(2)),
          totalUnitsSold: monthOrders.reduce((sum, order) => sum + order.lineItems, 0),
          conversionRate: conversionRate,
          avgShippingTime: avgShippingTime,
          topCategories: topCategories,
          recommendations: recommendations,
          abandonedCarts: {
            count: abandonedCartCount,
            potentialRevenue: abandonedCartRevenue,
            recoveryRate: recoveryRate
          },
          seasonalAnalysis: {
            seasonalityIndex: seasonalAnalysis.seasonalityIndex,
            seasonalityStrength: seasonalAnalysis.seasonalityStrength,
            topMonths: seasonalInsights.topMonths,
            bottomMonths: seasonalInsights.bottomMonths,
            strengthCategory: seasonalInsights.strengthCategory,
            seasonalRecommendations: seasonalInsights.recommendations
          }
        },
      });

      // Run root-cause analysis for months after the first one
      if (prevMonthIndex >= 0) {
        const [prevYear, prevMonth] = sortedMonths[prevMonthIndex].split('-').map(Number);
        const previousReport = await Report.findOne({
          store: store._id,
          month: prevMonth,
          year: prevYear
        });

        const { rootCauses, deltas } = await analyzeRootCauses(store._id, month, year);

        // Generate alerts
        const alerts = generateAlerts(report, previousReport);

        if (rootCauses.length > 0) {
          report.rootCauses = rootCauses;
          report.deltas = deltas;
          report.alerts = alerts;
          await report.save();
          console.log(`       ${monthKey}: $${monthRevenue.toFixed(0)} | ${rootCauses.length} root causes | ${alerts.length} alerts`);
        } else {
          console.log(`       ${monthKey}: $${monthRevenue.toFixed(0)} (baseline month)`);
        }
      } else {
        // First month - add baseline alert
        const alerts = generateAlerts(report, null);
        report.alerts = alerts;
        await report.save();
        console.log(`       ${monthKey}: $${monthRevenue.toFixed(0)} (baseline month)`);
      }
    }

    console.log(`    Seasonal Strength: ${(seasonalAnalysis.seasonalityStrength * 100).toFixed(1)}% (${seasonalInsights.strengthCategory})`);
    if (seasonalInsights.topMonths.length > 0) {
      console.log(`      Best: ${seasonalInsights.topMonths[0].month} (${seasonalInsights.topMonths[0].change}%)`);
      console.log(`      Worst: ${seasonalInsights.bottomMonths[0].month} (${seasonalInsights.bottomMonths[0].change}%)\n`);
    }
  }

  await user.save();

  console.log(" Seeding complete!");
  console.log(` Summary:`);
  console.log(`   - Users: 1`);
  console.log(`   - Stores: ${stores.length}`);
  console.log(`   - Email: alex@shopifyanalytics.com`);
  console.log(`   - Password: 12345`);

  process.exit(0);
};

seed();
