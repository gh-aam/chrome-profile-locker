/**
 * ProfileLock Popup Controller
 */

const lockNowBtn = document.getElementById('lockNowBtn');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const popupProfileName = document.getElementById('popupProfileName');
const popupIdleInfo = document.getElementById('popupIdleInfo');
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');

async function initPopup() {
  try {
    const status = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });

    if (!status.isConfigured) {
      statusBadge.style.borderColor = '#f59e0b';
      statusBadge.style.color = '#fcd34d';
      statusBadge.querySelector('.status-dot').style.backgroundColor = '#f59e0b';
      statusText.textContent = 'Unconfigured';
      popupProfileName.textContent = 'Setup Required';
      popupIdleInfo.textContent = 'Click below to arm locker';

      lockNowBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Complete Setup</span>
      `;
      lockNowBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('setup/setup.html') });
        window.close();
      });
      return;
    }

    if (status.profileName) {
      popupProfileName.textContent = status.profileName;
    }

    const idleMins = status.idleTimeoutMinutes;
    if (idleMins > 0) {
      popupIdleInfo.textContent = `Auto-lock: ${idleMins}m idle`;
    } else {
      popupIdleInfo.textContent = 'Auto-lock: Disabled';
    }

    lockNowBtn.addEventListener('click', async () => {
      lockNowBtn.disabled = true;
      await chrome.runtime.sendMessage({ action: 'LOCK_NOW' });
      window.close();
    });
  } catch (err) {
    console.error('Failed to initialize popup:', err);
  }
}

openSettingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

initPopup();
