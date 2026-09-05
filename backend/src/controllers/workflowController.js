import Workflow from "../models/Workflow.js";
import WorkflowItem from "../models/WorkflowItem.js";
import ConnectedAccount from "../models/ConnectedAccount.js";
import { writeAuditLog } from "../utils/audit.js";

const cleanUsername = (username = "") =>
  username.trim().replace(/^@/, "").toLowerCase();

const cleanActionType = (actionType = "FOLLOW") => {
  const type = String(actionType).trim().toUpperCase();
  return ["FOLLOW", "UNFOLLOW", "LIKE_REEL"].includes(type) ? type : "FOLLOW";
};

const targetUrlFor = (targetUsername) =>
  `https://www.instagram.com/${encodeURIComponent(targetUsername)}/`;

const cleanReelUrl = (rawUrl = "") => {
  const value = String(rawUrl).trim();

  if (!value) return "";

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    const isInstagram = host === "instagram.com";
    const isReel = /^\/reel\/[^/]+\/?$/i.test(url.pathname);

    if (!isInstagram || !isReel) return "";

    url.protocol = "https:";
    url.hostname = "www.instagram.com";
    url.search = "";
    url.hash = "";

    return url.toString();
  } catch {
    return "";
  }
};

const loadWorkflow = async (id, userId) =>
  Workflow.findOne({
    _id: id,
    userId,
  });

const refreshWorkflowCounts = async (workflow) => {
  const items = await WorkflowItem.find({ workflowId: workflow._id });
  const completedAccounts = items.filter((item) => item.status === "COMPLETED").length;
  const failedAccounts = items.filter((item) => item.status === "ERROR").length;
  const skippedAccounts = items.filter((item) => item.status === "SKIPPED").length;
  const authRequiredAccounts = items.filter(
    (item) => item.status === "AUTH_REQUIRED"
  ).length;

  workflow.completedAccounts = completedAccounts;
  workflow.failedAccounts = failedAccounts;
  workflow.skippedAccounts = skippedAccounts;
  workflow.authRequiredAccounts = authRequiredAccounts;

  if (completedAccounts + failedAccounts + skippedAccounts + authRequiredAccounts >= workflow.totalAccounts) {
    workflow.status = "COMPLETED";
    workflow.completedAt = workflow.completedAt || new Date();
    workflow.currentItemId = null;
  }

  await workflow.save();
  return workflow;
};

const getNextPendingItem = async (workflow) =>
  WorkflowItem.findOne({
    workflowId: workflow._id,
    status: "PENDING",
  })
    .populate("accountId", "username platform status tokenExpiresAt desktopSessionStatus")
    .sort({ createdAt: 1 });

const prepareItem = async (workflow, item) => {
  if (!item) {
    workflow.status = "COMPLETED";
    workflow.completedAt = new Date();
    workflow.currentItemId = null;
    await workflow.save();
    return null;
  }

  const account = item.accountId;
  const tokenExpired = account?.tokenExpiresAt && account.tokenExpiresAt <= new Date();

  if (!account || account.status !== "CONNECTED" || tokenExpired) {
    item.status = "AUTH_REQUIRED";
    item.errorMessage = "Is account ki authorization expire ya missing hai.";
    item.completedAt = new Date();
    await item.save();

    if (account && tokenExpired) {
      await ConnectedAccount.updateOne(
        { _id: account._id },
        {
          status: "AUTH_REQUIRED",
          lastError: "Authorization expire ho gayi. Re-authenticate required.",
        }
      );
    }

    await refreshWorkflowCounts(workflow);
    return prepareItem(workflow, await getNextPendingItem(workflow));
  }

  item.status = "TARGET_READY";
  item.targetProfileUrl =
    workflow.actionType === "LIKE_REEL"
      ? workflow.reelUrl
      : targetUrlFor(workflow.targetUsername);
  item.startedAt = item.startedAt || new Date();
  item.targetPreparedAt = new Date();
  item.errorMessage = null;
  await item.save();

  workflow.status = "RUNNING";
  workflow.startedAt = workflow.startedAt || new Date();
  workflow.pausedAt = null;
  workflow.currentItemId = item._id;
  await workflow.save();

  return item;
};

export const createWorkflow = async (req, res) => {
  try {
    const targetUsername = cleanUsername(req.body.targetUsername);
    const actionType = cleanActionType(req.body.actionType);
    const reelUrl = cleanReelUrl(req.body.reelUrl);
    const { accountIds } = req.body;

    if (actionType === "LIKE_REEL" && !reelUrl) {
      return res.status(400).json({
        success: false,
        message: "Valid Instagram reel URL required hai.",
      });
    }

    if (actionType !== "LIKE_REEL" && !targetUsername) {
      return res.status(400).json({
        success: false,
        message: "Target username required hai.",
      });
    }

    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Kam az kam 1 account select karo.",
      });
    }

    const accounts = await ConnectedAccount.find({
      _id: { $in: accountIds },
      userId: req.userId,
      status: { $ne: "DISCONNECTED" },
    });

    if (accounts.length !== accountIds.length) {
      return res.status(400).json({
        success: false,
        message: "Kuch selected accounts valid nahi hain.",
      });
    }

    const workflow = await Workflow.create({
      userId: req.userId,
      targetUsername: actionType === "LIKE_REEL" ? null : targetUsername,
      reelUrl: actionType === "LIKE_REEL" ? reelUrl : null,
      actionType,
      status: "READY",
      totalAccounts: accounts.length,
    });

    const items = accountIds.map((accountId) => ({
      workflowId: workflow._id,
      accountId,
      status: "PENDING",
    }));

    await WorkflowItem.insertMany(items);

    await writeAuditLog({
      userId: req.userId,
      action: "WORKFLOW_CREATED",
      entityType: "Workflow",
      entityId: workflow._id,
      metadata: { targetUsername, reelUrl, actionType, accountCount: accounts.length },
      req,
    });

    res.status(201).json({
      success: true,
      message: "Workflow successfully create ho gaya.",
      workflow,
    });
  } catch (error) {
    console.error("Create workflow error:", error);

    res.status(500).json({
      success: false,
      message: "Workflow create nahi ho saka.",
    });
  }
};

export const getWorkflows = async (req, res) => {
  try {
    const workflows = await Workflow.find({
      userId: req.userId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      workflows,
    });
  } catch (error) {
    console.error("Get workflows error:", error);

    res.status(500).json({
      success: false,
      message: "Workflows fetch nahi ho sake.",
    });
  }
};

export const getWorkflowById = async (req, res) => {
  try {
    const workflow = await loadWorkflow(req.params.id, req.userId);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow nahi mila.",
      });
    }

    const items = await WorkflowItem.find({
      workflowId: workflow._id,
    })
      .populate("accountId", "username platform status tokenExpiresAt desktopSessionStatus")
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      workflow,
      items,
      currentItem: items.find((item) => item._id.equals(workflow.currentItemId)) || null,
    });
  } catch (error) {
    console.error("Get workflow detail error:", error);

    res.status(500).json({
      success: false,
      message: "Workflow detail fetch nahi ho saki.",
    });
  }
};

export const startWorkflow = async (req, res) => {
  try {
    const workflow = await loadWorkflow(req.params.id, req.userId);

    if (!workflow) {
      return res.status(404).json({ success: false, message: "Workflow nahi mila." });
    }

    if (workflow.status === "COMPLETED") {
      return res.status(400).json({ success: false, message: "Workflow already complete hai." });
    }

    const item = await prepareItem(workflow, await getNextPendingItem(workflow));
    await refreshWorkflowCounts(workflow);

    res.json({
      success: true,
      message: item ? "Target profile ready hai." : "Workflow complete ho gaya.",
      workflow,
      currentItem: item,
    });
  } catch (error) {
    console.error("Start workflow error:", error);
    res.status(500).json({ success: false, message: "Workflow start nahi ho saka." });
  }
};

export const nextWorkflowItem = async (req, res) => {
  try {
    const workflow = await loadWorkflow(req.params.id, req.userId);

    if (!workflow) {
      return res.status(404).json({ success: false, message: "Workflow nahi mila." });
    }

    const currentItem = workflow.currentItemId
      ? await WorkflowItem.findOne({
          _id: workflow.currentItemId,
          workflowId: workflow._id,
        })
      : null;

    if (currentItem && ["TARGET_READY", "IN_PROGRESS"].includes(currentItem.status)) {
      currentItem.status = "COMPLETED";
      const confirmedAt = new Date();
      currentItem.actionConfirmedAt = confirmedAt;
      if (workflow.actionType === "LIKE_REEL") {
        currentItem.likeConfirmedAt = confirmedAt;
      } else if (workflow.actionType === "UNFOLLOW") {
        currentItem.unfollowConfirmedAt = confirmedAt;
      } else {
        currentItem.followConfirmedAt = confirmedAt;
      }
      currentItem.completedAt = new Date();
      await currentItem.save();
    }

    await refreshWorkflowCounts(workflow);
    const item = await prepareItem(workflow, await getNextPendingItem(workflow));
    await refreshWorkflowCounts(workflow);

    res.json({
      success: true,
      message: item ? "Next account ka target ready hai." : "Workflow complete ho gaya.",
      workflow,
      currentItem: item,
    });
  } catch (error) {
    console.error("Next workflow error:", error);
    res.status(500).json({ success: false, message: "Next account load nahi ho saka." });
  }
};

export const completeWorkflow = async (req, res) => {
  try {
    const workflow = await loadWorkflow(req.params.id, req.userId);

    if (!workflow) {
      return res.status(404).json({ success: false, message: "Workflow nahi mila." });
    }

    await WorkflowItem.updateMany(
      { workflowId: workflow._id, status: "PENDING" },
      { status: "SKIPPED", completedAt: new Date() }
    );

    workflow.status = "COMPLETED";
    workflow.currentItemId = null;
    workflow.completedAt = new Date();
    await refreshWorkflowCounts(workflow);

    res.json({ success: true, message: "Workflow complete ho gaya.", workflow });
  } catch (error) {
    console.error("Complete workflow error:", error);
    res.status(500).json({ success: false, message: "Workflow complete nahi ho saka." });
  }
};

export const pauseWorkflow = async (req, res) => {
  try {
    const workflow = await loadWorkflow(req.params.id, req.userId);

    if (!workflow) {
      return res.status(404).json({ success: false, message: "Workflow nahi mila." });
    }

    workflow.status = "PAUSED";
    workflow.pausedAt = new Date();
    await workflow.save();

    res.json({ success: true, message: "Workflow pause ho gaya.", workflow });
  } catch (error) {
    console.error("Pause workflow error:", error);
    res.status(500).json({ success: false, message: "Workflow pause nahi ho saka." });
  }
};

export const resumeWorkflow = async (req, res) => {
  try {
    const workflow = await loadWorkflow(req.params.id, req.userId);

    if (!workflow) {
      return res.status(404).json({ success: false, message: "Workflow nahi mila." });
    }

    if (workflow.currentItemId) {
      workflow.status = "RUNNING";
      workflow.pausedAt = null;
      await workflow.save();
      const currentItem = await WorkflowItem.findById(workflow.currentItemId).populate(
        "accountId",
        "username platform status tokenExpiresAt desktopSessionStatus"
      );

      return res.json({
        success: true,
        message: "Workflow resume ho gaya.",
        workflow,
        currentItem,
      });
    }

    const item = await prepareItem(workflow, await getNextPendingItem(workflow));
    await refreshWorkflowCounts(workflow);

    res.json({
      success: true,
      message: item ? "Workflow resume ho gaya." : "Workflow complete ho gaya.",
      workflow,
      currentItem: item,
    });
  } catch (error) {
    console.error("Resume workflow error:", error);
    res.status(500).json({ success: false, message: "Workflow resume nahi ho saka." });
  }
};

export const getWorkflowProgress = async (req, res) => {
  try {
    const workflow = await loadWorkflow(req.params.id, req.userId);

    if (!workflow) {
      return res.status(404).json({ success: false, message: "Workflow nahi mila." });
    }

    await refreshWorkflowCounts(workflow);

    res.json({
      success: true,
      progress: {
        completed: workflow.completedAccounts,
        failed: workflow.failedAccounts,
        skipped: workflow.skippedAccounts,
        authRequired: workflow.authRequiredAccounts,
        total: workflow.totalAccounts,
        percent: workflow.totalAccounts
          ? Math.round((workflow.completedAccounts / workflow.totalAccounts) * 100)
          : 0,
      },
    });
  } catch (error) {
    console.error("Progress error:", error);
    res.status(500).json({ success: false, message: "Progress fetch nahi ho saki." });
  }
};

export const deleteWorkflow = async (req, res) => {
  try {
    const workflow = await loadWorkflow(req.params.id, req.userId);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow nahi mila.",
      });
    }

    await WorkflowItem.deleteMany({
      workflowId: workflow._id,
    });

    await Workflow.deleteOne({
      _id: workflow._id,
    });

    await writeAuditLog({
      userId: req.userId,
      action: "WORKFLOW_DELETED",
      entityType: "Workflow",
      entityId: workflow._id,
      metadata: {
        targetUsername: workflow.targetUsername,
        reelUrl: workflow.reelUrl,
        actionType: workflow.actionType,
      },
      req,
    });

    res.json({
      success: true,
      message: "Workflow successfully delete ho gaya.",
    });
  } catch (error) {
    console.error("Delete workflow error:", error);

    res.status(500).json({
      success: false,
      message: "Workflow delete nahi ho saka.",
    });
  }
};
