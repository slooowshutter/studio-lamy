document.documentElement.classList.add('js');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const revealed = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduced.matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: 0.08 });
  revealed.forEach(item => observer.observe(item));
} else revealed.forEach(item => item.classList.add('visible'));

const panel = document.querySelector('#booking-panel');
const recap = document.querySelector('#recap');
const stepButtons = [...document.querySelectorAll('[data-step]')];
const state = { step: 0, maxStep: 0, date: '', time: '', name: '', phone: '' };
const dateLabel = value => new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' }).format(new Date(value + 'T12:00:00'));
const dateValue = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function updateRecap() {
  recap.textContent = state.date ? `${dateLabel(state.date)}${state.time ? ' · ' + state.time.replace(':',' h ') : ' · heure à choisir'}` : 'Jour et heure à choisir.';
}
function go(step) { if (step >= 1 && !state.date) return; if (step >= 2 && !state.time) return; state.step = step; state.maxStep = Math.max(state.maxStep, step); render(true); }
function render(focus = false) {
  updateRecap();
  stepButtons.forEach((button, index) => {
    button.disabled = index > state.maxStep;
    if (index === state.step) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
  });
  panel.classList.remove('panel-in');
  if (state.step === 0) {
    const today = new Date();
    const days = Array.from({length:14}, (_,i) => { const d = new Date(today.getFullYear(),today.getMonth(),today.getDate()+i); const v = dateValue(d); const closed = d.getDay() === 0; const label = new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(d); return `<label class="choice"><input type="radio" name="jour" value="${v}" ${closed?'disabled':''} ${v===state.date?'checked':''}><span>${label}${closed?'<br>fermé':''}</span></label>`; }).join('');
    panel.innerHTML = `<h4 tabindex="-1">Choisir un jour</h4><p>Jours indiqués par l’annuaire, à confirmer.</p><div class="choice-grid">${days}</div><div class="booking-actions"><button type="button" id="suivant" ${state.date?'':'disabled'}>Choisir une heure →</button></div>`;
    panel.querySelectorAll('[name="jour"]').forEach(input => input.addEventListener('change', () => { if(state.date !== input.value) { state.time = ''; state.maxStep = 0; stepButtons.slice(1).forEach(button => button.disabled = true); } state.date = input.value; updateRecap(); panel.querySelector('#suivant').disabled = false; }));
    panel.querySelector('#suivant').addEventListener('click',()=>go(1));
  } else if (state.step === 1) {
    const now = new Date();
    const times = ['10:00','11:00','15:00','17:00'];
    const choices = times.map(time => { const past = new Date(`${state.date}T${time}:00`) <= now; return `<label class="choice"><input type="radio" name="heure" value="${time}" ${past?'disabled':''} ${time===state.time?'checked':''}><span>${time.replace(':',' h ')}${past?'<br>passé':''}</span></label>`; }).join('');
    panel.innerHTML = `<h4 tabindex="-1">Choisir une heure</h4><p>Exemples dans les horaires indiqués par l’annuaire. Disponibilités réelles à confirmer.</p><div class="choice-grid">${choices}</div>${times.every(time => new Date(`${state.date}T${time}:00`) <= now) ? '<p>Ces heures sont passées. Choisissez un autre jour.</p>' : ''}<div class="booking-actions"><button class="back" type="button" id="retour">← Jour</button><button type="button" id="suivant" ${state.time?'':'disabled'}>Continuer →</button></div>`;
    panel.querySelectorAll('[name="heure"]').forEach(input => input.addEventListener('change',()=>{ if (state.time !== input.value) { state.maxStep = 1; stepButtons[2].disabled = true; } state.time=input.value; updateRecap(); panel.querySelector('#suivant').disabled=false; }));
    panel.querySelector('#retour').addEventListener('click',()=>go(0));
    panel.querySelector('#suivant').addEventListener('click',()=>go(2));
  } else if (state.step === 2) {
    panel.innerHTML = `<h4 tabindex="-1">Vos coordonnées</h4><p>Pour la démonstration uniquement&nbsp;: aucune donnée n’est envoyée.</p><form id="simulation" novalidate><label class="field">Prénom<input name="prenom" autocomplete="given-name" required aria-describedby="erreur-prenom"><span class="error" id="erreur-prenom"></span></label><label class="field">Téléphone<input name="telephone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="erreur-telephone"><span class="error" id="erreur-telephone"></span></label><div class="booking-actions"><button class="back" type="button" id="retour">← Heure</button><button type="submit">Terminer la simulation →</button></div></form>`;
    const form=panel.querySelector('form'); form.prenom.value=state.name; form.telephone.value=state.phone;
    panel.querySelector('#retour').addEventListener('click',()=>go(1));
    form.addEventListener('submit',event=>{ event.preventDefault(); const name=form.prenom.value.trim(), phone=form.telephone.value.trim(), digits=phone.replace(/[\s.()-]/g,''); const validName=name.length>0, validPhone=/^(?:(?:\+33|0033)[1-9]|0[1-9])\d{8}$/.test(digits); panel.querySelector('#erreur-prenom').textContent=validName?'':'Indiquez votre prénom.'; panel.querySelector('#erreur-telephone').textContent=validPhone?'':'Indiquez un numéro de téléphone français valide.'; form.prenom.setAttribute('aria-invalid',String(!validName)); form.telephone.setAttribute('aria-invalid',String(!validPhone)); if(!validName || !validPhone){(validName?form.telephone:form.prenom).focus();return} state.name=name; state.phone=phone; go(3); });
  } else {
    panel.innerHTML = `<h4 tabindex="-1">Simulation terminée.</h4><p>Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée. Pour convenir d’un rendez-vous, contactez le salon.</p><div class="booking-actions"><a class="button" href="tel:0768788546">Appeler le salon ↗</a><button class="back" type="button" id="recommencer">Recommencer</button></div>`;
    panel.querySelector('#recommencer').addEventListener('click',()=>{Object.assign(state,{step:0,maxStep:0,date:'',time:'',name:'',phone:''});render(true)});
  }
  if (!reduced.matches) { void panel.offsetWidth; panel.classList.add('panel-in'); }
  if (focus) panel.querySelector('h4').focus();
}
stepButtons.forEach(button => button.addEventListener('click',()=>go(Number(button.dataset.step))));
render();

const mobileBar = document.querySelector('.mobile-bar');
if ('IntersectionObserver' in window) {
  const hiddenBy = new Set();
  const barObserver = new IntersectionObserver(entries => { entries.forEach(entry => entry.isIntersecting ? hiddenBy.add(entry.target) : hiddenBy.delete(entry.target)); mobileBar.classList.toggle('is-hidden', hiddenBy.size > 0); }, { threshold: 0 });
  document.querySelectorAll('#rendez-vous, footer').forEach(element => barObserver.observe(element));
}
