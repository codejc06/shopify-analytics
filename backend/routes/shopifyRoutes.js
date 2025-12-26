import express from "express";
import shopify from "../config/shopify.js";
import Store from "../models/Store.js";
import User from "../models/User.js";
import { isAuthenticated } from "../middleware/auth.js";
import { syncShopifyStore } from "../utils/shopifySync.js";

const router = express.Router();

// Apply authentication middleware
router.use(isAuthenticated);

// GET /auth/shopify - Initiate OAuth flow
router.get("/shopify", async (req, res) => {
  try {
    const { shop } = req.query;

    if (!shop) {
      return res.status(400).send("Shop parameter is required");
    }

    // Validate shop domain format
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;

    // Store user ID in session for callback
    req.session.userId = req.user._id;

    // Generate OAuth URL
    const authRoute = await shopify.auth.begin({
      shop: shopDomain,
      callbackPath: '/auth/shopify/callback',
      isOnline: false, // Offline access token for background sync
    });

    res.redirect(authRoute);
  } catch (error) {
    console.error("Shopify OAuth initiation error:", error);
    res.status(500).send("Error initiating Shopify connection");
  }
});

// GET /auth/shopify/callback - Handle OAuth callback
router.get("/shopify/callback", async (req, res) => {
  try {
    const { shop, code, state, hmac } = req.query;

    if (!shop || !code) {
      return res.status(400).send("Missing required parameters");
    }

    // Validate and complete OAuth
    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const { session } = callback;

    if (!session || !session.accessToken) {
      return res.status(400).send("Failed to obtain access token");
    }

    // Get user ID from session
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).send("User session not found. Please log in again.");
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    console.log(`\n OAuth successful for shop: ${session.shop}`);
    console.log(`   Access Token: ${session.accessToken.substring(0, 20)}...`);
    console.log(`   Scope: ${session.scope}`);

    // Check if store already exists
    let store = await Store.findOne({ shopifyDomain: session.shop });

    if (store) {
      // Update existing store
      store.accessToken = session.accessToken;
      store.scope = session.scope;
      store.lastSync = new Date();
      await store.save();
      console.log(`    Updated existing store: ${store.storeName}`);
    } else {
      // Create new store
      const storeName = session.shop.replace('.myshopify.com', '');
      store = await Store.create({
        user: userId,
        storeName: storeName.charAt(0).toUpperCase() + storeName.slice(1),
        shopifyDomain: session.shop,
        accessToken: session.accessToken,
        scope: session.scope,
        lastSync: new Date(),
      });

      // Add store to user's stores array
      user.stores.push(store._id);
      await user.save();

      console.log(`    Created new store: ${store.storeName}`);
    }

    // Perform initial sync
    console.log(`\n Starting initial sync for ${store.storeName}...`);
    try {
      await syncShopifyStore(session, store._id);
      console.log(` Initial sync completed for ${store.storeName}\n`);
    } catch (syncError) {
      console.error(` Sync failed for ${store.storeName}:`, syncError.message);
      // Continue even if sync fails - user can retry later
    }

    // Redirect to store analytics page
    res.redirect(`/dashboard/${store._id}`);
  } catch (error) {
    console.error("Shopify OAuth callback error:", error);
    res.status(500).send(`Error completing Shopify connection: ${error.message}`);
  }
});

export default router;
