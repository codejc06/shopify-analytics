import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import MongoStore from "connect-mongo";
import flash from "connect-flash";
import passportConfig from "../config/passport.js";
import dashboardRoutes from "../routes/dashboardRoutes.js";
import authRoutes from "../routes/authRoutes.js";
import shopifyRoutes from "../routes/shopifyRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Set EJS as view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../../views"));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../../public")));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "shopify-analytics-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      dbName: "shopify_analytics",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  })
);

// Flash messages
app.use(flash());

// Passport initialization
app.use(passportConfig.initialize());
app.use(passportConfig.session());

// Make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

// Health check
app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect("/dashboard");
  } else {
    res.redirect("/auth/login");
  }
});

// Routes
// Auth Routes
app.use("/auth", authRoutes);

// Shopify OAuth Routes (protected)
app.use("/auth", shopifyRoutes);

// Dashboard Routes (protected)
app.use("/dashboard", dashboardRoutes);

// Connect to MongoDB
async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "shopify_analytics",
    });

    console.log("MongoDB connected");

    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

start();
