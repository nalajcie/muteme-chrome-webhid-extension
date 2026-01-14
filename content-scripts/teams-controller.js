/**
 * @filename teams-controller.js
 * @description Content script for Microsoft Teams integration
 * 
 * Detects Teams calls, monitors mute state, and handles mute commands.
 */

'use strict';

// Message types (duplicated here since content scripts can't use ES modules in manifest v3)
const MESSAGE = {
  CALL_STARTED: 'muteme:call-started',
  CALL_ENDED: 'muteme:call-ended',
  MUTE_STATE_CHANGED: 'muteme:mute-state-changed',
  SET_MUTE: 'muteme:set-mute',
  TOGGLE_MUTE: 'muteme:toggle-mute',
};

const PLATFORM = 'teams';

// ============================================================================
// Selectors
// ============================================================================
// Microsoft Teams UI - multiple versions exist (new Teams, classic, etc.)
const MUTE_BUTTON_SELECTORS = [
  // New Teams (2023+)
  '#microphone-button',
  '[data-tid="call-control-microphone"]',
  '[id*="microphone"][role="button"]',
  
  // Classic Teams
  'button[aria-label*="microphone" i]',
  'button[title*="microphone" i]',
  '[data-cid="calling-control-bar-microphone"]',
  
  // Generic fallbacks
  '[aria-label*="Mute" i]',
  '[aria-label*="Unmute" i]',
];

const CALL_INDICATORS = [
  // New Teams
  '[data-tid="calling-unified-bar"]',
  '[data-tid="call-control-bar"]',
  
  // Classic Teams
  '[data-cid="calling-unified-bar"]',
  '#calling-unified-bar',
  
  // Hangup button
  '[data-tid="call-control-hangup"]',
  'button[aria-label*="Hang up" i]',
  'button[aria-label*="Leave" i]',
];

// ============================================================================
// State
// ============================================================================
let isInCall = false;
let isMuted = null;
let muteCheckInterval = null;
let callCheckInterval = null;

// ============================================================================
// DOM Helpers
// ============================================================================
function findMuteButton() {
  for (const selector of MUTE_BUTTON_SELECTORS) {
    const buttons = document.querySelectorAll(selector);
    for (const button of buttons) {
      if (isElementVisible(button)) {
        return button;
      }
    }
  }
  return null;
}

function isElementVisible(el) {
  if (!el) return false;
  
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && 
         style.display !== 'none' &&
         style.opacity !== '0';
}

function getMuteState() {
  const button = findMuteButton();
  if (!button) return null;

  // Check aria-pressed (common in new Teams)
  const ariaPressed = button.getAttribute('aria-pressed');
  if (ariaPressed !== null) {
    return ariaPressed === 'true';
  }

  // Check aria-label
  const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
  const title = (button.getAttribute('title') || '').toLowerCase();
  const label = ariaLabel || title;
  
  if (label.includes('unmute') || label.includes('turn on microphone')) {
    return true; // Button says "unmute" = currently muted
  }
  if (label.includes('mute') || label.includes('turn off microphone')) {
    return false; // Button says "mute" = currently unmuted
  }

  // Check for muted class or icon
  const classList = button.className.toLowerCase();
  if (classList.includes('muted') || classList.includes('off')) {
    return true;
  }

  // Check child elements for mute indicator
  const icon = button.querySelector('[data-icon-name]');
  if (icon) {
    const iconName = icon.getAttribute('data-icon-name')?.toLowerCase() || '';
    if (iconName.includes('micoff') || iconName.includes('muted')) {
      return true;
    }
    if (iconName.includes('micon') || iconName.includes('microphone')) {
      return false;
    }
  }

  return null;
}

function isInTeamsCall() {
  // Check for call control bar
  for (const selector of CALL_INDICATORS) {
    const element = document.querySelector(selector);
    if (element && isElementVisible(element)) {
      return true;
    }
  }
  
  // Check for mute button presence as a call indicator
  return findMuteButton() !== null;
}

// ============================================================================
// Mute Control
// ============================================================================
function toggleMute() {
  const button = findMuteButton();
  if (button) {
    button.click();
    console.log('[MuteMe Teams] Toggled mute');
    
    // Check state after a short delay
    setTimeout(checkMuteState, 100);
  } else {
    // Try keyboard shortcut as fallback (Ctrl+Shift+M)
    console.log('[MuteMe Teams] Button not found, trying keyboard shortcut');
    simulateKeyboardShortcut();
  }
}

function simulateKeyboardShortcut() {
  // Ctrl+Shift+M is the Teams mute shortcut
  const event = new KeyboardEvent('keydown', {
    key: 'm',
    code: 'KeyM',
    keyCode: 77,
    which: 77,
    ctrlKey: true,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
}

function setMute(shouldMute) {
  const currentMuted = getMuteState();
  console.log('[MuteMe Teams] setMute:', shouldMute, 'current:', currentMuted);
  
  if (currentMuted === null) {
    console.warn('[MuteMe Teams] Cannot determine current mute state, attempting toggle');
    toggleMute();
    return;
  }

  if (currentMuted !== shouldMute) {
    toggleMute();
  }
}

// ============================================================================
// State Monitoring
// ============================================================================
function checkMuteState() {
  const newMuted = getMuteState();
  
  if (newMuted !== isMuted) {
    isMuted = newMuted;
    console.log('[MuteMe Teams] Mute state changed:', isMuted);
    
    chrome.runtime.sendMessage({
      type: MESSAGE.MUTE_STATE_CHANGED,
      data: { isMuted: isMuted },
    }).catch(e => console.warn('[MuteMe Teams] Failed to send mute state:', e));
  }
}

function checkCallState() {
  const newInCall = isInTeamsCall();
  
  if (newInCall !== isInCall) {
    isInCall = newInCall;
    console.log('[MuteMe Teams] Call state changed:', isInCall);
    
    if (isInCall) {
      chrome.runtime.sendMessage({
        type: MESSAGE.CALL_STARTED,
        data: { platform: PLATFORM },
      }).catch(e => console.warn('[MuteMe Teams] Failed to send call started:', e));
      
      // Start mute state monitoring
      startMuteMonitoring();
    } else {
      chrome.runtime.sendMessage({
        type: MESSAGE.CALL_ENDED,
        data: { platform: PLATFORM },
      }).catch(e => console.warn('[MuteMe Teams] Failed to send call ended:', e));
      
      // Stop mute monitoring
      stopMuteMonitoring();
    }
  }
}

function startMuteMonitoring() {
  if (muteCheckInterval) return;
  
  // Check mute state every 500ms
  muteCheckInterval = setInterval(checkMuteState, 500);
  checkMuteState(); // Initial check
}

function stopMuteMonitoring() {
  if (muteCheckInterval) {
    clearInterval(muteCheckInterval);
    muteCheckInterval = null;
  }
  isMuted = null;
}

// ============================================================================
// Message Handling
// ============================================================================
function handleMessage(message, sender, sendResponse) {
  console.log('[MuteMe Teams] Received message:', message);
  
  switch (message.type) {
    case MESSAGE.SET_MUTE:
      setMute(message.data.mute);
      break;
      
    case MESSAGE.TOGGLE_MUTE:
      toggleMute();
      break;
  }
}

// ============================================================================
// Initialization
// ============================================================================
function init() {
  console.log('[MuteMe Teams] Content script loaded');
  
  // Listen for messages from background
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Start monitoring for call state
  callCheckInterval = setInterval(checkCallState, 1000);
  
  // Initial check with delay (Teams can be slow to load)
  setTimeout(checkCallState, 2000);
  
  // Also use MutationObserver for faster detection
  const observer = new MutationObserver(() => {
    checkCallState();
    if (isInCall) {
      checkMuteState();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-pressed', 'aria-label', 'title', 'class'],
  });
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
