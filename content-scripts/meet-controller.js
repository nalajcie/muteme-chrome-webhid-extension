/**
 * @filename meet-controller.js
 * @description Content script for Google Meet integration
 *
 * Detects Google Meet calls, monitors mute state, and handles mute commands.
 */

'use strict';

// Message types (duplicated here since content scripts can't use ES modules in manifest v3)
const MESSAGE = {
  CALL_STARTED: 'muteme:call-started',
  CALL_ENDED: 'muteme:call-ended',
  MUTE_STATE_CHANGED: 'muteme:mute-state-changed',
  SET_MUTE: 'muteme:set-mute',
  TOGGLE_MUTE: 'muteme:toggle-mute',
  GET_VISIBILITY: 'muteme:get-visibility',
};

const PLATFORM = 'meet';

// ============================================================================
// Selectors
// ============================================================================
// Google Meet UI can change, so we use multiple fallback selectors
const MUTE_BUTTON_SELECTORS = [
  '[data-is-muted]',
  '[aria-label*="microphone" i]',
  '[aria-label*="Turn off microphone" i]',
  '[aria-label*="Turn on microphone" i]',
  'button[data-tooltip*="microphone" i]',
];

// eslint-disable-next-line no-unused-vars
const _CALL_INDICATORS = [
  '[data-meeting-code]',
  '[data-meeting-title]',
  '.google-material-icons:contains("call_end")',
  '[aria-label*="Leave call" i]',
];

// ============================================================================
// State
// ============================================================================
let isInCall = false;
let isMuted = null;
let muteCheckInterval = null;
let _callCheckInterval = null;

// ============================================================================
// DOM Helpers
// ============================================================================
function findMuteButton() {
  for (const selector of MUTE_BUTTON_SELECTORS) {
    const button = document.querySelector(selector);
    if (button && isElementVisible(button)) {
      return button;
    }
  }
  return null;
}

function isElementVisible(el) {
  return el && el.offsetParent !== null &&
         getComputedStyle(el).visibility !== 'hidden' &&
         getComputedStyle(el).display !== 'none';
}

function getMuteState() {
  const button = findMuteButton();
  if (!button) return null;

  // Check data-is-muted attribute (most reliable)
  const dataMuted = button.getAttribute('data-is-muted');
  if (dataMuted !== null) {
    return dataMuted === 'true';
  }

  // Check aria-label
  const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
  if (ariaLabel.includes('turn off microphone')) {
    return false; // Microphone is on, so not muted
  }
  if (ariaLabel.includes('turn on microphone')) {
    return true; // Microphone is off, so muted
  }

  // Check aria-pressed for some button variants
  const ariaPressed = button.getAttribute('aria-pressed');
  if (ariaPressed !== null) {
    return ariaPressed === 'true';
  }

  return null;
}

function isInMeetCall() {
  // Check URL pattern (xxx-xxxx-xxx)
  const urlMatch = window.location.pathname.match(/\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i);
  if (!urlMatch) return false;

  // Look for call UI elements
  const hasLeaveButton = !!document.querySelector('[aria-label*="Leave call" i]');
  const hasCallControls = !!findMuteButton();

  return hasLeaveButton || hasCallControls;
}

// ============================================================================
// Mute Control
// ============================================================================

/**
 * Simulate Ctrl+D keyboard shortcut (Google Meet mute toggle)
 * This works even when the tab is not focused, unlike button.click()
 */
function simulateMuteShortcut() {
  console.log('[MuteMe Meet] Simulating Ctrl+D shortcut');

  // Google Meet uses Ctrl+D to toggle mute
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

  // Check state after a short delay
  setTimeout(checkMuteState, 150);
}

function toggleMute() {
  // Try keyboard shortcut first (works even when tab not focused)
  simulateMuteShortcut();
}

function setMute(shouldMute) {
  const currentMuted = getMuteState();
  console.log('[MuteMe Meet] setMute:', shouldMute, 'current:', currentMuted);

  if (currentMuted === null) {
    console.warn('[MuteMe Meet] Cannot determine current mute state, attempting toggle anyway');
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
    console.log('[MuteMe Meet] Mute state changed:', isMuted);

    chrome.runtime.sendMessage({
      type: MESSAGE.MUTE_STATE_CHANGED,
      data: { isMuted: isMuted },
    }).catch(e => console.warn('[MuteMe Meet] Failed to send mute state:', e));
  }
}

function checkCallState() {
  const newInCall = isInMeetCall();

  if (newInCall !== isInCall) {
    isInCall = newInCall;
    console.log('[MuteMe Meet] Call state changed:', isInCall);

    if (isInCall) {
      chrome.runtime.sendMessage({
        type: MESSAGE.CALL_STARTED,
        data: { platform: PLATFORM },
      }).catch(e => console.warn('[MuteMe Meet] Failed to send call started:', e));

      // Start mute state monitoring
      startMuteMonitoring();
    } else {
      chrome.runtime.sendMessage({
        type: MESSAGE.CALL_ENDED,
        data: { platform: PLATFORM },
      }).catch(e => console.warn('[MuteMe Meet] Failed to send call ended:', e));

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
  switch (message.type) {
    case MESSAGE.SET_MUTE:
      setMute(message.data.mute);
      break;

    case MESSAGE.TOGGLE_MUTE:
      toggleMute();
      break;

    case MESSAGE.GET_VISIBILITY:
      // Return whether the tab content is visible
      // Either the tab itself is visible, or there's a Picture-in-Picture window
      // eslint-disable-next-line no-case-declarations
      const hasPip = typeof documentPictureInPicture !== 'undefined' &&
                     documentPictureInPicture.window !== null;
      sendResponse({
        visible: document.visibilityState === 'visible' || hasPip,
      });
      return true; // Keep channel open for async response
  }
}

// ============================================================================
// Initialization
// ============================================================================
function init() {
  console.log('[MuteMe Meet] Content script loaded');

  // Listen for messages from background
  chrome.runtime.onMessage.addListener(handleMessage);

  // Start monitoring for call state
  _callCheckInterval = setInterval(checkCallState, 1000);

  // Initial check
  checkCallState();

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
    attributeFilter: ['data-is-muted', 'aria-label', 'aria-pressed'],
  });
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
