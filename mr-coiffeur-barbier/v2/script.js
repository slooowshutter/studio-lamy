'use strict';
window.sitePret = true;
document.querySelectorAll('.entrance').forEach(el => requestAnimationFrame(() => el.classList.add('ready')));
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: 0.12 });
  reveals.forEach(el => observer.observe(el));
} else { reveals.forEach(el => el.classList.add('visible')); }

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('is-active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  document.querySelectorAll('.service-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
}));

const zone = document.getElementById('steps');
const recap = document.getElementById('recap');
const modifications = document.getElementById('modifications');
const services = ['Shampoing, coupe et coiffage', 'Taille de barbe au rasoir, serviette chaude et soin'];
const choix = { service: '', date: '', heure: '', prenom: '', telephone: '' };
let etape = 0;
const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
function isoLocal(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function dateLocale(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d); }
function dates() { return Array.from({length:14}, (_,i) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+i); return d; }); }
function horaires(d) {
  if (d.getDay() < 2 || d.getDay() > 5) return [];
  const fin = 17;
  const now = new Date();
  const slots = [];
  for (let h=10; h<fin; h++) for (const min of [0,30]) {
    const moment = new Date(d); moment.setHours(h,min,0,0);
    const value = `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
    const pris = (h*2 + min/30 + d.getDate()) % 5 === 0;
    slots.push({value, disabled: moment <= now || pris, label: `${String(h).padStart(2,'0')} h ${String(min).padStart(2,'0')}${moment <= now ? ' · passé' : pris ? ' · indisponible (exemple)' : ''}`});
  }
  return slots;
}
function updateRecap() {
  const parts = [];
  if (choix.service) parts.push(choix.service);
  if (choix.date) parts.push(dateFormat.format(dateLocale(choix.date)));
  if (choix.heure) parts.push(choix.heure.replace(':',' h '));
  if (etape === 4) { parts.push(choix.prenom, choix.telephone); }
  recap.textContent = parts.length ? parts.join(' · ') : 'Rien de choisi pour le moment.';
  modifications.replaceChildren();
  if (etape > 0 && etape < 4) {
    [['Prestation', 0, choix.service], ['Jour', 1, choix.date], ['Heure', 2, choix.heure]].forEach(([label, index, value]) => {
      if (value && index < etape) modifications.append(button(`Modifier : ${label}`, 'modify', () => {
        if (etape === 3) { choix.prenom = document.getElementById('prenom').value; choix.telephone = document.getElementById('telephone').value; }
        go(index);
      }));
    });
  }
}
function radio(name, value, label, checked, disabled) {
  const input = document.createElement('input'); input.type='radio'; input.name=name; input.value=value; input.checked=checked; input.disabled=disabled;
  const wrapper = document.createElement('label'); wrapper.className='choice'; wrapper.append(input, document.createTextNode(label)); return wrapper;
}
function button(label, cls, fn) { const b=document.createElement('button'); b.type='button'; b.textContent=label; if(cls)b.className=cls; b.addEventListener('click',fn); return b; }
function go(n) { etape=n; render(true); }
function render(moveFocus = false) {
  updateRecap();
  const wrap=document.createElement('div'); wrap.className='booking-step entering';
  const counter=document.createElement('p'); counter.className='step-counter'; counter.textContent=etape === 4 ? 'SIMULATION TERMINÉE' : `ÉTAPE 0${etape+1} / 04`; wrap.append(counter);
  const title=document.createElement('h3'); title.tabIndex=-1; title.textContent=['Choisir une prestation','Choisir un jour','Choisir une heure','Vos coordonnées','Simulation terminée'][etape]; wrap.append(title);
  const intro=document.createElement('p');
  intro.textContent=['Ces prestations durent 30 minutes selon Planity.','Jours proposés pour l’exemple seulement, sans rapport avec les horaires du salon, à confirmer.','Créneaux fictifs. Ils ne reflètent ni les horaires ni les disponibilités du salon.','Ces informations restent dans cette page et ne sont pas envoyées.','Rien n’a été envoyé. Pour un vrai rendez-vous, utilisez Planity ou appelez le salon.'][etape]; wrap.append(intro);
  const options=document.createElement(etape < 3 ? 'fieldset' : 'div'); options.className='choices';
  if (etape < 3) { const legend=document.createElement('legend'); legend.className='sr-only'; legend.textContent=title.textContent; options.append(legend); }
  if(etape===0) services.forEach(s=>options.append(radio('prestation',s,s,choix.service===s,false)));
  if(etape===1) { options.classList.add('days'); dates().forEach(d=>{const off=d.getDay()<2||d.getDay()>5; const noSlots=!off && !horaires(d).some(slot=>!slot.disabled); const closed=off||noSlots; const val=isoLocal(d); const label=dateFormat.format(d)+(off?' · non proposé':noSlots?' · aucun créneau simulé':''); options.append(radio('jour',val,label,choix.date===val,closed));}); }
  if(etape===2) { options.classList.add('slots'); horaires(dateLocale(choix.date)).forEach(slot=>options.append(radio('heure',slot.value,slot.label,choix.heure===slot.value,slot.disabled))); }
  if(etape===3) {
    options.innerHTML='<label class="field" for="prenom">Prénom<input id="prenom" name="prenom" autocomplete="given-name" required aria-describedby="erreur-prenom"><span class="error" id="erreur-prenom"></span></label><label class="field" for="telephone">Téléphone<input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="erreur-telephone"><span class="error" id="erreur-telephone"></span></label>';
    options.querySelector('#prenom').value=choix.prenom; options.querySelector('#telephone').value=choix.telephone;
  }
  if(etape===4) { const link=document.createElement('a'); link.className='external'; link.href='https://www.planity.com/mr-coiffeur-barbier-34000-montpellier'; link.target='_blank'; link.rel='noopener'; link.textContent='Réserver sur Planity ↗'; options.append(link); }
  wrap.append(options);
  const error=document.createElement('p'); error.className='error'; error.setAttribute('role','status'); wrap.append(error);
  const actions=document.createElement('div'); actions.className='booking-actions';
  if(etape>0 && etape<4) actions.append(button('Retour','back',()=>{if(etape===3){choix.prenom=options.querySelector('#prenom').value; choix.telephone=options.querySelector('#telephone').value;} go(etape-1);}));
  if(etape<4) actions.append(button(etape===3?'Terminer la simulation':'Continuer','',()=>{
    if(etape<3){const selected=options.querySelector('input:checked'); if(!selected){error.textContent='Choisissez une option pour continuer.';return;} if(etape===0){if(choix.service!==selected.value){choix.date='';choix.heure='';} choix.service=selected.value;} if(etape===1){if(choix.date!==selected.value)choix.heure=''; choix.date=selected.value;} if(etape===2)choix.heure=selected.value; go(etape+1); return;}
    choix.prenom=options.querySelector('#prenom').value.trim(); choix.telephone=options.querySelector('#telephone').value.trim();
    const digits=choix.telephone.replace(/[\s.()-]/g,''); const validPhone=/^(?:(?:\+33|0033)[1-9]\d{8}|0[1-9]\d{8})$/.test(digits);
    options.querySelector('#erreur-prenom').textContent=choix.prenom?'':'Indiquez votre prénom.'; options.querySelector('#erreur-telephone').textContent=validPhone?'':'Indiquez un numéro français valide.';
    if(!choix.prenom){options.querySelector('#prenom').focus();return;} if(!validPhone){options.querySelector('#telephone').focus();return;} go(4);
  }));
  if(etape===4) actions.append(button('Recommencer','back',()=>{Object.keys(choix).forEach(k=>choix[k]='');go(0);}));
  wrap.append(actions); zone.replaceChildren(wrap); requestAnimationFrame(()=>wrap.classList.remove('entering')); if(moveFocus) title.focus();
}
render();
