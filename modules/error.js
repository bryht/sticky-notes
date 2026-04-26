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
 * Replaces all alert() calls throughout the extension.
 */
export function showToast(message, type = 'info', durationMs = 3000) {
  // Remove existing toast
  const existing = document.getElementById('sticky-notes-toast');
  if (existing) existing.remove();

  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.id = 'sticky-notes-toast';
  toast.className = `sticky-notes-toast sticky-notes-toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${escapeHtmlSimple(message)}</span>
    <button class="toast-dismiss" title="Dismiss">✕</button>
  `;

  const dismissBtn = toast.querySelector('.toast-dismiss');
  dismissBtn.addEventListener('click', () => toast.remove());

  document.body.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('sticky-notes-toast-fade-out');
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    }
  }, durationMs);
}

function escapeHtmlSimple(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}