import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true
    },

    orderId: { type: String, required: true },
    totalPrice: { type: Number, required: true },
    lineItems: { type: Number, required: true },
    customerId: { type: String },

    createdAt: { type: Date, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);

