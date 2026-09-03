const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("instagramDesktop", {
  isElectron: true,
  openLoginSession: (payload) =>
    ipcRenderer.invoke("instagram:open-login-session", payload),
  openTargetSession: (payload) =>
    ipcRenderer.invoke("instagram:open-target-session", payload),
  nextWorkflowAccount: () =>
    ipcRenderer.invoke("workflow:next-account"),
});
