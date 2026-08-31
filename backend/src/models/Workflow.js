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

    status: {
      type: String,
      enum: [
        "DRAFT",
        "READY",
        "RUNNING",
        "PAUSED",
        "COMPLETED",
        "FAILED",
      ],
      default: "DRAFT",
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
  },
  {
    timestamps: true,
  }
);

const Workflow = mongoose.model("Workflow", workflowSchema);

export default Workflow;