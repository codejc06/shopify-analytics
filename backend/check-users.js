import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

async function checkUsers() {
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: "shopify_analytics",
  });

  console.log("Connected to MongoDB");

  const users = await User.find();

  console.log(`\nFound ${users.length} users in database:\n`);

  users.forEach(user => {
    console.log(`- ${user.name} (${user.email})`);
  });

  if (users.length === 0) {
    console.log("\n No users found! The seeding may have failed or used a different database.");
  }

  process.exit(0);
}

checkUsers();
