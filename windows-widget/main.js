const { app, BrowserWindow, Menu, Tray, screen, shell, nativeImage, powerMonitor } = require('electron');
const fs = require('fs');
const path = require('path');

const CLOCK_URL = 'https://cashier.onepointsystems.io/';
const ALLOWED_HOSTS = new Set([
  'cashier.onepointsystems.io',
  'timeclock.onepointsystems.io'
]);
const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 680;
const EDGE_GAP = 14;

let win = null;
let tray = null;
let quitting = false;
let saveTimer = null;
let settings = null;

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
  const height = Math.min(Math.max(size?.height || DEFAULT_HEIGHT, 500), work.height - EDGE_GAP * 2);
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
    { label: 'Reload Time Clock', click: () => win?.webContents.reloadIgnoringCache() },
    { type: 'separator' },
    { label: 'Quit OnePoint Widget', click: () => { quitting = true; app.quit(); } }
  ]));
}

function createTray() {
  const icon = nativeImage.createFromPath(process.execPath);
  tray = new Tray(icon);
  tray.setToolTip('OnePoint Time Clock Widget');
  tray.on('double-click', () => {
    if (!win || win.isDestroyed()) return;
    win.isVisible() ? hideWidget() : showWidget();
  });
  rebuildTrayMenu();
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
    minHeight: 500,
    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: !!settings.alwaysOnTop,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#0b1118',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
      if (ALLOWED_HOSTS.has(u.hostname)) return;
    } catch {}
    event.preventDefault();
    shell.openExternal(url).catch(() => {});
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    console.warn('Time Clock failed to load:', errorDescription, validatedURL);
    setTimeout(() => {
      if (win && !win.isDestroyed()) win.loadURL(CLOCK_URL).catch(() => {});
    }, 10000);
  });

  win.on('move', scheduleSaveBounds);
  win.on('resize', scheduleSaveBounds);
  win.on('close', event => {
    if (quitting) return;
    event.preventDefault();
    hideWidget();
  });

  win.once('ready-to-show', () => showWidget());
  win.loadURL(CLOCK_URL).catch(err => console.warn('Initial Time Clock load failed:', err.message));
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
        if (win && !win.isDestroyed()) win.webContents.reload();
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
