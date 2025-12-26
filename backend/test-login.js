import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

async function testLogin() {
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: "shopify_analytics",
  });

  console.log("Connected to MongoDB");

  // Test user
  const email = "john@example.com";
  const password = "12345";

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    console.log(" User not found");
    process.exit(1);
  }

  console.log(" User found:", user.email);
  console.log("Hashed password in DB:", user.password);

  // Test password comparison
  const isMatch = await user.comparePassword(password);

  if (isMatch) {
    console.log(" Password matches! Login would succeed.");
  } else {
    console.log(" Password does NOT match. Login would fail.");
  }

  process.exit(0);
}

testLogin();
