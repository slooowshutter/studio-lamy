/* Local preview only. No requests, persistence or real booking. */
(() => {
  'use strict';
  window.siteReady = true;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; document.documentElement.classList.add('keyboard'); }, true);
  document.addEventListener('pointerdown', () => { keyboard = false; document.documentElement.classList.remove('keyboard'); }, true);
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // One finite ripple on arrival; further ripples have an explicit user cause.
  const ripple = document.querySelector('.ripple');
  let waveTimer;
  function makeWave() {
    if (reduced.matches || keyboard) return;
    clearTimeout(waveTimer);
    ripple.classList.add('is-spreading');
    waveTimer = setTimeout(() => ripple.classList.remove('is-spreading'), 650);
  }
  document.querySelector('.wave-trigger').addEventListener('click', makeWave);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.entrance').forEach(el => el.classList.add('is-visible'));
    makeWave();
  }));
  const reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -20px 0px' });
    reveals.forEach((el, i) => {
      if (el.dataset.reveal === 'line') el.style.transitionDelay = `${(i % 3) * 60}ms`;
      observer.observe(el);
    });
  } else reveals.forEach(el => el.classList.add('is-visible'));

  const services = [
    { id: 'balneo', name: 'Soin des pieds en balnéo' },
    { id: 'pieds', name: 'Semi-permanent pieds' },
    { id: 'mains', name: 'Semi-permanent mains' },
    { id: 'gainage', name: 'Gainage des ongles naturels' },
    { id: 'extensions', name: 'Extensions d’ongles' }
  ];
  const app = document.getElementById('booking-app');
  const panel = document.getElementById('booking-panel');
  let selected = 'balneo';
  function render() {
    panel.innerHTML = `<h3 id="step-heading">Choisir une prestation</h3><p class="panel-intro">Simulation : choisissez une prestation, puis appelez le salon pour les horaires et les tarifs.</p><fieldset><legend class="sr-only">Choisir une prestation</legend><div class="choice-list">${services.map(item => `<label class="choice"><input type="radio" name="service" value="${item.id}" ${selected === item.id ? 'checked' : ''}><span class="choice-title">${item.name}</span><span class="choice-price">Sur appel</span></label>`).join('')}</div></fieldset><div class="panel-actions"><span class="form-note">Aucune demande n’est envoyée.</span><a class="button" href="tel:+33663670729">Appeler le salon <span aria-hidden="true">→</span></a></div>`;
    document.getElementById('summary-service').textContent = services.find(item => item.id === selected).name;
    document.getElementById('summary-day').textContent = 'Sur appel';
    document.getElementById('summary-time').textContent = 'Sur appel';
  }
  document.querySelector('[data-edit="0"]').addEventListener('click', () => {
    panel.querySelector('input:checked')?.focus();
  });
  panel.addEventListener('change', event => {
    if (event.target.name === 'service') {
      selected = event.target.value;
      document.getElementById('summary-service').textContent = services.find(item => item.id === selected).name;
    }
  });
  document.querySelectorAll('[data-preselect]').forEach(link => link.addEventListener('click', () => {
    selected = link.dataset.preselect;
    render();
  }));
  app.hidden = false;
  render();

  // Hide the mobile contact bar while it would duplicate or obstruct current actions.
  const bar = document.querySelector('.mobile-bar');
  const visible = { hero: false, booking: false, footer: false };
  if ('IntersectionObserver' in window) {
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const key = entry.target.id === 'hero-actions' ? 'hero' : entry.target.id === 'reserver' ? 'booking' : 'footer';
        visible[key] = entry.isIntersecting;
      });
      bar.classList.toggle('is-hidden', visible.hero || visible.booking || visible.footer);
    }, { threshold: 0 });
    ['hero-actions', 'reserver', 'footer'].forEach(id => barObserver.observe(document.getElementById(id)));
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      clearTimeout(waveTimer); ripple.classList.remove('is-spreading');
      reveals.forEach(el => el.classList.add('is-visible'));

    }
  });
})();
