require("dotenv").config();

async function slackAlert(msg) {
  try {
    const https = require('https');
    if (!process.env.SLACK_WEBHOOK_URL) return;
    const url = new URL(process.env.SLACK_WEBHOOK_URL);
    const req = https.request({
      hostname: url.hostname, path: url.pathname,
      method: 'POST', headers: { 'Content-Type': 'application/json' }
    });
    req.write(JSON.stringify({ text: msg }));
    req.end();
  } catch(e) {}
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./config/db");

function validateRuntimeConfig() {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.DB_URL;
  const missing = [];

  if (!mongoUri) missing.push("DB_URL or MONGODB_URI");
  if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const weakJwtSecret =
    process.env.JWT_SECRET === "replace_with_a_long_random_secret" ||
    process.env.JWT_SECRET.length < 32;

  if (process.env.NODE_ENV === "production" && weakJwtSecret) {
    throw new Error("JWT_SECRET must be a long random production secret.");
  }

  if (weakJwtSecret) {
    console.warn("[Config] JWT_SECRET is short. Use a 32+ character random secret in production.");
  }

  if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL) {
    console.warn("[Config] CLIENT_URL is not set. Add your frontend URL for production CORS.");
  }
}

validateRuntimeConfig();

const app = express();
app.set('trust proxy', 1);
const { verifyMailer } = require("./config/mailer");
verifyMailer();

if (process.env.SLACK_WEBHOOK_URL) {
  import("monilog-sdk")
    .then((mod) => {
      app.use(
        mod.monitor({
          serviceName: process.env.SERVICE_NAME || "Shumara API",
          slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
          maxLogSize: 10 * 1024 * 1024,
          maxFiles: 5,
        })
      );
      console.log("[Monitor] Monilog connected");
    })
    .catch((err) => {
      console.warn("[Monitor] Monilog disabled:", err.message);
    });
}



app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(morgan("dev"));

app.use(cors({
  origin: "*",
  credentials: false,
}));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: { message: "Too many attempts" } });
const generalLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 200, message: { message: "Too many requests" } });

app.use("/api/", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);


app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/products/:id/reviews", require("./routes/reviews"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/contact", require("./routes/contact"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/addresses", require("./routes/addresses"));
app.use("/api/admin", require("./routes/admin"));


app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});


app.get("/error", (req, res, next) => {
  next(new Error("Test error from Shumara! 🚨"));
});


app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.path} not found` });
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  slackAlert(`🚨 *Error on Shumara*\n*Route:* ${req.method} ${req.path}\n*Error:* ${err.message}`);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});


const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[DB] MongoDB connection failed:", err.message);
    process.exit(1);
  });
