import express from "express";

import {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  startWorkflow,
  nextWorkflowItem,
  completeWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  getWorkflowProgress,
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

router.post("/:id/start", authMiddleware, startWorkflow);
router.post("/:id/next", authMiddleware, nextWorkflowItem);
router.post("/:id/complete", authMiddleware, completeWorkflow);
router.post("/:id/pause", authMiddleware, pauseWorkflow);
router.post("/:id/resume", authMiddleware, resumeWorkflow);
router.get("/:id/progress", authMiddleware, getWorkflowProgress);

router.delete(
  "/:id",
  authMiddleware,
  deleteWorkflow
);

export default router;
