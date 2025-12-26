import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Store from "../models/Store.js";
import Order from "../models/Order.js";
import Report from "../models/Report.js";
import { computeSeasonality, getSeasonalInsights } from "../utils/seasonalAnalysis.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      dbName: "shopify_analytics",
    });
    console.log(" Connected to MongoDB (shopify_analytics database)");
  } catch (err) {
    console.error(" MongoDB connection error:", err);
    process.exit(1);
  }
};

const seed = async () => {
  await connectDB();

  console.log(" Clearing old data...");
  await User.deleteMany({});
  await Store.deleteMany({});
  await Order.deleteMany({});
  await Report.deleteMany({});
  console.log(" Old data cleared\n");

  // Create 1 user
  const user = await User.create({
    name: "Alex Johnson",
    email: "alex@shopifyanalytics.com",
    password: "12345",
  });
  console.log(` User created: ${user.name} (${user.email})`);

  const stores = [];
  const storeNames = [
    { name: "TechGear Pro", domain: "techgear-pro.myshopify.com" },
    { name: "Fashion Forward Boutique", domain: "fashion-forward.myshopify.com" },
    { name: "Home & Living Co", domain: "home-living-co.myshopify.com" },
  ];

  // Create 1-3 stores for the user
  for (let i = 0; i < 2; i++) {
    const storeData = storeNames[i];
    const store = await Store.create({
      user: user._id,
      storeName: storeData.name,
      shopifyDomain: storeData.domain,
      accessToken: `shpat_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      lastSync: new Date(),
    });

    stores.push(store);
    user.stores.push(store._id);
    console.log(`   Store created: ${store.storeName}`);

    // Create orders for the past 24 months (2 years)
    const orders = [];
    const monthlyOrders = [];

    const productNames = [
      "Wireless Bluetooth Headphones",
      "USB-C Charging Cable 6ft",
      "Laptop Stand Aluminum",
      "Mechanical Keyboard RGB",
      "Wireless Mouse Ergonomic",
      "Phone Case Silicone",
      "Screen Protector Tempered Glass",
      "Portable Power Bank 20000mAh",
      "Smart Watch Fitness Tracker",
      "Webcam HD 1080p",
    ];

    const customerFirstNames = ["John", "Sarah", "Michael", "Emma", "David", "Lisa", "James", "Emily", "Robert", "Jennifer"];
    const customerLastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];

    // Create some returning customers by pre-defining a few customer IDs
    const returningCustomerIds = [
      `gid://shopify/Customer/${100000 + i}`,
      `gid://shopify/Customer/${200000 + i}`,
      `gid://shopify/Customer/${300000 + i}`,
    ];

    // Generate orders for the past 24 months (2 years)
    for (let monthsAgo = 23; monthsAgo >= 0; monthsAgo--) {
      const orderDate = new Date();
      orderDate.setMonth(orderDate.getMonth() - monthsAgo);

      // Vary order count per month with a growth trend
      const baseOrders = 8 + Math.floor(Math.random() * 8); // 8-15 base orders
      const growthFactor = 1 + ((23 - monthsAgo) / 23) * 0.5; // 0-50% growth over 2 years
      const monthOrderCount = Math.floor(baseOrders * growthFactor);

      for (let j = 0; j < monthOrderCount; j++) {
        // Random day within the month
        const dayOfMonth = Math.floor(Math.random() * 28) + 1;
        const specificDate = new Date(orderDate.getFullYear(), orderDate.getMonth(), dayOfMonth);

        const numLineItems = Math.floor(Math.random() * 3) + 1;
        const lineItemsCount = numLineItems;

        let subtotal = 0;
        for (let k = 0; k < numLineItems; k++) {
          const price = parseFloat((Math.random() * 150 + 20).toFixed(2));
          const quantity = Math.floor(Math.random() * 2) + 1;
          subtotal += price * quantity;
        }

        const taxRate = 0.08;
        const shippingCost = parseFloat((Math.random() * 10 + 5).toFixed(2));
        const taxes = parseFloat((subtotal * taxRate).toFixed(2));
        const totalPrice = parseFloat((subtotal + taxes + shippingCost).toFixed(2));

        // 30% chance to use a returning customer ID
        let customerId;
        if (Math.random() < 0.3 && orders.length > 5) {
          customerId = returningCustomerIds[Math.floor(Math.random() * returningCustomerIds.length)];
        } else {
          customerId = `gid://shopify/Customer/${Math.floor(Math.random() * 900000) + 100000}`;
        }

        const order = await Order.create({
          store: store._id,
          orderId: `#${1000 + i * 1000 + orders.length}`,
          totalPrice: totalPrice,
          lineItems: lineItemsCount,
          customerId: customerId,
          createdAt: specificDate,
        });

        orders.push(order);
      }
    }

    console.log(`     ${orders.length} orders created for ${store.storeName} (24 months of data)`);

    // Calculate metrics for Report
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalRevenue / totalOrders;

    // Calculate returning customer rate
    const customerIds = orders.map(o => o.customerId);
    const uniqueCustomers = new Set(customerIds);
    const returningCustomers = customerIds.length - uniqueCustomers.size;
    const returningCustomerRate = uniqueCustomers.size > 0 ? returningCustomers / uniqueCustomers.size : 0;

    console.log(`     Customer metrics: ${uniqueCustomers.size} unique customers, ${returningCustomers} returning orders (${(returningCustomerRate * 100).toFixed(1)}% rate)`);

    // Calculate additional metrics for richer report
    const totalUnitsSold = orders.reduce((sum, order) => sum + order.lineItems, 0);
    const topProductName = productNames[Math.floor(Math.random() * productNames.length)];
    const topProductUnits = Math.floor(Math.random() * 50) + 20;
    const topProductRevenue = parseFloat((topProductUnits * (Math.random() * 100 + 30)).toFixed(2));

    const previousMonthRevenue = parseFloat((totalRevenue * (0.7 + Math.random() * 0.5)).toFixed(2));
    const growth = previousMonthRevenue > 0 ? parseFloat(((totalRevenue - previousMonthRevenue) / previousMonthRevenue).toFixed(2)) : 0;

    const conversionRate = parseFloat((Math.random() * 0.04 + 0.01).toFixed(3)); // 1-5%
    const avgShippingTime = parseFloat((Math.random() * 3 + 2).toFixed(1)); // 2-5 days

    const categories = ["Electronics", "Accessories", "Home & Garden", "Fashion", "Sports & Outdoors"];
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

    // Generate abandoned cart data
    const abandonedCartCount = Math.floor(Math.random() * 30) + 20; // 20-50 carts
    const abandonedCartRevenue = parseFloat((abandonedCartCount * avgOrderValue * 0.8).toFixed(2));
    const recoveryRate = 0.20; // 20% recovery rate

    // Generate smart, actionable recommendations
    const recommendations = [];

    // Abandoned cart recommendation
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

    // AOV drop recommendation
    if (growth < -0.05) {
      const bundleImpact = parseFloat((avgOrderValue * 0.15).toFixed(2));
      const topProductPair = productNames[Math.floor(Math.random() * productNames.length)];
      recommendations.push({
        type: 'warning',
        title: 'Revenue dropped - bundle opportunity detected',
        description: `Revenue is down ${Math.abs(growth * 100).toFixed(1)}% because customers buying ${topProductName} aren't adding complementary products. Create a bundle with ${topProductPair}.`,
        impact: `+$${bundleImpact.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AOV expected`,
        actionText: 'Create product bundle',
        actionUrl: '/dashboard/bundles/create',
        priority: 2
      });
    }

    // Low returning customer rate
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

    // Positive growth - reinvestment opportunity
    if (growth > 0.10) {
      const adSpendRecommendation = parseFloat((totalRevenue * 0.05).toFixed(2));
      recommendations.push({
        type: 'opportunity',
        title: 'Scale what\'s working',
        description: `You're up ${(growth * 100).toFixed(1)}% this month. Your top category (${topCategories[0].name}) is hot. Invest ${((topCategories[0].percentage / 100) * 5).toFixed(0)}% more in ads for it.`,
        impact: `${Math.floor(growth * 100 * 1.5)}% growth potential`,
        actionText: 'Increase ad spend',
        actionUrl: '/dashboard/marketing/ads',
        priority: 2
      });
    }

    // Low conversion rate
    if (conversionRate < 0.025) {
      recommendations.push({
        type: 'action',
        title: 'Conversion rate below industry average',
        description: `Your ${(conversionRate * 100).toFixed(2)}% conversion rate is below the ${(2.5).toFixed(1)}% industry average. Adding trust badges and customer reviews typically lifts conversion by 15-25%.`,
        impact: '+0.3-0.6% conversion lift',
        actionText: 'Add trust signals',
        actionUrl: '/dashboard/settings/trust-badges',
        priority: 2
      });
    }

    // Shipping time opportunity
    if (avgShippingTime > 4) {
      const fasterShippingImpact = parseFloat((totalRevenue * 0.12).toFixed(2));
      recommendations.push({
        type: 'warning',
        title: 'Slow shipping hurting conversions',
        description: `Your ${avgShippingTime}-day average shipping is ${(avgShippingTime - 3).toFixed(1)} days slower than competitors. 12% of customers abandon at checkout due to slow shipping.`,
        impact: `+$${fasterShippingImpact.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} potential revenue`,
        actionText: 'Find faster shipping',
        actionUrl: '/dashboard/settings/shipping',
        priority: 3
      });
    }

    // Sort by priority
    recommendations.sort((a, b) => a.priority - b.priority);

    // Compute seasonal analysis from order history
    const monthlySales = [];
    for (let monthsAgo = 23; monthsAgo >= 0; monthsAgo--) {
      const date = new Date();
      date.setMonth(date.getMonth() - monthsAgo);
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === date.getMonth() &&
               orderDate.getFullYear() === date.getFullYear();
      });
      monthlySales.push({
        date: date,
        units: monthOrders.reduce((sum, order) => sum + order.lineItems, 0)
      });
    }

    const seasonalAnalysis = computeSeasonality(monthlySales);
    const seasonalInsights = getSeasonalInsights(
      seasonalAnalysis.seasonalityIndex,
      seasonalAnalysis.seasonalityStrength
    );

    // Create report for this store
    const report = await Report.create({
      store: store._id,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      data: {
        revenue: parseFloat(totalRevenue.toFixed(2)),
        aov: parseFloat(avgOrderValue.toFixed(2)),
        returningCustomerRate: parseFloat(returningCustomerRate.toFixed(2)),
        topProduct: {
          name: topProductName,
          unitsSold: topProductUnits,
          revenue: topProductRevenue
        },
        growth: growth,
        previousMonthRevenue: previousMonthRevenue,
        totalUnitsSold: totalUnitsSold,
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

    console.log(`     Report created: Revenue $${report.data.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, AOV $${report.data.aov.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Growth ${(growth * 100).toFixed(1)}%`);
    console.log(`     Seasonal Strength: ${(seasonalAnalysis.seasonalityStrength * 100).toFixed(1)}% (${seasonalInsights.strengthCategory})`);
    if (seasonalInsights.topMonths.length > 0) {
      console.log(`       Best: ${seasonalInsights.topMonths[0].month} (${seasonalInsights.topMonths[0].change}%)`);
      console.log(`       Worst: ${seasonalInsights.bottomMonths[0].month} (${seasonalInsights.bottomMonths[0].change}%)`);
    }
  }

  await user.save();

  console.log("\n Seeding complete!");
  console.log(` Summary:`);
  console.log(`   - Users: 1`);
  console.log(`   - Stores: ${stores.length}`);
  console.log(`   - Password: 12345`);

  process.exit(0);
};

seed();
