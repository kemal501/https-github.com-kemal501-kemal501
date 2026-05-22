import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import crypto from "crypto";
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

// Daily Streak Claim
app.post("/api/bonus/streak/claim", async (req, res) => {
  const { userId } = req.body;
  try {
    const userRef = adminDb.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });
    
    const data = userSnap.data() || {};
    const today = new Date().toISOString().split('T')[0];
    
    // Yesterday's date
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];
    
    if (data.lastStreakClaimedDate === today) {
      return res.status(400).json({ error: "Already claimed today" });
    }

    let newStreak = 1;
    if (data.lastStreakClaimedDate === yesterday) {
      newStreak = (data.loginStreak || 0) + 1;
      if (newStreak > 7) newStreak = 1; // Reset after 7 days
    }

    // Rewards: 100, 200, 300, 400, 500, 750, 1500
    const rewards = [100, 200, 300, 400, 500, 750, 1500];
    const rewardAmount = rewards[newStreak - 1] || 100;

    await userRef.update({
      coins: FieldValue.increment(rewardAmount),
      loginStreak: newStreak,
      lastStreakClaimedDate: today
    });

    res.json({ success: true, amount: rewardAmount, streak: newStreak });
  } catch (error) { res.status(500).json({ error: "Streak claim error" }); }
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

// ==========================================
// BARCA-LIVE SECURE COIN GENERATION SYSTEM
// ==========================================

const DAILY_LIMIT = 50000;
const MAX_SHOT_PER_SECOND = 8;

interface ActiveUserStats {
  shots: number;
  lastShot: number;
}

const activeUsers: Record<string, ActiveUserStats> = {};

function generateTransactionId(): string {
  return crypto.randomBytes(16).toString("hex");
}

async function validateUser(uid: string): Promise<any> {
  const userRef = await adminDb.collection("users").doc(uid).get();

  if (!userRef.exists) {
    throw new Error("User not found");
  }

  return userRef.data();
}

function antiCheatCheck(uid: string): boolean {
  const now = Date.now();

  if (!activeUsers[uid]) {
    activeUsers[uid] = {
      shots: 1,
      lastShot: now
    };
    return true;
  }

  const diff = now - activeUsers[uid].lastShot;

  if (diff < 1000) {
    activeUsers[uid].shots++;
    if (activeUsers[uid].shots > MAX_SHOT_PER_SECOND) {
      return false;
    }
  } else {
    activeUsers[uid].shots = 1;
  }

  activeUsers[uid].lastShot = now;
  return true;
}

// Generate Coins Endpoint
app.post(["/generateCoins", "/api/generateCoins"], async (req, res) => {
  try {
    const { uid, gameType, fishType, score } = req.body;

    if (!uid || !gameType || !fishType) {
      return res.status(400).json({
        success: false,
        message: "Missing fields"
      });
    }

    const safe = antiCheatCheck(uid);

    if (!safe) {
      await adminDb.collection("reports").add({
        uid,
        reason: "Coin cheat detected",
        createdAt: FieldValue.serverTimestamp()
      });

      return res.status(403).json({
        success: false,
        message: "Cheat detected"
      });
    }

    const userData = await validateUser(uid);
    const todayCoins = userData.todayCoins || 0;

    if (todayCoins >= DAILY_LIMIT) {
      return res.status(403).json({
        success: false,
        message: "Daily limit reached"
      });
    }

    let reward = 0;

    switch (fishType) {
      case "small":
        reward = 20;
        break;
      case "medium":
        reward = 100;
        break;
      case "shark":
        reward = 500;
        break;
      case "boss":
        reward = 5000;
        break;
      case "jackpot":
        reward = 10000;
        break;
      default:
        reward = 10;
    }

    if (userData.vip === true) {
      reward += Math.floor(reward * 0.20);
    }

    if (score >= 1000) {
      reward += 200;
    }

    await adminDb.collection("users").doc(uid).update({
      coins: FieldValue.increment(reward),
      todayCoins: FieldValue.increment(reward),
      totalKills: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp()
    });

    const txId = generateTransactionId();

    await adminDb.collection("transactions").doc(txId).set({
      txId,
      uid,
      gameType,
      fishType,
      reward,
      score,
      createdAt: FieldValue.serverTimestamp()
    });

    await adminDb.collection("leaderboard").doc(uid).set({
      uid,
      coins: (userData.coins || 0) + reward,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({
      success: true,
      txId,
      reward,
      totalCoins: (userData.coins || 0) + reward,
      message: "Coins generated successfully"
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// VIP Purchase Endpoint
app.post(["/buyVIP", "/api/buyVIP"], async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ success: false, message: "Missing uid" });

    await adminDb.collection("users").doc(uid).update({
      vip: true,
      vipExpire: Date.now() + (30 * 24 * 60 * 60 * 1000)
    });

    res.json({
      success: true,
      message: "VIP activated"
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      message: e.message
    });
  }
});

// Withdraw Endpoint
app.post(["/withdraw", "/api/withdraw"], async (req, res) => {
  try {
    const { uid, amount, method } = req.body;
    if (!uid || !amount) return res.status(400).json({ success: false, message: "Missing required fields" });

    const userRef = await adminDb.collection("users").doc(uid).get();
    if (!userRef.exists) return res.status(404).json({ success: false, message: "User not found" });

    const user = userRef.data() || {};
    const userCoins = user.coins || 0;

    if (userCoins < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance"
      });
    }

    await adminDb.collection("users").doc(uid).update({
      coins: FieldValue.increment(-amount)
    });

    await adminDb.collection("withdrawals").add({
      uid,
      amount,
      method,
      status: "pending",
      createdAt: FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: "Withdraw request sent"
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      message: e.message
    });
  }
});

// Claim Mission Endpoint
app.post(["/claimMission", "/api/claimMission"], async (req, res) => {
  try {
    const { uid, missionId } = req.body;
    if (!uid || !missionId) return res.status(400).json({ success: false, message: "Missing uid or missionId" });

    let reward = 0;

    switch (missionId) {
      case "kill10":
        reward = 500;
        break;
      case "boss":
        reward = 5000;
        break;
      case "room":
        reward = 1000;
        break;
    }

    await adminDb.collection("users").doc(uid).update({
      coins: FieldValue.increment(reward)
    });

    res.json({
      success: true,
      reward
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      message: e.message
    });
  }
});

// Rank Endpoint
app.get(["/rank/:uid", "/api/rank/:uid"], async (req, res) => {
  try {
    const uid = req.params.uid;
    const user = await adminDb.collection("users").doc(uid).get();

    if (!user.exists) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const coins = user.data()?.coins || 0;
    let rank = "Bronze";

    if (coins >= 100000) {
      rank = "King";
    } else if (coins >= 50000) {
      rank = "Diamond";
    } else if (coins >= 10000) {
      rank = "Gold";
    }

    res.json({
      success: true,
      rank
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      message: e.message
    });
  }
});

// Admin Users List Endpoint
app.get(["/admin/users", "/api/admin/users-list"], async (req, res) => {
  try {
    const users = await adminDb.collection("users").get();
    const result: any[] = [];

    users.forEach(doc => {
      result.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      users: result
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      message: e.message
    });
  }
});

// Telebirr Payment Endpoint
app.post(["/telebirr/pay", "/api/telebirr/pay"], async (req, res) => {
  try {
    const { uid, amount } = req.body;
    res.json({
      success: true,
      paymentUrl: "https://telebirr-payment-url"
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      message: e.message
    });
  }
});

// Chapa Payment Endpoint
app.post(["/chapa/pay", "/api/chapa/pay"], async (req, res) => {
  try {
    const { uid, amount } = req.body;
    res.json({
      success: true,
      paymentUrl: "https://checkout.chapa.co"
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      message: e.message
    });
  }
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
  const { userId, role, changedById } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  try {
    const targetRef = adminDb.doc(`users/${userId}`);
    const targetSnap = await targetRef.get();
    let oldRole = "user";
    let targetUserName = userId;
    if (targetSnap.exists) {
      const targetData = targetSnap.data() || {};
      oldRole = targetData.role || "user";
      targetUserName = targetData.displayName || targetData.email || userId;
    }

    let changedByName = "System/Anonymous";
    const executorId = changedById || userId; // fallback to user themselves
    if (executorId) {
      const changedRef = adminDb.doc(`users/${executorId}`);
      const changedSnap = await changedRef.get();
      if (changedSnap.exists) {
        const changedData = changedSnap.data() || {};
        changedByName = changedData.displayName || changedData.email || executorId;
      } else {
        changedByName = executorId;
      }
    }

    await targetRef.update({ role });

    // Save audit log
    await adminDb.collection("role_change_audits").add({
      changedById: executorId,
      changedByName,
      targetUserId: userId,
      targetUserName,
      oldRole,
      newRole: role,
      createdAt: FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: `User role updated successfully to ${role}` });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ error: "Could not update user role" });
  }
});

// Admin: Get all role change audit logs
app.get("/api/admin/role-audits", async (req, res) => {
  try {
    const auditsSnap = await adminDb.collection("role_change_audits")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    const audits = auditsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt && typeof data.createdAt.toDate === "function" ? data.createdAt.toDate() : data.createdAt
      };
    });
    res.json({ success: true, audits });
  } catch (error) {
    console.error("Error fetching role audits:", error);
    res.status(500).json({ error: "Could not fetch audit logs" });
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

// Game Logic: Fishing
app.post("/api/games/fishing", async (req, res) => {
  const { userId, betAmount } = req.body; // betAmount is cost per shot
  if (!userId || !betAmount || betAmount <= 0) return res.status(400).json({ error: "Invalid request" });

  try {
    const userRef = adminDb.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });
    
    if ((userSnap.data()?.coins || 0) < betAmount) return res.status(400).json({ error: "Insufficient coins" });

    // Catch logic
    const roll = Math.random();
    let caughtFish = null;
    let multiplier = 0;

    // Golden Shark: 1% chance, 50x
    // Hammerhead: 5% chance, 10x
    // Turtle: 15% chance, 4x
    // Jellyfish: 25% chance, 2x
    // Small Fish: 30% chance, 1.2x
    // Miss: 24% chance
    if (roll < 0.01) { caughtFish = "Golden Shark"; multiplier = 50; }
    else if (roll < 0.06) { caughtFish = "Hammerhead"; multiplier = 10; }
    else if (roll < 0.21) { caughtFish = "Golden Turtle"; multiplier = 4; }
    else if (roll < 0.46) { caughtFish = "Jellyfish"; multiplier = 2; }
    else if (roll < 0.76) { caughtFish = "Small Fish"; multiplier = 1.2; }

    const winAmount = caughtFish ? Math.floor(betAmount * multiplier) : 0;
    const balanceChange = winAmount - betAmount;

    await userRef.update({
      coins: FieldValue.increment(balanceChange)
    });

    res.json({
        success: true,
        caughtFish,
        winAmount,
        win: !!caughtFish,
        message: caughtFish ? `You caught a ${caughtFish}! Won ${winAmount} coins.` : `Missed! Try again.`
    });
  } catch (error) {
    res.status(500).json({ error: "Fishing error" });
  }
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
