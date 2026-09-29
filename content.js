/**
 * ProfileLock Content Script
 * Captures keyboard lock shortcuts (Ctrl+Shift+L and Alt+Shift+L) directly from web pages
 */

(() => {
  window.addEventListener('keydown', (e) => {
    const isKeyL = e.key === 'L' || e.key === 'l' || e.code === 'KeyL';
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const isAlt = e.altKey;

    // Detect either Ctrl+Shift+L or Alt+Shift+L
    if ((isCtrlOrCmd || isAlt) && e.shiftKey && isKeyL) {
      // Don't intercept if modifier combinations don't match
      try {
        chrome.runtime.sendMessage({ action: 'LOCK_NOW' }, () => {
          // Check for any runtime errors silently
          if (chrome.runtime.lastError) {
            // Service worker might be spinning up
          }
        });
      } catch (err) {
        // Context might be invalidated on extension reload
      }
    }
  }, true);
})();
