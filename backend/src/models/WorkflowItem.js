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
        "READY",
        "COMPLETED",
        "FAILED",
        "SKIPPED",
      ],
      default: "PENDING",
    },

    errorMessage: {
      type: String,
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