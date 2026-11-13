document.documentElement.classList.add('js');
const groups = document.querySelectorAll('[data-reveal-group]');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.reveal').forEach((row, i) => { row.style.setProperty('--delay', `${i * 40}ms`); row.classList.add('visible'); });
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.08 });
  groups.forEach(group => observer.observe(group));
} else { document.querySelectorAll('.reveal').forEach(row => row.classList.add('visible')); }

const services = {
  homme: { label: 'Shampooing, coupe et coiffage homme', duration: 30 },
  enfant: { label: 'Shampooing et coupe enfant jusqu’à 10 ans', duration: 30 },
  transformation: { label: 'Coupe transformation', duration: 60 }
};
const schedule = { 0: null, 1: null, 2: [9,19], 3: [9,13], 4: [10,20], 5: [9,19], 6: [9,19] };
const form = document.querySelector('#booking-form');
const sections = [...document.querySelectorAll('.step')];
const navigation = [...document.querySelectorAll('[data-step-nav]')];
const announce = document.querySelector('#annonce');
const state = { service: '', day: '', time: '', current: 0, reached: 0 };
const dateLabel = date => new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' }).format(date);
const localDate = value => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d); };
const dateValue = date => [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
function recap() {
  document.querySelector('#recap-prestation span').textContent = state.service ? services[state.service].label : '—';
  document.querySelector('#recap-jour span').textContent = state.day ? dateLabel(localDate(state.day)) : '—';
  document.querySelector('#recap-heure span').textContent = state.time || '—';
}
let transitionFrame = 0;
function syncNavigation() {
  navigation.forEach((button, i) => { button.disabled = i > state.reached || state.current === 4; if (i === state.current) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current'); });
}
function showStep(index) {
  cancelAnimationFrame(transitionFrame);
  state.current = index; state.reached = Math.max(state.reached,index);
  sections.forEach((section, i) => { section.hidden = i !== index; section.classList.remove('is-entering'); });
  const active = sections[index]; active.classList.add('is-entering');
  transitionFrame = requestAnimationFrame(() => { transitionFrame = requestAnimationFrame(() => active.classList.remove('is-entering')); });
  syncNavigation();
  const heading = active.querySelector('h4'); heading.focus({preventScroll:true}); announce.textContent = heading.textContent;
  recap();
}
function makeOption(name, value, label, disabled, checked) {
  const wrapper = document.createElement('label'); wrapper.className = 'option';
  const input = document.createElement('input'); input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled; input.checked = checked;
  const span = document.createElement('span'); span.textContent = label; wrapper.append(input, span); return wrapper;
}
function renderDays() {
  const container = document.querySelector('#jours'); container.replaceChildren();
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i=0;i<14;i++) {
    const date = new Date(today); date.setDate(today.getDate()+i); const value = dateValue(date); const closed = !schedule[date.getDay()];
    const label = new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(date) + (closed ? ' · fermé' : '');
    container.append(makeOption('jour',value,label,closed,state.day===value));
  }
}
function renderTimes() {
  const container = document.querySelector('#heures'); container.replaceChildren();
  const date = localDate(state.day), hours = schedule[date.getDay()], duration = services[state.service].duration, now = new Date();
  let available = 0;
  for (let minutes=hours[0]*60; minutes+duration<=hours[1]*60; minutes+=30) {
    const hour = Math.floor(minutes/60), minute = minutes%60;
    const value = `${String(hour).padStart(2,'0')} h ${String(minute).padStart(2,'0')}`;
    const when = new Date(date); when.setHours(hour,minute,0,0);
    const taken = ((date.getDate()+minutes/30)%5===0), disabled = taken || when<=now;
    if (!disabled) available++;
    container.append(makeOption('heure',value,value+(disabled ? (when<=now ? ' · passé' : ' · déjà pris') : ''),disabled,state.time===value));
  }
  if (!available) { const p=document.createElement('p'); p.textContent='Aucun créneau fictif disponible ce jour. Choisissez un autre jour.'; container.prepend(p); }
}
form.addEventListener('change', event => {
  const {name,value}=event.target;
  if (name==='prestation') { if (state.service!==value) {state.day='';state.time='';state.reached=0;} state.service=value; document.querySelector('#erreur-prestation').textContent=''; }
  if (name==='jour') { if (state.day!==value) {state.time='';state.reached=1;} state.day=value; document.querySelector('#erreur-jour').textContent=''; }
  if (name==='heure') { state.time=value; document.querySelector('#erreur-heure').textContent=''; }
  syncNavigation(); recap();
});
document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
  const index=Number(button.dataset.next);
  if (index===0 && !state.service) {document.querySelector('#erreur-prestation').textContent='Choisissez une prestation pour continuer.';return;}
  if (index===1 && !state.day) {document.querySelector('#erreur-jour').textContent='Choisissez un jour pour continuer.';return;}
  if (index===2 && !state.time) {document.querySelector('#erreur-heure').textContent='Choisissez une heure pour continuer.';return;}
  if(index===0) renderDays(); if(index===1) renderTimes(); showStep(index+1);
}));
navigation.forEach(button => button.addEventListener('click', () => { const index=Number(button.dataset.stepNav); if(index > state.reached || (index >= 1 && !state.service) || (index >= 2 && !state.day) || (index >= 3 && !state.time)) return; if(index===1) renderDays(); if(index===2) renderTimes(); showStep(index); }));
form.addEventListener('submit', event => {
  event.preventDefault(); const first=document.querySelector('#prenom'), phone=document.querySelector('#telephone');
  const validFirst=first.value.trim().length>0, validPhone=/^(?:(?:\+33|0033|0)[1-9])\d{8}$/.test(phone.value.replace(/[\s.()-]/g,''));
  document.querySelector('#erreur-prenom').textContent=validFirst?'':'Indiquez votre prénom.';
  document.querySelector('#erreur-telephone').textContent=validPhone?'':'Indiquez un numéro de téléphone français valide.';
  first.setAttribute('aria-invalid',String(!validFirst)); phone.setAttribute('aria-invalid',String(!validPhone));
  if(!validFirst || !validPhone) { (validFirst?phone:first).focus(); return; } showStep(4);
});
document.querySelector('#recommencer').addEventListener('click', () => {form.reset(); Object.assign(state,{service:'',day:'',time:'',current:0,reached:0}); showStep(0);});
