// Error Boundary for Sticky Notes
// Wraps initialization in try/catch and shows user-visible error banner

export function withErrorBoundary(fn, context = 'Sticky Notes') {
  try {
    const result = fn();
    // Handle async functions
    if (result && typeof result.catch === 'function') {
      return result.catch((err) => showErrorBanner(err, context));
    }
    return result;
  } catch (err) {
    showErrorBanner(err, context);
  }
}

export function showErrorBanner(error, context = 'Sticky Notes') {
  console.error(`[${context}] Error:`, error);

  // Remove existing banner
  const existing = document.getElementById('sticky-notes-error-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'sticky-notes-error-banner';
  banner.className = 'sticky-notes-error-banner';
  banner.innerHTML = `
    <span>⚠️ ${context} encountered an error. Some features may not work correctly.</span>
    <button class="error-dismiss" title="Dismiss">✕</button>
  `;

  const dismissBtn = banner.querySelector('.error-dismiss');
  dismissBtn.addEventListener('click', () => banner.remove());

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (banner.parentNode) banner.remove();
  }, 10000);

  document.body.appendChild(banner);
}

/**
 * Show a non-blocking toast notification instead of alert().
 * @param {string} message - The message to display
 * @param {string} type - 'info'|'success'|'error'|'warning' or 'Undo' action label
 * @param {number|function} durationOrAction - Duration in ms, or an undo callback
 * @param {number} durationMs - Duration in ms (used when type is an action label)
 */
export function showToast(message, type = 'info', durationOrAction = 3000, durationMs = 5000) {
  // Remove existing toast
  const existing = document.getElementById('sticky-notes-toast');
  if (existing) existing.remove();

  // Support undo/action button: if type is a string label and durationOrAction is a function
  const hasAction = typeof durationOrAction === 'function';
  const actionLabel = hasAction ? type : null;
  const actionFn = hasAction ? durationOrAction : null;
  const actualDuration = hasAction ? durationMs : (typeof durationOrAction === 'number' ? durationOrAction : 3000);

  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  const icon = icons[type] || icons.info;

  const toast = document.createElement('div');
  toast.id = 'sticky-notes-toast';
  toast.className = `sticky-notes-toast sticky-notes-toast-${hasAction ? 'info' : type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${escapeHtmlSimple(message)}</span>
    ${hasAction ? `<button class="toast-action-btn">${escapeHtmlSimple(actionLabel)}</button>` : ''}
    <button class="toast-dismiss" title="Dismiss">✕</button>
  `;

  const dismissBtn = toast.querySelector('.toast-dismiss');
  dismissBtn.addEventListener('click', () => toast.remove());

  if (hasAction) {
    const actionBtn = toast.querySelector('.toast-action-btn');
    actionBtn.addEventListener('click', () => {
      actionFn();
      toast.remove();
    });
  }

  document.body.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('sticky-notes-toast-fade-out');
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    }
  }, actualDuration);
}

/**
 * Show a styled confirmation modal instead of window.confirm().
 * @param {string} message - The message/question to display
 * @param {Object} options - { title, confirmText, cancelText, confirmClass }
 * @returns {Promise<boolean>} true if confirmed, false if cancelled
 */
export function showConfirmModal(message, options = {}) {
  const {
    title = 'Confirm',
    confirmText = 'OK',
    cancelText = 'Cancel',
    confirmClass = 'modal-btn-danger'
  } = options;

  return new Promise((resolve) => {
    // Remove existing modal
    const existing = document.getElementById('sticky-notes-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'sticky-notes-modal-overlay';
    overlay.className = 'sticky-notes-modal-overlay';
    overlay.innerHTML = `
      <div class="sticky-notes-modal">
        <h3 class="modal-title">${escapeHtmlSimple(title)}</h3>
        <p class="modal-message">${escapeHtmlSimple(message)}</p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel">${escapeHtmlSimple(cancelText)}</button>
          <button class="modal-btn ${confirmClass}">${escapeHtmlSimple(confirmText)}</button>
        </div>
      </div>
    `;

    const cancelBtn = overlay.querySelector('.modal-btn-cancel');
    const confirmBtn = overlay.querySelector(`.${confirmClass}`) || overlay.querySelectorAll('.modal-btn')[1];

    // Escape key handler — must be removed on any dismiss, not just Escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
      }
    };

    const cleanup = () => {
      document.removeEventListener('keydown', escHandler);
      overlay.remove();
    };

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
    confirmBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    });
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
    confirmBtn.focus();
  });
}

function escapeHtmlSimple(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
