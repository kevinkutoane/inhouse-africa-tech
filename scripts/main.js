// Main runtime script for client-side behavior
// Currently contains the quote form submission handler.

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const quoteForm = document.getElementById('quoteForm');
    const quoteModal = document.getElementById('quoteModal');
    if (!quoteForm) return;

    // Resolve Apps Script URL in this order:
    // 1) window.QUOTE_SCRIPT_URL (preferred)
    // 2) data-script-url attribute on the form
    function resolveScriptUrl() {
      try {
        if (window && typeof window.QUOTE_SCRIPT_URL === 'string' && window.QUOTE_SCRIPT_URL.trim()) {
          return window.QUOTE_SCRIPT_URL.trim();
        }
      } catch (e) {
        // ignore
      }
      if (quoteForm.dataset && quoteForm.dataset.scriptUrl) return quoteForm.dataset.scriptUrl.trim();
      return '';
    }

    const scriptURL = resolveScriptUrl();

    // small status element (created if missing)
    let statusEl = document.getElementById('quoteStatus');
    if (!statusEl) {
      statusEl = document.createElement('p');
      statusEl.id = 'quoteStatus';
      statusEl.className = 'mt-2 text-sm';
      quoteForm.appendChild(statusEl);
    }

    // If no script URL was found, show a helpful message
    if (!scriptURL) {
      statusEl.textContent = '⚠️ Configuration missing: create scripts/quote-config.js with your Apps Script URL (see scripts/quote-config.example.js).';
      statusEl.classList.add('text-red-400');
      return;
    }

    quoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      statusEl.textContent = '';

      const submitBtn = quoteForm.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('opacity-60', 'cursor-not-allowed'); }

      const fd = new FormData(quoteForm);

      try {
        const res = await fetch(scriptURL, { method: 'POST', body: fd });

        if (res.ok) {
          statusEl.textContent = '✅ Thank you — your request was submitted.';
          statusEl.classList.remove('text-red-400');
          statusEl.classList.add('text-green-400');
          quoteForm.reset();
          setTimeout(() => { if (quoteModal) quoteModal.classList.add('hidden'); statusEl.textContent = ''; }, 1400);
        } else {
          const txt = await res.text().catch(() => '');
          console.warn('Submission response not ok', res.status, txt);
          statusEl.textContent = '⚠️ Something went wrong. Please try again.';
          statusEl.classList.remove('text-green-400');
          statusEl.classList.add('text-red-400');
        }
      } catch (err) {
        console.error('Quote submission failed', err);
        statusEl.textContent = '❌ Submission failed. Check your connection and try again.';
        statusEl.classList.remove('text-green-400');
        statusEl.classList.add('text-red-400');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('opacity-60', 'cursor-not-allowed'); }
      }
    });
  });
})();
