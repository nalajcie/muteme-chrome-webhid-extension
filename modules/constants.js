/**
 * @filename constants.js
 * @description Constants for the MuteMe Chrome Extension
 */

// ============================================================================
// MuteMe Device Filters (USB VID/PID pairs)
// ============================================================================
export const MUTEME_DEVICE_FILTERS = [
  { vendorId: 0x16c0, productId: 0x27db }, // MuteMe Original (prototypes)
  { vendorId: 0x20a0, productId: 0x42da }, // MuteMe Original (production)
  { vendorId: 0x20a0, productId: 0x42db }, // MuteMe Mini (production)
  { vendorId: 0x3603, productId: 0x0001 }, // MuteMe Original (Batch 009+)
  { vendorId: 0x3603, productId: 0x0002 }, // MuteMe Mini USB-C
  { vendorId: 0x3603, productId: 0x0003 }, // MuteMe Mini USB-A
  { vendorId: 0x3603, productId: 0x0004 }, // MuteMe Mini (Generic)
];

// ============================================================================
// LED Colors (base values for sendReport)
// ============================================================================
export const LED_COLOR = {
  OFF: 0x00,
  RED: 0x01,
  GREEN: 0x02,
  YELLOW: 0x03,
  BLUE: 0x04,
  PURPLE: 0x05,
  CYAN: 0x06,
  WHITE: 0x07,
};

// ============================================================================
// LED Effects (added to base color value)
// ============================================================================
export const LED_EFFECT = {
  SOLID: 0x00,
  DIM: 0x10,
  FAST_PULSE: 0x20,
  SLOW_PULSE: 0x30,
};

// ============================================================================
// Touch Events (received from device)
// ============================================================================
export const TOUCH_EVENT = {
  CLEAR: 0x00,
  TOUCHING: 0x01,
  END_TOUCH: 0x02,
  START_TOUCH: 0x04,
};

// ============================================================================
// Touch Modes (user preference for touch behavior)
// ============================================================================
export const TOUCH_MODE = {
  TOGGLE: 'toggle', // Single tap to toggle mute
  PUSH_TO_TALK: 'push-to-talk', // Hold to unmute
  SMART: 'smart', // Toggle on tap, push-to-talk when muted and holding
};

// ============================================================================
// Message Types (for extension messaging)
// ============================================================================
export const MESSAGE = {
  // Device status
  PERMISSION_GRANTED: 'muteme:permission-granted',
  DEVICE_CONNECTED: 'muteme:device-connected',
  DEVICE_DISCONNECTED: 'muteme:device-disconnected',

  // Touch events
  TOUCH_START: 'muteme:touch-start',
  TOUCH_END: 'muteme:touch-end',
  TOUCH_TAP: 'muteme:touch-tap',

  // LED control
  SET_LED: 'muteme:set-led',

  // Call session
  CALL_STARTED: 'muteme:call-started',
  CALL_ENDED: 'muteme:call-ended',
  MUTE_STATE_CHANGED: 'muteme:mute-state-changed',

  // Commands
  TOGGLE_MUTE: 'muteme:toggle-mute',
  SET_MUTE: 'muteme:set-mute',
  SET_TOUCH_MODE: 'muteme:set-touch-mode',
  SET_FOCUS_TAB: 'muteme:set-focus-tab',
  FOCUS_MEETING_TAB: 'muteme:focus-meeting-tab',
  GET_VISIBILITY: 'muteme:get-visibility',

  // State requests
  GET_STATE: 'muteme:get-state',
  STATE_UPDATE: 'muteme:state-update',
};

// ============================================================================
// Call Platforms
// ============================================================================
export const PLATFORM = {
  GOOGLE_MEET: 'meet',
  MICROSOFT_TEAMS: 'teams',
  UNKNOWN: 'unknown',
};

// ============================================================================
// Extension State Defaults
// ============================================================================
export const DEFAULT_STATE = {
  mutemeConnected: false,
  activeCallTabId: null,
  isMuted: null,
  touchMode: TOUCH_MODE.TOGGLE,
};

// ============================================================================
// LED Presets (for different states)
// ============================================================================
export const LED_PRESET = {
  OFF: { color: LED_COLOR.OFF, effect: LED_EFFECT.SOLID },
  CONNECTED_IDLE: { color: LED_COLOR.OFF, effect: LED_EFFECT.SOLID }, // Off until call found
  MUTED: { color: LED_COLOR.RED, effect: LED_EFFECT.SOLID },
  MUTED_PTT_READY: { color: LED_COLOR.RED, effect: LED_EFFECT.SLOW_PULSE }, // Muted in smart/PTT mode
  UNMUTED: { color: LED_COLOR.GREEN, effect: LED_EFFECT.SOLID },
  PUSH_TO_TALK_ACTIVE: { color: LED_COLOR.GREEN, effect: LED_EFFECT.FAST_PULSE }, // Holding to talk
  CONNECTING: { color: LED_COLOR.CYAN, effect: LED_EFFECT.FAST_PULSE }, // Connection animation
  ERROR: { color: LED_COLOR.YELLOW, effect: LED_EFFECT.FAST_PULSE },
};

