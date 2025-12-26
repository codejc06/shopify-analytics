import express from "express";
import Store from "../models/Store.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Report from "../models/Report.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Apply authentication middleware to all dashboard routes
router.use(isAuthenticated);

// GET /dashboard - Show all connected shops for the logged-in user
router.get("/", async (req, res) => {
  try {
    const currentUser = req.user;
    const userStores = await Store.find({ user: req.user._id }).populate("user");

    const storesWithStats = await Promise.all(
      userStores.map(async (store) => {
        const orderCount = await Order.countDocuments({ store: store._id });
        const orders = await Order.find({ store: store._id });
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

        return {
          ...store.toObject(),
          user: store.user,
          orderCount,
          totalRevenue: totalRevenue.toFixed(2),
        };
      })
    );

    res.render("dashboard", {
      title: "My Dashboard",
      user: currentUser,
      stores: storesWithStats,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).send("Error loading dashboard");
  }
});

// GET /dashboard/add - Show form to add new Shopify store
router.get("/add", async (req, res) => {
  try {
    res.render("add-store", {
      title: "Add New Store",
      user: req.user,
    });
  } catch (error) {
    console.error("Add store page error:", error);
    res.status(500).send("Error loading add store page");
  }
});

// POST /dashboard/add - Create new store for logged-in user
router.post("/add", async (req, res) => {
  try {
    const { storeName, shopifyDomain, accessToken } = req.body;

    const store = await Store.create({
      user: req.user._id,
      storeName,
      shopifyDomain,
      accessToken,
      lastSync: new Date(),
    });

    const user = await User.findById(req.user._id);
    user.stores.push(store._id);
    await user.save();

    req.flash("success", "Store added successfully!");
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Add store error:", error);
    req.flash("error", "Error adding store. Please try again.");
    res.redirect("/dashboard/add");
  }
});

// GET /dashboard/ads - Show ads management page
router.get("/ads", async (req, res) => {
  try {
    const userStores = await Store.find({ user: req.user._id });

    res.render("ads", {
      title: "Ad Campaign Manager",
      user: req.user,
      stores: userStores,
    });
  } catch (error) {
    console.error("Ads page error:", error);
    res.status(500).send("Error loading ads page");
  }
});

// DELETE /dashboard/:id - Delete a store
router.delete("/:id", async (req, res) => {
  try {
    const storeId = req.params.id;
    const store = await Store.findById(storeId);

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Verify the store belongs to the logged-in user
    if (store.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You don't have permission to delete this store" });
    }

    // Delete all associated data
    await Order.deleteMany({ store: storeId });
    await Report.deleteMany({ store: storeId });
    await Store.findByIdAndDelete(storeId);

    // Remove store reference from user
    const user = await User.findById(req.user._id);
    user.stores = user.stores.filter(id => id.toString() !== storeId);
    await user.save();

    console.log(`Deleted store ${store.storeName} and all associated data`);
    res.json({ success: true, message: "Store deleted successfully" });
  } catch (error) {
    console.error("Delete store error:", error);
    res.status(500).json({ error: "Error deleting store" });
  }
});

// GET /dashboard/:id - Show specific store analytics
router.get("/:id", async (req, res) => {
  try {
    const storeId = req.params.id;
    const store = await Store.findById(storeId).populate("user");

    if (!store) {
      return res.status(404).send("Store not found");
    }

    const orders = await Order.find({ store: storeId }).sort({ createdAt: -1 });

    // Get month from query parameter, default to October (latest month with data)
    const selectedMonth = req.query.month ? parseInt(req.query.month) : 10;
    const selectedYear = 2024; // For now, we're using 2024 data

    const report = await Report.findOne({
      store: storeId,
      month: selectedMonth,
      year: selectedYear
    });

    console.log(`Fetching report for store ${storeId}, month ${selectedMonth}, year ${selectedYear}`);
    console.log(`Report found:`, report ? 'YES' : 'NO');

    // Calculate analytics
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Group orders by month
    const ordersByMonth = orders.reduce((acc, order) => {
      const month = new Date(order.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = { count: 0, revenue: 0 };
      }
      acc[month].count++;
      acc[month].revenue += order.totalPrice;
      return acc;
    }, {});

    res.render("store-analytics", {
      title: `${store.storeName} - Analytics`,
      user: req.user,
      store,
      orders: orders.slice(0, 20), // Show latest 20 orders
      totalOrders: orders.length,
      totalRevenue: totalRevenue.toFixed(2),
      avgOrderValue: avgOrderValue.toFixed(2),
      ordersByMonth,
      report,
    });
  } catch (error) {
    console.error("Store analytics error:", error);
    res.status(500).send("Error loading store analytics");
  }
});

export default router;
