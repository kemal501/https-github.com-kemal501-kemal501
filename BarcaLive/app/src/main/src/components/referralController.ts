import express from "express";
import { adminDb } from "./admin.ts";
import { FieldValue } from "firebase-admin/firestore";

// =========================================
// REGISTER USER / AGENT
// =========================================
export const registerUser = async (req: express.Request, res: express.Response) => {
  try {
    const {
      userId,
      name,
      email,
      role,
      invitedBy,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: "userId is required",
      });
    }

    const referralCode = userId.slice(0, 6).toUpperCase();

    await adminDb.collection("users").doc(userId).set({
      name: name || "Anonymous User",
      email: email || "",
      role: role || "user",
      invitedBy: invitedBy || null,
      referralCode,
      walletBalance: 0,
      totalEarnings: 0,
      activeHostCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // PAY REFERRAL COMMISSION
    if (invitedBy) {
      await payAgentCommission(invitedBy, userId, 1);
    }

    res.json({
      success: true,
      message: "User registered successfully",
    });

  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// =========================================
// MULTI-LEVEL COMMISSION SYSTEM
// =========================================
async function payAgentCommission(agentId: string, sourceUserId: string, level: number) {
  if (level > 5) return;

  const commissions: Record<number, number> = {
    1: 5,
    2: 3,
    3: 2,
    4: 1,
    5: 1,
  };

  const amount = commissions[level];
  if (!amount) return;

  const agentRef = adminDb.collection("users").doc(agentId);
  const agentDoc = await agentRef.get();

  if (!agentDoc.exists) return;

  const agentData = agentDoc.data();
  if (!agentData || agentData.role !== "agent") return;

  await agentRef.update({
    walletBalance: FieldValue.increment(amount),
    totalEarnings: FieldValue.increment(amount),
  });

  await adminDb.collection("agent_earnings").add({
    agentId,
    amount,
    type: "referral",
    sourceUser: sourceUserId,
    level,
    createdAt: FieldValue.serverTimestamp(),
  });

  // GO TO NEXT CHAIN
  if (agentData.invitedBy) {
    await payAgentCommission(
      agentData.invitedBy,
      sourceUserId,
      level + 1
    );
  }
}

// =========================================
// RECRUIT HOST
// =========================================
export const recruitHost = async (req: express.Request, res: express.Response) => {
  try {
    const {
      hostId,
      agentId,
      monthlyCoins,
    } = req.body;

    if (!hostId || !agentId) {
      return res.status(400).json({
        error: "Missing required fields (hostId, agentId)",
      });
    }

    await adminDb.collection("hosts").doc(hostId).set({
      ownerId: hostId,
      recruitedByAgent: agentId,
      isActive: (monthlyCoins || 0) >= 10000,
      monthlyCoins: monthlyCoins || 0,
      lastLiveDate: FieldValue.serverTimestamp(),
    }, { merge: true });

    // UPDATE ACTIVE HOST COUNT
    if (monthlyCoins >= 10000) {
      await adminDb.collection("users")
        .doc(agentId)
        .update({
          activeHostCount: FieldValue.increment(1),
        });
    }

    res.json({
      success: true,
      message: "Host recruited successfully",
    });

  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// =========================================
// MONTHLY BD SALARY BONUS
// 3 ACTIVE HOSTS = $20
// =========================================
export const monthlyBDSalaryChecker = async (req: express.Request, res: express.Response) => {
  try {
    const agentsSnapshot = await adminDb.collection("users")
      .where("role", "==", "agent")
      .get();

    const currentMonth = new Date().toISOString().slice(0, 7);

    for (const agent of agentsSnapshot.docs) {
      const data = agent.data();

      // CHECK ACTIVE HOSTS
      if (data && data.activeHostCount >= 3) {
        // PREVENT DOUBLE BONUS
        const existingReport = await adminDb.collection("monthly_reports")
          .where("month", "==", currentMonth)
          .where("agentId", "==", agent.id)
          .get();

        if (!existingReport.empty) continue;

        // PAY BONUS
        await adminDb.collection("users")
          .doc(agent.id)
          .update({
            walletBalance: FieldValue.increment(20),
            totalEarnings: FieldValue.increment(20),
          });

        // SAVE EARNING
        await adminDb.collection("agent_earnings").add({
          agentId: agent.id,
          amount: 20,
          type: "bd_salary",
          createdAt: FieldValue.serverTimestamp(),
        });

        // REPORT
        await adminDb.collection("monthly_reports").add({
          month: currentMonth,
          agentId: agent.id,
          activeHosts: data.activeHostCount,
          bonusPaid: true,
        });
      }
    }

    res.json({
      success: true,
      message: "Monthly BD salary processed",
    });

  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
};
