(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    items.forEach(item => observer.observe(item));
  } else items.forEach(item => item.classList.add('visible'));

  const mobileBar = document.querySelector('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const hiddenRegions = new Set();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? hiddenRegions.add(entry.target) : hiddenRegions.delete(entry.target));
      mobileBar.classList.toggle('is-hidden', hiddenRegions.size > 0);
    }, { threshold: 0 });
    document.querySelectorAll('#rendez-vous, footer').forEach(region => barObserver.observe(region));
  }

  const services = ['Coupe homme', 'Coupe femme', 'Coloration', 'Balayage'];
  const state = { step: 0, service: '', day: '', time: '', firstName: '', phone: '', complete: false };
  const panel = document.querySelector('#booking-panel');
  const live = document.querySelector('#booking-live');
  const stepButtons = [...document.querySelectorAll('[data-go]')];
  const formatDate = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  const dateKey = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const dateFromKey = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
  const escapeText = text => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const canGo = index => index === 0 || (index === 1 && state.service) || (index === 2 && state.service && state.day) || (index === 3 && state.service && state.day && state.time);
  function summary() {
    document.querySelector('#sum-service').textContent = state.service || 'À choisir';
    document.querySelector('#sum-day').textContent = state.day ? formatDate(dateFromKey(state.day)) : 'À choisir';
    document.querySelector('#sum-time').textContent = state.time || 'À choisir';
    stepButtons.forEach((button, index) => {
      button.disabled = !canGo(index);
      if (index === state.step && !state.complete) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function heading(title, help) { return `<h3 id="etape-titre" tabindex="-1">${title}</h3><p class="booking-help">${help}</p>`; }
  function choice(name, value, label, disabled = false) {
    const checked = state[name] === value ? ' checked' : '';
    return `<label class="choice"><input type="radio" name="${name}" value="${escapeText(value)}"${checked}${disabled ? ' disabled' : ''}><span>${label}</span></label>`;
  }
  function days() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, n) => {
      const day = new Date(today); day.setDate(today.getDate() + n);
      const closed = day.getDay() === 0 || day.getDay() === 1;
      const now = new Date();
      const elapsed = n === 0 && now.getHours() * 60 + now.getMinutes() >= 16 * 60 + 30;
      const note = closed ? '<br>Fermé' : elapsed ? '<br>Exemples passés' : '';
      return choice('day', dateKey(day), `${formatDate(day)}${note}`, closed || elapsed);
    }).join('');
  }
  function times() {
    const day = dateFromKey(state.day);
    const now = new Date();
    const isToday = dateKey(now) === state.day;
    const slots = [];
    // All proposed examples lie inside the sourced opening hours, including Saturday.
    for (let hour = 10; hour <= 16; hour++) {
      for (const minutes of [0, 30]) {
        const label = `${hour} h ${String(minutes).padStart(2, '0')}`;
        const past = isToday && (hour * 60 + minutes <= now.getHours() * 60 + now.getMinutes());
        slots.push(choice('time', label, `${label}${past ? '<br>Passé' : ''}`, past));
      }
    }
    return slots.join('');
  }
  function actions(back = true, nextLabel = 'Continuer') {
    return `<div class="booking-actions">${back ? '<button class="button secondary" type="button" data-back>Retour</button>' : ''}<button class="button" type="submit">${nextLabel} →</button></div>`;
  }
  function render(focus = true) {
    summary();
    let content = '';
    if (state.complete) {
      content = `<div class="success">${heading('Carte remplie', 'Simulation terminée : aucun rendez-vous n’a été transmis.')}<p>${escapeText(state.firstName)}, vous avez choisi <strong>${escapeText(state.service)}</strong>, le <strong>${formatDate(dateFromKey(state.day))}</strong> à <strong>${escapeText(state.time)}</strong>.</p><p>Pour prendre réellement rendez-vous, utilisez Planity ou appelez le salon.</p><div class="booking-actions"><a class="button" href="https://www.planity.com/latelier-gonzag-63100-clermont-ferrand" target="_blank" rel="noopener">Aller sur Planity ↗</a><button class="button secondary" type="button" data-reset>Recommencer</button></div></div>`;
    } else if (state.step === 0) {
      content = `<form>${heading('Quelle prestation ?', 'Choisissez une prestation pour cette simulation.')}<div class="choices" role="radiogroup" aria-labelledby="etape-titre">${services.map(s => choice('service', s, s)).join('')}</div><p class="error" id="step-error" role="status"></p>${actions(false)}</form>`;
    } else if (state.step === 1) {
      content = `<form>${heading('Quel jour ?', 'Exemples sur les 14 prochains jours ; les jours de fermeture sont indiqués.')}<div class="choices date-grid" role="radiogroup" aria-labelledby="etape-titre">${days()}</div><p class="error" id="step-error" role="status"></p>${actions()}</form>`;
    } else if (state.step === 2) {
      content = `<form>${heading('À quelle heure ?', 'Horaires proposés à titre d’exemple, sans indication de disponibilité réelle.')}<div class="choices time-grid" role="radiogroup" aria-labelledby="etape-titre">${times()}</div><p class="error" id="step-error" role="status"></p>${actions()}</form>`;
    } else {
      content = `<form novalidate>${heading('Vos coordonnées', 'Pour terminer la simulation. Ces informations restent dans votre navigateur.')}<label class="field">Prénom<input name="firstName" autocomplete="given-name" value="${escapeText(state.firstName)}" required aria-describedby="name-error"></label><p class="error" id="name-error"></p><label class="field">Téléphone<input name="phone" type="tel" autocomplete="tel" inputmode="tel" value="${escapeText(state.phone)}" required aria-describedby="phone-error"></label><p class="error" id="phone-error"></p><p>Simulation : ${escapeText(state.service)}, ${formatDate(dateFromKey(state.day))} à ${escapeText(state.time)}.</p>${actions(true, 'Terminer la simulation')}</form>`;
    }
    panel.classList.add('panel-enter');
    panel.innerHTML = content;
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('panel-enter')));
    if (focus) panel.querySelector('#etape-titre').focus({ preventScroll: true });
    live.textContent = state.complete ? 'Simulation terminée.' : `Étape ${state.step + 1} sur 4.`;
  }
  panel.addEventListener('change', event => {
    const { name, value } = event.target;
    if (name === 'service') { state.service = value; }
    if (name === 'day') { if (state.day !== value) state.time = ''; state.day = value; }
    if (name === 'time') state.time = value;
    summary();
  });
  panel.addEventListener('click', event => {
    if (event.target.closest('[data-back]')) { state.step--; render(); }
    if (event.target.closest('[data-reset]')) { Object.assign(state, { step: 0, service: '', day: '', time: '', firstName: '', phone: '', complete: false }); render(); }
  });
  panel.addEventListener('submit', event => {
    event.preventDefault();
    const keys = ['service', 'day', 'time'];
    if (state.step < 3) {
      if (!state[keys[state.step]]) { document.querySelector('#step-error').textContent = 'Veuillez faire un choix pour continuer.'; return; }
      state.step++; render(); return;
    }
    const data = new FormData(event.target);
    state.firstName = String(data.get('firstName') || '').trim();
    state.phone = String(data.get('phone') || '').trim();
    const validName = state.firstName.length > 0;
    const digits = state.phone.replace(/[\s.()-]/g, '');
    const validPhone = /^(?:\+33|0)[1-9]\d{8}$/.test(digits);
    document.querySelector('#name-error').textContent = validName ? '' : 'Indiquez votre prénom.';
    document.querySelector('#phone-error').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
    if (!validName || !validPhone) { event.target.querySelector(validName ? '[name="phone"]' : '[name="firstName"]').focus(); return; }
    state.complete = true; render();
  });
  stepButtons.forEach(button => button.addEventListener('click', () => { const step = Number(button.dataset.go); if (canGo(step)) { state.complete = false; state.step = step; render(); } }));
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {
    state.service = button.dataset.service; state.complete = false; state.step = 1; render(false);
    document.querySelector('#rendez-vous').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    panel.querySelector('#etape-titre').focus({ preventScroll: true });
  }));
  render(false);
})();
