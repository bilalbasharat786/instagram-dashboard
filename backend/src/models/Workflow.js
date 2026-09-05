import mongoose from "mongoose";

const workflowSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    targetUsername: {
      type: String,
      required: true,
      trim: true,
    },

    actionType: {
      type: String,
      enum: ["FOLLOW", "UNFOLLOW"],
      default: "FOLLOW",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "READY",
        "RUNNING",
        "PAUSED",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ],
      default: "DRAFT",
    },

    currentItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkflowItem",
      default: null,
    },

    totalAccounts: {
      type: Number,
      default: 0,
    },

    completedAccounts: {
      type: Number,
      default: 0,
    },

    failedAccounts: {
      type: Number,
      default: 0,
    },

    skippedAccounts: {
      type: Number,
      default: 0,
    },

    authRequiredAccounts: {
      type: Number,
      default: 0,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    pausedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    lastError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Workflow = mongoose.model("Workflow", workflowSchema);

export default Workflow;
