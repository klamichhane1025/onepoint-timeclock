const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('onePointDesktopWidget', Object.freeze({
  platform: 'windows',
  shell: 'electron',
  version: '1.0.0'
}));

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-onepoint-desktop-widget', 'true');
});
