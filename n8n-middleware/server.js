import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { getUser, incrementUser, resetIfExpired, resetAllLimits } from "./database.js";

dotenv.config();

const app = express();
app.use(express.json());

const MAX_EXECUTIONS = parseInt(process.env.MAX_EXECUTIONS || "5", 10);
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const RESET_INTERVAL_MS = 60 * 60 * 1000; // hourly reset check

// Periodically reset old limits
setInterval(resetIfExpired, RESET_INTERVAL_MS);

app.post("/trigger", async (req, res) => {
  const { userId, ...rest } = req.body;
  if (!userId) return res.status(400).json({ message: "Missing userId" });

  const user = getUser(userId);
  const count = user ? user.count : 0;

  if (count >= MAX_EXECUTIONS) {
    return res.status(429).json({
      message: `Execution limit reached (${MAX_EXECUTIONS}) for user ${userId}`,
    });
  }

  incrementUser(userId);

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...rest }),
    });

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    console.error("Error forwarding to n8n:", error);
    res.status(500).json({ message: "Error connecting to n8n" });
  }
});

app.post("/reset", (req, res) => {
  resetAllLimits();
  res.json({ message: "All user limits reset." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Middleware running on port ${PORT}`));
