import mongoose from "mongoose";

const authenticationRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    connectedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectedAccount",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      default: "instagram",
      enum: ["instagram"],
    },
    method: {
      type: String,
      enum: ["INSTAGRAM_LOGIN", "FACEBOOK_LOGIN", "MANUAL_REAUTH_REQUIRED"],
      default: "INSTAGRAM_LOGIN",
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "EXPIRED", "REVOKED", "AUTH_REQUIRED"],
      default: "AUTH_REQUIRED",
    },
    tokenExpiresAt: {
      type: Date,
      default: null,
    },
    message: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const AuthenticationRecord = mongoose.model(
  "AuthenticationRecord",
  authenticationRecordSchema
);

export default AuthenticationRecord;
