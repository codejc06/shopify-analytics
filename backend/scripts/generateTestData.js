/**
 * Generate test data with multiple months to demo root-cause analysis
 *
 * Run with: node backend/scripts/generateTestData.js
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/User.js";
import Store from "../models/Store.js";
import Order from "../models/Order.js";
import Report from "../models/Report.js";
import { analyzeRootCauses } from "../utils/rootCauseEngine.js";

async function generateTestData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(" MongoDB connected\n");

    // Create test user
    console.log(" Creating test user...");
    let user = await User.findOne({ email: "demo@test.com" });

    if (!user) {
      user = await User.create({
        name: "Demo User",
        email: "demo@test.com",
        password: "password123"
      });
      console.log("    Created user: demo@test.com");
    } else {
      console.log("   ℹ  User already exists");
    }

    // Create test store
    console.log("\n Creating test store...");
    let store = await Store.findOne({ shopifyDomain: "demo-store.myshopify.com" });

    if (!store) {
      store = await Store.create({
        user: user._id,
        storeName: "Demo Fashion Store",
        shopifyDomain: "demo-store.myshopify.com",
        accessToken: "test_token_123"
      });

      user.stores.push(store._id);
      await user.save();
      console.log("    Created store: Demo Fashion Store");
    } else {
      console.log("   ℹ  Store already exists");
    }

    // Clear existing test data
    await Order.deleteMany({ store: store._id });
    await Report.deleteMany({ store: store._id });
    console.log("\n Cleared existing test data");

    // Generate 3 months of orders with trending data
    console.log("\n Generating orders for 3 months...\n");

    const months = [
      {
        name: "November 2024",
        month: 11,
        year: 2024,
        orders: 150,
        avgOrderValue: 75,
        returningCustomerRate: 0.30,
        conversionRate: 0.025,
        avgShippingTime: 3.2
      },
      {
        name: "December 2024",
        month: 12,
        year: 2024,
        orders: 200,
        avgOrderValue: 85,
        returningCustomerRate: 0.35,
        conversionRate: 0.030,
        avgShippingTime: 2.8
      },
      {
        name: "January 2025",
        month: 1,
        year: 2025,
        orders: 120,  // DOWN from December (holiday dropoff)
        avgOrderValue: 65,  // DOWN (lower value purchases)
        returningCustomerRate: 0.22,  // DOWN (fewer returning customers)
        conversionRate: 0.020,  // DOWN (lower conversion)
        avgShippingTime: 4.5  // UP (slower shipping)
      }
    ];

    for (const monthData of months) {
      console.log(` ${monthData.name}:`);

      // Generate orders
      const orders = [];
      const customerPool = [];

      // Create customer pool (some will be returning)
      const totalCustomers = Math.floor(monthData.orders / (1 + monthData.returningCustomerRate));
      const returningCustomers = Math.floor(totalCustomers * monthData.returningCustomerRate);

      for (let i = 0; i < totalCustomers; i++) {
        customerPool.push(`customer_${i}`);
      }

      // Generate orders
      for (let i = 0; i < monthData.orders; i++) {
        let customerId;
        if (i < returningCustomers * 2) {
          // Make some customers return multiple times
          customerId = customerPool[Math.floor(Math.random() * returningCustomers)];
        } else {
          customerId = customerPool[Math.floor(Math.random() * totalCustomers)];
        }

        const orderValue = monthData.avgOrderValue + (Math.random() * 40 - 20); // +/- $20 variance
        const itemCount = Math.floor(Math.random() * 4) + 1;

        // Spread orders throughout the month
        const dayOfMonth = Math.floor(Math.random() * 28) + 1;
        const orderDate = new Date(monthData.year, monthData.month - 1, dayOfMonth);

        const order = await Order.create({
          store: store._id,
          orderId: `#${monthData.year}${String(monthData.month).padStart(2, '0')}${String(i + 1).padStart(4, '0')}`,
          totalPrice: parseFloat(orderValue.toFixed(2)),
          lineItems: itemCount,
          customerId: `gid://shopify/Customer/${customerId}`,
          createdAt: orderDate
        });

        orders.push(order);
      }

      console.log(`    Created ${orders.length} orders`);

      // Generate report
      const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
      const customerIds = orders.map(o => o.customerId);
      const uniqueCustomers = new Set(customerIds);

      const customerOrderCounts = {};
      customerIds.forEach(id => {
        customerOrderCounts[id] = (customerOrderCounts[id] || 0) + 1;
      });
      const returningCount = Object.values(customerOrderCounts).filter(count => count > 1).length;
      const actualReturningRate = uniqueCustomers.size > 0 ? returningCount / uniqueCustomers.size : 0;

      // Get previous month revenue for growth calculation
      let growth = 0;
      let previousMonthRevenue = 0;

      if (monthData.month > 11 || monthData.year > 2024) {
        const prevMonth = monthData.month === 1 ? 12 : monthData.month - 1;
        const prevYear = monthData.month === 1 ? monthData.year - 1 : monthData.year;

        const prevReport = await Report.findOne({
          store: store._id,
          month: prevMonth,
          year: prevYear
        });

        if (prevReport) {
          previousMonthRevenue = prevReport.data.revenue;
          growth = (totalRevenue - previousMonthRevenue) / previousMonthRevenue;
        }
      }

      const report = await Report.create({
        store: store._id,
        month: monthData.month,
        year: monthData.year,
        data: {
          revenue: parseFloat(totalRevenue.toFixed(2)),
          aov: parseFloat((totalRevenue / orders.length).toFixed(2)),
          returningCustomerRate: parseFloat(actualReturningRate.toFixed(2)),
          topProduct: {
            name: "Best Selling T-Shirt",
            unitsSold: Math.floor(orders.length * 0.15),
            revenue: parseFloat((totalRevenue * 0.15).toFixed(2))
          },
          growth: parseFloat(growth.toFixed(2)),
          previousMonthRevenue: previousMonthRevenue,
          totalUnitsSold: orders.reduce((sum, o) => sum + o.lineItems, 0),
          conversionRate: monthData.conversionRate,
          avgShippingTime: monthData.avgShippingTime,
          topCategories: [
            { name: "Apparel", revenue: totalRevenue * 0.5, percentage: 50 },
            { name: "Accessories", revenue: totalRevenue * 0.3, percentage: 30 },
            { name: "Footwear", revenue: totalRevenue * 0.2, percentage: 20 }
          ],
          recommendations: [],
          abandonedCarts: {
            count: 25,
            potentialRevenue: 1500,
            recoveryRate: 0.20
          },
          seasonalAnalysis: {
            seasonalityIndex: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
            seasonalityStrength: 0.15,
            topMonths: [],
            bottomMonths: [],
            strengthCategory: "Weak",
            seasonalRecommendations: []
          }
        }
      });

      console.log(`    Report created: $${totalRevenue.toFixed(2)} revenue, ${orders.length} orders`);
      console.log(`    Growth: ${(growth * 100).toFixed(1)}%`);

      // Run root-cause analysis for months 2+
      if (monthData.month > 11 || monthData.year > 2024) {
        console.log(`    Running root-cause analysis...`);
        const { rootCauses, deltas } = await analyzeRootCauses(
          store._id,
          monthData.month,
          monthData.year
        );

        if (rootCauses.length > 0) {
          report.rootCauses = rootCauses;
          report.deltas = deltas;
          await report.save();

          console.log(`    Root causes identified:`);
          rootCauses.forEach(cause => {
            const arrow = cause.direction === 'up' ? '↑' : '↓';
            console.log(`      ${arrow} ${cause.metric}: ${cause.changePercent.toFixed(1)}% (${cause.impact} impact)`);
          });
        }
      }

      console.log("");
    }

    console.log(" Test data generation complete!\n");
    console.log(" To view the root-cause analysis:");
    console.log("   1. Visit http://localhost:5001/auth/login");
    console.log("   2. Login with: demo@test.com / password123");
    console.log("   3. Click on 'Demo Fashion Store'");
    console.log("   4. Scroll down to see ' Why Did This Change?'\n");

    process.exit(0);
  } catch (error) {
    console.error(" Error:", error);
    process.exit(1);
  }
}

generateTestData();
