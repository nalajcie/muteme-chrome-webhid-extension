/**
 * @filename icon.js
 * @description Dynamic extension icon management for MuteMe Controller
 */

// Icon states
const ICON_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTED: 'connected',
  MUTED: 'muted',
  UNMUTED: 'unmuted',
};

// Badge colors
const BADGE_COLORS = {
  DISCONNECTED: '#666666',
  CONNECTED: '#4488ff',
  MUTED: '#ff4444',
  UNMUTED: '#00ff88',
};

class Icon {
  constructor() {
    this.currentState = ICON_STATE.DISCONNECTED;
  }

  /**
   * Set icon to disconnected state (gray)
   */
  setDisconnected() {
    this.currentState = ICON_STATE.DISCONNECTED;
    this._updateIcon();
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'MuteMe: Disconnected' });
  }

  /**
   * Set icon to connected state (no active call)
   */
  setConnected() {
    this.currentState = ICON_STATE.CONNECTED;
    this._updateIcon();
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'MuteMe: Connected (No active call)' });
  }

  /**
   * Set icon to muted state (red)
   */
  setMuted() {
    this.currentState = ICON_STATE.MUTED;
    this._updateIcon();
    chrome.action.setBadgeText({ text: '🔇' });
    chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.MUTED });
    chrome.action.setTitle({ title: 'MuteMe: Muted' });
  }

  /**
   * Set icon to unmuted state (green)
   */
  setUnmuted() {
    this.currentState = ICON_STATE.UNMUTED;
    this._updateIcon();
    chrome.action.setBadgeText({ text: '🎤' });
    chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.UNMUTED });
    chrome.action.setTitle({ title: 'MuteMe: Unmuted' });
  }

  /**
   * Update icon based on mute state
   * @param {boolean|null} isMuted - true if muted, false if unmuted, null if no call
   */
  setMuteState(isMuted) {
    if (isMuted === null) {
      this.setConnected();
    } else if (isMuted) {
      this.setMuted();
    } else {
      this.setUnmuted();
    }
  }

  /**
   * Internal method to update the icon image
   * For now uses static icons; can be enhanced to use canvas-generated icons
   */
  _updateIcon() {
    // Using the same base icon for now
    // In Phase 4, we can generate dynamic icons based on state
    const iconPath = {
      16: 'images/icon16.png',
      32: 'images/icon32.png',
      48: 'images/icon48.png',
      128: 'images/icon128.png',
    };

    try {
      chrome.action.setIcon({ path: iconPath });
    } catch (e) {
      console.warn('[Icon] Failed to set icon:', e);
    }
  }
}

const icon = new Icon();
export default icon;
export { ICON_STATE };

