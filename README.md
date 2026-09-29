# ProfileLock - Chrome Browser Profile Locker

A secure, high-performance, Manifest V3 Chrome browser profile locker extension designed to safeguard your open tabs, browser sessions, and personal data from local snooping.

---

## Features

- 🔐 **PBKDF2-SHA256 Cryptography**: Master password/PIN stored locally with 100,000 iterations of PBKDF2 hashing, random salt, and timing-safe comparisons via Web Crypto API.
- ⚡ **Instant Keyboard Lock**: Press <kbd>Ctrl+Shift+L</kbd> or <kbd>Alt+Shift+L</kbd> (<kbd>Command+Shift+L</kbd> on macOS) to instantly secure your profile.
- ⏱️ **Idle Auto-Lock**: Automatically locks the browser after a period of user inactivity (e.g. 5m, 15m, 30m).
- 🛡️ **Anti-Bypass Window Containment**:
  - Automatically minimizes background windows when locked.
  - Aggressively refocuses the lock window if any unauthorized interaction occurs.
  - Closes all browser windows if the lock screen is dismissed without authentication (preventing Alt+F4 or window-close circumvention).
- 🔇 **Automatic Audio/Video Muting**: Silences any audible background tabs when the browser locks and restores volume upon unlocking.
- ⏱️ **Brute-Force Rate Limiting**: Enforces a 30s/60s cooldown lockout timer after 5 failed password attempts.
- 🔑 **Dual Recovery Options**: Reset forgotten passwords using a personalized Security Question or an offline 20-character Emergency Recovery Key.
- 🎨 **Cyber-Dark Glassmorphic UI**: Real-time digital clock, date display, customized profile name, and sleek animations.

---

## Step-by-Step Installation Guide

### Step 1: Open Chrome Extension Management
1. Open Google Chrome.
2. In the address bar, type `chrome://extensions` and press **Enter**.
3. In the top-right corner of the Extensions page, toggle **Developer mode** to **ON**.

### Step 2: Load Unpacked Extension
1. Click the **Load unpacked** button in the top-left corner.
2. In the folder picker dialog, navigate to and select the folder where you cloned or extracted this repository (the folder containing `manifest.json`):
   ```text
   path/to/chrome-profile-locker
   ```
3. Click **Select Folder**.
4. The extension **ProfileLock - Browser Profile Locker** will appear in your installed extensions list.

### Step 3: Complete First-Time Setup Wizard
1. Immediately upon installation, ProfileLock automatically opens the **Setup Wizard** in a new tab.
   *(If not opened automatically, click the ProfileLock icon in the browser toolbar and select "Complete Setup".)*
2. **Step 1 - Profile**: Enter your profile display name (e.g., "Mamun's Profile") and choose an avatar icon. Click **Next Step**.
3. **Step 2 - Password**: Set your master password or PIN (minimum 4 characters/digits). Confirm the password and click **Next Step**.
4. **Step 3 - Recovery**: Select a security question, type your secret answer, and click **Download** or **Copy** to save your offline **Emergency Recovery Key**. Click **Next Step**.
5. **Step 4 - Auto-Lock**: Choose your preferred inactivity timeout (e.g., 15 minutes) and verify your security toggles. Click **Complete Setup**.
6. **Step 5 - Arm ProfileLock**: Click **Lock Now to Test** to test your lock screen immediately!

---

## How to Use ProfileLock

### 1. Locking the Browser
- **Shortcut**: Press <kbd>Ctrl+Shift+L</kbd> or <kbd>Alt+Shift+L</kbd> (<kbd>Command+Shift+L</kbd> on Mac).
- **Toolbar Action**: Click the ProfileLock icon in your Chrome toolbar and click **Lock Profile Now**.
- **Browser Startup**: Whenever you relaunch Chrome, ProfileLock automatically locks down the browser until unlocked.
- **Inactivity**: Walk away from your computer, and Chrome will lock after your configured idle timer expires.

### 2. Unlocking the Profile
- Enter your master password or PIN on the lock screen and press **Enter** (or click **Unlock Profile**).
- If you forget your password, click **Forgot Password / Recovery** on the lock screen to use your Security Question or Emergency Recovery Key.

### 3. Customizing Settings
1. Right-click the ProfileLock extension icon and choose **Options** (or click **Settings & Security** inside the extension popup).
2. From the options dashboard, you can:
   - Change your profile display name.
   - Adjust or disable the auto-lock idle timeout.
   - Toggle audio muting and anti-bypass containment.
   - Change your master password.
   - Update security questions or generate a new emergency recovery key.
   - Execute a factory reset.

---

## Extension Structure

```
├── manifest.json            # Manifest V3 specification
├── background.js            # Background service worker (locking & containment engine)
├── CHROMEWEBSTORE.md        # Chrome Web Store listing & permissions justification
├── README.md                # Project documentation & user guide
├── icons/                   # High-resolution PNG icons (16px, 32px, 48px, 128px)
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
├── utils/                   # Cryptographic engine
│   └── crypto.js            # PBKDF2-SHA256, salted hashing, recovery keys
├── lock/                    # Fullscreen Lock Screen
│   ├── lock.html
│   ├── lock.css
│   └── lock.js
├── setup/                   # 4-Step Onboarding Setup Wizard
│   ├── setup.html
│   ├── setup.css
│   └── setup.js
├── options/                 # Options & Settings Dashboard
│   ├── options.html
│   ├── options.css
│   └── options.js
└── popup/                   # Toolbar Action Popup
    ├── popup.html
    ├── popup.css
    └── popup.js
```

---

## Security Verification & Integrity

- **No Remote Calls**: The extension operates entirely offline. No passwords, credentials, or keys ever leave your machine.
- **Timing-Safe Checks**: Hash comparisons use constant-time operations to thwart side-channel timing analysis.
- **Anti-Brute Force**: Locks input for 30s/60s after repeated invalid attempts.
- **Anti-Bypass Protection**: Closing the lock window without authenticating automatically closes all other Chrome windows, stopping unauthorized access in its tracks.
