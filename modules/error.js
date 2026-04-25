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