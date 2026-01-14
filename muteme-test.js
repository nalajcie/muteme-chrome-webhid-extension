/**
 * @filename muteme-test.js
 * @description Test page for MuteMe device - LED control and touch event monitoring
 */

import muteme from './modules/muteme.js';
import { LED_COLOR, LED_EFFECT, MESSAGE } from './modules/constants.js';

// ============================================================================
// State
// ============================================================================
let selectedColor = LED_COLOR.OFF;
let selectedEffect = LED_EFFECT.SOLID;

// ============================================================================
// DOM Elements
// ============================================================================
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const deviceInfo = document.getElementById('deviceInfo');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const colorGrid = document.getElementById('colorGrid');
const effectButtons = document.getElementById('effectButtons');
const touchDisplay = document.getElementById('touchDisplay');
const logContainer = document.getElementById('log');
const clearLogBtn = document.getElementById('clearLogBtn');

// ============================================================================
// Logging
// ============================================================================
function log(message, type = 'info') {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">${time}</span><span class="log-${type}">${message}</span>`;
  logContainer.insertBefore(entry, logContainer.firstChild);
  
  // Keep only last 50 entries
  while (logContainer.children.length > 50) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

// ============================================================================
// UI Updates
// ============================================================================
function updateConnectionUI(connected, device = null) {
  if (connected) {
    statusIndicator.classList.add('connected');
    statusIndicator.classList.remove('disconnected');
    statusText.textContent = 'Connected';
    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
    
    if (device) {
      const status = muteme.getStatus();
      deviceInfo.innerHTML = `
        Device: <span>${status.deviceName}</span> | 
        VID: <span>0x${status.vendorId?.toString(16).padStart(4, '0')}</span> | 
        PID: <span>0x${status.productId?.toString(16).padStart(4, '0')}</span>
      `;
    }
  } else {
    statusIndicator.classList.remove('connected');
    statusIndicator.classList.add('disconnected');
    statusText.textContent = 'Disconnected';
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    deviceInfo.innerHTML = '';
  }
}

function updateTouchDisplay(isTouching, message = null) {
  if (isTouching) {
    touchDisplay.classList.add('touching');
    touchDisplay.classList.remove('idle');
    touchDisplay.textContent = message || '👆 TOUCHING';
  } else {
    touchDisplay.classList.remove('touching');
    touchDisplay.classList.add('idle');
    touchDisplay.textContent = message || 'Waiting for touch...';
  }
}

// ============================================================================
// LED Control
// ============================================================================
async function updateLed() {
  if (!muteme.isConnected) return;
  
  const success = await muteme.setLed(selectedColor, selectedEffect);
  if (success) {
    const colorName = Object.keys(LED_COLOR).find(k => LED_COLOR[k] === selectedColor);
    const effectName = Object.keys(LED_EFFECT).find(k => LED_EFFECT[k] === selectedEffect);
    log(`LED: ${colorName} + ${effectName}`, 'led');
  } else {
    log('Failed to set LED', 'error');
  }
}

function setupColorButtons() {
  colorGrid.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      // Update UI
      colorGrid.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update state and send to device
      selectedColor = parseInt(btn.dataset.color, 10);
      await updateLed();
    });
  });
}

function setupEffectButtons() {
  effectButtons.querySelectorAll('.effect-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      // Update UI
      effectButtons.querySelectorAll('.effect-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update state and send to device
      selectedEffect = parseInt(btn.dataset.effect, 10);
      await updateLed();
    });
  });
}

// ============================================================================
// MuteMe Callbacks
// ============================================================================
function onDeviceConnect(device) {
  updateConnectionUI(true, device);
  log(`Connected: ${device.productName}`, 'device');
  
  // Notify background script if running as extension
  if (chrome?.runtime?.sendMessage) {
    chrome.runtime.sendMessage(MESSAGE.PERMISSION_GRANTED);
  }
}

function onDeviceDisconnect() {
  updateConnectionUI(false);
  updateTouchDisplay(false);
  log('Device disconnected', 'device');
}

function onTouchStart() {
  updateTouchDisplay(true);
  log('Touch START', 'touch');
}

function onTouchEnd(event) {
  updateTouchDisplay(false, event.isTap ? '👆 TAP detected!' : 'Touch ended');
  log(`Touch END (${event.duration}ms, ${event.isTap ? 'TAP' : 'HOLD'})`, 'touch');
  
  // Reset display after a moment
  setTimeout(() => {
    if (!muteme._isTouching) {
      updateTouchDisplay(false);
    }
  }, 1000);
}

function onTouching() {
  // Optional: could update UI to show continuous touch
}

// ============================================================================
// Connection Handlers
// ============================================================================
async function handleConnect() {
  log('Requesting device permission...', 'device');
  const success = await muteme.requestPermission();
  
  if (success) {
    updateConnectionUI(true);
  } else {
    log('Connection failed or cancelled', 'error');
  }
}

async function handleDisconnect() {
  await muteme.disconnect();
  updateConnectionUI(false);
}

// ============================================================================
// Initialization
// ============================================================================
async function init() {
  log('MuteMe Test Page initialized', 'info');
  
  // Setup MuteMe driver
  await muteme.init({
    onConnect: onDeviceConnect,
    onDisconnect: onDeviceDisconnect,
    onTouchStart: onTouchStart,
    onTouchEnd: onTouchEnd,
    onTouching: onTouching,
  });
  
  // Setup UI
  setupColorButtons();
  setupEffectButtons();
  
  connectBtn.addEventListener('click', handleConnect);
  disconnectBtn.addEventListener('click', handleDisconnect);
  clearLogBtn.addEventListener('click', () => {
    logContainer.innerHTML = '';
    log('Log cleared', 'info');
  });
  
  // Check if device is already paired/available
  if (await muteme.isDeviceAvailable()) {
    log('Found paired MuteMe device, attempting connection...', 'device');
    const connected = await muteme.connect();
    if (connected) {
      updateConnectionUI(true);
    }
  } else {
    log('No paired device found. Click "Connect MuteMe" to pair.', 'info');
  }
}

// Run when page loads
window.addEventListener('load', init);
