import express from "express";

import {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  deleteWorkflow,

} from "../controllers/workflowController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  createWorkflow
);

router.get(
  "/",
  authMiddleware,
  getWorkflows
);

router.get(
  "/:id",
  authMiddleware,
  getWorkflowById
);
router.delete(
  "/:id",
  authMiddleware,
  deleteWorkflow
);

export default router;