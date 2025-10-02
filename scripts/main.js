// Main runtime script for client-side behavior
// Currently contains the quote form submission handler.

// IIFE to bootstrap interactions
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const quoteModal = document.getElementById('quoteModal');
    const openBtn = document.getElementById('openQuoteModal');
    const closeBtn = document.getElementById('closeQuoteModal');
    const quoteForm = document.getElementById('quoteForm');
    const successPanel = document.getElementById('quoteFormSuccess');
    const submitBtn = document.getElementById('quoteSubmitBtn');
    const statusEl = document.getElementById('quoteStatus');

    // Basic open/close handlers (ensure accessibility focus trap could be added later)
    function openModal() {
      if (!quoteModal) return;
      quoteModal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      setTimeout(()=>{
        const firstInput = quoteForm?.querySelector('input,select,textarea');
        firstInput && firstInput.focus();
      }, 50);
    }
    function closeModal() {
      if (!quoteModal) return;
      quoteModal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
    openBtn && openBtn.addEventListener('click', openModal);
    closeBtn && closeBtn.addEventListener('click', closeModal);
    quoteModal && quoteModal.addEventListener('click', (e)=>{ if (e.target === quoteModal) closeModal(); });
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeModal(); });

    if (!quoteForm) return; // nothing else to wire

    // Helper: show loading state
    function setLoading(loading) {
      if (!submitBtn) return;
      const label = submitBtn.querySelector('.submit-label');
      const dots = submitBtn.querySelector('.loading-dots');
      if (loading) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-60','cursor-not-allowed');
        if (label) label.classList.add('hidden');
        if (dots) dots.classList.remove('hidden');
      } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-60','cursor-not-allowed');
        if (label) label.classList.remove('hidden');
        if (dots) dots.classList.add('hidden');
      }
    }

    async function submitLead(e) {
      e.preventDefault();
      if (!statusEl) return;
      statusEl.textContent = '';
      statusEl.className = 'mt-4 text-sm';

      // Client-side validation (basic)
      const formData = new FormData(quoteForm);
      const payload = Object.fromEntries(formData.entries());
      if (payload._hp) return; // honeypot triggered silently
      if (!payload.name || !payload.email || !payload.projectType || !payload.details) {
        statusEl.textContent = '⚠️ Please fill all required fields.';
        statusEl.classList.add('text-red-400');
        return;
      }
      if (String(payload.details).trim().length < 15) {
        statusEl.textContent = '⚠️ Provide at least 15 characters in project details.';
        statusEl.classList.add('text-red-400');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('https://inhouse-africa-tech.onrender.com/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(()=>({}));
        if (!res.ok || !data.ok) {
          statusEl.textContent = data.error || 'Submission failed. Please try again.';
          statusEl.classList.add('text-red-400');
          statusEl.setAttribute('role', 'alert');
          return;
        }
        // Success: hide form, show panel and announce success
        quoteForm.classList.add('hidden');
        successPanel && successPanel.classList.remove('hidden');
        statusEl.textContent = 'Success! Your quote request has been received.';
        statusEl.classList.add('text-green-400','font-medium');
        statusEl.setAttribute('role', 'status');
      } catch(err) {
        console.error('Lead submission error', err);
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          statusEl.textContent = 'Connection error. Please check your internet connection and try again.';
        } else if (err.message.includes('CORS')) {
          statusEl.textContent = 'Access error. Please contact support if this persists.';
        } else {
          statusEl.textContent = 'Network error. Please retry in a moment.';
        }
        statusEl.classList.add('text-red-400');
        statusEl.setAttribute('role', 'alert');
      } finally {
        setLoading(false);
      }
    }

    quoteForm.addEventListener('submit', submitLead);
  });
})();
