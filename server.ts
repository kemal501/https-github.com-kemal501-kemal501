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

// User profile retrieval
app.get("/api/users/:userId", async (req, res) => {
  try {
    const doc = await adminDb.doc(`users/${req.params.userId}`).get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, user: { id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ error: "External Error" });
  }
});

// Update user profile
app.put("/api/users/:userId", async (req, res) => {
  try {
    await adminDb.doc(`users/${req.params.userId}`).update(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
});

// Game Logic: Slots
app.post("/api/games/slots", async (req, res) => {
  const { userId, betAmount } = req.body;
  if (!userId || !betAmount || betAmount <= 0) return res.status(400).json({ error: "Invalid request" });

  try {
    const userRef = adminDb.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });
    
    const userData = userSnap.data() || {};
    if ((userData.coins || 0) < betAmount) return res.status(400).json({ error: "Insufficient coins" });

    const symbols = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣"];
    const reels = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];

    let winMultiplier = 0;
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      // Jackpot
      winMultiplier = reels[0] === "7️⃣" ? 50 : 10;
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      // 2 match
      winMultiplier = 2;
    }

    const winAmount = betAmount * winMultiplier;
    const balanceChange = winAmount - betAmount;

    await userRef.update({
      coins: FieldValue.increment(balanceChange),
      totalGamble: FieldValue.increment(betAmount)
    });

    res.json({
      success: true,
      reels,
      winAmount,
      betAmount,
      message: winMultiplier > 0 ? `JACKPOT! You won ${winAmount} coins!` : "Better luck next time!"
    });
  } catch (error) {
    res.status(500).json({ error: "Slot error" });
  }
});

// Agency Dashboard & Registration
app.post("/api/agency/register", async (req, res) => {
  const { userId } = req.body;
  try {
    await adminDb.doc(`users/${userId}`).update({
      role: 'agent',
      agencyId: userId, // for simplicity, agent ID is their UID
      commissionRate: 20
    });
    res.json({ success: true, message: "Agency registered successfully" });
  } catch (error) { res.status(500).json({ error: "Agency registration error" }); }
});

app.get("/api/agency/dashboard/:agentId", async (req, res) => {
  try {
    const agentDoc = await adminDb.doc(`users/${req.params.agentId}`).get();
    if (!agentDoc.exists || agentDoc.data()?.role !== 'agent') {
      return res.status(404).json({ error: "Agent not found" });
    }
    const agentData = agentDoc.data();
    res.json({ success: true, agent: agentData });
  } catch (error) { res.status(500).json({ error: "Agency dashboard error" }); }
});

// Daily Bonus Claim
app.post("/api/bonus/claim", async (req, res) => {
  const { userId } = req.body;
  try {
    const userRef = adminDb.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    const data = userSnap.data() || {};
    
    if (data.lastBonusClaimedDate === new Date().toISOString().split('T')[0]) {
      return res.status(400).json({ error: "Already claimed today" });
    }
    
    if ((data.minutesInRoomToday || 0) < 60) {
      return res.status(400).json({ error: "Not enough time in room (need 60 mins)" });
    }

    await userRef.update({
      coins: FieldValue.increment(300), // $3 bonus = 300 coins
      lastBonusClaimedDate: new Date().toISOString().split('T')[0]
    });

    res.json({ success: true, amount: 300 });
  } catch (error) { res.status(500).json({ error: "Bonus claim error" }); }
});

// Room Heartbeat (Tracks time for daily bonus)
app.post("/api/room/heartbeat", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  
  try {
    const userRef = adminDb.doc(`users/${userId}`);
    const today = new Date().toISOString().split('T')[0];
    const userSnap = await userRef.get();
    const data = userSnap.data() || {};
    
    // Reset if it's a new day
    if (data.lastHeatbeatDate !== today) {
       await userRef.update({
         minutesInRoomToday: 1,
         lastHeatbeatDate: today
       });
    } else {
       await userRef.update({
         minutesInRoomToday: FieldValue.increment(1)
       });
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: "Heartbeat error" }); }
});

// Admin: Generate Coins
app.post("/api/admin/generate-coins", async (req, res) => {
  const { userId, amount, reason, adminSecret } = req.body;
  // Simple check for now, in production use proper auth/roles
  if (adminSecret !== "TEMPORARY_SECRET" && adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  
  try {
    const userRef = adminDb.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "Target user not found" });
    }

    await userRef.update({
      coins: FieldValue.increment(amount)
    });
    
    // Log the action to unified coin transactions
    const txLog = {
      type: "admin_mint",
      targetUserId: userId,
      targetUserName: userSnap.data()?.displayName || "Platform User",
      amount,
      reason: reason || "Admin Generation",
      createdAt: new Date().toISOString()
    };

    await adminDb.collection("coin_transactions").add(txLog);
    
    res.json({ success: true, message: `${amount} coins generated successfully.` });
  } catch (error) { res.status(500).json({ error: "Mint error" }); }
});

// Admin: Retrieve platform users list
app.get("/api/admin/users", async (req, res) => {
  try {
    const usersSnap = await adminDb.collection("users").limit(150).get();
    const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch platform users" });
  }
});

// Admin: Update user's role on the platform
app.post("/api/admin/update-role", async (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  try {
    await adminDb.doc(`users/${userId}`).update({ role });
    res.json({ success: true, message: `User role updated successfully to ${role}` });
  } catch (error) {
    res.status(500).json({ error: "Could not update user role" });
  }
});

// Seller: Purchase coin package wholesale from platform
app.post("/api/seller/purchase-coins", async (req, res) => {
  const { sellerId, amount, costETB } = req.body;
  if (!sellerId || !amount) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  try {
    const sellerRef = adminDb.doc(`users/${sellerId}`);
    const sellerSnap = await sellerRef.get();
    if (!sellerSnap.exists) {
      return res.status(404).json({ error: "Seller profile not found" });
    }

    await sellerRef.update({
      coins: FieldValue.increment(amount)
    });

    // Create a transaction log
    await adminDb.collection("coin_transactions").add({
      type: "wholesale_purchase",
      sellerId,
      sellerName: sellerSnap.data()?.displayName || "Coin Seller",
      amount,
      costETB,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, message: `Successfully purchased ${amount} coins wholesale` });
  } catch (error) {
    res.status(500).json({ error: "Wholesale purchase failed" });
  }
});

// Seller: Resell coins to another platform user
app.post("/api/seller/resell-coins", async (req, res) => {
  const { sellerId, targetUserId, amount, priceETB } = req.body;
  if (!sellerId || !targetUserId || !amount || amount <= 0) {
    return res.status(400).json({ error: "Missing required resell details" });
  }

  try {
    const sellerRef = adminDb.doc(`users/${sellerId}`);
    const sellerSnap = await sellerRef.get();
    if (!sellerSnap.exists) {
      return res.status(404).json({ error: "Seller profile not found" });
    }

    const sellerCoins = sellerSnap.data()?.coins || 0;
    if (sellerCoins < amount) {
      return res.status(400).json({ error: "Insufficient coin balance for resell" });
    }

    const targetRef = adminDb.doc(`users/${targetUserId}`);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) {
      return res.status(404).json({ error: "Target platform user not found" });
    }

    // Atomic transaction updates
    const batch = adminDb.batch();
    batch.update(sellerRef, { coins: FieldValue.increment(-amount) });
    batch.update(targetRef, { coins: FieldValue.increment(amount) });

    // Track transaction
    const txRef = adminDb.collection("coin_transactions").doc();
    batch.set(txRef, {
      type: "seller_resell",
      sellerId,
      sellerName: sellerSnap.data()?.displayName || "Coin Seller",
      targetUserId,
      targetUserName: targetSnap.data()?.displayName || "Platform User",
      amount,
      priceETB: priceETB || 0,
      createdAt: new Date().toISOString()
    });

    await batch.commit();
    res.json({ success: true, message: `Successfully resold ${amount} coins to ${targetSnap.data()?.displayName}` });
  } catch (error) {
    console.error("Resell database operation error:", error);
    res.status(500).json({ error: "Resell transaction failed internally" });
  }
});

// Coin Transactions log retriever
app.get("/api/coin/transactions", async (req, res) => {
  try {
    const snap = await adminDb.collection("coin_transactions").orderBy("createdAt", "desc").limit(40).get();
    const transactions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ error: "Could not fetch coins logs" });
  }
});

// Game Logic: Dice
app.post("/api/games/dice", async (req, res) => {
  const { userId, betAmount, prediction, value } = req.body;
  if (!userId || !betAmount || betAmount <= 0) return res.status(400).json({ error: "Invalid request" });

  try {
    const userRef = adminDb.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });
    
    if ((userSnap.data()?.coins || 0) < betAmount) return res.status(400).json({ error: "Insufficient coins" });

    const diceRoll = Math.floor(Math.random() * 6) + 1;
    let win = false;
    let multiplier = 2;

    if (prediction === "over") win = diceRoll > 3;
    else if (prediction === "under") win = diceRoll < 4;
    else if (prediction === "number") {
      win = diceRoll === value;
      multiplier = 5;
    }

    const winAmount = win ? betAmount * multiplier : 0;
    const balanceChange = winAmount - betAmount;

    await userRef.update({
      coins: FieldValue.increment(balanceChange)
    });

    res.json({
        success: true,
        diceRoll,
        win,
        message: win ? `WINNER! Roll was ${diceRoll}` : `LOSE! Roll was ${diceRoll}`
    });
  } catch (error) {
    res.status(500).json({ error: "Dice error" });
  }
});

// Game Logic: Roulette
app.post("/api/games/roulette", async (req, res) => {
  const { userId, betAmount, betType, betValue } = req.body;
  try {
    const userRef = adminDb.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    if ((userSnap.data()?.coins || 0) < betAmount) return res.status(400).json({ error: "Insufficient coins" });

    const winningNumber = Math.floor(Math.random() * 37);
    const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    const winningColor = winningNumber === 0 ? 'green' : (redNumbers.includes(winningNumber) ? 'red' : 'black');
    
    let win = false;
    let multiplier = 0;

    if (betType === 'number' && parseInt(betValue) === winningNumber) { win = true; multiplier = 35; }
    else if (betType === 'color' && betValue === winningColor) { win = true; multiplier = 2; }
    else if (betType === 'even_odd') {
      const isEven = winningNumber !== 0 && winningNumber % 2 === 0;
      if (betValue === 'even' && isEven) { win = true; multiplier = 2; }
      if (betValue === 'odd' && !isEven && winningNumber !== 0) { win = true; multiplier = 2; }
    }

    const winAmount = win ? betAmount * multiplier : 0;
    await userRef.update({ coins: FieldValue.increment(winAmount - betAmount) });

    res.json({ success: true, winningNumber, winningColor, win, message: win ? ` Roulette Win! ${winningNumber} ${winningColor}` : `Roulette Lose! ${winningNumber} ${winningColor}` });
  } catch (error) { res.status(500).json({ error: "Roulette error" }); }
});

// Coin balance with USD conversion
app.get("/api/coins/balance/:userId", async (req, res) => {
  try {
    const doc = await adminDb.doc(`users/${req.params.userId}`).get();
    const coins = doc.data()?.coins || 0;
    res.json({ success: true, balance: coins, balanceUSD: (coins / 100).toFixed(2) });
  } catch (error) { res.status(500).json({ error: "Balance error" }); }
});

// Withdrawal Request
app.post("/api/withdraw/request", async (req, res) => {
  const { userId, amountUSD, method } = req.body;
  if (!userId || amountUSD < 10) return res.status(400).json({ error: "Min $10 required" });

  try {
    const userRef = adminDb.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    const coinsNeeded = amountUSD * 100;
    if ((userSnap.data()?.coins || 0) < coinsNeeded) return res.status(400).json({ error: "Insufficient coins" });

    const fee = amountUSD * 0.05;
    const netAmount = amountUSD - fee;

    await userRef.update({ coins: FieldValue.increment(-coinsNeeded) });
    await adminDb.collection('withdrawals').add({
      userId, amountUSD, fee, netAmount, method, status: 'pending', createdAt: new Date().toISOString()
    });

    res.json({ success: true, message: "Withdrawal request submitted", netAmount });
  } catch (error) { res.status(500).json({ error: "Withdraw error" }); }
});

// Daily Bonus logic
app.get("/api/bonus/daily/:userId", async (req, res) => {
  try {
    const doc = await adminDb.doc(`users/${req.params.userId}`).get();
    const data = doc.data() || {};
    res.json({ 
      success: true, 
      minutesInRoom: data.minutesInRoomToday || 0,
      claimedToday: data.lastBonusClaimedDate === new Date().toISOString().split('T')[0]
    });
  } catch (error) { res.status(500).json({ error: "Bonus check error" }); }
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
      model: "gemini-3.5-flash",
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

    const textContent = response.text?.trim() || "{}";
    const result = JSON.parse(textContent);

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
