document.documentElement.classList.add('js');
const panels = [...document.querySelectorAll('.panel')];
function openPanel(panel, focus = false) {
  if (!panel) return;
  panels.forEach(item => {
    const open = item === panel;
    item.classList.toggle('is-open', open);
    item.querySelector('.panel-toggle').setAttribute('aria-expanded', String(open));
    item.querySelector('.panel-body').hidden = !open;
  });
  if (focus) panel.querySelector('.panel-toggle').focus({preventScroll:true});
}
panels.forEach(panel => { const toggle = panel.querySelector('.panel-toggle'); toggle.disabled = false; toggle.addEventListener('click', () => openPanel(panel)); });
openPanel(panels[0]);
document.querySelectorAll('[data-open]').forEach(link => link.addEventListener('click', () => openPanel(document.getElementById(link.dataset.open))));
const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), {threshold:.1}) : null;
document.querySelectorAll('.panel-toggle').forEach(item => { if (observer) { item.classList.add('reveal'); observer.observe(item); } });

const content = document.getElementById('booking-content');
const selection = document.getElementById('selection');
const state = { service:null, day:null, time:null, name:'', phone:'' };
const services = [{name:'Curly M', duration:90, label:'90 min'}, {name:'Curly L', duration:105, label:'105 min'}];
const formatDay = date => new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long', timeZone:'UTC'}).format(date);
function parisNow() { const parts = new Intl.DateTimeFormat('fr-FR', {timeZone:'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(new Date()); return Object.fromEntries(parts.map(part => [part.type, Number(part.value)])); }
function summary() { selection.textContent = [state.service?.name, state.day && formatDay(state.day), state.time].filter(Boolean).join(' · ') || 'À composer'; const nav=document.getElementById('etapes'); if(nav){nav.querySelector('[data-etape=jour]').disabled=!state.service; nav.querySelector('[data-etape=heure]').disabled=!state.day;} }
function view(html) { content.innerHTML = `<div class="step">${html}</div>`; summary(); const heading=content.querySelector('h3'); if (heading && document.getElementById('rendez-vous').classList.contains('is-open')) heading.focus({preventScroll:true}); }
function stepService() {
  view(`<h3 tabindex="-1">1. Choisir une prestation</h3><fieldset><legend>Simulation, sans tarif</legend>${services.map((s,i)=>`<label class="choice"><input type="radio" name="prestation" value="${i}" ${state.service?.name===s.name?'checked':''}><span>${s.name}<br><small>Coupe &amp; coiffage · ${s.label}</small></span></label>`).join('')}</fieldset><div class="booking-actions"><button type="button" id="continuer">Choisir un jour →</button></div><p class="error" id="erreur" aria-live="polite"></p>`);
  document.getElementById('continuer').onclick=()=>{const chosen=content.querySelector('input[name=prestation]:checked'); if(!chosen){document.getElementById('erreur').textContent='Choisissez une prestation pour continuer.';return;} state.service=services[Number(chosen.value)];state.day=null;state.time=null;stepDay();};
}
function stepDay() {
  const now=parisNow(); const today=new Date(Date.UTC(now.year,now.month-1,now.day)); const days=Array.from({length:14},(_,i)=>{let d=new Date(today); d.setUTCDate(today.getUTCDate()+i); return d;});
  view(`<h3 tabindex="-1">2. Choisir un jour</h3><p>Horaires publiés, à confirmer. Les jours fermés sont indiqués.</p><div class="date-list">${days.map((d,i)=>{const closed=d.getUTCDay()===0||d.getUTCDay()===6;return `<button type="button" data-day="${i}" ${closed?'disabled':''}>${new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(d)}${closed?'<br>Fermé':''}</button>`}).join('')}</div><div class="booking-actions"><button class="secondary" type="button" id="retour">← Prestation</button></div>`);
  content.querySelectorAll('[data-day]').forEach(button=>button.onclick=()=>{state.day=days[Number(button.dataset.day)];state.time=null;stepTime();});document.getElementById('retour').onclick=stepService;
}
function stepTime() {
  const now=parisNow(); const today=Date.UTC(now.year,now.month-1,now.day); let slots=[]; for(let minutes=9*60;minutes+state.service.duration<=19*60;minutes+=30){if(state.day.getTime()>today || (state.day.getTime()===today && minutes>now.hour*60+now.minute)) slots.push({label:`${String(Math.floor(minutes/60)).padStart(2,'0')} h ${String(minutes%60).padStart(2,'0')}`, taken:(minutes/30 + state.day.getUTCDate())%5===0});}
  view(`<h3 tabindex="-1">3. Choisir une heure</h3><p>${formatDay(state.day)} · créneaux fictifs dans les horaires publiés.</p><div class="slot-list">${slots.map((slot,i)=>`<button type="button" data-slot="${i}" ${slot.taken?'disabled':''}>${slot.label}${slot.taken?'<br>Déjà pris':''}</button>`).join('')}</div>${slots.length?'':'<p>Aucun créneau proposé pour ce jour. Choisissez un autre jour.</p>'}<div class="booking-actions"><button class="secondary" type="button" id="retour">← Jour</button></div>`);
  content.querySelectorAll('[data-slot]').forEach(button=>button.onclick=()=>{state.time=slots[Number(button.dataset.slot)].label;stepDetails();});document.getElementById('retour').onclick=stepDay;
}
function stepDetails() {
  view(`<h3 tabindex="-1">4. Vos coordonnées</h3><p>Ces informations restent dans votre navigateur.</p><form id="coordonnees" novalidate><label class="field" for="prenom">Prénom<input id="prenom" type="text" autocomplete="given-name" aria-describedby="erreur" required></label><label class="field" for="telephone">Téléphone<input id="telephone" type="tel" autocomplete="tel" inputmode="tel" aria-describedby="erreur" required></label><p class="error" id="erreur" aria-live="polite"></p><div class="booking-actions"><button class="secondary" type="button" id="retour">← Heure</button><button type="submit">Confirmer la simulation →</button></div></form>`);
  document.getElementById('prenom').value=state.name;document.getElementById('telephone').value=state.phone;document.getElementById('retour').onclick=stepTime;
  document.getElementById('coordonnees').onsubmit=e=>{e.preventDefault();state.name=document.getElementById('prenom').value.trim();state.phone=document.getElementById('telephone').value.trim();if(!state.name||! /^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.phone)){document.getElementById('erreur').textContent='Indiquez votre prénom et un numéro de téléphone français valide.';document.getElementById(state.name ? 'telephone' : 'prenom').focus();return;}stepSuccess();};
}
function stepSuccess(){view(`<h3 tabindex="-1">Simulation terminée.</h3><p>Aucune demande n’a été envoyée et aucun créneau n’est réservé. Pour prendre rendez-vous, rendez-vous sur Planity.</p><a class="solid-link" href="https://www.planity.com/oma-coiffeur-et-barber-nantes-44200" target="_blank" rel="noopener">Réserver sur Planity ↗</a><div class="booking-actions"><button class="secondary" type="button" id="recommencer">Recommencer</button></div>`);document.getElementById('recommencer').onclick=()=>{state.service=null;state.day=null;state.time=null;state.name='';state.phone='';stepService();};}
stepService();

document.getElementById('etapes').addEventListener('click', event => { const target=event.target.closest('[data-etape]'); if (!target || target.disabled) return; if(target.dataset.etape==='prestation') stepService(); if(target.dataset.etape==='jour') stepDay(); if(target.dataset.etape==='heure') stepTime(); });
