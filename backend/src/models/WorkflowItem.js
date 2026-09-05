import mongoose from "mongoose";

const workflowItemSchema = new mongoose.Schema(
  {
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workflow",
      required: true,
      index: true,
    },

    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectedAccount",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "IN_PROGRESS",
        "TARGET_READY",
        "ACTION_CONFIRMED",
        "FOLLOW_CONFIRMED",
        "UNFOLLOW_CONFIRMED",
        "COMPLETED",
        "AUTH_REQUIRED",
        "ERROR",
        "SKIPPED",
      ],
      default: "PENDING",
    },

    targetProfileUrl: {
      type: String,
      default: null,
    },

    errorMessage: {
      type: String,
      default: null,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    targetPreparedAt: {
      type: Date,
      default: null,
    },

    followConfirmedAt: {
      type: Date,
      default: null,
    },

    unfollowConfirmedAt: {
      type: Date,
      default: null,
    },

    actionConfirmedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const WorkflowItem = mongoose.model(
  "WorkflowItem",
  workflowItemSchema
);

export default WorkflowItem;
