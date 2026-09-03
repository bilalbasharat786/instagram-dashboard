import ConnectedAccount from "../models/ConnectedAccount.js";
import AuthenticationRecord from "../models/AuthenticationRecord.js";
import { encryptValue } from "../utils/crypto.js";
import { writeAuditLog } from "../utils/audit.js";

const cleanUsername = (username = "") =>
  username.trim().replace(/^@/, "").toLowerCase();

const getOfficialAuthUrl = (state) => {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  const scope = process.env.INSTAGRAM_SCOPES || "instagram_business_basic";

  if (!clientId || !redirectUri) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state,
  });

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
};

const refreshExpiredStatus = async (account) => {
  if (
    account.status === "CONNECTED" &&
    account.tokenExpiresAt &&
    account.tokenExpiresAt <= new Date()
  ) {
    account.status = "AUTH_REQUIRED";
    account.lastError = "Authorization expire ho gayi. Re-authenticate required.";
    await account.save();

    await AuthenticationRecord.create({
      userId: account.userId,
      connectedAccountId: account._id,
      status: "EXPIRED",
      method: account.authorizationType,
      tokenExpiresAt: account.tokenExpiresAt,
      message: account.lastError,
    });
  }

  return account;
};

export const getAccounts = async (req, res) => {
  try {
    const { search = "", status = "ALL" } = req.query;
    const query = { userId: req.userId };

    if (status !== "ALL") {
      query.status = status;
    }

    if (search.trim()) {
      query.username = { $regex: cleanUsername(search), $options: "i" };
    }

    const accounts = await ConnectedAccount.find(query).sort({ createdAt: -1 });

    await Promise.all(accounts.map(refreshExpiredStatus));

    res.json({
      success: true,
      accounts,
    });
  } catch (error) {
    console.error("Get accounts error:", error);

    res.status(500).json({
      success: false,
      message: "Accounts fetch nahi ho sake.",
    });
  }
};

export const getAccountById = async (req, res) => {
  try {
    const account = await ConnectedAccount.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account nahi mila.",
      });
    }

    await refreshExpiredStatus(account);

    const authHistory = await AuthenticationRecord.find({
      connectedAccountId: account._id,
      userId: req.userId,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      account,
      authHistory,
    });
  } catch (error) {
    console.error("Get account error:", error);

    res.status(500).json({
      success: false,
      message: "Account detail fetch nahi ho saki.",
    });
  }
};

export const connectAccount = async (req, res) => {
  try {
    const username = cleanUsername(req.body.username);

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Instagram username required hai.",
      });
    }

    const existingAccount = await ConnectedAccount.findOne({
      userId: req.userId,
      username,
    });

    if (existingAccount) {
      return res.status(409).json({
        success: false,
        message: "Ye account already dashboard mein exist karta hai.",
      });
    }

    const account = await ConnectedAccount.create({
      userId: req.userId,
      username,
      status: "AUTH_REQUIRED",
      authorizationType: "NOT_CONNECTED",
      lastError:
        "Official Instagram OAuth connect karna required hai. Password store nahi kiya gaya.",
    });

    await AuthenticationRecord.create({
      userId: req.userId,
      connectedAccountId: account._id,
      method: "MANUAL_REAUTH_REQUIRED",
      status: "AUTH_REQUIRED",
      message: "Account placeholder create hua. Official authentication pending hai.",
    });

    await writeAuditLog({
      userId: req.userId,
      action: "ACCOUNT_CREATED",
      entityType: "ConnectedAccount",
      entityId: account._id,
      metadata: { username },
      req,
    });

    const authorizationUrl = getOfficialAuthUrl(account._id.toString());

    res.status(201).json({
      success: true,
      message: authorizationUrl
        ? "Account add ho gaya. Official Instagram authorization complete karo."
        : "Account add ho gaya. Instagram OAuth env vars set karne ke baad re-authenticate karo.",
      account,
      authorizationUrl,
    });
  } catch (error) {
    console.error("Connect account error:", error);

    res.status(500).json({
      success: false,
      message: "Account connect nahi ho saka.",
    });
  }
};

export const getAccountStatus = async (req, res) => {
  try {
    const account = await ConnectedAccount.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account nahi mila.",
      });
    }

    account.lastStatusCheckedAt = new Date();
    await refreshExpiredStatus(account);
    await account.save();

    res.json({
      success: true,
      status: account.status,
      tokenExpiresAt: account.tokenExpiresAt,
      lastStatusCheckedAt: account.lastStatusCheckedAt,
      message: account.lastError,
    });
  } catch (error) {
    console.error("Account status error:", error);

    res.status(500).json({
      success: false,
      message: "Account status check nahi ho saka.",
    });
  }
};

export const prepareDesktopSession = async (req, res) => {
  try {
    const account = await ConnectedAccount.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account nahi mila.",
      });
    }

    account.desktopSessionKey = account.desktopSessionKey || `instagram-${account._id}`;
    account.desktopSessionStatus = req.body.markReady ? "READY" : "LOGIN_REQUIRED";
    account.status = req.body.markReady ? "CONNECTED" : "AUTH_REQUIRED";
    account.lastDesktopLoginAt = req.body.markReady ? new Date() : account.lastDesktopLoginAt;
    account.lastError = req.body.markReady ? null : account.lastError;
    await account.save();

    await writeAuditLog({
      userId: req.userId,
      action: req.body.markReady ? "DESKTOP_SESSION_READY" : "DESKTOP_SESSION_LOGIN_STARTED",
      entityType: "ConnectedAccount",
      entityId: account._id,
      metadata: {
        username: account.username,
        desktopSessionKey: account.desktopSessionKey,
      },
      req,
    });

    res.json({
      success: true,
      message: req.body.markReady
        ? "Desktop session ready mark ho gaya."
        : "Desktop login session ready hai. Electron Instagram window mein login complete karo.",
      account,
    });
  } catch (error) {
    console.error("Prepare desktop session error:", error);

    res.status(500).json({
      success: false,
      message: "Desktop session prepare nahi ho saka.",
    });
  }
};

export const reauthenticateAccount = async (req, res) => {
  try {
    const account = await ConnectedAccount.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account nahi mila.",
      });
    }

    account.status = "AUTH_REQUIRED";
    account.lastError = "Official re-authentication required.";
    await account.save();

    const authorizationUrl = getOfficialAuthUrl(account._id.toString());

    await AuthenticationRecord.create({
      userId: req.userId,
      connectedAccountId: account._id,
      method: "MANUAL_REAUTH_REQUIRED",
      status: "AUTH_REQUIRED",
      message: "User ne re-authentication start ki.",
    });

    res.json({
      success: true,
      message: authorizationUrl
        ? "Official Instagram authorization URL ready hai."
        : "Instagram OAuth env vars missing hain.",
      account,
      authorizationUrl,
    });
  } catch (error) {
    console.error("Re-auth error:", error);

    res.status(500).json({
      success: false,
      message: "Re-authentication start nahi ho saki.",
    });
  }
};

export const markOAuthCallback = async (req, res) => {
  try {
    const { accountId, platformAccountId, accessToken, expiresInDays = 60 } = req.body;

    const account = await ConnectedAccount.findOne({
      _id: accountId,
      userId: req.userId,
    }).select("+encryptedAccessToken");

    if (!account || !accessToken) {
      return res.status(400).json({
        success: false,
        message: "Valid account aur official access token required hain.",
      });
    }

    const tokenExpiresAt = new Date(
      Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000
    );

    account.platformAccountId = platformAccountId || account.platformAccountId;
    account.encryptedAccessToken = encryptValue(accessToken);
    account.tokenExpiresAt = tokenExpiresAt;
    account.authorizationType = "INSTAGRAM_LOGIN";
    account.status = "CONNECTED";
    account.lastAuthenticatedAt = new Date();
    account.lastError = null;
    await account.save();

    await AuthenticationRecord.create({
      userId: req.userId,
      connectedAccountId: account._id,
      method: "INSTAGRAM_LOGIN",
      status: "SUCCESS",
      tokenExpiresAt,
      message: "Official Instagram token securely store hua.",
    });

    res.json({
      success: true,
      message: "Account officially authenticated ho gaya.",
      account,
    });
  } catch (error) {
    console.error("OAuth callback error:", error);

    res.status(500).json({
      success: false,
      message: "OAuth callback process nahi ho saka.",
    });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const account = await ConnectedAccount.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account nahi mila.",
      });
    }

    await writeAuditLog({
      userId: req.userId,
      action: "ACCOUNT_DELETED",
      entityType: "ConnectedAccount",
      entityId: account._id,
      metadata: { username: account.username },
      req,
    });

    res.json({
      success: true,
      message: "Account successfully remove ho gaya.",
    });
  } catch (error) {
    console.error("Delete account error:", error);

    res.status(500).json({
      success: false,
      message: "Account remove nahi ho saka.",
    });
  }
};
