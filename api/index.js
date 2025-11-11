
const express = require("express");
const SearchBasic = require("./search/basic.js");
const SearchAdvanced = require("./search/advanced.js");

const router = express.Router();

// Import proxy methods state from parent
let proxyMethods = { basic: true, advanced: true };

// Middleware to check if method is enabled
router.use((req, res, next) => {
  // Re-import state from index.js on each request
  try {
    const mainApp = require("../index.js");
    if (mainApp.proxyMethods) {
      proxyMethods = mainApp.proxyMethods;
    }
  } catch (e) {
    // Fallback if can't access parent state
  }
  next();
});

// Basic proxy endpoint
router.get("/basic", async (req, res) => {
  if (!proxyMethods.basic) {
    return res.status(503).json({ error: "Basic proxy method is currently disabled" });
  }
  
  try {
    const { url, engine } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: "URL parameter is required" });
    }
    
    const result = await SearchBasic.basic(url, engine);
    
    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    
    res.status(result.status).send(result.body);
  } catch (error) {
    console.error("Basic proxy error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Advanced proxy endpoint
router.get("/advanced", async (req, res) => {
  if (!proxyMethods.advanced) {
    return res.status(503).json({ error: "Advanced proxy method is currently disabled" });
  }
  
  try {
    const { url, engine } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: "URL parameter is required" });
    }
    
    const result = await SearchAdvanced.advanced(url, engine);
    
    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error });
    }
    
    res.status(result.status).send(result.body);
  } catch (error) {
    console.error("Advanced proxy error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
