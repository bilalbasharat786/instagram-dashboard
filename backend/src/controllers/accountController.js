import ConnectedAccount from "../models/ConnectedAccount.js";

export const getAccounts = async (req, res) => {
  try {
    const accounts = await ConnectedAccount.find({
      userId: req.userId,
    }).sort({ createdAt: -1 });

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

export const addAccount = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username required hai.",
      });
    }

    const existingAccount = await ConnectedAccount.findOne({
      userId: req.userId,
      username: username.trim(),
    });

    if (existingAccount) {
      return res.status(409).json({
        success: false,
        message: "Ye account already connected hai.",
      });
    }

    const account = await ConnectedAccount.create({
      userId: req.userId,
      username: username.trim(),
      status: "CONNECTED",
      lastAuthenticatedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Account successfully add ho gaya.",
      account,
    });
  } catch (error) {
    console.error("Add account error:", error);

    res.status(500).json({
      success: false,
      message: "Account add nahi ho saka.",
    });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await ConnectedAccount.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account nahi mila.",
      });
    }

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