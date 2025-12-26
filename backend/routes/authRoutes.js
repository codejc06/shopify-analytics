import express from "express";
import passport from "passport";
import User from "../models/User.js";

const router = express.Router();

// GET /auth/login - Show login page
router.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }
  res.render("login", {
    title: "Login - Shopify Analytics",
    error: req.flash("error"),
  });
});

// POST /auth/login - Handle login
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/auth/login",
    failureFlash: true,
  })
);

// GET /auth/register - Show registration page
router.get("/register", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }
  res.render("register", {
    title: "Register - Shopify Analytics",
    error: req.flash("error"),
  });
});

// POST /auth/register - Handle registration
router.post("/register", async (req, res) => {
  console.log("Registration attempt:", req.body);
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      console.log("Validation failed: Missing fields");
      req.flash("error", "All fields are required");
      return res.redirect("/auth/register");
    }

    if (password !== confirmPassword) {
      console.log("Validation failed: Passwords don't match");
      req.flash("error", "Passwords do not match");
      return res.redirect("/auth/register");
    }

    if (password.length < 6) {
      console.log("Validation failed: Password too short");
      req.flash("error", "Password must be at least 6 characters");
      return res.redirect("/auth/register");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log("Validation failed: Email already exists");
      req.flash("error", "Email already registered");
      return res.redirect("/auth/register");
    }

    console.log("Creating new user...");
    // Create new user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
    });

    console.log("User created successfully:", user._id);

    // Log the user in after registration
    req.login(user, (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        req.flash("error", "Registration successful but login failed. Please login manually.");
        return res.redirect("/auth/login");
      }
      console.log("User logged in successfully, redirecting to dashboard");
      res.redirect("/dashboard");
    });
  } catch (error) {
    console.error("Registration error:", error);
    req.flash("error", "Registration failed. Please try again.");
    res.redirect("/auth/register");
  }
});

// GET /auth/logout - Handle logout
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/auth/login");
  });
});

// GET /auth/google - Initiate Google OAuth
router.get("/google", passport.authenticate("google", {
  scope: ["profile", "email"],
}));

// GET /auth/google/callback - Handle Google OAuth callback
router.get("/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/login",
    failureFlash: true,
  }),
  (req, res) => {
    // Successful authentication, redirect to dashboard
    res.redirect("/dashboard");
  }
);

export default router;
