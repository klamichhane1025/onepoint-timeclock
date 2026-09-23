const { app, BrowserWindow, Menu, Tray, screen, shell, nativeImage, powerMonitor } = require('electron');
const fs = require('fs');
const path = require('path');

const CLOCK_URL = 'https://cashier.onepointsystems.io/timeclock/?widget=1';
const ALLOWED_HOSTS = new Set([
  'cashier.onepointsystems.io',
  'timeclock.onepointsystems.io'
]);
const DEFAULT_WIDTH = 430;
const DEFAULT_HEIGHT = 600;
const EDGE_GAP = 14;

let win = null;
let tray = null;
let quitting = false;
let saveTimer = null;
let settings = null;
let renderRecoveryAttempts = 0;

function settingsPath() {
  return path.join(app.getPath('userData'), 'widget-settings.json');
}

function loadSettings() {
  const fallback = {
    alwaysOnTop: true,
    startWithWindows: true,
    corner: 'bottom-right',
    bounds: null
  };
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function saveSettings() {
  if (!settings) return;
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf8');
  } catch (err) {
    console.warn('Unable to save widget settings:', err.message);
  }
}

function scheduleSaveBounds() {
  if (!win || win.isDestroyed()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!win || win.isDestroyed() || win.isMinimized()) return;
    settings.bounds = win.getBounds();
    settings.corner = 'custom';
    saveSettings();
  }, 250);
}

function displayForBounds(bounds) {
  if (!bounds) return screen.getPrimaryDisplay();
  return screen.getDisplayMatching(bounds) || screen.getPrimaryDisplay();
}

function isVisibleOnAnyDisplay(bounds) {
  if (!bounds) return false;
  return screen.getAllDisplays().some(({ workArea }) => {
    const x1 = Math.max(bounds.x, workArea.x);
    const y1 = Math.max(bounds.y, workArea.y);
    const x2 = Math.min(bounds.x + bounds.width, workArea.x + workArea.width);
    const y2 = Math.min(bounds.y + bounds.height, workArea.y + workArea.height);
    return x2 - x1 >= 80 && y2 - y1 >= 80;
  });
}

function boundsForCorner(corner, display = screen.getPrimaryDisplay(), size = null) {
  const work = display.workArea;
  const width = Math.min(Math.max(size?.width || DEFAULT_WIDTH, 340), work.width - EDGE_GAP * 2);
  const height = Math.min(Math.max(size?.height || DEFAULT_HEIGHT, 480), work.height - EDGE_GAP * 2);
  const left = work.x + EDGE_GAP;
  const right = work.x + work.width - width - EDGE_GAP;
  const top = work.y + EDGE_GAP;
  const bottom = work.y + work.height - height - EDGE_GAP;
  switch (corner) {
    case 'top-left': return { x: left, y: top, width, height };
    case 'top-right': return { x: right, y: top, width, height };
    case 'bottom-left': return { x: left, y: bottom, width, height };
    default: return { x: right, y: bottom, width, height };
  }
}

function snapTo(corner) {
  if (!win || win.isDestroyed()) return;
  const current = win.getBounds();
  const display = displayForBounds(current);
  const next = boundsForCorner(corner, display, current);
  settings.corner = corner;
  settings.bounds = next;
  win.setBounds(next, true);
  saveSettings();
}

function setStartWithWindows(enabled) {
  settings.startWithWindows = !!enabled;
  if (process.platform === 'win32' && app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: !!enabled,
      path: process.execPath,
      args: []
    });
  }
  saveSettings();
}

function setAlwaysOnTop(enabled) {
  settings.alwaysOnTop = !!enabled;
  if (win && !win.isDestroyed()) {
    win.setAlwaysOnTop(!!enabled, 'floating');
  }
  saveSettings();
  rebuildTrayMenu();
}

function showWidget() {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function hideWidget() {
  if (win && !win.isDestroyed()) win.hide();
}

function loadClock({ ignoreCache = false } = {}) {
  if (!win || win.isDestroyed()) return;
  if (ignoreCache) {
    win.webContents.session.clearCache().catch(() => {}).finally(() => {
      if (win && !win.isDestroyed()) win.loadURL(CLOCK_URL).catch(showLoadFailure);
    });
    return;
  }
  win.loadURL(CLOCK_URL).catch(showLoadFailure);
}

function showLoadFailure(error) {
  if (!win || win.isDestroyed()) return;
  const detail = String(error?.message || error || 'Unable to load the cashier clock.');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#08111d;color:#f7f9fc;font-family:Segoe UI,Arial,sans-serif}body{display:grid;place-items:center;padding:20px;box-sizing:border-box}.card{width:min(360px,100%);padding:24px;border-radius:22px;background:#10243a;border:1px solid rgba(120,180,255,.26);box-shadow:0 20px 50px rgba(0,0,0,.35)}h1{font-size:23px;margin:0 0 10px}p{color:#b8c4d1;line-height:1.45;font-size:14px}button{width:100%;height:48px;border:0;border-radius:12px;background:#1687e8;color:#fff;font-weight:700;font-size:15px;cursor:pointer}.small{font-size:11px;color:#7890a6;margin-top:14px;word-break:break-word}</style></head><body><div class="card"><h1>OnePoint Time Clock</h1><p>The cashier screen could not load. Check the internet connection, then retry. If you are already offline, the previously cached clock will load when available.</p><button onclick="location.href='${CLOCK_URL}'">Retry Time Clock</button><div class="small">${detail.replace(/[<>&]/g, '')}</div></div></body></html>`;
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(() => {});
}

function verifyRenderedClock() {
  if (!win || win.isDestroyed()) return;
  setTimeout(async () => {
    if (!win || win.isDestroyed()) return;
    try {
      const state = await win.webContents.executeJavaScript(`(() => ({
        hasClock: !!document.querySelector('.clock'),
        hasContent: !!(document.querySelector('#content')?.textContent || '').trim(),
        ready: document.readyState,
        href: location.href
      }))()`);
      if (state?.hasClock || state?.hasContent) {
        renderRecoveryAttempts = 0;
        return;
      }
      if (renderRecoveryAttempts < 1) {
        renderRecoveryAttempts += 1;
        loadClock({ ignoreCache: true });
        return;
      }
      showLoadFailure(new Error(`Cashier page loaded but did not render (${state?.ready || 'unknown'}).`));
    } catch (err) {
      showLoadFailure(err);
    }
  }, 5000);
}

function rebuildTrayMenu() {
  if (!tray) return;
  const loginEnabled = process.platform === 'win32' && app.isPackaged
    ? app.getLoginItemSettings().openAtLogin
    : settings.startWithWindows;

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show OnePoint Widget', click: showWidget },
    { label: 'Hide Widget', click: hideWidget },
    { type: 'separator' },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: !!settings.alwaysOnTop,
      click: item => setAlwaysOnTop(item.checked)
    },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: !!loginEnabled,
      click: item => setStartWithWindows(item.checked)
    },
    {
      label: 'Snap to Corner',
      submenu: [
        { label: 'Top Left', click: () => snapTo('top-left') },
        { label: 'Top Right', click: () => snapTo('top-right') },
        { label: 'Bottom Left', click: () => snapTo('bottom-left') },
        { label: 'Bottom Right', click: () => snapTo('bottom-right') }
      ]
    },
    { label: 'Reset Size', click: () => {
      if (!win || win.isDestroyed()) return;
      const display = displayForBounds(win.getBounds());
      const corner = settings.corner === 'custom' ? 'bottom-right' : settings.corner;
      const next = boundsForCorner(corner, display, { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
      settings.bounds = next;
      settings.corner = corner;
      win.setBounds(next, true);
      saveSettings();
    } },
    { label: 'Reload Time Clock', click: () => { renderRecoveryAttempts = 0; loadClock({ ignoreCache: true }); } },
    { type: 'separator' },
    { label: 'Quit OnePoint Widget', click: () => { quitting = true; app.quit(); } }
  ]));
}

function createTray() {
  try {
    const icon = nativeImage.createFromPath(process.execPath);
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    tray.setToolTip('OnePoint Time Clock Widget');
    tray.on('double-click', () => {
      if (!win || win.isDestroyed()) return;
      win.isVisible() ? hideWidget() : showWidget();
    });
    rebuildTrayMenu();
  } catch (err) {
    console.warn('Tray unavailable:', err.message);
  }
}

function createWindow() {
  let initial = settings.bounds;
  if (!isVisibleOnAnyDisplay(initial)) {
    initial = boundsForCorner(
      settings.corner && settings.corner !== 'custom' ? settings.corner : 'bottom-right'
    );
    settings.bounds = initial;
    saveSettings();
  }

  win = new BrowserWindow({
    ...initial,
    title: 'OnePoint Time Clock',
    minWidth: 340,
    minHeight: 480,
    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: !!settings.alwaysOnTop,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#08111d',
    webPreferences: {
      partition: 'persist:onepoint-pos-widget',
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  win.setMenuBarVisibility(false);
  win.setAlwaysOnTop(!!settings.alwaysOnTop, 'floating');

  const ses = win.webContents.session;
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (ALLOWED_HOSTS.has(u.hostname)) return { action: 'allow' };
    } catch {}
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    try {
      const u = new URL(url);
      if (ALLOWED_HOSTS.has(u.hostname) || u.protocol === 'data:') return;
    } catch {}
    event.preventDefault();
    shell.openExternal(url).catch(() => {});
  });

  win.webContents.on('did-finish-load', verifyRenderedClock);
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    console.warn('Time Clock failed to load:', errorDescription, validatedURL);
    showLoadFailure(new Error(`${errorDescription} (${errorCode})`));
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    console.warn('Time Clock renderer exited:', details.reason);
    setTimeout(() => loadClock({ ignoreCache: true }), 1500);
  });
  win.on('unresponsive', () => {
    console.warn('Time Clock window became unresponsive; reloading.');
    loadClock({ ignoreCache: true });
  });

  win.on('move', scheduleSaveBounds);
  win.on('resize', scheduleSaveBounds);
  win.on('close', event => {
    if (quitting) return;
    event.preventDefault();
    hideWidget();
  });

  win.once('ready-to-show', () => showWidget());
  loadClock();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', showWidget);

  app.whenReady().then(() => {
    settings = loadSettings();
    if (settings.startWithWindows) setStartWithWindows(true);
    createWindow();
    createTray();

    powerMonitor.on('resume', () => {
      setTimeout(() => {
        renderRecoveryAttempts = 0;
        loadClock();
      }, 1500);
    });

    app.on('activate', showWidget);
  });

  app.on('before-quit', () => {
    quitting = true;
    saveSettings();
  });

  app.on('window-all-closed', event => {
    if (process.platform !== 'darwin') event?.preventDefault?.();
  });
}
