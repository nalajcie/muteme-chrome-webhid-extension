# Copilot Instructions for MuteMe Chrome Extension

## Project Overview

This is a Chrome Extension (Manifest V3) that integrates MuteMe hardware buttons with Google Meet and Microsoft Teams using the WebHID API. The extension allows users to control their meeting mute state via a physical USB button.

## Technology Stack

- **Chrome Extension Manifest V3** with service worker
- **WebHID API** for USB device communication
- **ES Modules** in background script and modules
- **Vanilla JavaScript** (no frameworks)
- **ESLint** for linting

## Architecture

```
Background Service Worker (background.js)
    ├── WebHID Driver (modules/muteme.js)
    ├── Icon Manager (modules/icon.js)
    ├── Constants (modules/constants.js)
    └── Message routing to content scripts

Content Scripts (injected per-tab)
    ├── meet-controller.js (Google Meet)
    └── teams-controller.js (Microsoft Teams)

Popup UI
    ├── popup.html
    └── popup.js
```

## Key Patterns

### Message Passing

All communication uses Chrome's messaging API with typed messages defined in `modules/constants.js`:

```javascript
chrome.runtime.sendMessage({
  type: MESSAGE.MUTE_STATE_CHANGED,
  data: { isMuted: true }
});
```

### Content Scripts

Content scripts **cannot use ES modules** in Manifest V3. Message types must be duplicated as plain objects:

```javascript
// In content scripts - duplicate, don't import
const MESSAGE = {
  CALL_STARTED: 'muteme:call-started',
  // ...
};
```

### LED Control

LED colors and effects are defined in `modules/constants.js`. Use presets from `LED_PRESET` or combine `LED_COLOR` + `LED_EFFECT`:

```javascript
muteme.setLed(LED_COLOR.GREEN, LED_EFFECT.SOLID);
```

### Touch Modes

- **Toggle**: Tap to toggle mute
- **Smart**: Tap to toggle, hold for push-to-talk when muted
- **Push-to-Talk**: Hold to unmute, release to mute

### Icon States

Icon is dynamically grayscaled when disconnected using OffscreenCanvas. Badges indicate call state:
- Green dot = unmuted in call
- Red "M" = muted in call

## Important Constraints

1. **Service Worker Lifecycle**: Service workers can be suspended. Use polling for device state, not event listeners alone.

2. **Content Script Isolation**: After extension reload, existing content scripts become orphaned and cannot communicate with new extension context.

3. **WebHID Permissions**: Device access requires user gesture to grant permission initially.

4. **Background Tab Throttling**: Chrome throttles background tabs. Mute state detection may be delayed.

5. **Platform-Specific Selectors**: Meet and Teams have different DOM structures. Teams selectors must support multiple versions (new Teams 2024+, classic).

## Code Style

- Use `'use strict';` at top of files
- Single quotes for strings
- 2-space indentation
- Trailing commas in multiline
- Prefix unused variables with underscore: `_unusedVar`
- Use async/await over raw promises

## File Naming

- Modules: `camelCase.js` (e.g., `muteme.js`, `icon.js`)
- Content scripts: `kebab-case.js` (e.g., `meet-controller.js`)
- Constants exported as UPPER_SNAKE_CASE

## Testing

Manual testing only. Use `muteme-test.html` for device testing.

```bash
# Lint code
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Build extension zip
npm run build

# Release new version (patch/minor/major)
npm run release [patch|minor|major]
```

## CHANGELOG.md

**Always update CHANGELOG.md** when adding features, fixing bugs, or making changes.

Format follows [Keep a Changelog](https://keepachangelog.com/):

```markdown
## [Unreleased]

### Added
- New feature description

### Changed
- Modified behavior

### Fixed
- Bug fix description
```

The `npm run release` script automatically moves `[Unreleased]` entries to a versioned section with the release date.

## Common Tasks

### Adding a New Message Type

1. Add to `MESSAGE` in `modules/constants.js`
2. Add handler in `background.js` `handleMessage()`
3. If content scripts need it, duplicate in content script MESSAGE object

### Adding Platform Support

1. Create `content-scripts/{platform}-controller.js`
2. Add URL patterns to `manifest.json` content_scripts
3. Implement `isInCall()`, `getMuteState()`, `toggleMute()`, `setMute()`
4. Use keyboard shortcuts for mute control (works when tab unfocused)

### Updating Teams Selectors

Teams UI changes frequently. Check for:
- `#mic-button` - primary mute button
- `#hangup-button` - call indicator
- `[data-cid="call-screen-wrapper"]` - call screen
- SVG `data-testid` attributes for icon state

### Releasing a New Version

1. Update `CHANGELOG.md` with changes under `[Unreleased]`
2. Run `npm run release [patch|minor|major]`
3. Push with tags: `git push origin main --tags`
4. Publish to Chrome Web Store: `npm run upload` (draft) or `npm run publish` (immediate)
5. Prepare new GH release using `gh` tool (extract changes from CHANGELOG.md, upload extension zip, etc.)