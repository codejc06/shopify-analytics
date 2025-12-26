import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    storeName: { type: String, required: true },
    shopifyDomain: { type: String, required: true, unique: true },
    accessToken: { type: String },
    scope: { type: String },
    lastSync: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("Store", storeSchema);

