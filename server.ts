import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { adminDb } from './src/lib/admin.ts';
import { FieldValue } from 'firebase-admin/firestore';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Admin Route: Coin Generation
// ... (keep the same)
app.post("/api/admin/generate-coins", async (req, res) => {
  const { userId, amount, adminSecret } = req.body;
  
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    await adminDb.doc(`users/${userId}`).update({
      coins: FieldValue.increment(amount)
    });
    console.log(`Generating ${amount} coins for user ${userId}`);
    res.json({ success: true, message: `${amount} coins generated successfully.` });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint to earn coins
app.post("/api/earnings/earn", async (req, res) => {
  const { userId, amount, type } = req.body;
  
  // REAL AUTHENTICATION SHOULD BE IMPLEMENTED HERE
  // This is just a placeholder example for demonstration
  if (!userId || !amount) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    await adminDb.doc(`users/${userId}`).update({
      coins: FieldValue.increment(amount)
    });
    console.log(`Earned ${amount} coins for user ${userId} via ${type}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Chapa Payment Initialization Placeholder
app.post("/api/payment/chapa/initialize", async (req, res) => {
  const { amount, email, firstName, lastName } = req.body;
  
  // Implementation for Chapa API call
  // const response = await fetch("https://api.chapa.co/v1/transaction/initialize", { ... })
  
  res.json({ 
    success: true, 
    checkout_url: "https://test.chapa.co/checkout/...", // Placeholder
    message: "Payment initialized for Ethiopia (Chapa)"
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Barca-live Server running at http://localhost:${PORT}`);
  });
}

startServer();
