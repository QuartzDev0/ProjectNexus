const SearchAPI = require("./api")

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

const proxyRouter = require("./api");
const gamesRouter = express.Router();
const appsRouter = express.Router();

const app = express();
const PORT = 80;

// ─────────────────────────────
// Config & State
// ─────────────────────────────
let DEV_MODE = false;
const DEV_KEYS = [
  "ujud[TP,aDF]boE#+{<sD:u3?0p3-+8[POfLG?M32Z22L6s",
];
const adminSessions = {};
const blockedIPs = new Set();
const blockedDomains = new Set();
const requestLogs = [];
const securityEvents = [];
const analyticsData = {
  totalRequests: 0,
  siteVisits: {},
  geoData: {},
  bandwidth: { total: 0, month: 0 }
};
let rateLimit = 60;
let proxyMethods = { basic: true, advanced: true };
const serverStartTime = Date.now();

// ─────────────────────────────
// Middleware
// ─────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "web")));

app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (blockedIPs.has(clientIP)) {
    securityEvents.push({
      timestamp: new Date().toISOString(),
      message: `Blocked IP attempt: ${clientIP}`,
      severity: 'warning'
    });
    return res.status(403).sendFile(path.join(__dirname, "web/server/403.html"));
  }
  next();
});

app.use((req, res, next) => {
  analyticsData.totalRequests++;
  
  requestLogs.push({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `${req.method} ${req.path} - ${req.ip}`,
    ip: req.ip,
    path: req.path,
    method: req.method
  });
  
  if (requestLogs.length > 1000) {
    requestLogs.shift();
  }
  
  next();
});

// Maintenance mode middleware
app.use((req, res, next) => {
  if (DEV_MODE && !req.path.startsWith("/api/auth") && !req.path.startsWith("/api/admin")) {
    return res
      .status(503)
      .sendFile(path.join(__dirname, "web/server/503.html"));
  }
  next();
});

// ─────────────────────────────
// Admin Authentication
// ─────────────────────────────
app.post("/api/auth/admin", (req, res) => {
  const key = req.headers["x-nexus-admin"];
  if (!key || !DEV_KEYS.includes(key)) {
    return res
      .status(403)
      .json({ success: false, error: "Invalid admin key." });
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  adminSessions[sessionToken] = {
    createdAt: Date.now(),
    ip: req.ip,
  };

  res.cookie("nexus_admin", sessionToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
  });

  return res.json({ success: true, message: "Admin authenticated." });
});

app.get("/api/auth/sso", (req, res) => {
  const key = req.query.key;
  
  if (!key || !DEV_KEYS.includes(key)) {
    return res.status(403).send(`
      <html>
        <head>
          <title>Invalid SSO Key</title>
          <link rel="stylesheet" href="/css/index.css" />
          <style>
            body {
              font-family: 'Montserrat', sans-serif;
              background: #0d0d0d;
              color: #f1f1f1;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .error {
              text-align: center;
              padding: 40px;
              background: rgba(239, 68, 68, 0.1);
              border: 2px solid #ef4444;
              border-radius: 12px;
              max-width: 500px;
            }
            .error h1 {
              font-size: 2rem;
              margin-bottom: 16px;
            }
            .error p {
              color: #b3b3b3;
              margin-bottom: 24px;
            }
            .btn {
              padding: 12px 24px;
              background: #ef4444;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              display: inline-block;
              transition: background 0.2s;
            }
            .btn:hover {
              background: #dc2626;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>🚫 Invalid SSO Key</h1>
            <p>The SSO authentication key is invalid or has expired.</p>
            <a href="/admin/login" class="btn">Go to Login Page</a>
          </div>
        </body>
      </html>
    `);
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  adminSessions[sessionToken] = {
    createdAt: Date.now(),
    ip: req.ip,
  };

  res.cookie("nexus_admin", sessionToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
  });

  securityEvents.push({
    timestamp: new Date().toISOString(),
    message: `SSO login from ${req.ip}`,
    severity: 'info'
  });

  res.send(`
    <html>
      <head>
        <title>SSO Login Success</title>
        <meta http-equiv="refresh" content="1;url=/admin">
        <style>
          body {
            font-family: 'Montserrat', sans-serif;
            background: #0d0d0d;
            color: #f1f1f1;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .success {
            text-align: center;
            padding: 40px;
            background: rgba(76, 175, 80, 0.1);
            border: 2px solid #4CAF50;
            border-radius: 12px;
          }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>✅ SSO Authentication Successful</h1>
          <p>Redirecting to admin panel...</p>
        </div>
      </body>
    </html>
  `);
});

// Verify admin session
function verifyAdmin(req, res, next) {
  const token = req.cookies.nexus_admin;
  if (!token || !adminSessions[token]) {
    return res.status(401).json({ success: false, error: "Not authorized." });
  }
  next();
}

// ─────────────────────────────
// Admin Panel Actions
// ─────────────────────────────
app.post("/api/admin/toggle-dev", verifyAdmin, (req, res) => {
  DEV_MODE = !DEV_MODE;
  console.log(`⚙️ DEV_MODE set to: ${DEV_MODE}`);
  res.json({
    success: true,
    message: `Developer mode ${DEV_MODE ? "enabled" : "disabled"}.`,
  });
});

app.post("/api/admin/logout", verifyAdmin, (req, res) => {
  const token = req.cookies.nexus_admin;
  if (token) delete adminSessions[token];
  res.clearCookie("nexus_admin");
  res.json({ success: true, message: "Session terminated." });
});

app.get("/api/admin/stats", verifyAdmin, (req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  res.json({
    success: true,
    stats: {
      activeSessions: Object.keys(adminSessions).length,
      totalRequests: analyticsData.totalRequests,
      blockedIPs: blockedIPs.size,
      uptime
    }
  });
});

app.get("/api/admin/status", verifyAdmin, (req, res) => {
  res.json({
    success: true,
    maintenanceMode: DEV_MODE,
    proxyMethods
  });
});

app.post("/api/admin/toggle-maintenance", verifyAdmin, (req, res) => {
  DEV_MODE = !DEV_MODE;
  console.log(`⚙️ DEV_MODE set to: ${DEV_MODE}`);
  res.json({
    success: true,
    message: `Maintenance mode ${DEV_MODE ? "enabled" : "disabled"}.`,
  });
});

app.post("/api/admin/clear-cache", verifyAdmin, (req, res) => {
  res.json({ success: true, message: "Cache cleared successfully." });
});

app.post("/api/admin/clear-logs", verifyAdmin, (req, res) => {
  requestLogs.length = 0;
  securityEvents.length = 0;
  res.json({ success: true, message: "All logs cleared." });
});

app.post("/api/admin/update-methods", verifyAdmin, (req, res) => {
  const { basic, advanced } = req.body;
  proxyMethods = { basic: !!basic, advanced: !!advanced };
  res.json({ success: true, message: "Proxy methods updated." });
});

app.post("/api/admin/update-rate-limit", verifyAdmin, (req, res) => {
  const { limit } = req.body;
  if (limit && limit > 0) {
    rateLimit = limit;
    res.json({ success: true, message: `Rate limit set to ${limit} req/min.` });
  } else {
    res.json({ success: false, error: "Invalid rate limit." });
  }
});

app.post("/api/admin/block-ip", verifyAdmin, (req, res) => {
  const { ip } = req.body;
  if (!ip) {
    return res.json({ success: false, error: "IP address required." });
  }
  blockedIPs.add(ip);
  securityEvents.push({
    timestamp: new Date().toISOString(),
    message: `IP blocked: ${ip}`,
    severity: 'info'
  });
  res.json({ success: true, message: `IP ${ip} blocked.` });
});

app.post("/api/admin/unblock-ip", verifyAdmin, (req, res) => {
  const { ip } = req.body;
  blockedIPs.delete(ip);
  res.json({ success: true, message: `IP ${ip} unblocked.` });
});

app.get("/api/admin/blocked-ips", verifyAdmin, (req, res) => {
  res.json({ success: true, ips: Array.from(blockedIPs) });
});

app.post("/api/admin/block-domain", verifyAdmin, (req, res) => {
  const { domain } = req.body;
  if (!domain) {
    return res.json({ success: false, error: "Domain required." });
  }
  blockedDomains.add(domain);
  res.json({ success: true, message: `Domain ${domain} blocked.` });
});

app.post("/api/admin/unblock-domain", verifyAdmin, (req, res) => {
  const { domain } = req.body;
  blockedDomains.delete(domain);
  res.json({ success: true, message: `Domain ${domain} unblocked.` });
});

app.get("/api/admin/blocked-domains", verifyAdmin, (req, res) => {
  res.json({ success: true, domains: Array.from(blockedDomains) });
});

app.get("/api/admin/analytics", verifyAdmin, (req, res) => {
  const topSites = Object.entries(analyticsData.siteVisits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([url, count]) => ({ url, count }));

  const geoStats = Object.entries(analyticsData.geoData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([country, count]) => ({ country, count }));

  res.json({
    success: true,
    topSites,
    geoStats,
    bandwidth: analyticsData.bandwidth
  });
});

app.get("/api/admin/logs", verifyAdmin, (req, res) => {
  const { level, search } = req.query;
  let logs = requestLogs;

  if (level && level !== 'all') {
    logs = logs.filter(log => log.level === level);
  }

  if (search) {
    logs = logs.filter(log => 
      log.message.toLowerCase().includes(search.toLowerCase())
    );
  }

  res.json({ success: true, logs: logs.slice(-100).reverse() });
});

app.get("/api/admin/security-events", verifyAdmin, (req, res) => {
  res.json({ 
    success: true, 
    events: securityEvents.slice(-50).reverse() 
  });
});

// ─────────────────────────────
// Proxy Routes
// ─────────────────────────────
app.use("/api/proxy");

// ─────────────────────────────
// Page Routes
// ─────────────────────────────
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "web/html/index.html"))
);
app.get("/nav/games", (_, res) =>
  res.sendFile(path.join(__dirname, "web/html/games.html"))
);
app.get("/nav/apps", (_, res) =>
  res.sendFile(path.join(__dirname, "web/html/apps.html"))
);

app.get("/admin/login", (_, res) =>
  res.sendFile(path.join(__dirname, "web/html/admin-login.html"))
);

app.get("/admin", verifyAdmin, (_, res) =>
  res.sendFile(path.join(__dirname, "web/server/admin.html"))
);

// ─────────────────────────────
// Testing Routes [for error pages]
// ─────────────────────────────
app.get("/error/404", (_, res) =>
  res.sendFile(path.join(__dirname, "web/server/404.html"))
);
app.get("/error/503", (_, res) =>
  res.sendFile(path.join(__dirname, "web/server/503.html"))
);
app.get("/error/500", (_, res) =>
  res.sendFile(path.join(__dirname, "web/server/500.html"))
);
app.get("/error/403", (_, res) =>
  res.status(403).sendFile(path.join(__dirname, "web/server/403.html"))
);

// Error Routes
app.use((req, res) =>
  res.status(404).sendFile(path.join(__dirname, "web/server/404.html"))
);

app.use((err, req, res, next) => {
  console.error("Internal Server Error:", err.stack);
  res.status(500).sendFile(path.join(__dirname, "web/server/500.html"));
});

// ─────────────────────────────
// Server Deployment Methods
// ─────────────────────────────
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () =>
    console.log(`🚀 Project: Nexus running on port ${PORT}`)
  );
}