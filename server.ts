import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { adminDb } from './src/lib/admin.ts';
import { FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Face Verification Endpoint
app.post("/api/verify-face", async (req, res) => {
  const { image, userId } = req.body;
  
  if (!image || !userId) {
    return res.status(400).json({ error: "Missing image or userId" });
  }

  try {
    const base64Data = image.split(",")[1];
    
    const prompt = `Analyze this image for biometric identity verification. 
    Task: Determine if there is a real, clearly visible human face in this image.
    Requirements:
    1. The face must be a real person, not a photo of a photo, not a drawing, not a mask.
    2. The face must be well-lit and clearly visible.
    3. The face should be centered in the frame.
    
    Return a JSON object with:
    - isRealPerson (boolean)
    - confidence (number 0-1)
    - reason (string, explain why it passed or failed, e.g., "Face is too dark", "No clear face detected", "Identity verified")
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isRealPerson: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            reason: { type: Type.STRING }
          },
          required: ["isRealPerson", "confidence", "reason"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");

    if (result.isRealPerson && result.confidence > 0.8) {
      await adminDb.doc(`users/${userId}`).update({
        isVerified: true,
        isFaceVerified: true,
        faceVerifiedAt: new Date().toISOString(),
        verificationNote: result.reason
      });
      return res.json({ success: true, ...result });
    } else {
      return res.json({ success: false, reason: result.reason, ...result });
    }
  } catch (error) {
    console.error("Face verification error:", error);
    res.status(500).json({ error: "Verification failed internally" });
  }
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
