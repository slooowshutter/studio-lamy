const root = document.documentElement;
root.classList.add('js');
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: 0.08 });
  reveals.forEach(item => observer.observe(item));
} else reveals.forEach(item => item.classList.add('visible'));

const content = document.querySelector('#booking-content');
const stepNumber = document.querySelector('#step-number');
const progress = document.querySelector('#booking-progress');
const services = [
  { name: 'Shampooing + coupe intégrale aux ciseaux, finition tondeuse', duration: 30 },
  { name: 'Coupe + coiffage homme', duration: 30 },
  { name: 'Shampooing + coupe tondeuse, un sabot', duration: 30 },
  { name: 'Coupe + coiffage + barbe et soins', duration: 30 }
];
const state = { step: 0, service: null, date: null, time: null, first: '', phone: '' };
const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' });
const shortFmt = new Intl.DateTimeFormat('fr-FR', { weekday:'short', day:'numeric', month:'short' });
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const getDates = () => Array.from({length:14}, (_, i) => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+i); return d; });
function summary() {
  document.querySelector('#summary-service').textContent = state.service === null ? 'À choisir' : services[state.service].name;
  document.querySelector('#summary-date').textContent = state.date ? dateFmt.format(state.date) : 'À choisir';
  document.querySelector('#summary-time').textContent = state.time || 'À choisir';
}
function controls(back = true, next = 'Continuer') {
  return `<div class="booking-controls">${back ? '<button type="button" class="button secondary" data-back>Retour</button>' : ''}<button type="submit" class="button">${next} →</button></div>`;
}
function render(focus = true) {
  summary();
  const labels = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
  progress.innerHTML = labels.map((label, i) => i < state.step && state.step < 4 ? `<button type="button" data-step="${i}">${i+1}. ${label}</button>` : `<span${i===state.step?' aria-current="step"':''}>${i+1}. ${label}</span>`).join('');
  progress.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => { state.step = Number(button.dataset.step); render(); }));
  stepNumber.textContent = state.step < 4 ? `0${state.step+1} / 04` : 'Simulation terminée';
  const recap = state.service !== null && state.date && state.time ? `<p class="booking-recap">${services[state.service].name} · ${dateFmt.format(state.date)} à ${state.time}</p>` : '';
  let body = '';
  if (state.step === 0) {
    body = `<h3 tabindex="-1">Choisir une prestation</h3><p>Pour cet essai, choisissez un geste de la carte.</p><form><fieldset><legend>Prestation</legend>${services.map((s,i) => `<label class="choice"><input type="radio" name="service" value="${i}" ${state.service===i?'checked':''} required><span>${s.name}</span><small>${s.duration} min</small></label>`).join('')}</fieldset>${controls(false)}</form>`;
  } else if (state.step === 1) {
    body = `<h3 tabindex="-1">Choisir un jour</h3><p>Jours proposés pour la simulation selon les horaires publiés, à confirmer.</p><form><fieldset><legend>Jour</legend><div class="days">${getDates().map(d => {const closed=d.getDay()===0; const key=dayKey(d); return `<label class="choice"><input type="radio" name="date" value="${key}" ${closed?'disabled':''} ${state.date&&dayKey(state.date)===key?'checked':''} required><span>${shortFmt.format(d)}</span>${closed?'<small>Fermé</small>':''}</label>`}).join('')}</div></fieldset>${controls()}</form>`;
  } else if (state.step === 2) {
    const start = state.date.getDay() === 1 ? 14 : 9;
    const now = new Date();
    const slots = [];
    for(let minutes=start*60; minutes+services[state.service].duration<=19*60; minutes+=30) {
      const hh=Math.floor(minutes/60), mm=minutes%60;
      const label=`${hh} h ${String(mm).padStart(2,'0')}`;
      const past=dayKey(state.date)===dayKey(now) && minutes<=now.getHours()*60+now.getMinutes();
      const unavailable=(minutes/30+state.date.getDate())%5===0;
      slots.push({label, disabled:past||unavailable});
    }
    body = `<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs&nbsp;: les disponibilités réelles ne sont pas vérifiées.</p><form><fieldset><legend>Heure</legend><div class="slots">${slots.map(s=>`<label class="choice"><input type="radio" name="time" value="${s.label}" ${s.disabled?'disabled':''} ${state.time===s.label&&!s.disabled?'checked':''} required><span>${s.label}</span>${s.disabled?'<small>Indisponible</small>':''}</label>`).join('')}</div></fieldset>${controls()}</form>`;
  } else if (state.step === 3) {
    body = `<h3 tabindex="-1">Vos coordonnées</h3>${recap}<p>Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><form novalidate><label class="field" for="first">Prénom <input id="first" name="first" autocomplete="given-name" required aria-describedby="first-error"></label><div class="error" id="first-error" aria-live="polite"></div><label class="field" for="phone">Téléphone <input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="phone-error"></label><div class="error" id="phone-error" aria-live="polite"></div>${controls(true,'Terminer la simulation')}</form>`;
  } else {
    body = `<h3 tabindex="-1">Simulation terminée</h3>${recap}<p>Merci. Rien n’a été envoyé et aucun rendez-vous n’a été pris.</p><p>Pour réserver réellement, utilisez <a href="https://www.planity.com/le-charisme-coiffeurbarbier-67000-strasbourg">Planity</a> ou appelez le <a href="tel:0955778293">09 55 77 82 93</a>.</p><div class="booking-controls"><button type="button" class="button secondary" data-reset>Recommencer</button></div>`;
  }
  content.innerHTML = `<div class="step-enter">${body}</div>`;
  if (state.step===3) { content.querySelector('#first').value=state.first; content.querySelector('#phone').value=state.phone; }
  if (focus) content.querySelector('h3').focus({preventScroll:true});
  content.querySelector('[data-back]')?.addEventListener('click',()=>{state.step--;render();});
  content.querySelector('[data-reset]')?.addEventListener('click',()=>{Object.assign(state,{step:0,service:null,date:null,time:null,first:'',phone:''});render();});
  content.querySelector('form')?.addEventListener('submit', event => {
    event.preventDefault();
    const form=event.currentTarget;
    if(state.step===0){const value=Number(new FormData(form).get('service')); if(state.service!==value){state.date=null;state.time=null;} state.service=value;}
    if(state.step===1){const value=new FormData(form).get('date'); if(!value)return; if(!state.date||dayKey(state.date)!==value)state.time=null; state.date=new Date(value+'T12:00:00');}
    if(state.step===2){const value=new FormData(form).get('time');if(!value)return;state.time=value;}
    if(state.step===3){
      const firstField=form.elements.namedItem('first'), phoneField=form.elements.namedItem('phone');
      const first=firstField.value.trim(), phone=phoneField.value.trim();
      const validFirst=first.length>0, validPhone=/^(?:(?:\+33|0033|0)[1-9])(?:[ .-]?\d{2}){4}$/.test(phone);
      form.querySelector('#first-error').textContent=validFirst?'':'Indiquez votre prénom.';
      form.querySelector('#phone-error').textContent=validPhone?'':'Indiquez un numéro français valide.';
      firstField.setAttribute('aria-invalid',String(!validFirst));phoneField.setAttribute('aria-invalid',String(!validPhone));
      if(!validFirst||!validPhone){(validFirst?phoneField:firstField).focus();return;}
      state.first=first;state.phone=phone;
    }
    state.step++;render();
  });
}
render(false);
