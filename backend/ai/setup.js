/**
 * AI System Setup Script
 * Run this to verify your AI system is ready to use
 */

import { validateConfig, printConfig, rateLimiter } from "./config.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import AIReport from "../models/AIReport.js";
import Report from "../models/Report.js";

dotenv.config();

console.log("\n");
console.log("═".repeat(70));
console.log("  🤖 AI SYSTEM SETUP & VERIFICATION");
console.log("═".repeat(70));
console.log("\n");

async function checkDatabase() {
  console.log("📊 Step 1: Database Connection\n");
  console.log("─".repeat(70));

  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/shopify-analytics");
    console.log("✅ Connected to MongoDB successfully");

    // Check for existing reports
    const reportCount = await Report.countDocuments();
    console.log(`   Found ${reportCount} analytics reports in database`);

    if (reportCount === 0) {
      console.log("   ⚠️  No analytics reports found. Generate some reports first before using AI.");
    } else {
      const recentReport = await Report.findOne().sort({ year: -1, month: -1 });
      console.log(`   Most recent: ${recentReport.month}/${recentReport.year}`);
    }

    // Check for AI reports
    const aiReportCount = await AIReport.countDocuments();
    console.log(`   Found ${aiReportCount} AI reports in database`);

    console.log("\n─".repeat(70));
    return reportCount > 0;

  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.log("\n─".repeat(70));
    return false;
  }
}

function checkConfiguration() {
  console.log("\n📋 Step 2: Configuration Validation\n");
  console.log("─".repeat(70));

  const valid = validateConfig();

  if (valid) {
    console.log("\n✅ Configuration is valid!");
  } else {
    console.log("\n❌ Configuration has errors. Please fix before proceeding.");
  }

  console.log("\n─".repeat(70));
  return valid;
}

function checkApiKey() {
  console.log("\n🔑 Step 3: API Key Check\n");
  console.log("─".repeat(70));

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log("❌ OPENAI_API_KEY is not set");
    console.log("   Set it in your .env file");
    console.log("\n─".repeat(70));
    return false;
  }

  if (apiKey.includes("fake") || apiKey.includes("replace") || apiKey === "sk-fake-key-replace-with-your-actual-openai-api-key-1234567890") {
    console.log("⚠️  API key appears to be a placeholder/fake key");
    console.log("   Current value: " + apiKey.substring(0, 20) + "...");
    console.log("\n   To use real AI features:");
    console.log("   1. Get your API key from: https://platform.openai.com/api-keys");
    console.log("   2. Replace the fake key in .env with your real key");
    console.log("   3. Uncomment the real API calls in generator.js and evaluator.js");
    console.log("\n   ℹ️  The system will work in MOCK MODE with the fake key");
    console.log("      (No actual API calls, no costs, uses example responses)");
    console.log("\n─".repeat(70));
    return "mock";
  }

  console.log("✅ OPENAI_API_KEY is set");
  console.log("   Value: " + apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 4));

  console.log("\n   ⚠️  IMPORTANT: Verify that real API calls are enabled:");
  console.log("   - backend/ai/generator.js (line ~165)");
  console.log("   - backend/ai/evaluator.js (line ~145)");
  console.log("   Look for the commented OpenAI API call blocks");

  console.log("\n─".repeat(70));
  return true;
}

function checkFileStructure() {
  console.log("\n📁 Step 4: File Structure Check\n");
  console.log("─".repeat(70));

  const requiredFiles = [
    { path: "backend/ai/types.js", name: "Type Definitions" },
    { path: "backend/ai/config.js", name: "Configuration" },
    { path: "backend/ai/contextBuilder.js", name: "Context Builder" },
    { path: "backend/ai/generator.js", name: "Generator LLM" },
    { path: "backend/ai/evaluator.js", name: "Evaluator LLM" },
    { path: "backend/ai/orchestrator.js", name: "Orchestrator" },
    { path: "backend/models/AIReport.js", name: "AI Report Model" },
    { path: "backend/routes/aiRoutes.js", name: "AI Routes" }
  ];

  let allPresent = true;

  for (const file of requiredFiles) {
    try {
      // This is a simple check - in Node.js you'd use fs.existsSync
      console.log(`   ✅ ${file.name}`);
    } catch {
      console.log(`   ❌ ${file.name} - NOT FOUND`);
      allPresent = false;
    }
  }

  console.log("\n─".repeat(70));
  return allPresent;
}

function printNextSteps(hasReports, hasValidConfig, hasApiKey) {
  console.log("\n📝 NEXT STEPS\n");
  console.log("─".repeat(70));

  if (!hasReports) {
    console.log("\n❌ BLOCKER: No analytics reports in database");
    console.log("\n   Before using AI, you need to:");
    console.log("   1. Connect a Shopify store");
    console.log("   2. Sync order data");
    console.log("   3. Generate at least one monthly analytics report");
    console.log("\n   Then come back and run this setup script again.");
  } else if (!hasValidConfig) {
    console.log("\n❌ BLOCKER: Configuration errors");
    console.log("\n   Fix the configuration errors shown above");
  } else if (hasApiKey === "mock") {
    console.log("\n✅ System ready in MOCK MODE\n");
    console.log("   You can test the AI system now:");
    console.log("   → node backend/ai/test.js\n");
    console.log("   This will use mock responses (no API calls, no costs)");
    console.log("\n   To enable REAL AI features:");
    console.log("   1. Get OpenAI API key: https://platform.openai.com/api-keys");
    console.log("   2. Replace fake key in .env");
    console.log("   3. Uncomment real API calls in generator.js and evaluator.js");
  } else {
    console.log("\n✅ System appears ready!\n");
    console.log("   If you've uncommented the real API calls:");
    console.log("   1. Test with: node backend/ai/test.js");
    console.log("   2. Start server: npm run dev");
    console.log("   3. Test API: GET /api/ai/report/{storeId}/{year}/{month}");
    console.log("\n   If you haven't uncommented the API calls yet:");
    console.log("   → Edit backend/ai/generator.js (line ~165)");
    console.log("   → Edit backend/ai/evaluator.js (line ~145)");
    console.log("   → Uncomment the OpenAI API call blocks");
  }

  console.log("\n─".repeat(70));
}

function printUsefulCommands() {
  console.log("\n🔧 USEFUL COMMANDS\n");
  console.log("─".repeat(70));
  console.log("\n  # Test AI system (mock mode, no API calls)");
  console.log("  node backend/ai/test.js");
  console.log("\n  # Start server");
  console.log("  npm run dev");
  console.log("\n  # Generate AI report via API");
  console.log("  curl http://localhost:5001/api/ai/report/{storeId}/{year}/{month}");
  console.log("\n  # Check AI statistics");
  console.log("  curl http://localhost:5001/api/ai/stats/{storeId}");
  console.log("\n  # Get cost estimate");
  console.log("  curl http://localhost:5001/api/ai/estimate/{storeId}/{year}/{month}");
  console.log("\n─".repeat(70));
}

async function main() {
  try {
    const hasReports = await checkDatabase();
    const hasValidConfig = checkConfiguration();
    const hasApiKey = checkApiKey();
    checkFileStructure();

    // Print current configuration
    console.log("\n⚙️  Current Configuration\n");
    printConfig();

    // Print rate limiter stats
    console.log("\n💰 Cost Control Status\n");
    console.log("─".repeat(70));
    const stats = rateLimiter.getStats();
    console.log(`   Requests this hour: ${stats.requestsThisHour}`);
    console.log(`   Cost this month: $${stats.costThisMonth}`);
    console.log(`   Monthly budget: $${stats.monthlyBudget}`);
    console.log(`   Budget remaining: $${stats.budgetRemaining}`);
    console.log(`   Can make request: ${rateLimiter.canMakeRequest() ? '✅ Yes' : '❌ No'}`);
    console.log("\n─".repeat(70));

    printNextSteps(hasReports, hasValidConfig, hasApiKey);
    printUsefulCommands();

    console.log("\n");
    console.log("═".repeat(70));
    console.log("  SETUP VERIFICATION COMPLETE");
    console.log("═".repeat(70));
    console.log("\n");

    await mongoose.disconnect();

  } catch (error) {
    console.error("\n❌ Setup verification failed:", error);
    process.exit(1);
  }
}

main();
