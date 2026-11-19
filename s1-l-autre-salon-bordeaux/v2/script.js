document.documentElement.classList.add('js');
const flow = document.querySelector('#flow');
const summary = document.querySelector('#summary');
const state = { step: 0, service: '', day: '', time: '', name: '', phone: '' };
const services = ['Couleur', 'Mèches', 'Chignons'];
const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const dates = Array.from({length: 14}, (_, i) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+i); return d; });
const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function updateSummary() {
  summary.replaceChildren();
  const values = [state.service, state.day && dateFormat.format(dates.find(d => key(d) === state.day)), state.time];
  if (!values.some(Boolean)) { summary.textContent = 'Votre choix apparaîtra ici.'; return; }
  values.filter(Boolean).forEach(value => { const p = document.createElement('p'); p.textContent = value; summary.append(p); });
}
function render(focus = true) {
  updateSummary();
  let body = '';
  if (state.step === 0) body = `<p class="flow-progress">Étape 1 sur 4</p><h3 class="flow-title" tabindex="-1">Choisir une prestation</h3><p>Prestations mentionnées en annuaire, à confirmer.</p><div class="choices">${services.map(s => `<label class="choice"><input type="radio" name="service" value="${s}" ${state.service === s ? 'checked' : ''}> ${s}</label>`).join('')}</div><div class="flow-actions"><button data-next ${state.service ? '' : 'disabled'}>Continuer →</button></div>`;
  if (state.step === 1) body = `<p class="flow-progress">Étape 2 sur 4</p><h3 class="flow-title" tabindex="-1">Choisir un jour</h3><p>Jours proposés à titre d’exemple, horaires à confirmer.</p><div class="choices">${dates.map(d => {const now = new Date(); const available = [2,3,5].includes(d.getDay()) && (key(d) !== key(now) || now.getHours() < 16); return `<label class="choice"><input type="radio" name="day" value="${key(d)}" ${state.day === key(d) ? 'checked' : ''} ${available ? '' : 'disabled'}> ${dateFormat.format(d)}${available ? '' : ' — non proposé'}</label>`}).join('')}</div><div class="flow-actions"><button class="back" data-back>← Retour</button><button data-next ${state.day ? '' : 'disabled'}>Continuer →</button></div>`;
  if (state.step === 2) { const selected = dates.find(d => key(d) === state.day); const now = new Date(); body = `<p class="flow-progress">Étape 3 sur 4</p><h3 class="flow-title" tabindex="-1">Choisir une heure</h3><p>Créneaux d’exemple, à confirmer par téléphone.</p><div class="choices">${[10,11,14,15,16].map(h => {const past = selected && key(selected) === key(now) && now.getHours() >= h; return `<label class="choice"><input type="radio" name="time" value="${h} h 00" ${state.time === `${h} h 00` ? 'checked' : ''} ${past ? 'disabled' : ''}> ${h} h 00${past ? ' — passé' : ''}</label>`}).join('')}</div><div class="flow-actions"><button class="back" data-back>← Retour</button><button data-next ${state.time ? '' : 'disabled'}>Continuer →</button></div>`; }
  if (state.step === 3) body = `<p class="flow-progress">Étape 4 sur 4</p><h3 class="flow-title" tabindex="-1">Vos coordonnées</h3><p>Ces données restent dans cette page et ne sont pas envoyées.</p><form id="details" novalidate><label class="field">Prénom<input name="prenom" autocomplete="given-name" required value=""></label><p class="error" id="name-error" aria-live="polite"></p><label class="field">Téléphone<input name="telephone" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="phone-error" value=""></label><p class="error" id="phone-error" aria-live="polite"></p><div class="flow-actions"><button type="button" class="back" data-back>← Retour</button><button type="submit">Terminer la simulation →</button></div></form>`;
  if (state.step === 4) body = `<p class="flow-progress">Simulation terminée</p><h3 class="flow-title" tabindex="-1">Votre essai est terminé.</h3><p>Rien n’a été envoyé et aucun rendez-vous n’a été pris. Appelez le salon pour confirmer votre demande.</p><div class="flow-actions"><a href="tel:+33556316994">Appeler le salon ↗</a><button class="back" data-reset>Recommencer</button></div>`;
  flow.innerHTML = `<div class="flow-enter">${body}</div>`;
  if (state.step === 3) { flow.querySelector('[name=prenom]').value = state.name; flow.querySelector('[name=telephone]').value = state.phone; }
  if (focus) flow.querySelector('.flow-title')?.focus({preventScroll:true});
}
flow.addEventListener('change', e => { if (!['service','day','time'].includes(e.target.name)) return; const field = e.target.name; state[field] = e.target.value; if (field === 'service') { state.day=''; state.time=''; } if (field === 'day') state.time=''; updateSummary(); const next = flow.querySelector('[data-next]'); if(next) next.disabled = false; });
flow.addEventListener('click', e => { if (e.target.closest('[data-next]')) { state.step++; render(); } else if (e.target.closest('[data-back]')) { if(state.step===3){ state.name=flow.querySelector('[name=prenom]').value; state.phone=flow.querySelector('[name=telephone]').value; } state.step--; render(); } else if(e.target.closest('[data-reset]')) { Object.assign(state,{step:0,service:'',day:'',time:'',name:'',phone:''}); render(); } });
flow.addEventListener('submit', e => { e.preventDefault(); const form=e.target; state.name=form.prenom.value.trim(); state.phone=form.telephone.value.trim(); const validPhone=/^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.phone); flow.querySelector('#name-error').textContent=state.name?'':'Indiquez votre prénom.'; flow.querySelector('#phone-error').textContent=validPhone?'':'Indiquez un numéro de téléphone français valide.'; form.prenom.setAttribute('aria-describedby','name-error'); if(!state.name){form.prenom.focus();return} if(!validPhone){form.telephone.focus();return} state.step=4;render(); });
render(false);
if ('IntersectionObserver' in window) {
const observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting){entry.target.classList.add('visible'); observer.unobserve(entry.target)} }), {threshold:.08});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
const navLinks = [...document.querySelectorAll('.side-nav a')]; const marker = document.querySelector('.nav-marker');
function setNav(index){const link=navLinks[index]; if(!link)return; navLinks.forEach((a,i)=>a.classList.toggle('active',i===index)); marker.style.width=`${link.offsetWidth}px`; marker.style.setProperty('--marker-x',`${link.offsetLeft}px`);}
const sectionObserver = new IntersectionObserver(entries => entries.forEach(entry=>{if(entry.isIntersecting)setNav(Number(entry.target.dataset.nav))}),{rootMargin:'-20% 0px -60% 0px'});
document.querySelectorAll('[data-nav]').forEach(el=>sectionObserver.observe(el)); window.addEventListener('resize',()=>setNav(navLinks.findIndex(a=>a.classList.contains('active'))));
} else { document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')); }
