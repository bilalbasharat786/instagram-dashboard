import mongoose from "mongoose";

const connectedAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    platform: {
      type: String,
      default: "instagram",
      enum: ["instagram"],
    },

    username: {
      type: String,
      required: true,
      trim: true,
    },

    platformAccountId: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "CONNECTED",
        "AUTH_REQUIRED",
        "ERROR",
        "DISCONNECTED",
      ],
      default: "CONNECTED",
    },

    lastAuthenticatedAt: {
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

const ConnectedAccount = mongoose.model(
  "ConnectedAccount",
  connectedAccountSchema
);

export default ConnectedAccount;