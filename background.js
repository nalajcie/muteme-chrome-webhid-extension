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
  LED_COLOR,
  LED_EFFECT,
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
  focusTabOnPress: false, // Whether to focus meeting tab when button pressed
  isHolding: false,
  pttActivated: false,
  pttTimer: null,
};

// Connected clients (popup, content scripts)
let clients = new Set();

// ============================================================================
// State Management
// ============================================================================
async function loadState() {
  try {
    const stored = await chrome.storage.local.get(['touchMode', 'focusTabOnPress']);
    if (stored.touchMode) {
      state.touchMode = stored.touchMode;
    }
    if (stored.focusTabOnPress !== undefined) {
      state.focusTabOnPress = stored.focusTabOnPress;
    }
  } catch (e) {
    console.warn('[Background] Failed to load state:', e);
  }
}

async function saveState() {
  try {
    await chrome.storage.local.set({
      touchMode: state.touchMode,
      focusTabOnPress: state.focusTabOnPress,
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
    focusTabOnPress: state.focusTabOnPress,
  };
}

// ============================================================================
// LED Management
// ============================================================================
async function updateLed() {
  if (!state.mutemeConnected) return;

  let preset;

  if (state.activeCallTabId === null) {
    // No active call - LED off
    preset = LED_PRESET.CONNECTED_IDLE;
  } else if (state.isHolding && state.isMuted === false) {
    // Currently holding and unmuted (push-to-talk active)
    preset = LED_PRESET.PUSH_TO_TALK_ACTIVE;
  } else if (state.isMuted === true) {
    // Muted - use pulsing red if in smart/PTT mode to indicate "hold to talk"
    if (state.touchMode === TOUCH_MODE.SMART || state.touchMode === TOUCH_MODE.PUSH_TO_TALK) {
      preset = LED_PRESET.MUTED_PTT_READY;
    } else {
      preset = LED_PRESET.MUTED;
    }
  } else if (state.isMuted === false) {
    preset = LED_PRESET.UNMUTED;
  } else {
    preset = LED_PRESET.CONNECTED_IDLE;
  }

  await muteme.setLedPreset(preset);
}

/**
 * Play a connection animation on the LED
 */
async function playConnectAnimation() {
  if (!state.mutemeConnected) return;

  // Quick cyan blink sequence
  await muteme.setLed(LED_COLOR.CYAN, LED_EFFECT.SOLID);
  await sleep(150);
  await muteme.setLed(LED_COLOR.OFF, LED_EFFECT.SOLID);
  await sleep(100);
  await muteme.setLed(LED_COLOR.CYAN, LED_EFFECT.SOLID);
  await sleep(150);
  await muteme.setLed(LED_COLOR.OFF, LED_EFFECT.SOLID);

  // Return to normal state
  await updateLed();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  console.log('[Background] MuteMe connected:', device?.productName);
  state.mutemeConnected = true;
  updateIcon();
  playConnectAnimation();
  broadcastMessage(MESSAGE.DEVICE_CONNECTED, getPublicState());
}

function onMutemeDisconnect() {
  console.log('[Background] MuteMe disconnected');
  state.mutemeConnected = false;
  state.isHolding = false;
  state.pttActivated = false;
  if (state.pttTimer) {
    clearTimeout(state.pttTimer);
    state.pttTimer = null;
  }
  updateIcon();
  broadcastMessage(MESSAGE.DEVICE_DISCONNECTED, getPublicState());
}

function onTouchStart() {
  state.isHolding = true;
  state.pttActivated = false;

  // Focus meeting tab if option is enabled
  if (state.focusTabOnPress && state.activeCallTabId) {
    focusMeetingTab();
  }

  // For Smart/PTT modes, we'll trigger unmute after a delay (to distinguish tap from hold)
  if ((state.touchMode === TOUCH_MODE.SMART || state.touchMode === TOUCH_MODE.PUSH_TO_TALK) && state.isMuted) {
    // Set a timer - if still holding after 200ms, activate PTT
    state.pttTimer = setTimeout(() => {
      if (state.isHolding && state.isMuted !== false) {
        state.pttActivated = true;
        sendMuteCommand(false);
        updateLed();
      }
    }, 200);
  }

  broadcastMessage(MESSAGE.TOUCH_START);
}

/**
 * Focus the meeting tab (brings it to foreground)
 * Only focuses if the tab is hidden (not just inactive)
 */
async function focusMeetingTab() {
  if (!state.activeCallTabId) return;

  try {
    // First check if the tab is already visible
    const response = await chrome.tabs.sendMessage(state.activeCallTabId, {
      type: MESSAGE.GET_VISIBILITY,
    });

    // If tab is visible (even if not focused), don't switch - PIP will work
    if (response && response.visible) {
      return;
    }

    // Tab is hidden, switch to it
    const tab = await chrome.tabs.get(state.activeCallTabId);
    if (tab) {
      await chrome.tabs.update(state.activeCallTabId, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  } catch (e) {
    // Tab may have been closed or content script not responding
    // Try to focus anyway
    try {
      const tab = await chrome.tabs.get(state.activeCallTabId);
      if (tab) {
        await chrome.tabs.update(state.activeCallTabId, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
      }
    } catch (e2) {
      // Tab definitely gone
    }
  }
}

function onTouchEnd(event) {
  const _wasHolding = state.isHolding;
  const wasPttActivated = state.pttActivated;
  state.isHolding = false;
  state.pttActivated = false;

  // Clear PTT timer if it hasn't fired yet
  if (state.pttTimer) {
    clearTimeout(state.pttTimer);
    state.pttTimer = null;
  }

  if (state.touchMode === TOUCH_MODE.TOGGLE) {
    // Toggle mode: toggle on tap only
    if (event.isTap) {
      sendMuteCommand(!state.isMuted);
    }
  } else if (state.touchMode === TOUCH_MODE.SMART) {
    // Smart mode: tap to toggle, hold for PTT
    if (event.isTap && !wasPttActivated) {
      // Short tap = toggle (only if PTT wasn't activated)
      sendMuteCommand(!state.isMuted);
    } else if (wasPttActivated) {
      // Was holding (push-to-talk), re-mute
      sendMuteCommand(true);
    }
    updateLed();
  } else if (state.touchMode === TOUCH_MODE.PUSH_TO_TALK) {
    // Push-to-talk mode: always re-mute when released
    if (wasPttActivated) {
      sendMuteCommand(true);
    }
    updateLed();
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

/**
 * Simulate keyboard shortcut for muting/unmuting
 * Using chrome.scripting.executeScript works even when tab is hidden
 */
async function sendMuteCommand(shouldMute) {
  console.log('[Background] sendMuteCommand called:', {
    shouldMute,
    activeCallTabId: state.activeCallTabId,
    activePlatform: state.activePlatform,
    currentMuted: state.isMuted,
  });

  if (state.activeCallTabId === null) {
    console.log('[Background] No active call to mute/unmute');
    return;
  }

  try {
    // Use scripting API to inject keyboard simulation directly
    // This works even when the tab is hidden (not just unfocused)
    if (state.activePlatform === PLATFORM.GOOGLE_MEET) {
      console.log('[Background] Executing Meet mute toggle script...');
      await chrome.scripting.executeScript({
        target: { tabId: state.activeCallTabId },
        func: simulateMeetMuteToggle,
      });
      console.log('[Background] Script executed, scheduling state query...');
      // Query mute state after a short delay (DOM needs time to update)
      setTimeout(() => queryMuteState(), 300);
    } else if (state.activePlatform === PLATFORM.MICROSOFT_TEAMS) {
      console.log('[Background] Executing Teams mute toggle script...');
      await chrome.scripting.executeScript({
        target: { tabId: state.activeCallTabId },
        func: simulateTeamsMuteToggle,
      });
      setTimeout(() => queryMuteState(), 300);
    } else {
      console.log('[Background] Unknown platform, using message-based approach');
      // Fallback to message-based approach
      await chrome.tabs.sendMessage(state.activeCallTabId, {
        type: MESSAGE.SET_MUTE,
        data: { mute: shouldMute },
      });
    }
  } catch (e) {
    console.warn('[Background] Failed to send mute command:', e);
  }
}

/**
 * Query mute state directly from the page via script injection
 * This works even when the tab is hidden
 */
async function queryMuteState() {
  console.log('[Background] queryMuteState called, tabId:', state.activeCallTabId, 'platform:', state.activePlatform);

  if (state.activeCallTabId === null) {
    console.log('[Background] No active call tab, skipping query');
    return;
  }

  try {
    let result;
    if (state.activePlatform === PLATFORM.GOOGLE_MEET) {
      console.log('[Background] Querying Meet mute state...');
      result = await chrome.scripting.executeScript({
        target: { tabId: state.activeCallTabId },
        func: getMeetMuteState,
      });
    } else if (state.activePlatform === PLATFORM.MICROSOFT_TEAMS) {
      console.log('[Background] Querying Teams mute state...');
      result = await chrome.scripting.executeScript({
        target: { tabId: state.activeCallTabId },
        func: getTeamsMuteState,
      });
    }

    console.log('[Background] Query result:', result);

    if (result && result[0] && result[0].result !== null) {
      const isMuted = result[0].result;
      console.log('[Background] Mute state from page:', isMuted, 'current state:', state.isMuted);
      if (state.isMuted !== isMuted) {
        console.log('[Background] State changed, updating...');
        handleMuteStateChanged(state.activeCallTabId, isMuted);
      }
    } else {
      console.log('[Background] Could not determine mute state from result');
    }
  } catch (e) {
    console.warn('[Background] Failed to query mute state:', e);
  }
}

/**
 * Injected function to simulate Ctrl+D in Google Meet
 * This is injected directly into the page context via chrome.scripting
 */
function simulateMeetMuteToggle() {
  const keydownEvent = new KeyboardEvent('keydown', {
    key: 'd',
    code: 'KeyD',
    keyCode: 68,
    which: 68,
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(keydownEvent);
}

/**
 * Injected function to simulate Ctrl+Shift+M in Microsoft Teams
 * This is injected directly into the page context via chrome.scripting
 */
function simulateTeamsMuteToggle() {
  const keydownEvent = new KeyboardEvent('keydown', {
    key: 'm',
    code: 'KeyM',
    keyCode: 77,
    which: 77,
    ctrlKey: true,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(keydownEvent);
}

/**
 * Injected function to get mute state from Google Meet
 */
function getMeetMuteState() {
  const button = document.querySelector('[data-is-muted]');
  if (button) {
    return button.getAttribute('data-is-muted') === 'true';
  }
  // Fallback to aria-label
  const micButton = document.querySelector('[aria-label*="microphone" i]');
  if (micButton) {
    const label = micButton.getAttribute('aria-label')?.toLowerCase() || '';
    if (label.includes('turn off')) return false;
    if (label.includes('turn on')) return true;
  }
  return null;
}

/**
 * Injected function to get mute state from Microsoft Teams
 */
function getTeamsMuteState() {
  const muteButton = document.querySelector('[data-tid="toggle-mute"]') ||
                     document.querySelector('button[aria-label*="mute" i]') ||
                     document.querySelector('#microphone-button');
  if (muteButton) {
    const ariaLabel = muteButton.getAttribute('aria-label')?.toLowerCase() || '';
    if (ariaLabel.includes('unmute')) return true;
    if (ariaLabel.includes('mute')) return false;
  }
  return null;
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

    case MESSAGE.SET_TOUCH_MODE:
      state.touchMode = data.mode;
      saveState();
      updateLed();
      broadcastMessage(MESSAGE.STATE_UPDATE, getPublicState());
      break;

    case MESSAGE.SET_FOCUS_TAB:
      state.focusTabOnPress = data.enabled;
      saveState();
      broadcastMessage(MESSAGE.STATE_UPDATE, getPublicState());
      break;

    case MESSAGE.FOCUS_MEETING_TAB:
      // Directly focus the meeting tab (from popup click)
      if (state.activeCallTabId) {
        chrome.tabs.get(state.activeCallTabId).then(tab => {
          chrome.tabs.update(state.activeCallTabId, { active: true });
          chrome.windows.update(tab.windowId, { focused: true });
        }).catch(() => {});
      }
      break;

    default:
      // Ignore unknown messages
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

  // Set up device connection polling (service workers don't reliably get HID events)
  setupDevicePolling();

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

// ============================================================================
// Device Polling (workaround for unreliable HID events in service workers)
// ============================================================================
let _pollInterval = null;

function setupDevicePolling() {
  // Poll every 2 seconds to check device status
  _pollInterval = setInterval(checkDeviceStatus, 2000);
  console.log('[Background] Device polling started');
}

async function checkDeviceStatus() {
  const wasConnected = state.mutemeConnected;
  const isAvailable = await muteme.isDeviceAvailable();

  // Device was connected but is no longer available
  if (wasConnected && !isAvailable) {
    console.log('[Background] Poll detected device disconnection');
    // Clean up the connection
    muteme.device = null;
    muteme.isConnected = false;
    onMutemeDisconnect();
  }
  // Device was not connected but is now available
  else if (!wasConnected && isAvailable) {
    console.log('[Background] Poll detected device available, attempting connection...');
    await muteme.connect();
  }
  // Verify connection is still valid
  else if (wasConnected && isAvailable && muteme.device) {
    // Try to verify the device is actually responsive
    try {
      // Check if device is still opened
      if (!muteme.device.opened) {
        console.log('[Background] Poll: device reference exists but not opened, reconnecting...');
        await muteme.connect();
      }
    } catch (e) {
      console.log('[Background] Poll: device check failed, triggering disconnect');
      muteme.device = null;
      muteme.isConnected = false;
      onMutemeDisconnect();
    }
  }
}

// Run initialization
if (navigator.hid) {
  initialize();
} else {
  console.error(
    'WebHID is not available! Use chrome://flags#enable-web-hid-on-extension-service-worker',
  );
}
