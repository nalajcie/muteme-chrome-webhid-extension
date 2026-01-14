/**
 * @filename muteme.js
 * @description MuteMe device driver using WebHID API
 *
 * Provides methods for:
 * - Device connection/disconnection
 * - LED color and effect control
 * - Touch event handling
 */

import {
  MUTEME_DEVICE_FILTERS,
  LED_COLOR,
  LED_EFFECT,
  TOUCH_EVENT,
} from './constants.js';

class MuteMe {
  constructor() {
    this.device = null;
    this.isConnected = false;

    // Callbacks
    this.onConnect = null;
    this.onDisconnect = null;
    this.onTouchStart = null;
    this.onTouchEnd = null;
    this.onTouching = null;

    // Bind methods
    this._handleConnect = this._handleConnect.bind(this);
    this._handleDisconnect = this._handleDisconnect.bind(this);
    this._handleInputReport = this._handleInputReport.bind(this);

    // Track touch state for tap detection
    this._isTouching = false;
    this._touchStartTime = null;
  }

  /**
   * Initialize the MuteMe driver.
   * Sets up HID event listeners for device connect/disconnect.
   *
   * @param {Object} callbacks - Callback functions
   * @param {Function} callbacks.onConnect - Called when device connects
   * @param {Function} callbacks.onDisconnect - Called when device disconnects
   * @param {Function} callbacks.onTouchStart - Called when touch begins
   * @param {Function} callbacks.onTouchEnd - Called when touch ends (includes tap detection)
   * @param {Function} callbacks.onTouching - Called repeatedly while touching
   */
  async init(callbacks = {}) {
    this.onConnect = callbacks.onConnect || null;
    this.onDisconnect = callbacks.onDisconnect || null;
    this.onTouchStart = callbacks.onTouchStart || null;
    this.onTouchEnd = callbacks.onTouchEnd || null;
    this.onTouching = callbacks.onTouching || null;

    // Listen for device connect/disconnect events
    navigator.hid.addEventListener('connect', this._handleConnect);
    navigator.hid.addEventListener('disconnect', this._handleDisconnect);

    console.log('[MuteMe] Initialized');
  }

  /**
   * Request user permission to access a MuteMe device.
   * Must be called from a user gesture (click event).
   *
   * @returns {Promise<boolean>} True if permission granted and device found
   */
  async requestPermission() {
    try {
      const devices = await navigator.hid.requestDevice({
        filters: MUTEME_DEVICE_FILTERS,
      });

      if (devices.length > 0) {
        console.log('[MuteMe] Permission granted for device:', devices[0].productName);
        await this.connect();
        return true;
      }

      console.log('[MuteMe] No device selected');
      return false;
    } catch (error) {
      console.error('[MuteMe] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Check if a MuteMe device is available (previously paired).
   *
   * @returns {Promise<boolean>} True if device is available
   */
  async isDeviceAvailable() {
    const devices = await navigator.hid.getDevices();
    return devices.some(device =>
      MUTEME_DEVICE_FILTERS.some(filter =>
        device.vendorId === filter.vendorId &&
        device.productId === filter.productId,
      ),
    );
  }

  /**
   * Connect to a previously paired MuteMe device.
   *
   * @returns {Promise<boolean>} True if connection successful
   */
  async connect() {
    if (this.isConnected && this.device) {
      return true;
    }

    try {
      const devices = await navigator.hid.getDevices();
      const muteMe = devices.find(device =>
        MUTEME_DEVICE_FILTERS.some(filter =>
          device.vendorId === filter.vendorId &&
          device.productId === filter.productId,
        ),
      );

      if (!muteMe) {
        return false;
      }

      console.log('[MuteMe] Connecting to:', muteMe.productName);
      this.device = muteMe;

      if (!this.device.opened) {
        await this.device.open();
      }

      this.device.addEventListener('inputreport', this._handleInputReport);
      this.isConnected = true;
      console.log('[MuteMe] Connected');

      if (this.onConnect) {
        this.onConnect(this.device);
      }

      return true;
    } catch (error) {
      console.error('[MuteMe] Connection failed:', error.message);
      this.device = null;
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Disconnect from the MuteMe device.
   */
  async disconnect() {
    if (!this.device) {
      return;
    }

    try {
      this.device.removeEventListener('inputreport', this._handleInputReport);

      if (this.device.opened) {
        await this.device.close();
      }
    } catch (error) {
      console.error('[MuteMe] Disconnect error:', error);
    }

    this.device = null;
    this.isConnected = false;
    console.log('[MuteMe] Disconnected');
  }

  /**
   * Set the LED color and effect.
   *
   * @param {number} color - LED color from LED_COLOR constants
   * @param {number} effect - LED effect from LED_EFFECT constants
   * @returns {Promise<boolean>} True if command sent successfully
   */
  async setLed(color = LED_COLOR.OFF, effect = LED_EFFECT.SOLID) {
    if (!this.isConnected || !this.device) {
      console.warn('[MuteMe] Cannot set LED: not connected');
      return false;
    }

    try {
      const value = color + effect;
      await this.device.sendReport(0, new Uint8Array([value]));
      console.log(`[MuteMe] LED set to: 0x${value.toString(16)}`);
      return true;
    } catch (error) {
      console.error('[MuteMe] Failed to set LED:', error);
      return false;
    }
  }

  /**
   * Convenience method to set LED using a preset.
   *
   * @param {Object} preset - Preset object with color and effect
   * @returns {Promise<boolean>} True if command sent successfully
   */
  async setLedPreset(preset) {
    return this.setLed(preset.color, preset.effect);
  }

  /**
   * Turn off the LED.
   *
   * @returns {Promise<boolean>} True if command sent successfully
   */
  async ledOff() {
    return this.setLed(LED_COLOR.OFF, LED_EFFECT.SOLID);
  }

  /**
   * Get current connection status.
   *
   * @returns {Object} Status object with isConnected and deviceName
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      deviceName: this.device?.productName || null,
      vendorId: this.device?.vendorId || null,
      productId: this.device?.productId || null,
    };
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  _handleConnect(event) {
    const device = event.device;
    const isMyDevice = MUTEME_DEVICE_FILTERS.some(filter =>
      device.vendorId === filter.vendorId &&
      device.productId === filter.productId,
    );

    if (isMyDevice && !this.isConnected) {
      console.log('[MuteMe] Device plugged in, reconnecting...');
      setTimeout(() => {
        if (!this.isConnected) {
          this.connect();
        }
      }, 200);
    }
  }

  _handleDisconnect(event) {
    const device = event.device;
    const isMyDevice = MUTEME_DEVICE_FILTERS.some(filter =>
      device.vendorId === filter.vendorId &&
      device.productId === filter.productId,
    );

    if (isMyDevice && this.isConnected) {
      console.log('[MuteMe] Device unplugged');

      if (this.device) {
        try {
          this.device.removeEventListener('inputreport', this._handleInputReport);
        } catch (e) {
          // Device already gone
        }
      }

      this.device = null;
      this.isConnected = false;
      this._isTouching = false;

      if (this.onDisconnect) {
        this.onDisconnect();
      }
    }
  }

  _handleInputReport(event) {
    const data = new Uint8Array(event.data.buffer);
    const touchEvent = data[3]; // not sure why byte 4, but that's what the device sends

    switch (touchEvent) {
      case TOUCH_EVENT.START_TOUCH:
        this._isTouching = true;
        this._touchStartTime = Date.now();
        if (this.onTouchStart) {
          this.onTouchStart();
        }
        break;

      case TOUCH_EVENT.TOUCHING:
        if (this.onTouching) {
          this.onTouching();
        }
        break;

      case TOUCH_EVENT.END_TOUCH:
        const wasTouching = this._isTouching;
        const touchDuration = this._touchStartTime ? Date.now() - this._touchStartTime : 0;
        this._isTouching = false;
        this._touchStartTime = null;

        console.log(`[MuteMe] Touch ended (duration: ${touchDuration}ms)`);
        if (wasTouching && this.onTouchEnd) {
          this.onTouchEnd({
            duration: touchDuration,
            isTap: touchDuration < 500,
          });
        }
        break;

      case TOUCH_EVENT.CLEAR:
        break;

      default:
        // Ignore unknown events
    }
  }

  /**
   * Clean up event listeners.
   */
  destroy() {
    navigator.hid.removeEventListener('connect', this._handleConnect);
    navigator.hid.removeEventListener('disconnect', this._handleDisconnect);
    this.disconnect();
    console.log('[MuteMe] Destroyed');
  }
}

// Export singleton instance
const muteme = new MuteMe();
export default muteme;

// Also export the class for testing
export { MuteMe };
