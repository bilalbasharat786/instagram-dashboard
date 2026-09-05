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
const injectWorkflowControls = async (window) => {
  await window.webContents.executeJavaScript(`
    (() => {
      const existing = document.getElementById("instaflow-next-account");
      if (existing) return;
      let openingNext = false;

      // 1. Next Account Button Create aur Style Karna
      const button = document.createElement("button");
      button.id = "instaflow-next-account";
      button.textContent = "Next Account";
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

      // 3. Instagram page par Follow button dhoondna (Auto-Follow logic)
      const triggerAutoFollow = () => {
        setTimeout(() => {
          // Instagram ke saare buttons nikalna
          const buttons = Array.from(document.querySelectorAll("button"));
          
          // Woh button dhoondna jiska text exact "Follow" ho
          const followButton = buttons.find(btn => btn.textContent.trim() === "Follow");

          if (followButton) {
            button.textContent = "Auto-Following...";
            followButton.click(); // Auto click the follow button
            
            // Follow click hone ke baad next account par switch karna (800ms baad)
            setTimeout(() => {
              openNextAccount("Opening next...");
            }, 800);
          } else {
            // Agar "Follow" button nahi mila (e.g. Pehle se followed hai ya net slow hai)
            console.log("Follow button nahi mila ya pehle se followed hai.");
          }
        }, 2000); // 2 second ka wait/delay
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

          if (clickedText === "Follow") {
            button.textContent = "Follow clicked...";
            setTimeout(() => openNextAccount("Opening next..."), 800);
          }
        },
        true
      );

      button.addEventListener("click", () => openNextAccount("Opening next..."));
      document.body.appendChild(button);

      // Script inject hote hi Auto-Follow function ko chala dena
      triggerAutoFollow();
    })();
  `);
};
// ================= MODIFIED FUNCTION END =================

const openInstagramWindow = async ({
  accountId,
  username,
  targetUsername,
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
  const url = targetUrlFor(targetUsername);

  const window = new BrowserWindow({
    width: 1180,
    height: 860,
    title: mode === "login" ? `Login @${username}` : `@${username} -> @${targetUsername}`,
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
    });

    window.on("closed", () => {
      workflowWindows.delete(webContentsId);
    });

    window.webContents.on("did-finish-load", () => {
      injectWorkflowControls(window).catch(() => {});
    });

    await injectWorkflowControls(window);
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

