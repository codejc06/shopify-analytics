import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/User.js";
import Store from "../models/Store.js";

async function transferStore() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(" MongoDB connected\n");

    const users = await User.find({});
    console.log("Total users:", users.length);
    users.forEach(u => {
      console.log("- ", u.email, "| Provider:", u.authProvider || "local", "| Stores:", u.stores.length);
    });

    // Find the latest user
    const latestUser = await User.findOne({}).sort({ createdAt: -1 });
    const demoStore = await Store.findOne({ storeName: "Demo Fashion Store" });

    if (latestUser && demoStore) {
      console.log("\n Transferring store to:", latestUser.email);
      demoStore.user = latestUser._id;
      await demoStore.save();

      if (!latestUser.stores.includes(demoStore._id)) {
        latestUser.stores.push(demoStore._id);
        await latestUser.save();
      }
      console.log(" Done! Visit: http://localhost:5001/dashboard");
    }

    process.exit(0);
  } catch (error) {
    console.error(" Error:", error);
    process.exit(1);
  }
}

transferStore();
