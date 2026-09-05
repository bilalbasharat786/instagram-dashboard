import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;
const workflowWindows = new Map();

const sanitizePartition = (value) =>
  String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80);

const targetUrlFor = (targetUsername) => {
  const target = String(targetUsername || "").replace(/^@/, "").trim();
  return target
    ? `https://www.instagram.com/${encodeURIComponent(target)}/`
    : "https://www.instagram.com/";
};

const destinationUrlFor = ({ targetUrl, targetUsername }) => {
  const url = String(targetUrl || "").trim();

  if (url.startsWith("https://www.instagram.com/")) {
    return url;
  }

  return targetUrlFor(targetUsername);
};

const createMainWindow = async () => {
  const window = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 980,
    minHeight: 680,
    title: "Instagram Workflow Dashboard",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173";

    try {
      await window.loadURL(devServerUrl);
    } catch {
      await window.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(`
          <main style="font-family: Arial, sans-serif; padding: 40px; line-height: 1.5;">
            <h1>Frontend dev server nahi chal raha</h1>
            <p>Pehlay frontend dev server start karo ya recommended command use karo:</p>
            <pre style="background: #f3f4f6; padding: 16px;">cd frontend
npm run desktop</pre>
          </main>
        `)}`
      );
    }
  } else {
    await window.loadFile(path.join(__dirname, "../dist/index.html"));
  }
};

const postJson = async (url, token) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Workflow next account load nahi ho saka.");
  }

  return data;
};

// ================= MODIFIED FUNCTION START =================
const injectWorkflowControls = async (window, actionType = "FOLLOW") => {
  const safeActionType = ["FOLLOW", "UNFOLLOW", "LIKE_REEL"].includes(actionType)
    ? actionType
    : "FOLLOW";

  await window.webContents.executeJavaScript(`
    (() => {
      const existing = document.getElementById("instaflow-next-account");
      if (existing) return;
      let openingNext = false;
      const actionType = ${JSON.stringify(safeActionType)};
      const actionLabel =
        actionType === "LIKE_REEL" ? "Like Reel" : actionType === "UNFOLLOW" ? "Unfollow" : "Follow";

      // 1. Next Account Button Create aur Style Karna
      const button = document.createElement("button");
      button.id = "instaflow-next-account";
      button.textContent = actionType === "LIKE_REEL" ? "Like Manually, Then Next" : "Next Account";
      button.style.position = "fixed";
      button.style.right = "18px";
      button.style.top = "72px";
      button.style.zIndex = "2147483647";
      button.style.border = "0";
      button.style.borderRadius = "10px";
      button.style.padding = "12px 16px";
      button.style.background = "#2563eb";
      button.style.color = "#ffffff";
      button.style.font = "700 14px Arial, sans-serif";
      button.style.boxShadow = "0 10px 24px rgba(0, 0, 0, 0.35)";
      button.style.cursor = "pointer";

      // 2. Next Account Open karne ka function
      const openNextAccount = async (label = "Opening next...") => {
        if (openingNext) return;

        openingNext = true;
        button.disabled = true;
        button.textContent = label;

        try {
          const result = await window.instagramDesktop.nextWorkflowAccount();
          button.textContent = result?.complete ? "Workflow Complete" : "Next Opened";
        } catch (error) {
          openingNext = false;
          button.disabled = false;
          button.textContent = "Try Next Again";
          alert(error?.message || "Next account open nahi ho saka.");
        }
      };

      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const getButtonText = (element) =>
        (element?.innerText || element?.textContent || "").replace(/\\s+/g, " ").trim();
      const getAriaText = (element) =>
        (element?.getAttribute?.("aria-label") || element?.getAttribute?.("title") || "").replace(/\\s+/g, " ").trim();
      const isVisible = (element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const styles = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && styles.visibility !== "hidden" && styles.display !== "none";
      };
      const actionableSelector = [
        "button",
        "[role='button']",
        "div[tabindex='0']",
        "span[tabindex='0']",
        "a[href]",
      ].join(",");
      const textMatches = (element, texts) => {
        const wanted = Array.isArray(texts) ? texts : [texts];
        const visibleText = getButtonText(element);
        const ariaText = getAriaText(element);
        return wanted.some((text) => visibleText === text || ariaText === text);
      };
      const findActionableByText = (texts, root = document) => {
        const candidates = Array.from(root.querySelectorAll(actionableSelector));
        return candidates.find((candidate) => isVisible(candidate) && textMatches(candidate, texts));
      };
      const findDialogActionByText = (texts) => {
        const dialog = document.querySelector("[role='dialog']");
        return findActionableByText(texts, dialog || document);
      };
      const clickElement = (element) => {
        if (!element) return false;
        element.scrollIntoView?.({ block: "center", inline: "center" });
        element.focus?.();
        ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
          element.dispatchEvent(
            new MouseEvent(type, {
              bubbles: true,
              cancelable: true,
              view: window,
            })
          );
        });
        return true;
      };
      const waitForActionableByText = async (texts, options = {}) => {
        const timeoutMs = options.timeoutMs || 12000;
        const intervalMs = options.intervalMs || 350;
        const find = options.dialogOnly ? findDialogActionByText : findActionableByText;
        const startedAt = Date.now();

        while (Date.now() - startedAt < timeoutMs) {
          const element = find(texts);
          if (element) return element;
          await sleep(intervalMs);
        }

        return null;
      };

      const finishAction = (label = actionLabel + " clicked...") => {
        button.textContent = label;
        setTimeout(() => {
          openNextAccount("Opening next...");
        }, 800);
      };

      const triggerAutoFollow = () => {
        setTimeout(async () => {
          const followButton = await waitForActionableByText("Follow", { timeoutMs: 12000 });

          if (followButton) {
            button.textContent = "Auto-Following...";
            clickElement(followButton);
            finishAction("Follow clicked...");
          } else {
            console.log("Follow button nahi mila ya pehle se followed hai.");
          }
        }, 2000);
      };

      const triggerAutoUnfollow = () => {
        setTimeout(async () => {
          const followingButton = await waitForActionableByText(["Following", "Requested"], {
            timeoutMs: 12000,
          });

          if (!followingButton) {
            console.log("Following/Requested button nahi mila ya account already unfollowed hai.");
            return;
          }

          button.textContent = "Opening unfollow...";
          clickElement(followingButton);

          const unfollowButton = await waitForActionableByText("Unfollow", {
            timeoutMs: 12000,
            dialogOnly: true,
          });

          if (unfollowButton) {
            button.textContent = "Auto-Unfollowing...";
            clickElement(unfollowButton);
            finishAction("Unfollow clicked...");
          } else {
            button.disabled = false;
            button.textContent = "Click Unfollow / Next";
            console.log("Unfollow confirmation button nahi mila.");
          }
        }, 2000);
      };

      // 4. Fallback Event Listener (Agar user khud manually kisi aur cheez par click kare)
      const getClickedText = (target) => {
        const control = target?.closest?.("button, [role='button'], div[tabindex='0']");
        return (control?.textContent || "").replace(/\\s+/g, " ").trim();
      };

      document.addEventListener(
        "click",
        (event) => {
          if (event.target?.id === "instaflow-next-account") return;

          const clickedText = getClickedText(event.target);

          if (
            (actionType === "FOLLOW" && clickedText === "Follow") ||
            (actionType === "UNFOLLOW" && clickedText === "Unfollow")
          ) {
            finishAction(actionLabel + " clicked...");
          }
        },
        true
      );

      button.addEventListener("click", () => openNextAccount("Opening next..."));
      document.body.appendChild(button);

      if (actionType === "LIKE_REEL") {
        console.log("Safe reel like workflow ready. Like manually, then press Next Account.");
      } else if (actionType === "UNFOLLOW") {
        triggerAutoUnfollow();
      } else {
        triggerAutoFollow();
      }
    })();
  `);
};
// ================= MODIFIED FUNCTION END =================

const openInstagramWindow = async ({
  accountId,
  username,
  targetUsername,
  targetUrl,
  actionType = "FOLLOW",
  mode,
  workflowId,
  authToken,
  apiBaseUrl,
}) => {
  const safeAccountId = sanitizePartition(accountId);

  if (!safeAccountId) {
    throw new Error("Valid account id required hai.");
  }

  const partition = `persist:instagram-${safeAccountId}`;
  const url = destinationUrlFor({ targetUrl, targetUsername });

  const window = new BrowserWindow({
    width: 1180,
    height: 860,
    title:
      mode === "login"
        ? `Login @${username}`
        : `${actionType === "LIKE_REEL" ? "Like Reel" : actionType === "UNFOLLOW" ? "Unfollow" : "Follow"} @${username}`,
    webPreferences: {
      partition,
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url: nextUrl }) => {
    if (nextUrl.startsWith("https://www.instagram.com/")) {
      return { action: "allow" };
    }

    shell.openExternal(nextUrl);
    return { action: "deny" };
  });

  await window.loadURL(url);

  if (mode === "target" && workflowId && authToken && apiBaseUrl) {
    const webContentsId = window.webContents.id;

    workflowWindows.set(webContentsId, {
      workflowId,
      authToken,
      apiBaseUrl: String(apiBaseUrl).replace(/\/$/, ""),
      targetUsername,
      targetUrl,
      actionType,
    });

    window.on("closed", () => {
      workflowWindows.delete(webContentsId);
    });

    window.webContents.on("did-finish-load", () => {
      injectWorkflowControls(window, actionType).catch(() => {});
    });

    await injectWorkflowControls(window, actionType);
  }

  return {
    success: true,
    partition,
    openedUrl: url,
  };
};

app.whenReady().then(async () => {
  ipcMain.handle("instagram:open-login-session", (_event, payload) =>
    openInstagramWindow({ ...payload, mode: "login" })
  );

  ipcMain.handle("instagram:open-target-session", (_event, payload) =>
    openInstagramWindow({ ...payload, mode: "target" })
  );

  ipcMain.handle("workflow:next-account", async (event) => {
    const context = workflowWindows.get(event.sender.id);

    if (!context) {
      throw new Error("Is Instagram window ke liye workflow context nahi mila.");
    }

    const result = await postJson(
      `${context.apiBaseUrl}/workflows/${context.workflowId}/next`,
      context.authToken
    );

    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    const nextItem = result.currentItem;
    const nextAccount = nextItem?.accountId;

    if (!nextItem || !nextAccount?._id) {
      currentWindow?.close();
      return {
        success: true,
        complete: true,
        message: result.message || "Workflow complete ho gaya.",
      };
    }

    await openInstagramWindow({
      accountId: nextAccount._id,
      username: nextAccount.username,
      targetUsername: result.workflow?.targetUsername || context.targetUsername,
      targetUrl: nextItem.targetProfileUrl || context.targetUrl,
      actionType: result.workflow?.actionType || context.actionType,
      mode: "target",
      workflowId: context.workflowId,
      authToken: context.authToken,
      apiBaseUrl: context.apiBaseUrl,
    });

    currentWindow?.close();

    return {
      success: true,
      complete: false,
      message: "Next account target open ho gaya.",
    };
  });

  await createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

