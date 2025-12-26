import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Report from "../models/Report.js";

async function checkRootCauses() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(" MongoDB connected\n");

    const reports = await Report.find({}).sort({ year: 1, month: 1 });
    console.log(` Total Reports: ${reports.length}\n`);

    let withRootCauses = 0;
    let withoutRootCauses = 0;

    reports.slice(0, 10).forEach(r => {
      const hasRootCauses = r.rootCauses && r.rootCauses.length > 0;
      console.log(`${r.month}/${r.year}:`);
      console.log(`  Revenue: $${r.data.revenue}`);
      console.log(`  Root Causes: ${hasRootCauses ? r.rootCauses.length : 'NONE'}`);

      if (hasRootCauses) {
        withRootCauses++;
        r.rootCauses.forEach(cause => {
          console.log(`    - ${cause.metric}: ${cause.direction === 'up' ? '↑' : '↓'} ${Math.abs(cause.changePercent).toFixed(1)}%`);
        });
      } else {
        withoutRootCauses++;
      }
      console.log('');
    });

    console.log(`Summary: ${withRootCauses} with root causes, ${withoutRootCauses} without\n`);

    process.exit(0);
  } catch (error) {
    console.error(" Error:", error);
    process.exit(1);
  }
}

checkRootCauses();
