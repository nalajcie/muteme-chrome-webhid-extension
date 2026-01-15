# Privacy Policy

**MuteMe Chrome WebHID Extension**

*Last updated: January 15, 2026*

## Overview

This extension is designed with privacy as a core principle. It operates entirely locally on your device and does not collect, store, or transmit any personal data.

## Data Collection

**We do not collect any data.**

This extension:
- Does not collect personal information
- Does not collect usage analytics or telemetry
- Does not use cookies or tracking technologies
- Does not transmit any data to external servers
- Does not store any data outside your browser

## How the Extension Works

The extension uses the [WebHID API](https://developer.chrome.com/docs/capabilities/hid) to communicate directly with your MuteMe USB device. All communication happens locally between your browser and the connected USB device.

The extension:
- Reads button presses from your MuteMe device via USB
- Controls the LED color on the device
- Sends keyboard shortcuts to Google Meet or Microsoft Teams tabs to toggle mute
- Stores your preferences (touch mode, auto-focus setting) in Chrome's local storage on your device only

## Permissions

The extension requests the following permissions:

| Permission | Purpose |
|------------|---------|
| `scripting` | To inject content scripts into Google Meet and Microsoft Teams tabs for detecting mute state and sending mute commands |
| `tabs` | To detect active meeting tabs and send mute commands |
| `storage` | To save your preferences locally |
| Host permissions for meet.google.com and teams.microsoft.com | To enable script injection and detect call state on those platforms |

These permissions are used solely for the extension's core functionality and no data is transmitted externally.

## Third-Party Services

This extension does not integrate with any third-party services, analytics platforms, or advertising networks.

## Open Source

This extension is open source and available under the MIT License. You can inspect the complete source code at:

https://github.com/nicholasn/muteme-chrome-webhid-extension

## Disclaimer

This extension is provided "as is", without warranty of any kind, express or implied. This is an unofficial community project and is not affiliated with, endorsed by, or supported by MuteMe Inc.

## Contact

If you have questions about this privacy policy, please open an issue on the GitHub repository.

---

*This privacy policy may be updated from time to time. Any changes will be reflected in the "Last updated" date above.*
