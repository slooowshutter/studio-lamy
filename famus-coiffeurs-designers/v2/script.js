document.documentElement.classList.add('js');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduceMotion) {
  reveals.forEach((el, i) => { el.classList.add('pending'); el.style.transitionDelay = `${i * 60}ms`; });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('pending'); observer.unobserve(entry.target); } }), { threshold: .1 });
  reveals.forEach(el => observer.observe(el));
}
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
}));
const services = [{ name: 'Diagnostic / conseil', duration: 30 }, { name: 'Devis', duration: 15 }];
const hours = { 2: [630,1140], 3: [630,1140], 4: [750,1140], 5: [630,1140], 6: [630,1080] };
const body = document.querySelector('#booking-body');
body.className = 'booking-body';
const summary = document.querySelector('#summary');
const state = {step:0, service:null, date:null, time:null, first:'', phone:''};
const dateText = date => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(date);
const timeText = minutes => `${String(Math.floor(minutes / 60)).padStart(2,'0')} h ${String(minutes % 60).padStart(2,'0')}`;
const escapeText = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function updateSummary() {
  const items = [];
  if (state.service !== null) items.push(services[state.service].name);
  if (state.date) items.push(dateText(state.date));
  if (state.time !== null) items.push(timeText(state.time));
  summary.textContent = items.length ? items.join(' · ') : 'Aucune sélection pour le moment.';
}
function showStep(step, focus = true) {
  state.step = step;
  document.querySelector('#step-count').textContent = step === 4 ? 'TERMINÉ' : `0${step + 1} / 04`;
  document.querySelectorAll('[data-go]').forEach((button, index) => {
    button.disabled = index > step || step === 4;
    button.classList.toggle('current', index === step);
    if (index === step) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
  });
  updateSummary();
  if (step === 0) {
    body.innerHTML = `<h3 tabindex="-1">Choisir une prestation</h3><p>Deux possibilités pour commencer. Simulation sans prix.</p><fieldset><legend>Prestation</legend>${services.map((s,i) => `<label class="choice"><input type="radio" name="service" value="${i}" ${state.service===i?'checked':''}><span>${s.name}</span><span>${s.duration} min</span></label>`).join('')}</fieldset><button class="booking-next" type="button" id="next" ${state.service===null?'disabled':''}>Choisir un jour →</button>`;
    body.querySelectorAll('[name=service]').forEach(input => input.addEventListener('change', () => { state.service = Number(input.value); state.date = null; state.time = null; updateSummary(); body.querySelector('#next').disabled = false; }));
    body.querySelector('#next').onclick = () => showStep(1);
  } else if (step === 1) {
    const today = new Date(); today.setHours(0,0,0,0);
    const days = Array.from({length:14}, (_,i) => { const d = new Date(today); d.setDate(d.getDate()+i); return d; });
    body.innerHTML = `<h3 tabindex="-1">Choisir un jour</h3><p>Les jours fermés sont indiqués. Les disponibilités sont fictives.</p><div class="slots">${days.map((date,i) => `<button type="button" class="slot ${state.date && date.toDateString()===state.date.toDateString()?'selected':''}" data-day="${i}" aria-pressed="${Boolean(state.date && date.toDateString()===state.date.toDateString())}" ${!hours[date.getDay()]?'disabled':''}>${new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(date)}${!hours[date.getDay()]?'<br>Fermé':''}</button>`).join('')}</div><button class="booking-next" type="button" id="next" ${!state.date?'disabled':''}>Choisir une heure →</button>`;
    body.querySelectorAll('[data-day]').forEach(button => button.onclick = () => { state.date = days[Number(button.dataset.day)]; state.time = null; body.querySelectorAll('[data-day]').forEach(b => { b.classList.toggle('selected',b===button); b.setAttribute('aria-pressed',String(b===button)); }); updateSummary(); body.querySelector('#next').disabled = false; });
    body.querySelector('#next').onclick = () => showStep(2);
  } else if (step === 2) {
    const [start,end] = hours[state.date.getDay()]; const duration = services[state.service].duration; const now = new Date();
    const slots = []; for (let t=start;t+duration<=end;t+=30) slots.push(t);
    body.innerHTML = `<h3 tabindex="-1">Choisir une heure</h3><p>${dateText(state.date)} · créneaux simulés, non disponibles à la réservation.</p><div class="slots">${slots.map(t => { const past = state.date.toDateString() === now.toDateString() && t <= now.getHours()*60+now.getMinutes(); return `<button type="button" class="slot ${state.time===t?'selected':''}" data-time="${t}" aria-pressed="${state.time===t}" ${past?'disabled':''}>${timeText(t)}${past?'<br>passé':''}</button>`; }).join('')}</div><button class="booking-next" type="button" id="next" ${state.time===null?'disabled':''}>Vos coordonnées →</button>`;
    body.querySelectorAll('[data-time]').forEach(button => button.onclick = () => { state.time = Number(button.dataset.time); body.querySelectorAll('[data-time]').forEach(b => { b.classList.toggle('selected',b===button); b.setAttribute('aria-pressed',String(b===button)); }); updateSummary(); body.querySelector('#next').disabled = false; });
    body.querySelector('#next').onclick = () => showStep(3);
  } else if (step === 3) {
    body.innerHTML = `<h3 tabindex="-1">Vos coordonnées</h3><p>Ces informations restent dans votre navigateur.</p><form novalidate><label class="field" for="first">Prénom <input id="first" name="first" autocomplete="given-name" value="${escapeText(state.first)}" aria-describedby="first-error" required><span class="error" id="first-error"></span></label><label class="field" for="phone">Téléphone <input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" value="${escapeText(state.phone)}" aria-describedby="phone-error" required><span class="error" id="phone-error"></span></label><button class="booking-next" type="submit">Terminer la simulation →</button></form>`;
    body.querySelector('form').onsubmit = event => { event.preventDefault(); const first = body.querySelector('#first'); const phone = body.querySelector('#phone'); state.first = first.value.trim(); state.phone = phone.value.trim(); const validPhone = /^(?:(?:\+33|0033)\s?[1-9]|0[1-9])(?:[\s.\-]?\d{2}){4}$/.test(state.phone); body.querySelector('#first-error').textContent = state.first ? '' : 'Veuillez indiquer votre prénom.'; body.querySelector('#phone-error').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.'; first.setAttribute('aria-invalid',String(!state.first)); phone.setAttribute('aria-invalid',String(!validPhone)); if (!state.first) first.focus(); else if (!validPhone) phone.focus(); else showStep(4); };
  } else {
    body.innerHTML = `<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${escapeText(state.first)}. Rien n’a été envoyé et aucun rendez-vous n’a été pris.</p><p>Pour réserver réellement, passez par Planity ou appelez le salon.</p><a class="button dark" href="https://www.planity.com/famus-coiffeurs-designers-59000-lille" target="_blank" rel="noopener">Aller sur Planity ↗</a> <button class="booking-next" id="restart" type="button">Recommencer</button>`;
    body.querySelector('#restart').onclick = () => { state.service=null; state.date=null; state.time=null; state.first=''; state.phone=''; showStep(0); };
  }
  body.classList.remove('enter'); void body.offsetWidth; body.classList.add('enter');
  if (focus) body.querySelector('h3').focus({preventScroll:true});
}
document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.go))));
showStep(0, false);
