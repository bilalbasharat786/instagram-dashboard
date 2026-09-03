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
      lowercase: true,
    },

    platformAccountId: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "CONNECTED",
        "PENDING_AUTH",
        "AUTH_REQUIRED",
        "ERROR",
        "DISCONNECTED",
      ],
      default: "AUTH_REQUIRED",
    },

    encryptedAccessToken: {
      type: String,
      default: null,
      select: false,
    },

    encryptedRefreshToken: {
      type: String,
      default: null,
      select: false,
    },

    tokenExpiresAt: {
      type: Date,
      default: null,
    },

    authorizationType: {
      type: String,
      enum: ["INSTAGRAM_LOGIN", "FACEBOOK_LOGIN", "NOT_CONNECTED"],
      default: "NOT_CONNECTED",
    },

    desktopSessionKey: {
      type: String,
      default: null,
    },

    desktopSessionStatus: {
      type: String,
      enum: ["NOT_CREATED", "LOGIN_REQUIRED", "READY", "EXPIRED", "ERROR"],
      default: "NOT_CREATED",
    },

    lastAuthenticatedAt: {
      type: Date,
      default: null,
    },

    lastDesktopLoginAt: {
      type: Date,
      default: null,
    },

    lastStatusCheckedAt: {
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

connectedAccountSchema.index({ userId: 1, username: 1 }, { unique: true });

const ConnectedAccount = mongoose.model(
  "ConnectedAccount",
  connectedAccountSchema
);

export default ConnectedAccount;
