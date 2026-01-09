(function() {
  'use strict';

  const STORAGE_KEY = 'workshop-persona';

  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('persona-toggle');
    const body = document.body;

    if (!toggle) return;

    // Initialize from localStorage - default to attendee mode
    const savedPersona = localStorage.getItem(STORAGE_KEY);

    // Only enable facilitator mode if explicitly saved as 'facilitator'
    // Otherwise ensure we're in attendee mode (the default)
    if (savedPersona === 'facilitator') {
      enableFacilitatorMode(toggle, body);
    } else {
      // Ensure attendee mode is set (clear any stale state)
      disableFacilitatorMode(toggle, body);
    }

    // Handle toggle click
    toggle.addEventListener('click', function() {
      const isFacilitator = body.getAttribute('data-persona') === 'facilitator';

      if (isFacilitator) {
        disableFacilitatorMode(toggle, body);
      } else {
        enableFacilitatorMode(toggle, body);
      }
    });
  });

  function enableFacilitatorMode(toggle, body) {
    body.setAttribute('data-persona', 'facilitator');
    localStorage.setItem(STORAGE_KEY, 'facilitator');
    toggle.setAttribute('aria-pressed', 'true');
    toggle.classList.add('active');

    const label = toggle.querySelector('.toggle-label');
    if (label) {
      label.textContent = 'Hide Facilitator Notes';
    }
  }

  function disableFacilitatorMode(toggle, body) {
    body.removeAttribute('data-persona');
    localStorage.setItem(STORAGE_KEY, 'attendee');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.classList.remove('active');

    const label = toggle.querySelector('.toggle-label');
    if (label) {
      label.textContent = 'Show Facilitator Notes';
    }
  }
})();
