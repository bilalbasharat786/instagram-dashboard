import express from "express";

import {
  getAccounts,
  addAccount,
  deleteAccount,
} from "../controllers/accountController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getAccounts);

router.post("/", authMiddleware, addAccount);

router.delete("/:id", authMiddleware, deleteAccount);

export default router;