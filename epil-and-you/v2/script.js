'use strict';
window.siteReady = true;
requestAnimationFrame(() => document.documentElement.classList.add('ready'));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
function countAddress() {
  const number = document.querySelector('.count-address');
  if (!number || reduceMotion.matches) return;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min(1, (now - start) / 600);
    number.textContent = String(Math.max(1, Math.round(19 * (1 - Math.pow(1 - progress, 3)))));
    if (progress < 1 && !reduceMotion.matches) requestAnimationFrame(tick); else number.textContent = '19';
  }
  requestAnimationFrame(tick);
}
const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); if (entry.target.classList.contains('tile-address')) countAddress(); observer.unobserve(entry.target); } }), { threshold: .15 }) : null;
document.querySelectorAll('.reveal').forEach((el, i) => { if (observer) { el.style.transitionDelay = `${i * 70}ms`; observer.observe(el); } else el.classList.add('visible'); });
setTimeout(() => document.querySelectorAll('.reveal:not(.visible)').forEach(el => el.classList.add('visible')), 8000);
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'all' && row.dataset.category !== button.dataset.filter; });
}));
const services = {
  epilation: { name: 'Épilation du corps', duration: 30, price: 25 },
  visage: { name: 'Soin du visage', duration: 45, price: 45 },
  mains: { name: 'Soin des mains', duration: 30, price: 25 },
  pieds: { name: 'Soin des pieds', duration: 45, price: 35 }
};
const state = { step: 0, service: '', day: '', time: '', name: '', phone: '', done: false };
const content = document.querySelector('#booking-content');
const summary = document.querySelector('#summary-content');
const stepButtons = [...document.querySelectorAll('[data-step]')];
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseDate = key => { const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d); };
const dayLabel = key => new Intl.DateTimeFormat('fr-FR', {weekday:'long',day:'numeric',month:'long'}).format(parseDate(key));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function summaryRender() {
  const s = services[state.service];
  summary.innerHTML = s ? `<p><strong>${s.name}</strong>${s.duration} min · ${s.price} € indicatifs</p>${state.day ? `<p><strong>Jour</strong>${dayLabel(state.day)}</p>` : ''}${state.time ? `<p><strong>Heure</strong>${state.time}</p>` : ''}` : 'Votre choix apparaîtra ici.';
}
function slotsFor(key) {
  const date = parseDate(key), weekday = date.getDay();
  if (weekday === 0) return [];
  const start = weekday === 6 ? 9*60 : 10*60, end = weekday === 6 ? 19*60 : 19*60+30;
  const duration = services[state.service].duration, now = new Date(), result = [];
  for (let minutes = start, i = 0; minutes + duration <= end; minutes += 30, i++) {
    const time = `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
    const slot = new Date(date); slot.setHours(Math.floor(minutes/60), minutes%60, 0, 0);
    result.push({time, disabled: slot <= now || (i + date.getDate()) % 5 === 0});
  }
  return result;
}
function render(focus = true) {
  summaryRender();
  stepButtons.forEach((b,i) => { b.disabled = state.done || (i > 0 && !state.service) || (i > 1 && !state.day) || (i > 2 && !state.time); if (i === state.step && !state.done) b.setAttribute('aria-current','step'); else b.removeAttribute('aria-current'); });
  let html = '';
  if (state.done) {
    html = `<div class="booking-panel success"><h3 tabindex="-1">Simulation terminée.</h3><p>${esc(state.name)}, votre choix : ${services[state.service].name}, le ${dayLabel(state.day)} à ${state.time} (${services[state.service].price} € indicatifs).</p><p>Aucun rendez-vous n’a été envoyé. Pour joindre l’institut, appelez le <a href="tel:+33556319834">05 56 31 98 34</a>.</p><button class="booking-action" type="button" data-reset>Recommencer</button></div>`;
  } else if (state.step === 0) {
    html = `<div class="booking-panel"><h3 tabindex="-1">Choisir une prestation.</h3><p class="booking-note">Tarifs indicatifs, à confirmer avec Epil &amp; You. Prix et durées sont des exemples.</p><fieldset style="border:0;padding:0;margin:0"><legend class="eyebrow">PRESTATION</legend>${Object.entries(services).map(([id,s]) => `<label class="service-option"><input type="radio" name="service" value="${id}" ${state.service===id?'checked':''}><span>${s.name}<small>${s.duration} min · exemple</small></span><strong>${s.price} €</strong></label>`).join('')}</fieldset><button class="booking-action" type="button" data-next ${state.service?'':'disabled'}>Choisir un jour →</button></div>`;
  } else if (state.step === 1) {
    const days = Array.from({length:14},(_,i)=> { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+i); const key=dateKey(d), closed=d.getDay()===0; return `<button type="button" data-day="${key}" class="${key===state.day?'selected':''}" ${closed?'disabled':''} aria-pressed="${key===state.day}">${new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(d)}<small>${closed?'fermé':'à confirmer'}</small></button>`; }).join('');
    html = `<div class="booking-panel"><h3 tabindex="-1">Choisir un jour.</h3><p class="booking-note">Horaires indicatifs à confirmer. Dimanche fermé selon Pages Jaunes.</p><div class="days">${days}</div><button class="booking-action" type="button" data-next ${state.day?'':'disabled'}>Choisir une heure →</button></div>`;
  } else if (state.step === 2) {
    html = `<div class="booking-panel"><h3 tabindex="-1">Choisir une heure.</h3><p class="booking-note">${dayLabel(state.day)} · créneaux fictifs. Les heures barrées sont indisponibles dans cette simulation.</p><div class="slots">${slotsFor(state.day).map(s => `<button type="button" data-time="${s.time}" ${s.disabled?'disabled':''} class="${state.time===s.time?'selected':''}" aria-pressed="${state.time===s.time}">${s.time}</button>`).join('')}</div><button class="booking-action" type="button" data-next ${state.time?'':'disabled'}>Vos coordonnées →</button></div>`;
  } else {
    html = `<div class="booking-panel"><h3 tabindex="-1">Vos coordonnées.</h3><p class="booking-note">Simulation uniquement. Ces informations restent dans votre navigateur.</p><form id="booking-form" novalidate><label class="field"><span>Prénom</span><input name="name" autocomplete="given-name" value="${esc(state.name)}" aria-describedby="name-error" required><small class="error" id="name-error"></small></label><label class="field"><span>Téléphone mobile</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(state.phone)}" aria-describedby="phone-error" required><small class="error" id="phone-error"></small></label><p class="booking-note">${services[state.service].name} · ${dayLabel(state.day)} à ${state.time} · ${services[state.service].price} € indicatifs</p><button class="booking-action" type="submit">Confirmer la simulation →</button></form></div>`;
  }
  content.innerHTML = html;
  const panel = content.querySelector('.booking-panel');
  if (focus && !reduceMotion.matches) { panel.classList.add('entering'); requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('entering'))); }
  if (focus) content.querySelector('h3')?.focus({preventScroll:true});
}
content.addEventListener('change', e => { if (e.target.name === 'service') { if (state.service !== e.target.value) {state.day='';state.time='';} state.service=e.target.value; render(false); content.querySelector(`input[value="${state.service}"]`).focus(); } });
content.addEventListener('click', e => {
  const day=e.target.closest('[data-day]'), time=e.target.closest('[data-time]');
  if(day){if(state.day!==day.dataset.day) state.time='';state.day=day.dataset.day;render(false);content.querySelector(`[data-day="${state.day}"]`).focus();}
  if(time){state.time=time.dataset.time;render(false);content.querySelector(`[data-time="${state.time}"]`).focus();}
  if(e.target.closest('[data-next]')) { state.step++; render(); }
  if(e.target.closest('[data-reset]')) { Object.assign(state,{step:0,service:'',day:'',time:'',name:'',phone:'',done:false}); render(); }
});
content.addEventListener('submit', e => {
  e.preventDefault(); const form=e.target; state.name=form.elements.name.value.trim(); state.phone=form.elements.phone.value.trim();
  const digits=state.phone.replace(/[\s.()-]/g,''); const nameOK=state.name.length>=2, phoneOK=/^(?:(?:\+33|0033)[67]|0[67])\d{8}$/.test(digits);
  form.querySelector('#name-error').textContent=nameOK?'':'Indiquez votre prénom (2 caractères minimum).';
  form.querySelector('#phone-error').textContent=phoneOK?'':'Indiquez un numéro de mobile français valide.';
  form.elements.name.setAttribute('aria-invalid',String(!nameOK)); form.elements.phone.setAttribute('aria-invalid',String(!phoneOK));
  if(!nameOK || !phoneOK){(nameOK?form.elements.phone:form.elements.name).focus();return;}
  state.done=true; render();
});
stepButtons.forEach(button => button.addEventListener('click', () => { state.step=Number(button.dataset.step); render(); }));
document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => { const id=button.dataset.book; if(state.service!==id){state.day='';state.time='';} state.service=id;state.step=0;state.done=false;render(false);document.querySelector('#reserver').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); }));
render(false);
