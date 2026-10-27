const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("cloudHost", {
  load: () => ipcRenderer.invoke("cloud:load"),
  save: (patch) => ipcRenderer.invoke("cloud:save", patch),
  interactive: (on) => ipcRenderer.send("cloud:interactive", Boolean(on)),
  command: (name, value) => ipcRenderer.send("cloud:command", { name, value }),
  report: (data) => ipcRenderer.send("cloud:report", data),
  onCursor: (cb) => ipcRenderer.on("cloud:cursor", (_e, p) => cb(p)),
  onCommand: (cb) => ipcRenderer.on("cloud:action", (_e, p) => cb(p)),
});
