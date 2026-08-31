import Workflow from "../models/Workflow.js";
import WorkflowItem from "../models/WorkflowItem.js";
import ConnectedAccount from "../models/ConnectedAccount.js";

export const createWorkflow = async (req, res) => {
  try {
    const { targetUsername, accountIds } = req.body;

    if (!targetUsername) {
      return res.status(400).json({
        success: false,
        message: "Target username required hai.",
      });
    }

    if (
      !Array.isArray(accountIds) ||
      accountIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Kam az kam 1 account select karo.",
      });
    }

    const accounts = await ConnectedAccount.find({
      _id: { $in: accountIds },
      userId: req.userId,
    });

    if (accounts.length !== accountIds.length) {
      return res.status(400).json({
        success: false,
        message: "Kuch selected accounts valid nahi hain.",
      });
    }

    const workflow = await Workflow.create({
      userId: req.userId,
      targetUsername: targetUsername.trim(),
      status: "READY",
      totalAccounts: accounts.length,
    });

    const items = accounts.map((account) => ({
      workflowId: workflow._id,
      accountId: account._id,
      status: "PENDING",
    }));

    await WorkflowItem.insertMany(items);

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
    const { id } = req.params;

    const workflow = await Workflow.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow nahi mila.",
      });
    }

    const items = await WorkflowItem.find({
      workflowId: workflow._id,
    })
      .populate("accountId", "username platform status")
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      workflow,
      items,
    });
  } catch (error) {
    console.error("Get workflow detail error:", error);

    res.status(500).json({
      success: false,
      message: "Workflow detail fetch nahi ho saki.",
    });
  }
};
export const deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.params;

    const workflow = await Workflow.findOne({
      _id: id,
      userId: req.userId,
    });

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