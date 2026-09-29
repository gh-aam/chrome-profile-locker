/**
 * ProfileLock Background Service Worker (Manifest V3)
 * Handles lifecycle, lock containment, idle monitoring, and audio muting.
 */

import { CryptoUtil } from './utils/crypto.js';

// Default configuration settings
const DEFAULT_CONFIG = {
  isConfigured: false,
  profileName: 'Personal Profile',
  avatarIcon: 'shield',
  idleTimeoutMinutes: 15,
  muteAudioOnLock: true,
  antiBypassHardening: true,
  failedAttempts: 0,
  lockoutUntil: 0
};

/**
 * Initialize default settings if not already present
 */
async function initializeDefaults() {
  const current = await chrome.storage.local.get(Object.keys(DEFAULT_CONFIG));
  const updates = {};
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    if (current[key] === undefined) {
      updates[key] = value;
    }
  }
  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
}

/**
 * Helper to get current session state
 */
async function getSessionState() {
  return await chrome.storage.session.get({
    isLocked: false,
    lockWindowId: null,
    mutedTabIds: [],
    isUnlocking: false
  });
}

/**
 * Helper to update session state
 */
async function updateSessionState(updates) {
  await chrome.storage.session.set(updates);
}

/**
 * Lock the browser profile
 */
export async function lockProfile() {
  const config = await chrome.storage.local.get(['isConfigured', 'muteAudioOnLock']);
  if (!config.isConfigured) {
    // If not configured yet, don't lock down; open or focus setup
    const setupUrl = chrome.runtime.getURL('setup/setup.html');
    const existing = await chrome.tabs.query({ url: setupUrl });
    if (existing && existing.length > 0) {
      await chrome.tabs.update(existing[0].id, { active: true });
      await chrome.windows.update(existing[0].windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: setupUrl });
    }
    return;
  }

  const session = await getSessionState();
  if (session.isLocked && session.lockWindowId) {
    // Already locked, verify if lock window still exists
    try {
      await chrome.windows.get(session.lockWindowId);
      await chrome.windows.update(session.lockWindowId, { focused: true });
      return;
    } catch {
      // Window might have been lost, proceed to create new lock window
    }
  }

  // 1. Gather all windows
  const allWindows = await chrome.windows.getAll({ populate: true });

  // 2. Mute tabs if enabled
  const mutedTabIds = [];
  if (config.muteAudioOnLock) {
    for (const win of allWindows) {
      if (win.tabs) {
        for (const tab of win.tabs) {
          if (tab.audible && !tab.mutedInfo?.muted) {
            try {
              await chrome.tabs.update(tab.id, { muted: true });
              mutedTabIds.push(tab.id);
            } catch (err) {
              console.warn('Failed to mute tab', tab.id, err);
            }
          }
        }
      }
    }
  }

  // 3. Create focused lock window safely with fallbacks
  let lockWindow;
  try {
    // Normal window allows state: 'fullscreen' cleanly in Chromium
    lockWindow = await chrome.windows.create({
      url: chrome.runtime.getURL('lock/lock.html'),
      type: 'normal',
      state: 'fullscreen',
      focused: true
    });
  } catch (err1) {
    console.warn('Fullscreen normal window fallback:', err1);
    try {
      // Fallback 1: Popup maximized
      lockWindow = await chrome.windows.create({
        url: chrome.runtime.getURL('lock/lock.html'),
        type: 'popup',
        state: 'maximized',
        focused: true
      });
    } catch (err2) {
      console.warn('Popup maximized fallback:', err2);
      // Fallback 2: Standard popup
      lockWindow = await chrome.windows.create({
        url: chrome.runtime.getURL('lock/lock.html'),
        type: 'popup',
        focused: true
      });
    }
  }

  if (!lockWindow || !lockWindow.id) {
    console.error('Failed to create lock window.');
    await updateSessionState({ isLocked: false });
    return;
  }

  // 4. Commit locked state with valid window ID
  await updateSessionState({
    isLocked: true,
    lockWindowId: lockWindow.id,
    mutedTabIds: mutedTabIds,
    isUnlocking: false
  });

  // 5. Minimize other normal browser windows to prevent background viewing
  for (const win of allWindows) {
    if (win.id !== lockWindow.id) {
      try {
        await chrome.windows.update(win.id, { state: 'minimized' });
      } catch (err) {
        console.warn('Failed to minimize window', win.id, err);
      }
    }
  }

  // 6. Update action icon badge
  try {
    await chrome.action.setBadgeText({ text: 'LOCK' });
    await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  } catch (err) {
    console.warn('Badge update error:', err);
  }
}

/**
 * Unlock the browser profile
 */
export async function unlockProfile() {
  const session = await getSessionState();
  const lockWinId = session.lockWindowId;

  // Mark unlocking flag so onRemoved doesn't interpret closing lock window as an evasion attempt
  await updateSessionState({
    isLocked: false,
    isUnlocking: true
  });

  // 1. Unmute previously muted tabs
  if (session.mutedTabIds && session.mutedTabIds.length > 0) {
    for (const tabId of session.mutedTabIds) {
      try {
        await chrome.tabs.update(tabId, { muted: false });
      } catch (err) {
        console.warn('Failed to unmute tab', tabId, err);
      }
    }
  }

  // 2. Restore other windows
  const allWindows = await chrome.windows.getAll();
  for (const win of allWindows) {
    if (win.id !== lockWinId && win.state === 'minimized') {
      try {
        await chrome.windows.update(win.id, { state: 'normal' });
      } catch (err) {
        console.warn('Failed to restore window', win.id, err);
      }
    }
  }

  // 3. Close the lock window
  if (lockWinId) {
    try {
      await chrome.windows.remove(lockWinId);
    } catch (err) {
      console.warn('Lock window already closed:', err);
    }
  }

  // 4. Reset session and failed attempts
  await updateSessionState({
    isLocked: false,
    lockWindowId: null,
    mutedTabIds: [],
    isUnlocking: false
  });

  await chrome.storage.local.set({
    failedAttempts: 0,
    lockoutUntil: 0
  });

  // 5. Clear action badge
  try {
    await chrome.action.setBadgeText({ text: '' });
  } catch (err) {
    console.warn('Badge clear error:', err);
  }
}

/**
 * Configure idle detection threshold
 */
async function configureIdleDetection() {
  const { idleTimeoutMinutes = 15 } = await chrome.storage.local.get('idleTimeoutMinutes');
  if (idleTimeoutMinutes > 0) {
    const seconds = Math.max(15, idleTimeoutMinutes * 60);
    chrome.idle.setDetectionInterval(seconds);
  }
}

// ---------------------- EVENT LISTENERS ----------------------

// 1. Extension Installed / Updated
chrome.runtime.onInstalled.addListener(async (details) => {
  await initializeDefaults();
  await configureIdleDetection();

  if (details.reason === 'install') {
    // Open onboarding wizard on first install
    await chrome.tabs.create({
      url: chrome.runtime.getURL('setup/setup.html')
    });
  }
});

// 2. Browser Startup
chrome.runtime.onStartup.addListener(async () => {
  await initializeDefaults();
  await configureIdleDetection();

  const { isConfigured } = await chrome.storage.local.get('isConfigured');
  if (isConfigured) {
    // Lock immediately on startup
    await lockProfile();
  }
});

// 3. User Inactivity / Idle Trigger
chrome.idle.onStateChanged.addListener(async (newState) => {
  const { isConfigured, idleTimeoutMinutes } = await chrome.storage.local.get(['isConfigured', 'idleTimeoutMinutes']);
  if (isConfigured && idleTimeoutMinutes > 0) {
    if (newState === 'idle' || newState === 'locked') {
      const session = await getSessionState();
      if (!session.isLocked) {
        await lockProfile();
      }
    }
  }
});

// 4. Keyboard Shortcut Commands (Ctrl+Shift+L or Alt+Shift+L)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'lock-profile' || command === 'lock-profile-alt') {
    await lockProfile();
  }
});

// 5. Anti-Bypass: Window Focus Enforcement
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;

  const session = await getSessionState();
  if (session.isLocked && session.lockWindowId && !session.isUnlocking) {
    if (windowId !== session.lockWindowId) {
      // User clicked another window while locked
      const { antiBypassHardening = true } = await chrome.storage.local.get('antiBypassHardening');
      if (antiBypassHardening) {
        try {
          // Re-minimize other window and refocus lock window
          await chrome.windows.update(windowId, { state: 'minimized' });
          await chrome.windows.update(session.lockWindowId, { focused: true });
        } catch (err) {
          console.warn('Containment focus error:', err);
        }
      }
    }
  }
});

// 6. Anti-Bypass: Lock Window Closure Defense
chrome.windows.onRemoved.addListener(async (windowId) => {
  const session = await getSessionState();
  if (session.isLocked && session.lockWindowId === windowId && !session.isUnlocking) {
    // Lock window was closed without unlocking! (e.g. user clicked X or used Alt+F4)
    // Instantly close all remaining windows to protect profile data
    const allWindows = await chrome.windows.getAll();
    for (const win of allWindows) {
      try {
        await chrome.windows.remove(win.id);
      } catch (err) {
        console.warn('Emergency exit window removal:', err);
      }
    }
  }
});

// 7. Anti-Bypass: New Tab Containment
chrome.tabs.onCreated.addListener(async (tab) => {
  const session = await getSessionState();
  if (session.isLocked && session.lockWindowId && !session.isUnlocking) {
    if (tab.windowId !== session.lockWindowId) {
      // Tab created in another window while locked; close it and refocus lock window
      try {
        await chrome.tabs.remove(tab.id);
        await chrome.windows.update(session.lockWindowId, { focused: true });
      } catch (err) {
        console.warn('Tab containment error:', err);
      }
    }
  }
});

// 8. Runtime Messaging (Popup, Setup, Options, Lock Screen)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.action) {
      case 'LOCK_NOW':
        await lockProfile();
        sendResponse({ success: true });
        break;

      case 'UNLOCK_SUCCESS':
        await unlockProfile();
        sendResponse({ success: true });
        break;

      case 'GET_STATUS': {
        const session = await getSessionState();
        const config = await chrome.storage.local.get([
          'isConfigured',
          'profileName',
          'avatarIcon',
          'idleTimeoutMinutes',
          'failedAttempts',
          'lockoutUntil'
        ]);
        sendResponse({
          isLocked: session.isLocked,
          ...config
        });
        break;
      }

      case 'UPDATE_IDLE_TIMER':
        await configureIdleDetection();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
  })();
  return true; // Keep message channel open for async response
});
