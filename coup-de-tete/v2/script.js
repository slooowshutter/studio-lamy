const app = document.querySelector('#booking-app');
const summary = document.querySelector('#summary-text');
const services = ['Coupe femme', 'Coiffure enfant', 'Coloration', 'Mèches', 'Permanente', 'Chignon'];
const state = { service: '', day: '', time: '', first: '', phone: '' };
let step = 0;
const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const formatDay = d => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
const hours = { 2: [9,18], 3: [9,18], 4: [9,18], 5: [9,19], 6: [8,16] };
function updateSummary() {
  const d = days.find(x => dayKey(x) === state.day);
  summary.textContent = [state.service, d ? formatDay(d) : '', state.time].filter(Boolean).join('\n') || 'Votre sélection apparaîtra ici.';
}
function option(name, value, label, selected, disabled = false) { return `<label class="option"><input type="radio" name="${name}" value="${value}" ${selected ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span>${label}</span></label>`; }
function render(focus = true) {
  updateSummary();
  let content = '';
  if (step === 0) content = `<h3 tabindex="-1">1. Choisir une prestation</h3><p>Prestations d’annuaire, à confirmer. Aucun tarif n’est indiqué.</p><div class="options">${services.map((s,i) => option('service', String(i), s, state.service === s)).join('')}</div><div class="booking-actions"><button type="button" data-next ${state.service ? '' : 'disabled'}>Choisir un jour →</button></div>`;
  if (step === 1) content = `<h3 tabindex="-1">2. Choisir un jour</h3><p>Horaires d’annuaire à confirmer. Dates présentées pour la simulation.</p><div class="options">${days.map(d => { const key=dayKey(d), closed=!hours[d.getDay()]; return option('day', key, `${formatDay(d)}${closed ? '<small>Fermé</small>' : ''}`, state.day === key, closed); }).join('')}</div><div class="booking-actions"><button class="back" type="button" data-back>← Prestation</button><button type="button" data-next ${state.day ? '' : 'disabled'}>Choisir une heure →</button></div>`;
  if (step === 2) { const d = days.find(x => dayKey(x) === state.day); const [start,end] = hours[d.getDay()]; const choices=[]; for(let h=start;h<end;h++){ const slot=new Date(d);slot.setHours(h,0); const label=`${h} h 00`; choices.push(option('time',label,`${label}${slot <= new Date() ? '<small>Passé</small>' : ''}`,state.time===label,slot <= new Date())); } content=`<h3 tabindex="-1">3. Choisir une heure</h3><p>Créneaux fictifs dans les horaires d’annuaire, à confirmer. Ils ne représentent pas les disponibilités du salon.</p><div class="options">${choices.join('')}</div><div class="booking-actions"><button class="back" type="button" data-back>← Jour</button><button type="button" data-next ${state.time ? '' : 'disabled'}>Vos coordonnées →</button></div>`; }
  if (step === 3) content = `<h3 tabindex="-1">4. Vos coordonnées</h3><p>Ces informations restent sur cet appareil et ne sont pas transmises.</p><form id="details" novalidate><label class="field">Prénom<input name="first" autocomplete="given-name" required></label><label class="field">Téléphone<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="form-error"></label><p class="error" id="form-error" role="status"></p><div class="booking-actions"><button class="back" type="button" data-back>← Heure</button><button type="submit">Confirmer la simulation →</button></div></form>`;
  if (step === 4) content = `<h3 tabindex="-1">Simulation terminée.</h3><p>Votre choix est récapitulé à côté. Aucun rendez-vous n’a été pris et rien n’a été envoyé.</p><p>Pour prendre rendez-vous, appelez le <a href="tel:+33388341367">03 88 34 13 67</a>.</p><div class="booking-actions"><button type="button" data-reset>Recommencer</button></div>`;
  const labels=['Prestation','Jour','Heure','Coordonnées'];
  const progress=step < 4 ? `<nav class="progress" aria-label="Étapes de la simulation">${labels.map((label,i)=>i < step ? `<button type="button" data-step="${i}">${i+1}. ${label}</button>` : i === step ? `<span aria-current="step">${i+1}. ${label}</span>` : '').join('')}</nav>` : '';
  app.innerHTML = `${progress}<div class="booking-panel" aria-live="polite">${content}</div>`;
  if(step===3){ app.querySelector('[name=first]').value=state.first; app.querySelector('[name=phone]').value=state.phone; }
  if(focus) app.querySelector('h3').focus();
}
app.addEventListener('change', e => { const input=e.target; if(input.name==='service'){state.service=services[Number(input.value)];state.day='';state.time='';} if(input.name==='day'){state.day=input.value;state.time='';} if(input.name==='time') state.time=input.value; updateSummary(); const next=app.querySelector('[data-next]');if(next) next.disabled=false; });
app.addEventListener('input', e => { if(e.target.name==='first') state.first=e.target.value; if(e.target.name==='phone') state.phone=e.target.value; });
app.addEventListener('click', e => { const jump=e.target.closest('[data-step]'); if(jump){step=Number(jump.dataset.step);render();return;} if(e.target.closest('[data-next]')){step++;render();} if(e.target.closest('[data-back]')){step--;render();} if(e.target.closest('[data-reset]')){Object.assign(state,{service:'',day:'',time:'',first:'',phone:''});step=0;render();} });
app.addEventListener('submit', e => {e.preventDefault(); const form=e.target; const first=form.elements.first.value.trim(); const phone=form.elements.phone.value.trim(); const digits=phone.replace(/[\s.()-]/g,''); const error=form.querySelector('#form-error'); if(!first){error.textContent='Indiquez votre prénom.';form.elements.first.focus();return;} if(!/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits)){error.textContent='Indiquez un numéro de téléphone français valide.';form.elements.phone.focus();return;} state.first=first;state.phone=phone;step=4;render(); });
render(false);
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) { const obs=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('pending');obs.unobserve(entry.target);}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>{el.classList.add('pending');obs.observe(el);}); }
