# MuteMe HID Protocol Reference

*Source: https://muteme.com/pages/muteme-hid-key*

This document describes the USB HID protocol for MuteMe devices, enabling custom application integration.

## Overview

MuteMe uses a completely custom HID key map (not standard HID interfaces). This approach was designed for portability across various controllers during component shortages.

## USB Specifications

### USB Speed

| Batch | USB Speed |
|-------|-----------|
| Batch 001 - 003 | USB 1.1 |
| Batch 004+ | USB 2.0 |

### VID/PID Pairs

| Device | VID | PID |
|--------|-----|-----|
| MuteMe Original (prototypes) | `0x16c0` | `0x27db` |
| MuteMe Original (production) | `0x20a0` | `0x42da` |
| MuteMe Mini (production) | `0x20a0` | `0x42db` |
| MuteMe Original (Batch 009+) | `0x3603` | `0x0001` |
| MuteMe Mini USB-C | `0x3603` | `0x0002` |
| MuteMe Mini USB-A | `0x3603` | `0x0003` |
| MuteMe Mini (Generic) | `0x3603` | `0x0004` |

## HID Protocol

### Input Keys (PC → Device)

These are commands sent **to the MuteMe** to control LED colors and effects.

#### Base Colors

| Color | Hex Value |
|-------|-----------|
| No Color (Off) | `0x00` |
| Red | `0x01` |
| Green | `0x02` |
| Yellow | `0x03` |
| Blue | `0x04` |
| Purple | `0x05` |
| Cyan | `0x06` |
| White | `0x07` |

#### Lighting Effects

Effects are applied by adding the effect modifier to the base color value:

| Effect | Modifier |
|--------|----------|
| Solid (bright, no effect) | `+0x00` |
| Dim | `+0x10` |
| Fast Pulse | `+0x20` |
| Slow Pulse | `0x30` |

#### Examples

| Desired Effect | Calculation | Hex Value |
|----------------|-------------|-----------|
| Solid Red | `0x01 + 0x00` | `0x01` |
| Dim Green | `0x02 + 0x10` | `0x12` |
| Fast Pulse Blue | `0x04 + 0x20` | `0x24` |
| Slow Pulse Red | `0x01 + 0x30` | `0x31` |
| Slow Pulse White | `0x07 + 0x30` | `0x37` |

### Output Keys (Device → PC)

These are events received **from the MuteMe** based on touch input:

| Event | Hex Value | Description |
|-------|-----------|-------------|
| Clear | `0x00` | No touch / idle state |
| Touching | `0x01` | Finger currently touching |
| End Touch | `0x02` | Finger lifted (touch ended) |
| Start Touch | `0x04` | Touch just started |

#### Touch Event Sequence

1. **Start Touch (`0x04`)** - Sent once when finger makes contact
2. **Touching (`0x01`)** - Sent repeatedly while finger remains on device
3. **End Touch (`0x02`)** - Sent once when finger is lifted
4. **Clear (`0x00`)** - Device returns to idle state

This sequence enables features like:
- **Push to Talk**: Unmute while touching, mute when released
- **Push to Mute**: Mute while touching, unmute when released
- **Toggle**: Toggle mute state on tap (start touch + end touch)

## Device Batches

| Gen | Batch | Changes | Date |
|-----|-------|---------|------|
| Gen 0 | Prototype | Handmade, 3D Printed | Oct 2020 |
| Gen 0 | Batch 000 | Manufactured, MicroUSB | Dec 2020 |
| Gen 1 | Batch 001 | USB-C, Better Illumination | Feb 2021 |
| Gen 1 | Batch 002 | Fixed USB Cable Support | Apr 2021 |
| Gen 1 | Batch 003 | Fixed LED Issues, Sleep Modes | Jul 2021 |
| Gen 2 | Batch 004 | USB 2.0 Support | Oct 2021 |
| Gen 2 | Batch 005 | New Touch Sensor Testing | Oct 2021 |
| Gen 3 | Batch 006 | Software Touch Sensor | Oct 2021 |
| Gen 3 | Batch 007 | Ultra-Fast Touch Response | Apr 2022 |
| Gen 3 | Batch 008 | No Change | Mar 2023 |
| Gen 3 | Batch 009 | Increased Weight, Firmware Changes | Feb 2024 |

## WebHID Implementation Notes

### Device Filters for `navigator.hid.requestDevice()`

```javascript
const MUTEME_FILTERS = [
  { vendorId: 0x16c0, productId: 0x27db }, // Original (prototypes)
  { vendorId: 0x20a0, productId: 0x42da }, // Original (production)
  { vendorId: 0x20a0, productId: 0x42db }, // Mini (production)
  { vendorId: 0x3603, productId: 0x0001 }, // Original (Batch 009+)
  { vendorId: 0x3603, productId: 0x0002 }, // Mini USB-C
  { vendorId: 0x3603, productId: 0x0003 }, // Mini USB-A
  { vendorId: 0x3603, productId: 0x0004 }, // Mini (Generic)
];
```

### Sending LED Commands

```javascript
// Set LED color (example: slow pulse green)
const color = 0x02 + 0x30; // green + slow pulse = 0x32
await device.sendReport(0, new Uint8Array([color]));
```

### Receiving Touch Events

```javascript
device.addEventListener('inputreport', (event) => {
  const data = new Uint8Array(event.data.buffer);
  const touchEvent = data[0];
  
  switch (touchEvent) {
    case 0x04: console.log('Touch started'); break;
    case 0x01: console.log('Touching'); break;
    case 0x02: console.log('Touch ended'); break;
    case 0x00: console.log('Clear'); break;
  }
});
```

---

*Last updated: January 2026*
*Original source: MuteMe Support - September 30, 2024*
