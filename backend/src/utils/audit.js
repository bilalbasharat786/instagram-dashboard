import AuditLog from "../models/AuditLog.js";

export const writeAuditLog = async ({
  userId,
  action,
  entityType,
  entityId = null,
  metadata = {},
  req = null,
}) => {
  try {
    await AuditLog.create({
      userId,
      action,
      entityType,
      entityId,
      metadata,
      ipAddress: req?.ip || null,
      userAgent: req?.get?.("user-agent") || null,
    });
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
};
