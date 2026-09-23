# OnePoint Time Clock Widget for Windows

A lightweight Windows desktop shell for the existing OnePoint cashier/time-clock app.

## Behavior

- Opens `https://cashier.onepointsystems.io/` in a persistent Electron profile.
- Defaults to the bottom-right corner of the active Windows desktop.
- Window is movable and resizable and remembers its last bounds.
- Always-on-top is enabled by default and can be toggled from the tray menu.
- Closing the window hides it to the Windows system tray instead of terminating it.
- Tray menu supports Show, Hide, four corner snap positions, Reset Size, Reload, Start with Windows, Always on Top, and Quit.
- Starts automatically at Windows sign-in after installation unless disabled from the tray menu.
- Uses the persistent Electron partition `persist:onepoint-pos-widget` so the OnePoint POS registration survives app restarts and upgrades.
- On the first install, link/activate the widget once using the existing OnePoint secure POS/browser-link flow. It does not use IP address, Wi-Fi SSID, router identity, MAC address, or browser fingerprinting as device identity.
- Timesheet, punch, payroll, and authentication logic remains on the existing OnePoint web application/backend.

## Cloud build

GitHub Actions workflow: `.github/workflows/build-windows-widget.yml`

The workflow builds an x64 NSIS installer on `windows-latest` and uploads an artifact named `OnePoint-Time-Clock-Widget-Windows` containing:

`OnePoint-Time-Clock-Widget-1.0.0-Setup.exe`

No local developer machine is required to build the installer.
