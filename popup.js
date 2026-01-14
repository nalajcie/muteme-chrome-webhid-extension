/**
 * @filename popup.js
 * @description Popup UI for MuteMe Controller extension
 */

'use strict';

import { MESSAGE, TOUCH_MODE } from './modules/constants.js';

// ============================================================================
// State
// ============================================================================
let port = null;
let state = {
  mutemeConnected: false,
  activeCallTabId: null,
  activePlatform: null,
  isMuted: null,
  touchMode: TOUCH_MODE.TOGGLE,
};

// ============================================================================
// DOM Elements
// ============================================================================
const connectedView = document.getElementById('connectedView');
const disconnectedView = document.getElementById('disconnectedView');
const deviceIndicator = document.getElementById('deviceIndicator');
const deviceStatus = document.getElementById('deviceStatus');
const callIndicator = document.getElementById('callIndicator');
const callStatus = document.getElementById('callStatus');
const muteIndicator = document.getElementById('muteIndicator');
const muteStatus = document.getElementById('muteStatus');
const muteBtn = document.getElementById('muteBtn');
const connectBtn = document.getElementById('connectBtn');
const touchModeSelect = document.getElementById('touchModeSelect');

// ============================================================================
// UI Update
// ============================================================================
function updateUI() {
  // Show/hide views
  if (state.mutemeConnected) {
    connectedView.style.display = 'block';
    disconnectedView.style.display = 'none';
  } else {
    connectedView.style.display = 'none';
    disconnectedView.style.display = 'block';
    return;
  }

  // Device status
  deviceIndicator.className = 'status-indicator connected';
  deviceStatus.textContent = 'Connected';

  // Call status
  if (state.activeCallTabId) {
    callIndicator.className = 'status-indicator connected';
    const platform = state.activePlatform === 'meet' ? 'Google Meet' : 
                     state.activePlatform === 'teams' ? 'Microsoft Teams' : 'Active';
    callStatus.textContent = platform;
  } else {
    callIndicator.className = 'status-indicator disconnected';
    callStatus.textContent = 'No call';
  }

  // Mute status
  if (state.activeCallTabId && state.isMuted !== null) {
    if (state.isMuted) {
      muteIndicator.className = 'status-indicator muted';
      muteStatus.textContent = 'Muted';
      muteBtn.textContent = '🔊 Unmute';
      muteBtn.className = 'mute-button muted';
      muteBtn.disabled = false;
    } else {
      muteIndicator.className = 'status-indicator unmuted';
      muteStatus.textContent = 'Unmuted';
      muteBtn.textContent = '🔇 Mute';
      muteBtn.className = 'mute-button unmuted';
      muteBtn.disabled = false;
    }
  } else {
    muteIndicator.className = 'status-indicator';
    muteStatus.textContent = '-';
    muteBtn.textContent = 'No Active Call';
    muteBtn.className = 'mute-button';
    muteBtn.disabled = true;
  }

  // Touch mode
  touchModeSelect.value = state.touchMode;
}

// ============================================================================
// Message Handling
// ============================================================================
function handleMessage(message) {
  console.log('[Popup] Received:', message);
  
  switch (message.type) {
    case MESSAGE.STATE_UPDATE:
    case MESSAGE.DEVICE_CONNECTED:
    case MESSAGE.DEVICE_DISCONNECTED:
    case MESSAGE.MUTE_STATE_CHANGED:
    case MESSAGE.CALL_STARTED:
    case MESSAGE.CALL_ENDED:
      if (message.data) {
        state = { ...state, ...message.data };
      }
      updateUI();
      break;
  }
}

// ============================================================================
// Event Handlers
// ============================================================================
function handleMuteClick() {
  chrome.runtime.sendMessage({
    type: MESSAGE.TOGGLE_MUTE,
  });
}

function handleConnectClick() {
  // Open the test page where user can grant permission
  chrome.tabs.create({ url: 'muteme-test.html' });
}

function handleTouchModeChange(e) {
  const mode = e.target.value;
  state.touchMode = mode;
  
  // Save to storage
  chrome.storage.local.set({ touchMode: mode });
  
  // Notify background
  chrome.runtime.sendMessage({
    type: 'muteme:set-touch-mode',
    data: { mode },
  });
}

// ============================================================================
// Initialization
// ============================================================================
async function init() {
  // Set up port connection to background
  port = chrome.runtime.connect({ name: 'popup' });
  port.onMessage.addListener(handleMessage);

  // Get initial state
  const response = await chrome.runtime.sendMessage({ type: MESSAGE.GET_STATE });
  if (response) {
    state = { ...state, ...response };
    updateUI();
  }

  // Load touch mode from storage
  const stored = await chrome.storage.local.get(['touchMode']);
  if (stored.touchMode) {
    state.touchMode = stored.touchMode;
    updateUI();
  }

  // Set up event handlers
  muteBtn.addEventListener('click', handleMuteClick);
  connectBtn.addEventListener('click', handleConnectClick);
  touchModeSelect.addEventListener('change', handleTouchModeChange);
}

window.addEventListener('load', init);
