# Chrome Web Store Listing: ProfileLock

## 1. Extension Metadata
- **Extension Name**: ProfileLock - Browser Profile Locker
- **Short Name**: ProfileLock
- **Version**: 1.0.0
- **Category**: Productivity / Security & Privacy
- **Language**: English

## 2. Store Listing Copy

### Single-Sentence Summary (Max 132 chars)
Secure your Chrome browser profile with master password or PIN protection, inactivity auto-lock, and anti-bypass focus containment.

### Detailed Description
ProfileLock protects your Chrome profile from unauthorized local access when stepping away from your computer or sharing a machine.

#### Key Features:
- **Master Password & PIN Protection**: Secure your browser profile with a personal password or numeric PIN hashed locally with high-iteration PBKDF2-SHA256 cryptography.
- **Inactivity Auto-Lock**: Automatically locks the browser after a customizable idle threshold (1m, 5m, 15m, 30m, 1h).
- **Instant Keyboard Lock**: Press `Ctrl+Shift+L` (`Command+Shift+L` on Mac) at any time to instantly lock your browser profile.
- **Anti-Bypass Window Containment**: Prevents unauthorized background viewing by keeping the lock screen focused and auto-minimizing other browser windows.
- **Background Audio Muting**: Automatically silences audible tabs (music, videos) when the browser is locked, preserving privacy in public spaces.
- **Brute-Force Rate Limiting**: Progressive delay timers engage automatically upon repeated incorrect attempts to thwart unauthorized guessing.
- **Emergency Recovery System**: Set a personalized security question and download an offline Emergency Recovery Key to ensure you never lose access to your profile.
- **Cyber-Dark Glassmorphic UI**: Sleek, distraction-free lock screen equipped with a real-time digital clock and personalized avatar.

---

## 3. Permissions Justifications (For Review Team)

| Permission | Justification |
| :--- | :--- |
| `storage` | Required to store encrypted/hashed credentials, salts, user profile preferences, and auto-lock timeout configurations locally on the device. |
| `idle` | Required to detect user system inactivity so the extension can automatically lock the profile after the configured timeout. |
| `tabs` | Required to identify and temporarily mute audible background media tabs when the browser profile locks, and to restore audio state upon unlocking. |
| `alarms` | Required to manage lockout cooldown timers for anti-brute-force rate limiting without relying on persistent background execution. |

---

## 4. Privacy & Data Use Disclosures
- **Single Purpose**: Securing the browser profile with a local authentication lock screen.
- **Data Collection**:
  - Does NOT collect, track, or transmit any user browsing history, website content, or personal identifiers.
  - All cryptographic hashes and credentials remain 100% strictly local in `chrome.storage.local`.
  - Zero external network requests or remote telemetry.
