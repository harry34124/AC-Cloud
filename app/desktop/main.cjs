const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  screen,
  powerMonitor,
} = require("electron");
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const ROOT = path.resolve(__dirname, ".."),
  bundle = require("./release-runtime.cjs")(ROOT),
  DATA =
    process.env.CLOUD_PET_DATA || path.join(app.getPath("appData"), "AC Cloud");
app.setName("AC Cloud");
if (process.platform === "win32") app.setAppUserModelId("ACCloud.Desktop");
function validateInputs() {
  bundle.validate();
}
app.commandLine.appendSwitch("disk-cache-size", "134217728");
fs.mkdirSync(DATA, { recursive: true });
app.setPath("userData", DATA);
app.setPath("crashDumps", path.join(DATA, "Crashpad"));
const stateFile = path.join(DATA, "settings.json");
let settings = { size: 200, x: 0.78, top: true, words: true, autonomous: true },
  win,
  tray,
  server,
  cursorTimer,
  lastReport,
  ready = false;
try {
  settings = { ...settings, ...JSON.parse(fs.readFileSync(stateFile, "utf8")) };
} catch {}
function clean(p) {
  const out = {};
  if (Number.isFinite(p.size)) out.size = Math.max(100, Math.min(300, p.size));
  if (Number.isFinite(p.x)) out.x = Math.max(0, Math.min(1, p.x));
  if (Number.isFinite(p.displayId)) out.displayId = p.displayId;
  for (const key of ["hudX", "hudY"])
    if (Number.isFinite(p[key])) out[key] = Math.max(0, Math.min(1, p[key]));
  for (const k of ["top", "words", "autonomous"])
    if (typeof p[k] === "boolean") out[k] = p[k];
  return out;
}
settings = {
  ...{ size: 200, x: 0.78, top: true, words: true, autonomous: true },
  ...clean(settings),
};
function save(p) {
  settings = { ...settings, ...clean(p) };
  fs.writeFileSync(stateFile + ".tmp", JSON.stringify(settings, null, 2));
  fs.renameSync(stateFile + ".tmp", stateFile);
  return settings;
}
const mime = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};
function startServer() {
  server = http.createServer((req, res) => {
    try {
      const u = new URL(req.url, "http://localhost");
      let rel = decodeURIComponent(u.pathname);
      if (rel === "/") rel = "/desktop/index.html";
      const file = bundle.resolve(rel);
      if (!file) {
        res.writeHead(404);
        return res.end("Not found");
      }
      res.setHeader(
        "Content-Type",
        mime[path.extname(file)] || "application/octet-stream",
      );
      res.setHeader(
        "Cache-Control",
        /^\/02_共用静止与衔接动作\/共用模型\/统一运行库\/objects\/[a-f0-9]{64}\//.test(
          rel,
        )
          ? "private, max-age=31536000, immutable"
          : "no-store",
      );
      fs.createReadStream(file).pipe(res);
    } catch {
      res.writeHead(400);
      res.end("Bad request");
    }
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () =>
      resolve("http://127.0.0.1:" + server.address().port),
    ),
  );
}
function display() {
  return (
    screen.getAllDisplays().find((d) => d.id === settings.displayId) ||
    screen.getPrimaryDisplay()
  );
}
const topmostTimers = new Set();
function clearTopmostRecovery() {
  for (const timer of topmostTimers) clearTimeout(timer);
  topmostTimers.clear();
}
function applyTopmost(raise = false) {
  if (!win || win.isDestroyed()) return;
  // Windows floating/status levels sit below the taskbar. Keep the transparent
  // tool window in the overlay band without activating it or taking keyboard focus.
  win.setAlwaysOnTop(
    settings.top,
    settings.top
      ? process.platform === "win32"
        ? "screen-saver"
        : "floating"
      : "normal",
  );
  if (settings.top && raise && win.isVisible() && !win.isMinimized())
    win.moveTop();
}
function recoverTopmost(delay = 0) {
  clearTopmostRecovery();
  if (!win || win.isDestroyed() || !settings.top || !win.isVisible()) return;
  // Explorer, display and unlock transitions may replace the native z-order
  // after their first event. Two bounded retries, rather than a polling timer.
  for (const wait of [delay, delay + 150, delay + 900]) {
    const timer = setTimeout(() => {
      topmostTimers.delete(timer);
      if (settings.top && win && !win.isDestroyed() && win.isVisible())
        applyTopmost(true);
    }, wait);
    topmostTimers.add(timer);
  }
}
function cover() {
  if (!win || win.isDestroyed()) return;
  const d = display();
  win.setBounds(d.workArea);
  recoverTopmost();
}
function action(name, value) {
  if (!win || win.isDestroyed()) return;
  if (name === "quit") {
    app.quit();
    return;
  }
  if (name === "hide") {
    clearTopmostRecovery();
    win.hide();
    return;
  }
  if (name === "show") {
    win.showInactive();
    recoverTopmost();
    return;
  }
  if (name === "focus") {
    if (!process.env.CLOUD_PET_TEST_RESULT) win.focus();
    return;
  }
  if (name === "top") {
    save({ top: !settings.top });
    clearTopmostRecovery();
    applyTopmost(settings.top);
    if (settings.top) recoverTopmost();
    rebuild();
    win.webContents.send("cloud:action", { name: "prefs", value: settings });
    return;
  }
  if (name === "display") {
    save({
      displayId: screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
        .id,
    });
    cover();
    win.showInactive();
    recoverTopmost();
    name = "home";
  }
  win.webContents.send("cloud:action", { name, value });
}
function actionMenus() {
  const groups = new Map();
  for (const a of JSON.parse(
    fs.readFileSync(path.join(__dirname, "daily.json"), "utf8"),
  ).actions) {
    const label = a.category ?? "日常动作";
    if (!groups.has(label)) groups.set(label, []);
    groups
      .get(label)
      .push({
        label: a.id + " · " + a.label,
        click: () => action("daily", a.id),
      });
  }
  return [...groups].map(([label, submenu]) => ({ label, submenu }));
}
function rebuild() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "显示桌宠", click: () => action("show") },
      { label: "动作", submenu: actionMenus() },
      { label: "暂停 / 继续", click: () => action("pause") },
      {
        label: "人物大小",
        submenu: [100, 150, 200, 250, 300].map((h) => ({
          label: h + " px",
          type: "radio",
          checked: settings.size === h,
          click: () => action("size", h),
        })),
      },
      {
        label: "始终置顶",
        type: "checkbox",
        checked: settings.top,
        click: () => action("top"),
      },
      { label: "移到鼠标所在屏幕", click: () => action("display") },
      { type: "separator" },
      { label: "退出桌宠", click: () => action("quit") },
    ]),
  );
}
async function boot() {
  validateInputs();
  const selection = JSON.parse(
      fs.readFileSync(path.join(__dirname, "hero-selection.json"), "utf8"),
    ),
    model = JSON.parse(
      fs.readFileSync(bundle.resolve(selection.model), "utf8"),
    ),
    moc = fs.readFileSync(bundle.resolve(model.FileReferences.Moc));
  if (
    moc.length !== selection.moc_bytes ||
    require("node:crypto").createHash("sha256").update(moc).digest("hex") !==
      selection.moc_sha256
  )
    throw Error("英雄落地模型校验失败");
  const origin = await startServer();
  win = new BrowserWindow({
    title: "AC Cloud",
    ...display().workArea,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: !process.env.CLOUD_PET_UI_TEST,
    show: false,
    alwaysOnTop: settings.top,
    type: process.env.CLOUD_PET_UI_TEST ? "normal" : "toolbar",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.setIgnoreMouseEvents(true, { forward: true });
  applyTopmost();
  cover();
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(origin + "/")) e.preventDefault();
  });
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect x="1" y="1" width="30" height="30" rx="8" fill="#25334e"/><path d="M8 24L13 9l4 5 7-7-3 14-7-3z" fill="#efce76"/></svg>',
    ),
  );
  // PNG is generated by prepare/QA for Windows; retain a usable native fallback.
  const png = path.join(__dirname, "icon.png");
  tray = new Tray(fs.existsSync(png) ? nativeImage.createFromPath(png) : icon);
  tray.setToolTip("AC Cloud");
  tray.on("double-click", () => action("show"));
  rebuild();
  ipcMain.handle("cloud:load", (e) => {
    if (!win || win.isDestroyed() || e.sender !== win.webContents)
      throw Error("Unknown sender");
    return settings;
  });
  ipcMain.handle("cloud:save", (e, p) => {
    if (!win || win.isDestroyed() || e.sender !== win.webContents)
      throw Error("Unknown sender");
    save(p || {});
    rebuild();
    return settings;
  });
  ipcMain.on("cloud:interactive", (e, on) => {
    if (win && !win.isDestroyed() && e.sender === win.webContents)
      win.setIgnoreMouseEvents(!on, { forward: true });
  });
  const commands = new Set([
    "quit",
    "hide",
    "show",
    "focus",
    "top",
    "display",
    "home",
    "idle",
    "tap",
    "pause",
    "size",
    "dialogue",
    "daily",
    "autonomous",
  ]);
  ipcMain.on("cloud:command", (e, { name, value }) => {
    if (
      win &&
      !win.isDestroyed() &&
      e.sender === win.webContents &&
      commands.has(name)
    )
      action(name, value);
  });
  ipcMain.on("cloud:report", async (e, data) => {
    if (!win || win.isDestroyed() || e.sender !== win.webContents) return;
    lastReport = data;
    fs.writeFileSync(
      path.join(DATA, "status.json"),
      JSON.stringify(
        {
          ...data,
          settings,
          window: win.getBounds(),
          pid: process.pid,
          appMetrics: app
            .getAppMetrics()
            .map((m) => ({ type: m.type, memory: m.memory })),
        },
        null,
        2,
      ),
    );
    if (data.ready && !ready) {
      ready = true;
      if (
        !process.env.CLOUD_PET_TEST_RESULT ||
        process.env.CLOUD_PET_UI_TEST === "1"
      )
        win.showInactive();
      if (process.env.CLOUD_PET_CAPTURE)
        setTimeout(async () => {
          if (!win.isDestroyed())
            fs.writeFileSync(
              process.env.CLOUD_PET_CAPTURE,
              (await win.webContents.capturePage()).toPNG(),
            );
        }, 800);
    }
  });
  win.webContents.on("console-message", (_e, level, message) => {
    if (level >= 2)
      fs.appendFileSync(path.join(DATA, "errors.log"), message + "\n");
  });
  win.webContents.on("render-process-gone", (_e, d) =>
    fs.appendFileSync(
      path.join(DATA, "errors.log"),
      "Renderer " + JSON.stringify(d) + "\n",
    ),
  );
  win.on("blur", () => {
    win.webContents.send("cloud:action", { name: "blur" });
    recoverTopmost(100);
  });
  win.on("hide", () => {
    clearTopmostRecovery();
    win.webContents.send("cloud:action", { name: "visibility", value: false });
  });
  win.on("show", () => {
    win.webContents.send("cloud:action", { name: "visibility", value: true });
    recoverTopmost();
  });
  win.on("restore", () => recoverTopmost());
  win.on("focus", () => recoverTopmost());
  win.on("always-on-top-changed", (_event, on) => {
    if (settings.top && !on) recoverTopmost();
  });
  win.on("closed", () => {
    clearTopmostRecovery();
    win = null;
  });
  let previous = "";
  cursorTimer = setInterval(() => {
    if (!win?.isVisible()) return;
    const p = screen.getCursorScreenPoint(),
      b = win.getBounds(),
      q = { x: p.x - b.x, y: p.y - b.y };
    const key = q.x + "," + q.y;
    if (key === previous) return;
    previous = key;
    win.webContents.send("cloud:cursor", q);
  }, 33);
  for (const event of [
    "display-metrics-changed",
    "display-added",
    "display-removed",
  ])
    screen.on(event, cover);
  for (const event of ["resume", "unlock-screen"])
    powerMonitor.on(event, cover);
  await win.loadURL(origin + "/desktop/index.html");
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", (_e, argv) => {
    if (argv.includes("--quit")) app.quit();
    else action("show");
  });
  app
    .whenReady()
    .then(boot)
    .catch((e) => {
      fs.appendFileSync(path.join(DATA, "errors.log"), String(e.stack || e));
      app.quit();
    });
  app.on("before-quit", () => {
    clearTopmostRecovery();
    clearInterval(cursorTimer);
    tray?.destroy();
    server?.close();
  });
  app.on("window-all-closed", () => app.quit());
}
