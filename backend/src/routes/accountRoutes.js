import express from "express";

import {
  getAccounts,
  getAccountById,
  connectAccount,
  getAccountStatus,
  prepareDesktopSession,
  reauthenticateAccount,
  markOAuthCallback,
  deleteAccount,
} from "../controllers/accountController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getAccounts);

router.post("/", authMiddleware, connectAccount);
router.post("/connect", authMiddleware, connectAccount);
router.post("/oauth/callback", authMiddleware, markOAuthCallback);

router.get("/:id", authMiddleware, getAccountById);
router.get("/:id/status", authMiddleware, getAccountStatus);
router.post("/:id/desktop-session", authMiddleware, prepareDesktopSession);
router.post("/:id/reauth", authMiddleware, reauthenticateAccount);

router.delete("/:id", authMiddleware, deleteAccount);

export default router;
