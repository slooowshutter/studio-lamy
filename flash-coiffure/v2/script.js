const root = document.documentElement;
root.classList.add('js');
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add(entry.target.classList.contains('hero-art') ? 'is-seen' : 'visible'); observer.unobserve(entry.target); }
}), {threshold: 0.12});
document.querySelectorAll('.reveal, .hero-art').forEach(el => observer.observe(el));

const services = ['Coupe femme', 'Coupe enfant', 'Brushing', 'Balayage', 'Coloration', 'Mèches', 'Permanente', 'Extensions'];
const state = {step: 0, service: '', date: '', heure: '', nom: '', telephone: ''};
const content = document.querySelector('#step-content');
content.className = 'step-content';
const title = document.querySelector('#step-title');
const number = document.querySelector('#step-number');
const summary = document.querySelector('#summary-text');
const summaryLinks = document.querySelector('#summary-links');
const status = document.querySelector('#booking-status');
const error = document.querySelector('#booking-error');
const next = document.querySelector('#next');
const back = document.querySelector('#back');
const formatter = new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'});
const localDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseDate = value => {const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d);};
const dateText = value => value ? formatter.format(parseDate(value)) : '';
function choice(name, value, label, checked = false, disabled = false) {
  const wrap = document.createElement('label'); wrap.className = 'option';
  const input = document.createElement('input'); input.type = 'radio'; input.name = name; input.value = value; input.checked = checked; input.disabled = disabled;
  const text = document.createElement('span'); text.textContent = label; wrap.append(input, text); return wrap;
}
function options(name, entries) { const group = document.createElement('fieldset'); group.className = 'choice-group'; const legend = document.createElement('legend'); legend.className = 'visually-hidden'; legend.textContent = {service:'Prestation',date:'Jour',heure:'Heure'}[name]; group.append(legend); const box = document.createElement('div'); box.className = 'options'; entries.forEach(x => box.append(choice(name, x.value, x.label, x.checked, x.disabled))); group.append(box); content.append(group); }
function note(text) {const p = document.createElement('p'); p.className='help'; p.textContent=text; content.append(p);}
function render(focus = true) {
  content.replaceChildren(); error.textContent = '';
  const titles = ['Choisir une prestation', 'Choisir un jour', 'Choisir une heure', 'Vos coordonnées', 'Simulation terminée'];
  title.textContent = titles[state.step]; number.textContent = state.step < 4 ? `Étape ${state.step+1} sur 4` : 'Récapitulatif';
  next.hidden = state.step === 4; back.hidden = state.step === 0; next.textContent = state.step === 3 ? 'Terminer la simulation →' : 'Continuer →';
  summary.textContent = [state.service, dateText(state.date), state.heure].filter(Boolean).join(' · ') || 'À composer';
  summaryLinks.replaceChildren(); [['Prestation',0,state.service],['Jour',1,state.date],['Heure',2,state.heure]].forEach(([label,step,value])=>{if(value && step < state.step){const button=document.createElement('button');button.type='button';button.textContent=`Modifier : ${label.toLowerCase()}`;button.addEventListener('click',()=>{if(state.step===3){state.nom=document.querySelector('#nom').value;state.telephone=document.querySelector('#telephone').value;}state.step=step;render();});summaryLinks.append(button);}});
  if(focus) status.textContent = `${number.textContent} : ${title.textContent}`;
  if(state.step===0){note('Prestations relevées dans les annuaires. Tarifs et durées à confirmer avec le salon.'); options('service',services.map(x=>({value:x,label:x,checked:state.service===x})));}
  if(state.step===1){note('Horaires publiés à confirmer. Les jours fermés ne sont pas proposés.');const today=new Date();today.setHours(0,0,0,0);const days=Array.from({length:14},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()+i);const value=localDate(d);const closed=d.getDay()===0||d.getDay()===1;const lastSlot=new Date(d);lastSlot.setHours(17,15,0,0);const elapsed=lastSlot<=new Date();return {value,label:`${formatter.format(d)}${closed?' · fermé':elapsed?' · heures passées':''}`,checked:state.date===value&&!elapsed,disabled:closed||elapsed};});options('date',days);}
  if(state.step===2){note('Heures proposées pour la simulation uniquement, sans disponibilité réelle. La durée est à confirmer avec le salon.');const today=new Date();const slots=['09:15','10:15','11:15','12:15','13:15','14:15','15:15','16:15','17:15'];options('heure',slots.map(x=>{const d=parseDate(state.date);const [h,m]=x.split(':').map(Number);d.setHours(h,m);return {value:x,label:x.replace(':',' h '),checked:state.heure===x,disabled:d<=today};}));}
  if(state.step===3){note('Ces informations restent dans cette page et ne sont pas envoyées.');for(const [id,label,type,auto,val] of [['nom','Prénom','text','given-name',state.nom],['telephone','Téléphone','tel','tel',state.telephone]]){const l=document.createElement('label');l.className='field';l.textContent=label;const input=document.createElement('input');input.id=id;input.type=type;input.autocomplete=auto;input.value=val;if(type==='tel')input.inputMode='tel';input.setAttribute('aria-describedby','booking-error');l.append(input);content.append(l);}}
  if(state.step===4){note(`${state.nom}, votre sélection est une simulation : aucun rendez-vous n’a été pris et rien n’a été envoyé. Pour prendre rendez-vous, appelez le salon au 04 91 82 29 49.`);const a=document.createElement('a');a.className='button button-outline';a.href='tel:0491822949';a.textContent='Appeler le salon ↗';content.append(a);}
  if(focus) title.focus({preventScroll:true});
  content.classList.add('entering'); requestAnimationFrame(()=>requestAnimationFrame(()=>content.classList.remove('entering')));
}
next.addEventListener('click',()=>{
  error.textContent='';
  if(state.step<3){const names=['service','date','heure'];const picked=content.querySelector(`input[name="${names[state.step]}"]:checked`);if(!picked){error.textContent='Choisissez une option pour continuer.';return;}if(state.step===0 && state.service!==picked.value){state.service=picked.value;}if(state.step===1 && state.date!==picked.value){state.date=picked.value;state.heure='';}if(state.step===2)state.heure=picked.value;}
  else {state.nom=document.querySelector('#nom').value.trim();state.telephone=document.querySelector('#telephone').value.trim();if(!state.nom){error.textContent='Indiquez votre prénom.';document.querySelector('#nom').focus();return;}if(!/^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.telephone)){error.textContent='Indiquez un numéro de téléphone français valide.';document.querySelector('#telephone').focus();return;}}
  state.step++;render();
});
back.addEventListener('click',()=>{if(state.step===3){state.nom=document.querySelector('#nom').value;state.telephone=document.querySelector('#telephone').value;}state.step=Math.max(0,state.step-1);render();});
content.addEventListener('change',e=>{if(e.target.name && e.target.checked){const s={service:state.service,date:state.date,heure:state.heure};s[e.target.name]=e.target.value;summary.textContent=[s.service,dateText(s.date),s.heure].filter(Boolean).join(' · ')||'À composer';}});
render(false);

document.addEventListener('focusin', e => { if (e.target.matches('.field input')) document.body.classList.add('saisie'); });
document.addEventListener('focusout', e => { if (e.target.matches('.field input')) document.body.classList.remove('saisie'); });
