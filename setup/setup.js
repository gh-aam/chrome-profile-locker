/**
 * ProfileLock Setup Wizard Controller
 * Handles user onboarding, credential hashing, emergency key generation, and preference storage.
 */

import { CryptoUtil } from '../utils/crypto.js';

// Elements
const stepItems = document.querySelectorAll('.step-item');
const wizardSteps = document.querySelectorAll('.wizard-step');
const profileNameInput = document.getElementById('profileNameInput');
const avatarOptions = document.querySelectorAll('.avatar-opt');
const masterPassword = document.getElementById('masterPassword');
const confirmPassword = document.getElementById('confirmPassword');
const strengthBar = document.getElementById('strengthBar');
const strengthText = document.getElementById('strengthText');
const securityQuestionSelect = document.getElementById('securityQuestionSelect');
const securityAnswer = document.getElementById('securityAnswer');
const emergencyKeyDisplay = document.getElementById('emergencyKeyDisplay');
const copyKeyBtn = document.getElementById('copyKeyBtn');
const downloadKeyBtn = document.getElementById('downloadKeyBtn');
const idleTimeoutSelect = document.getElementById('idleTimeoutSelect');
const muteAudioCheck = document.getElementById('muteAudioCheck');
const antiBypassCheck = document.getElementById('antiBypassCheck');
const saveAndFinishBtn = document.getElementById('saveAndFinishBtn');
const lockNowTestBtn = document.getElementById('lockNowTestBtn');
const startBrowsingBtn = document.getElementById('startBrowsingBtn');
const setupErrorMsg = document.getElementById('setupErrorMsg');

// State
let selectedAvatar = 'shield';
let generatedEmergencyKey = '';

/**
 * 1. Initialize Emergency Key
 */
function initKey() {
  generatedEmergencyKey = CryptoUtil.generateEmergencyKey();
  emergencyKeyDisplay.textContent = generatedEmergencyKey;
}
initKey();

/**
 * 2. Avatar Selection
 */
avatarOptions.forEach((btn) => {
  btn.addEventListener('click', () => {
    avatarOptions.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedAvatar = btn.dataset.avatar;
  });
});

/**
 * 3. Password Strength Meter
 */
masterPassword.addEventListener('input', () => {
  const val = masterPassword.value;
  let score = 0;
  if (val.length >= 4) score++;
  if (val.length >= 8) score++;
  if (/[0-9]/.test(val) && /[a-zA-Z]/.test(val)) score++;
  if (/[^a-zA-Z0-9]/.test(val)) score++;

  if (val.length === 0) {
    strengthBar.style.width = '0%';
    strengthBar.style.backgroundColor = 'transparent';
    strengthText.textContent = 'Password strength';
  } else if (score <= 1) {
    strengthBar.style.width = '25%';
    strengthBar.style.backgroundColor = '#ef4444';
    strengthText.textContent = 'Weak';
  } else if (score === 2) {
    strengthBar.style.width = '50%';
    strengthBar.style.backgroundColor = '#f59e0b';
    strengthText.textContent = 'Moderate';
  } else if (score === 3) {
    strengthBar.style.width = '75%';
    strengthBar.style.backgroundColor = '#38bdf8';
    strengthText.textContent = 'Strong';
  } else {
    strengthBar.style.width = '100%';
    strengthBar.style.backgroundColor = '#10b981';
    strengthText.textContent = 'Very strong';
  }
});

// Show / Hide Password Buttons
document.querySelectorAll('.btn-eye').forEach((eyeBtn) => {
  eyeBtn.addEventListener('click', () => {
    const targetId = eyeBtn.dataset.target;
    const targetInput = document.getElementById(targetId);
    if (targetInput) {
      targetInput.type = targetInput.type === 'password' ? 'text' : 'password';
    }
  });
});

/**
 * 4. Step Navigation & Validation
 */
function showStep(stepNumber) {
  setupErrorMsg.classList.add('hidden');
  wizardSteps.forEach((s) => s.classList.add('hidden'));

  const activeStep = document.getElementById(`step${stepNumber}`);
  if (activeStep) {
    activeStep.classList.remove('hidden');
  }

  // Update Stepper Dots
  stepItems.forEach((item) => {
    const step = parseInt(item.dataset.step, 10);
    if (step < stepNumber) {
      item.classList.add('completed');
      item.classList.remove('active');
    } else if (step === stepNumber) {
      item.classList.add('active');
      item.classList.remove('completed');
    } else {
      item.classList.remove('active', 'completed');
    }
  });
}

function showError(msg) {
  setupErrorMsg.textContent = msg;
  setupErrorMsg.classList.remove('hidden');
}

// Next Buttons
document.querySelectorAll('.next-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const nextStep = parseInt(btn.dataset.next, 10);

    // Validate Step 1
    if (nextStep === 2) {
      if (!profileNameInput.value.trim()) {
        showError('Please provide a profile display name.');
        return;
      }
    }

    // Validate Step 2
    if (nextStep === 3) {
      const pass = masterPassword.value.trim();
      const confirm = confirmPassword.value.trim();
      if (!pass || pass.length < 4) {
        showError('Password must be at least 4 characters/digits.');
        return;
      }
      if (pass !== confirm) {
        showError('Passwords do not match. Please verify.');
        return;
      }
    }

    // Validate Step 3
    if (nextStep === 4) {
      const ans = securityAnswer.value.trim();
      if (!ans) {
        showError('Please provide an answer to your security question.');
        return;
      }
    }

    showStep(nextStep);
  });
});

// Prev Buttons
document.querySelectorAll('.prev-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const prevStep = parseInt(btn.dataset.prev, 10);
    showStep(prevStep);
  });
});

/**
 * 5. Emergency Key Copy & Download
 */
copyKeyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(generatedEmergencyKey);
    copyKeyBtn.textContent = 'Copied!';
    setTimeout(() => { copyKeyBtn.textContent = 'Copy'; }, 2000);
  } catch (err) {
    console.error('Clipboard copy failed:', err);
  }
});

downloadKeyBtn.addEventListener('click', () => {
  const fileContent = `ProfileLock Emergency Recovery Key\r\n` +
    `Generated: ${new Date().toISOString()}\r\n` +
    `Profile Name: ${profileNameInput.value.trim()}\r\n\r\n` +
    `EMERGENCY KEY: ${generatedEmergencyKey}\r\n\r\n` +
    `Keep this file safe and offline. You can use it to reset your profile lock if you forget your master password.`;

  const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ProfileLock-Emergency-Key-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

/**
 * 6. Save and Finish Setup
 */
saveAndFinishBtn.addEventListener('click', async () => {
  saveAndFinishBtn.disabled = true;
  saveAndFinishBtn.textContent = 'Encrypting & Saving...';

  try {
    const pass = masterPassword.value.trim();
    const ans = securityAnswer.value.trim().toLowerCase();
    const q = securityQuestionSelect.value;
    const idleMinutes = parseInt(idleTimeoutSelect.value, 10);
    const muteAudio = muteAudioCheck.checked;
    const antiBypass = antiBypassCheck.checked;
    const profileName = profileNameInput.value.trim();

    // 1. Hash Master Password
    const passwordSalt = CryptoUtil.generateSalt();
    const passwordHash = await CryptoUtil.hashWithSalt(pass, passwordSalt);

    // 2. Hash Security Answer
    const securitySalt = CryptoUtil.generateSalt();
    const securityAnswerHash = await CryptoUtil.hashWithSalt(ans, securitySalt);

    // 3. Hash Emergency Key
    const emergencyKeyHash = await CryptoUtil.hashSHA256(generatedEmergencyKey);

    // 4. Save to chrome.storage.local
    await chrome.storage.local.set({
      isConfigured: true,
      profileName: profileName,
      avatarIcon: selectedAvatar,
      passwordHash: passwordHash,
      salt: passwordSalt,
      securityQuestion: q,
      securityAnswerHash: securityAnswerHash,
      securitySalt: securitySalt,
      emergencyKeyHash: emergencyKeyHash,
      idleTimeoutMinutes: idleMinutes,
      muteAudioOnLock: muteAudio,
      antiBypassHardening: antiBypass,
      failedAttempts: 0,
      lockoutUntil: 0
    });

    // 5. Notify background to configure idle timer
    await chrome.runtime.sendMessage({ action: 'UPDATE_IDLE_TIMER' });

    // 6. Transition to Success step
    showStep(5);
  } catch (err) {
    console.error('Setup error:', err);
    showError('An error occurred while saving your security profile.');
    saveAndFinishBtn.disabled = false;
    saveAndFinishBtn.textContent = 'Complete Setup';
  }
});

/**
 * 7. Final Step Actions
 */
lockNowTestBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'LOCK_NOW' });
});

startBrowsingBtn.addEventListener('click', async () => {
  const currentTab = await chrome.tabs.getCurrent();
  if (currentTab) {
    await chrome.tabs.remove(currentTab.id);
  } else {
    window.close();
  }
});
