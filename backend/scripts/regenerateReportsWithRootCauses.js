/**
 * Script to regenerate all existing reports with root-cause analysis
 *
 * Run with: node backend/scripts/regenerateReportsWithRootCauses.js
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Report from "../models/Report.js";
import { analyzeRootCauses } from "../utils/rootCauseEngine.js";

async function regenerateAllReports() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log(" MongoDB connected");

    // Get all reports
    const reports = await Report.find({}).sort({ year: 1, month: 1 });
    console.log(` Found ${reports.length} reports to analyze`);

    let updated = 0;
    let skipped = 0;

    for (const report of reports) {
      try {
        console.log(`\n Analyzing ${report.store} - ${report.month}/${report.year}`);

        const { rootCauses, deltas } = await analyzeRootCauses(
          report.store,
          report.month,
          report.year
        );

        if (rootCauses.length > 0) {
          report.rootCauses = rootCauses;
          report.deltas = deltas;
          await report.save();

          console.log(`    Updated with ${rootCauses.length} root causes:`);
          rootCauses.forEach(cause => {
            console.log(`      - ${cause.metric}: ${cause.direction === 'up' ? '↑' : '↓'} ${Math.abs(cause.changePercent).toFixed(1)}% (${cause.impact} impact)`);
          });
          updated++;
        } else {
          console.log(`   ⏭  Skipped (first month or no previous data)`);
          skipped++;
        }
      } catch (error) {
        console.error(`    Error analyzing report ${report._id}:`, error.message);
      }
    }

    console.log(`\n Summary:`);
    console.log(`    Updated: ${updated} reports`);
    console.log(`   ⏭  Skipped: ${skipped} reports`);
    console.log(`    Total: ${reports.length} reports`);

    process.exit(0);
  } catch (error) {
    console.error(" Error:", error);
    process.exit(1);
  }
}

regenerateAllReports();
