import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Store from "../models/Store.js";
import Order from "../models/Order.js";
import Report from "../models/Report.js";

async function checkDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected\n");

    const stores = await Store.find({}).populate('user');
    const orders = await Order.find({});
    const reports = await Report.find({});

    console.log(`Database Summary:`);
    console.log(`   Stores: ${stores.length}`);
    console.log(`   Orders: ${orders.length}`);
    console.log(`   Reports: ${reports.length}`);

    if (stores.length > 0) {
      console.log(`\nStores:`);
      stores.forEach(s => {
        console.log(`   - ${s.storeName} (${s.shopifyDomain})`);
        console.log(`     Owner: ${s.user.name} (${s.user.email})`);
      });
    }

    if (reports.length > 0) {
      console.log(`\nReports:`);
      reports.forEach(r => {
        console.log(`   - ${r.month}/${r.year}: Revenue $${r.data.revenue.toFixed(2)}`);
        if (r.rootCauses && r.rootCauses.length > 0) {
          console.log(`     Root Causes: ${r.rootCauses.length} identified`);
        } else {
          console.log(`     Root Causes: Not yet analyzed`);
        }
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkDatabase();
