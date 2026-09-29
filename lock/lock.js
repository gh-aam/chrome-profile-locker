/**
 * ProfileLock Lock Screen Controller
 * Handles real-time clock, authentication, anti-brute force cooldowns, and recovery
 */

import { CryptoUtil } from '../utils/crypto.js';

// DOM Elements
const digitalClock = document.getElementById('digitalClock');
const currentDate = document.getElementById('currentDate');
const authCard = document.getElementById('authCard');
const profileNameEl = document.getElementById('profileName');
const passwordInput = document.getElementById('passwordInput');
const unlockForm = document.getElementById('unlockForm');
const unlockButton = document.getElementById('unlockButton');
const statusMessage = document.getElementById('statusMessage');
const togglePasswordVisibility = document.getElementById('togglePasswordVisibility');
const eyeIcon = togglePasswordVisibility.querySelector('.icon-eye');
const eyeOffIcon = togglePasswordVisibility.querySelector('.icon-eye-off');

// Recovery Modal Elements
const recoveryModal = document.getElementById('recoveryModal');
const openRecoveryBtn = document.getElementById('openRecoveryBtn');
const closeRecoveryBtn = document.getElementById('closeRecoveryBtn');
const tabSecurityQ = document.getElementById('tabSecurityQ');
const tabEmergencyKey = document.getElementById('tabEmergencyKey');
const sectionSecurityQ = document.getElementById('sectionSecurityQ');
const sectionEmergencyKey = document.getElementById('sectionEmergencyKey');
const securityQuestionText = document.getElementById('securityQuestionText');
const securityAnswerInput = document.getElementById('securityAnswerInput');
const newPasswordInput = document.getElementById('newPasswordInput');
const submitSecurityRecoveryBtn = document.getElementById('submitSecurityRecoveryBtn');
const emergencyKeyInput = document.getElementById('emergencyKeyInput');
const emergencyNewPasswordInput = document.getElementById('emergencyNewPasswordInput');
const submitEmergencyRecoveryBtn = document.getElementById('submitEmergencyRecoveryBtn');
const recoveryStatus = document.getElementById('recoveryStatus');

let lockoutInterval = null;

/**
 * 1. Initialize Real-Time Clock & Date
 */
function updateClock() {
  const now = new Date();
  digitalClock.textContent = now.toLocaleTimeString([], { hour12: true });
  currentDate.textContent = now.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

setInterval(updateClock, 1000);
updateClock();

/**
 * 2. Load Profile Configurations & Check Lockout Status
 */
async function initScreen() {
  const data = await chrome.storage.local.get([
    'isConfigured',
    'profileName',
    'passwordHash',
    'salt',
    'securityQuestion',
    'failedAttempts',
    'lockoutUntil'
  ]);

  if (!data.isConfigured || !data.passwordHash) {
    // Open setup if unconfigured
    window.location.href = chrome.runtime.getURL('setup/setup.html');
    return;
  }

  if (data.profileName) {
    profileNameEl.textContent = data.profileName;
  }

  if (data.securityQuestion) {
    securityQuestionText.textContent = data.securityQuestion;
  }

  // Check cooldown lockout
  checkLockoutState(data.lockoutUntil);
}

/**
 * Handle Anti-Brute-Force Lockout Countdown
 */
function checkLockoutState(lockoutUntil) {
  const now = Date.now();
  if (lockoutUntil && lockoutUntil > now) {
    passwordInput.disabled = true;
    unlockButton.disabled = true;

    if (lockoutInterval) clearInterval(lockoutInterval);

    const updateCountdown = () => {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remainingSeconds <= 0) {
        clearInterval(lockoutInterval);
        passwordInput.disabled = false;
        unlockButton.disabled = false;
        statusMessage.classList.add('hidden');
        passwordInput.focus();
      } else {
        showStatus(`Rate limit active. Please wait ${remainingSeconds}s...`, 'error');
      }
    };

    updateCountdown();
    lockoutInterval = setInterval(updateCountdown, 1000);
  } else {
    passwordInput.disabled = false;
    unlockButton.disabled = false;
    passwordInput.focus();
  }
}

/**
 * Display Status / Error Banner
 */
function showStatus(message, type = 'error', targetEl = statusMessage) {
  targetEl.textContent = message;
  targetEl.className = `status-message ${type}`;
  targetEl.classList.remove('hidden');
}

/**
 * Trigger Input Shake Animation
 */
function triggerShake() {
  authCard.classList.remove('shake');
  // Trigger reflow
  void authCard.offsetWidth;
  authCard.classList.add('shake');
}

/**
 * 3. Handle Form Submission / Password Authentication
 */
unlockForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const enteredPassword = passwordInput.value.trim();
  if (!enteredPassword) return;

  const data = await chrome.storage.local.get([
    'passwordHash',
    'salt',
    'failedAttempts',
    'lockoutUntil'
  ]);

  // Check cooldown
  if (data.lockoutUntil && data.lockoutUntil > Date.now()) {
    checkLockoutState(data.lockoutUntil);
    return;
  }

  unlockButton.disabled = true;

  try {
    const computedHash = await CryptoUtil.hashWithSalt(enteredPassword, data.salt);
    const isMatch = CryptoUtil.constantTimeCompare(computedHash, data.passwordHash);

    if (isMatch) {
      // SUCCESS: Perform unlock
      showStatus('Profile unlocked. Decrypting session...', 'success');
      authCard.classList.add('unlock-success');

      // Notify background worker
      setTimeout(async () => {
        await chrome.runtime.sendMessage({ action: 'UNLOCK_SUCCESS' });
      }, 350);
    } else {
      // FAILURE: Increment failed attempts & rate limit
      const newAttempts = (data.failedAttempts || 0) + 1;
      let newLockout = 0;

      if (newAttempts >= 5) {
        const cooldownSeconds = newAttempts >= 10 ? 60 : 30;
        newLockout = Date.now() + cooldownSeconds * 1000;
        await chrome.storage.local.set({
          failedAttempts: newAttempts,
          lockoutUntil: newLockout
        });
        checkLockoutState(newLockout);
      } else {
        await chrome.storage.local.set({ failedAttempts: newAttempts });
        showStatus(`Incorrect password/PIN (${newAttempts}/5 attempts)`, 'error');
      }

      triggerShake();
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (err) {
    console.error('Authentication error:', err);
    showStatus('An error occurred during verification.', 'error');
  } finally {
    if (!passwordInput.disabled) {
      unlockButton.disabled = false;
    }
  }
});

/**
 * 4. Password Visibility Toggle
 */
togglePasswordVisibility.addEventListener('click', () => {
  const isCurrentlyPassword = passwordInput.type === 'password';
  passwordInput.type = isCurrentlyPassword ? 'text' : 'password';
  eyeIcon.classList.toggle('hidden', isCurrentlyPassword);
  eyeOffIcon.classList.toggle('hidden', !isCurrentlyPassword);
  passwordInput.focus();
});

/**
 * 5. Recovery Flow
 */
openRecoveryBtn.addEventListener('click', () => {
  recoveryModal.classList.remove('hidden');
  securityAnswerInput.focus();
});

closeRecoveryBtn.addEventListener('click', () => {
  recoveryModal.classList.add('hidden');
  recoveryStatus.classList.add('hidden');
  passwordInput.focus();
});

tabSecurityQ.addEventListener('click', () => {
  tabSecurityQ.classList.add('active');
  tabEmergencyKey.classList.remove('active');
  sectionSecurityQ.classList.remove('hidden');
  sectionEmergencyKey.classList.add('hidden');
  recoveryStatus.classList.add('hidden');
});

tabEmergencyKey.addEventListener('click', () => {
  tabEmergencyKey.classList.add('active');
  tabSecurityQ.classList.remove('active');
  sectionEmergencyKey.classList.remove('hidden');
  sectionSecurityQ.classList.add('hidden');
  recoveryStatus.classList.add('hidden');
});

// Security Question Reset
submitSecurityRecoveryBtn.addEventListener('click', async () => {
  const answer = securityAnswerInput.value.trim().toLowerCase();
  const newPassword = newPasswordInput.value.trim();

  if (!answer) {
    showStatus('Please provide the security answer.', 'error', recoveryStatus);
    return;
  }
  if (!newPassword || newPassword.length < 4) {
    showStatus('New password must be at least 4 characters.', 'error', recoveryStatus);
    return;
  }

  const data = await chrome.storage.local.get(['securityAnswerHash', 'securitySalt']);
  const computedAnswerHash = await CryptoUtil.hashWithSalt(answer, data.securitySalt);

  if (CryptoUtil.constantTimeCompare(computedAnswerHash, data.securityAnswerHash)) {
    // Correct answer: Update password
    const newSalt = CryptoUtil.generateSalt();
    const newPasswordHash = await CryptoUtil.hashWithSalt(newPassword, newSalt);

    await chrome.storage.local.set({
      passwordHash: newPasswordHash,
      salt: newSalt,
      failedAttempts: 0,
      lockoutUntil: 0
    });

    showStatus('Password reset successfully! Unlocking...', 'success', recoveryStatus);
    setTimeout(async () => {
      await chrome.runtime.sendMessage({ action: 'UNLOCK_SUCCESS' });
    }, 600);
  } else {
    showStatus('Incorrect security answer.', 'error', recoveryStatus);
  }
});

// Emergency Key Reset
submitEmergencyRecoveryBtn.addEventListener('click', async () => {
  const key = emergencyKeyInput.value.trim();
  const newPassword = emergencyNewPasswordInput.value.trim();

  if (!key) {
    showStatus('Please enter your emergency key.', 'error', recoveryStatus);
    return;
  }
  if (!newPassword || newPassword.length < 4) {
    showStatus('New password must be at least 4 characters.', 'error', recoveryStatus);
    return;
  }

  const data = await chrome.storage.local.get(['emergencyKeyHash']);
  const computedKeyHash = await CryptoUtil.hashSHA256(key);

  if (CryptoUtil.constantTimeCompare(computedKeyHash, data.emergencyKeyHash)) {
    // Valid Emergency Key
    const newSalt = CryptoUtil.generateSalt();
    const newPasswordHash = await CryptoUtil.hashWithSalt(newPassword, newSalt);

    await chrome.storage.local.set({
      passwordHash: newPasswordHash,
      salt: newSalt,
      failedAttempts: 0,
      lockoutUntil: 0
    });

    showStatus('Key verified! Password reset. Unlocking...', 'success', recoveryStatus);
    setTimeout(async () => {
      await chrome.runtime.sendMessage({ action: 'UNLOCK_SUCCESS' });
    }, 600);
  } else {
    showStatus('Invalid emergency recovery key.', 'error', recoveryStatus);
  }
});

/**
 * 6. Hardening: Disable Context Menu, DevTools Shortcuts, and Maintain Focus
 */
document.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('keydown', (e) => {
  // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
    (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S'))
  ) {
    e.preventDefault();
  }
});

// Auto-focus password input on window click unless modal is active
document.addEventListener('click', (e) => {
  if (recoveryModal.classList.contains('hidden') && !passwordInput.disabled) {
    if (e.target !== passwordInput && e.target !== togglePasswordVisibility && !togglePasswordVisibility.contains(e.target) && e.target !== openRecoveryBtn) {
      passwordInput.focus();
    }
  }
});

// Run screen initialization
initScreen();
