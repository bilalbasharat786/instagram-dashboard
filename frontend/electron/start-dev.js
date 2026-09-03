import { spawn } from "child_process";
import http from "http";

const devServerUrl = "http://127.0.0.1:5173";

let viteProcess = null;
let electronProcess = null;

const isServerReady = () =>
  new Promise((resolve) => {
    const request = http.get(devServerUrl, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });

    request.on("error", () => resolve(false));
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });

const waitForServer = async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await isServerReady()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Frontend dev server start nahi hua: ${devServerUrl}`);
};

const startViteIfNeeded = async () => {
  if (await isServerReady()) {
    console.log(`Frontend dev server already running: ${devServerUrl}`);
    return;
  }

  console.log("Starting frontend dev server...");
  viteProcess = spawn("npm run dev -- --host 127.0.0.1", {
    shell: true,
    stdio: "inherit",
  });

  await waitForServer();
};

const startElectron = () => {
  console.log("Opening Electron desktop app...");
  electronProcess = spawn("npm run desktop:only", {
    shell: true,
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devServerUrl,
    },
  });

  electronProcess.on("exit", (code) => {
    viteProcess?.kill();
    process.exit(code ?? 0);
  });
};

process.on("SIGINT", () => {
  electronProcess?.kill();
  viteProcess?.kill();
  process.exit(0);
});

try {
  await startViteIfNeeded();
  startElectron();
} catch (error) {
  console.error(error.message);
  viteProcess?.kill();
  process.exit(1);
}
