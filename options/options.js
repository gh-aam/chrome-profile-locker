/**
 * ProfileLock Options / Settings Page Controller
 */

import { CryptoUtil } from '../utils/crypto.js';

// Navigation Elements
const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');
const sidebarLockNowBtn = document.getElementById('sidebarLockNowBtn');

// General Tab Elements
const optProfileName = document.getElementById('optProfileName');
const optIdleMinutes = document.getElementById('optIdleMinutes');
const optMuteAudio = document.getElementById('optMuteAudio');
const optAntiBypass = document.getElementById('optAntiBypass');
const saveGeneralBtn = document.getElementById('saveGeneralBtn');

// Security Tab Elements
const currentPassword = document.getElementById('currentPassword');
const newPassword = document.getElementById('newPassword');
const confirmNewPassword = document.getElementById('confirmNewPassword');
const savePasswordBtn = document.getElementById('savePasswordBtn');

// Recovery Tab Elements
const optSecurityQuestion = document.getElementById('optSecurityQuestion');
const optSecurityAnswer = document.getElementById('optSecurityAnswer');
const optVerifyPassForRecovery = document.getElementById('optVerifyPassForRecovery');
const saveRecoveryBtn = document.getElementById('saveRecoveryBtn');
const generateNewKeyBtn = document.getElementById('generateNewKeyBtn');
const newKeyResult = document.getElementById('newKeyResult');
const newKeyDisplay = document.getElementById('newKeyDisplay');
const copyNewKeyBtn = document.getElementById('copyNewKeyBtn');

// Danger Tab Elements
const resetConfirmPass = document.getElementById('resetConfirmPass');
const executeResetBtn = document.getElementById('executeResetBtn');

// Toast Element
const toastMessage = document.getElementById('toastMessage');

let toastTimeout = null;

function showToast(msg, type = 'success') {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastMessage.textContent = msg;
  toastMessage.className = `toast-notification ${type}`;
  toastMessage.classList.remove('hidden');

  toastTimeout = setTimeout(() => {
    toastMessage.classList.add('hidden');
  }, 3500);
}

/**
 * 1. Tab Navigation
 */
navItems.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    navItems.forEach((b) => b.classList.remove('active'));
    tabPanes.forEach((p) => p.classList.add('hidden'));

    btn.classList.add('active');
    const targetPane = document.getElementById(`tabContent${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (targetPane) {
      targetPane.classList.remove('hidden');
    }
  });
});

/**
 * 2. Load Existing Settings
 */
async function loadSettings() {
  const data = await chrome.storage.local.get([
    'profileName',
    'idleTimeoutMinutes',
    'muteAudioOnLock',
    'antiBypassHardening',
    'securityQuestion'
  ]);

  if (data.profileName) optProfileName.value = data.profileName;
  if (data.idleTimeoutMinutes !== undefined) optIdleMinutes.value = String(data.idleTimeoutMinutes);
  if (data.muteAudioOnLock !== undefined) optMuteAudio.checked = data.muteAudioOnLock;
  if (data.antiBypassHardening !== undefined) optAntiBypass.checked = data.antiBypassHardening;
  if (data.securityQuestion) optSecurityQuestion.value = data.securityQuestion;
}
loadSettings();

/**
 * 3. Save General Preferences
 */
saveGeneralBtn.addEventListener('click', async () => {
  const name = optProfileName.value.trim() || 'Personal Profile';
  const idle = parseInt(optIdleMinutes.value, 10);
  const mute = optMuteAudio.checked;
  const antiBypass = optAntiBypass.checked;

  await chrome.storage.local.set({
    profileName: name,
    idleTimeoutMinutes: idle,
    muteAudioOnLock: mute,
    antiBypassHardening: antiBypass
  });

  await chrome.runtime.sendMessage({ action: 'UPDATE_IDLE_TIMER' });
  showToast('General preferences updated successfully.');
});

/**
 * 4. Change Password
 */
savePasswordBtn.addEventListener('click', async () => {
  const current = currentPassword.value.trim();
  const next = newPassword.value.trim();
  const confirm = confirmNewPassword.value.trim();

  if (!current) {
    showToast('Please enter your current master password.', 'error');
    return;
  }
  if (!next || next.length < 4) {
    showToast('New password must be at least 4 characters.', 'error');
    return;
  }
  if (next !== confirm) {
    showToast('New passwords do not match.', 'error');
    return;
  }

  const data = await chrome.storage.local.get(['passwordHash', 'salt']);
  const computedCurrentHash = await CryptoUtil.hashWithSalt(current, data.salt);

  if (!CryptoUtil.constantTimeCompare(computedCurrentHash, data.passwordHash)) {
    showToast('Current password is incorrect.', 'error');
    return;
  }

  // Update with fresh salt & hash
  const newSalt = CryptoUtil.generateSalt();
  const newHash = await CryptoUtil.hashWithSalt(next, newSalt);

  await chrome.storage.local.set({
    passwordHash: newHash,
    salt: newSalt
  });

  currentPassword.value = '';
  newPassword.value = '';
  confirmNewPassword.value = '';

  showToast('Master password changed successfully!');
});

/**
 * 5. Update Security Question
 */
saveRecoveryBtn.addEventListener('click', async () => {
  const q = optSecurityQuestion.value;
  const a = optSecurityAnswer.value.trim().toLowerCase();
  const verifyPass = optVerifyPassForRecovery.value.trim();

  if (!a) {
    showToast('Please provide a security answer.', 'error');
    return;
  }
  if (!verifyPass) {
    showToast('Please enter your master password to confirm changes.', 'error');
    return;
  }

  const data = await chrome.storage.local.get(['passwordHash', 'salt']);
  const computedPassHash = await CryptoUtil.hashWithSalt(verifyPass, data.salt);

  if (!CryptoUtil.constantTimeCompare(computedPassHash, data.passwordHash)) {
    showToast('Incorrect master password.', 'error');
    return;
  }

  const newSalt = CryptoUtil.generateSalt();
  const answerHash = await CryptoUtil.hashWithSalt(a, newSalt);

  await chrome.storage.local.set({
    securityQuestion: q,
    securityAnswerHash: answerHash,
    securitySalt: newSalt
  });

  optSecurityAnswer.value = '';
  optVerifyPassForRecovery.value = '';
  showToast('Security question updated successfully.');
});

/**
 * 6. Generate New Emergency Key
 */
generateNewKeyBtn.addEventListener('click', async () => {
  const newKey = CryptoUtil.generateEmergencyKey();
  const keyHash = await CryptoUtil.hashSHA256(newKey);

  await chrome.storage.local.set({ emergencyKeyHash: keyHash });

  newKeyDisplay.textContent = newKey;
  newKeyResult.classList.remove('hidden');
  showToast('New Emergency Key generated! Save it securely.');
});

copyNewKeyBtn.addEventListener('click', async () => {
  const key = newKeyDisplay.textContent;
  if (key) {
    await navigator.clipboard.writeText(key);
    copyNewKeyBtn.textContent = 'Copied!';
    setTimeout(() => { copyNewKeyBtn.textContent = 'Copy'; }, 2000);
  }
});

/**
 * 7. Factory Reset
 */
executeResetBtn.addEventListener('click', async () => {
  const pass = resetConfirmPass.value.trim();
  if (!pass) {
    showToast('Enter your master password to execute a reset.', 'error');
    return;
  }

  const data = await chrome.storage.local.get(['passwordHash', 'salt']);
  const computedPass = await CryptoUtil.hashWithSalt(pass, data.salt);

  if (!CryptoUtil.constantTimeCompare(computedPass, data.passwordHash)) {
    showToast('Incorrect master password. Reset denied.', 'error');
    return;
  }

  const confirmWipe = confirm('Are you sure you want to permanently reset ProfileLock? All password protections will be removed.');
  if (confirmWipe) {
    await chrome.storage.local.clear();
    await chrome.storage.session.clear();
    window.location.href = chrome.runtime.getURL('setup/setup.html');
  }
});

/**
 * 8. Quick Lock Action
 */
sidebarLockNowBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'LOCK_NOW' });
});
