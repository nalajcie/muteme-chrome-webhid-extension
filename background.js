/**
 * @filename background.js
 * @description Background service worker for MuteMe Chrome Extension
 * 
 * Handles:
 * - MuteMe device connection state
 * - Message routing between popup, content scripts, and device
 * - Call session tracking
 * - LED state synchronization
 */

'use strict';

import icon from './modules/icon.js';
import muteme from './modules/muteme.js';
import {
  MESSAGE,
  PLATFORM,
  TOUCH_MODE,
  LED_PRESET,
  DEFAULT_STATE,
} from './modules/constants.js';

// ============================================================================
// Extension State
// ============================================================================
let state = {
  mutemeConnected: false,
  activeCallTabId: null,
  activePlatform: null,
  isMuted: null,
  touchMode: TOUCH_MODE.TOGGLE,
};

// Connected clients (popup, content scripts)
let clients = new Set();

// ============================================================================
// State Management
// ============================================================================
async function loadState() {
  try {
    const stored = await chrome.storage.local.get(['touchMode']);
    if (stored.touchMode) {
      state.touchMode = stored.touchMode;
    }
  } catch (e) {
    console.warn('[Background] Failed to load state:', e);
  }
}

async function saveState() {
  try {
    await chrome.storage.local.set({
      touchMode: state.touchMode,
    });
  } catch (e) {
    console.warn('[Background] Failed to save state:', e);
  }
}

function getPublicState() {
  return {
    mutemeConnected: state.mutemeConnected,
    activeCallTabId: state.activeCallTabId,
    activePlatform: state.activePlatform,
    isMuted: state.isMuted,
    touchMode: state.touchMode,
  };
}

// ============================================================================
// LED Management
// ============================================================================
async function updateLed() {
  if (!state.mutemeConnected) return;

  let preset;
  
  if (state.activeCallTabId === null) {
    // No active call
    preset = LED_PRESET.CONNECTED_IDLE;
  } else if (state.isMuted === true) {
    preset = LED_PRESET.MUTED;
  } else if (state.isMuted === false) {
    preset = LED_PRESET.UNMUTED;
  } else {
    preset = LED_PRESET.CONNECTED_IDLE;
  }

  await muteme.setLedPreset(preset);
}

// ============================================================================
// Icon Management
// ============================================================================
function updateIcon() {
  if (!state.mutemeConnected) {
    icon.setDisconnected();
  } else if (state.activeCallTabId === null) {
    icon.setConnected();
  } else {
    icon.setMuteState(state.isMuted);
  }
}

// ============================================================================
// MuteMe Callbacks
// ============================================================================
function onMutemeConnect(device) {
  console.log('[Background] MuteMe connected:', device.productName);
  state.mutemeConnected = true;
  updateIcon();
  updateLed();
  broadcastMessage(MESSAGE.DEVICE_CONNECTED, getPublicState());
}

function onMutemeDisconnect() {
  console.log('[Background] MuteMe disconnected');
  state.mutemeConnected = false;
  updateIcon();
  broadcastMessage(MESSAGE.DEVICE_DISCONNECTED, getPublicState());
}

function onTouchStart() {
  console.log('[Background] Touch start');
  
  if (state.touchMode === TOUCH_MODE.PUSH_TO_TALK && state.isMuted) {
    // Temporarily unmute while touching
    sendMuteCommand(false);
  } else if (state.touchMode === TOUCH_MODE.PUSH_TO_MUTE && !state.isMuted) {
    // Temporarily mute while touching
    sendMuteCommand(true);
  }
  
  broadcastMessage(MESSAGE.TOUCH_START);
}

function onTouchEnd(event) {
  console.log('[Background] Touch end:', event);
  
  if (state.touchMode === TOUCH_MODE.TOGGLE && event.isTap) {
    // Toggle mute on tap
    sendMuteCommand(!state.isMuted);
  } else if (state.touchMode === TOUCH_MODE.PUSH_TO_TALK) {
    // Re-mute when released
    sendMuteCommand(true);
  } else if (state.touchMode === TOUCH_MODE.PUSH_TO_MUTE) {
    // Re-unmute when released
    sendMuteCommand(false);
  }
  
  broadcastMessage(MESSAGE.TOUCH_END, event);
}

// ============================================================================
// Call Session Management
// ============================================================================
function handleCallStarted(tabId, platform) {
  console.log('[Background] Call started in tab:', tabId, 'platform:', platform);
  state.activeCallTabId = tabId;
  state.activePlatform = platform;
  updateIcon();
  updateLed();
  broadcastMessage(MESSAGE.CALL_STARTED, { tabId, platform });
}

function handleCallEnded(tabId) {
  console.log('[Background] Call ended in tab:', tabId);
  if (state.activeCallTabId === tabId) {
    state.activeCallTabId = null;
    state.activePlatform = null;
    state.isMuted = null;
    updateIcon();
    updateLed();
    broadcastMessage(MESSAGE.CALL_ENDED, { tabId });
  }
}

function handleMuteStateChanged(tabId, isMuted) {
  console.log('[Background] Mute state changed:', isMuted);
  if (state.activeCallTabId === tabId) {
    state.isMuted = isMuted;
    updateIcon();
    updateLed();
    broadcastMessage(MESSAGE.MUTE_STATE_CHANGED, { tabId, isMuted });
  }
}

// ============================================================================
// Mute Command
// ============================================================================
function sendMuteCommand(shouldMute) {
  if (state.activeCallTabId === null) {
    console.log('[Background] No active call to mute/unmute');
    return;
  }

  chrome.tabs.sendMessage(state.activeCallTabId, {
    type: MESSAGE.SET_MUTE,
    data: { mute: shouldMute },
  }).catch(e => {
    console.warn('[Background] Failed to send mute command:', e);
  });
}

// ============================================================================
// Message Broadcasting
// ============================================================================
async function broadcastMessage(type, data = null) {
  const message = { type, data };
  
  for (const client of clients.values()) {
    try {
      client.postMessage(message);
    } catch (e) {
      // Client disconnected
      clients.delete(client);
    }
  }
}

// ============================================================================
// Message Handling
// ============================================================================
function handleMessage(message, sender) {
  const { type, data } = message;

  switch (type) {
    case MESSAGE.PERMISSION_GRANTED:
      muteme.connect();
      break;

    case MESSAGE.GET_STATE:
      return getPublicState();

    case MESSAGE.TOGGLE_MUTE:
      sendMuteCommand(!state.isMuted);
      break;

    case MESSAGE.SET_MUTE:
      sendMuteCommand(data.mute);
      break;

    case MESSAGE.CALL_STARTED:
      handleCallStarted(sender.tab?.id, data.platform);
      break;

    case MESSAGE.CALL_ENDED:
      handleCallEnded(sender.tab?.id);
      break;

    case MESSAGE.MUTE_STATE_CHANGED:
      handleMuteStateChanged(sender.tab?.id, data.isMuted);
      break;

    case MESSAGE.SET_LED:
      if (state.mutemeConnected) {
        muteme.setLed(data.color, data.effect);
      }
      break;

    default:
      console.log('[Background] Unknown message type:', type);
  }
}

// ============================================================================
// Tab Monitoring
// ============================================================================
function setupTabMonitoring() {
  // Handle tab close
  chrome.tabs.onRemoved.addListener((tabId) => {
    if (state.activeCallTabId === tabId) {
      handleCallEnded(tabId);
    }
  });

  // Handle tab URL change (navigating away from call)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (state.activeCallTabId === tabId && changeInfo.url) {
      // Check if still on a call page
      const isMeetCall = tab.url?.includes('meet.google.com') && tab.url?.match(/[a-z]{3}-[a-z]{4}-[a-z]{3}/);
      const isTeamsCall = tab.url?.includes('teams.microsoft.com');
      
      if (!isMeetCall && !isTeamsCall) {
        handleCallEnded(tabId);
      }
    }
  });
}

// ============================================================================
// Initialization
// ============================================================================
async function initialize() {
  console.log('[Background] Initializing MuteMe Controller...');

  // Load saved state
  await loadState();

  // Initialize MuteMe driver
  await muteme.init({
    onConnect: onMutemeConnect,
    onDisconnect: onMutemeDisconnect,
    onTouchStart: onTouchStart,
    onTouchEnd: onTouchEnd,
  });

  // Set up message listeners
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = handleMessage(message, sender);
    if (result !== undefined) {
      sendResponse(result);
    }
    return true; // Keep channel open for async response
  });

  // Set up port connections (for popup)
  chrome.runtime.onConnect.addListener((port) => {
    clients.add(port);
    console.log('[Background] Client connected');

    port.onDisconnect.addListener(() => {
      clients.delete(port);
      console.log('[Background] Client disconnected');
    });

    // Send current state to new client
    port.postMessage({
      type: MESSAGE.STATE_UPDATE,
      data: getPublicState(),
    });
  });

  // Set up tab monitoring
  setupTabMonitoring();

  // Try to connect to already-paired device
  if (await muteme.isDeviceAvailable()) {
    console.log('[Background] Found paired MuteMe device');
    await muteme.connect();
  } else {
    console.log('[Background] No paired MuteMe device found');
    icon.setDisconnected();
  }

  console.log('[Background] Initialization complete');
}

// Run initialization
if (navigator.hid) {
  initialize();
} else {
  console.error(
    'WebHID is not available! Use chrome://flags#enable-web-hid-on-extension-service-worker'
  );
}
