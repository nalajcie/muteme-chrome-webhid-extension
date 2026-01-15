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
  MUTED: '#ff4444',
  IN_CALL: '#00cc6a',
};

// Icon sizes
const ICON_SIZES = [16, 32, 48, 128];

// Cache for grayscale icons
const grayscaleCache = new Map();

/**
 * Load an image and convert to grayscale ImageData
 */
async function createGrayscaleIcon(size) {
  const cacheKey = size;
  if (grayscaleCache.has(cacheKey)) {
    return grayscaleCache.get(cacheKey);
  }

  const imagePath = `images/icon${size}.png`;

  // Fetch the image
  const response = await fetch(chrome.runtime.getURL(imagePath));
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  // Create offscreen canvas
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Draw image
  ctx.drawImage(bitmap, 0, 0, size, size);

  // Get image data and convert to grayscale
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale using luminance formula
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray; // R
    data[i + 1] = gray; // G
    data[i + 2] = gray; // B
    // Alpha unchanged
  }

  grayscaleCache.set(cacheKey, imageData);
  return imageData;
}

// Icon paths for connected state
const ICON_PATHS = {
  16: 'images/icon16.png',
  32: 'images/icon32.png',
  48: 'images/icon48.png',
  128: 'images/icon128.png',
};

class Icon {
  constructor() {
    this.currentState = ICON_STATE.DISCONNECTED;
  }

  /**
   * Set icon to disconnected state (gray)
   */
  async setDisconnected() {
    this.currentState = ICON_STATE.DISCONNECTED;
    await this._setGrayscaleIcon();
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'MuteMe: Disconnected' });
  }

  /**
   * Set icon to connected state (no active call)
   */
  setConnected() {
    this.currentState = ICON_STATE.CONNECTED;
    this._setColorIcon();
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'MuteMe: Connected (No active call)' });
  }

  /**
   * Set icon to muted state (red badge)
   */
  setMuted() {
    this.currentState = ICON_STATE.MUTED;
    this._setColorIcon();
    chrome.action.setBadgeText({ text: 'M' });
    chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.MUTED });
    chrome.action.setTitle({ title: 'MuteMe: Muted' });
  }

  /**
   * Set icon to unmuted state (green badge to show active call)
   */
  setUnmuted() {
    this.currentState = ICON_STATE.UNMUTED;
    this._setColorIcon();
    chrome.action.setBadgeText({ text: ' ' });
    chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.IN_CALL });
    chrome.action.setTitle({ title: 'MuteMe: Unmuted' });
  }

  /**
   * Update icon based on mute state
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

  _setColorIcon() {
    try {
      chrome.action.setIcon({ path: ICON_PATHS });
    } catch (e) {
      // Ignore errors
    }
  }

  async _setGrayscaleIcon() {
    try {
      const imageData = {};
      for (const size of ICON_SIZES) {
        imageData[size] = await createGrayscaleIcon(size);
      }
      chrome.action.setIcon({ imageData });
    } catch (e) {
      // Fallback to color icon if grayscale fails
      this._setColorIcon();
    }
  }
}

const icon = new Icon();
export default icon;
export { ICON_STATE };