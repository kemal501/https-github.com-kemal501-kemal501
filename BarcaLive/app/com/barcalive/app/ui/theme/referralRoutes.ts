import express from "express";
import {
  registerUser,
  recruitHost,
  monthlyBDSalaryChecker,
} from "./referralController.ts";

const router = express.Router();

router.post("/register", registerUser);
router.post("/recruit-host", recruitHost);
router.post("/monthly-bd-check", monthlyBDSalaryChecker);

export default router;
