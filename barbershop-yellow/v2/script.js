document.documentElement.classList.add('js');
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('ready')));
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: 0.08 });
  reveals.forEach(el => observer.observe(el));
} else reveals.forEach(el => el.classList.add('visible'));

const app = document.querySelector('#booking-app');
const content = document.querySelector('#step-content');
const summary = document.querySelector('#summary');
const status = document.querySelector('#booking-status');
const nav = [...document.querySelectorAll('[data-go]')];
const state = { step: 0, date: null, time: null, name: '', phone: '' };
const hours = { 0:[[13,19]], 1:[[13,19]], 2:[[9,19]], 3:[[9,19]], 4:[[9,19]], 5:[[9,12.5],[15,20]], 6:[[9,19]] };
const fmtDate = d => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(d);
const fmtTime = minutes => `${Math.floor(minutes/60)} h ${String(minutes%60).padStart(2,'0')}`;
const escapeText = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function dates() {
  const today = new Date(); today.setHours(0,0,0,0);
  return Array.from({length:14},(_,i) => { const d = new Date(today); d.setDate(d.getDate()+i); return d; });
}
function slots(date) {
  const now = new Date(); const list = [];
  hours[date.getDay()].forEach(([start,end]) => {
    for (let minute=start*60; minute<end*60; minute+=30) {
      const when = new Date(date); when.setHours(Math.floor(minute/60),minute%60,0,0);
      if (when > now) list.push(minute);
    }
  });
  return list;
}
function render() {
  nav.forEach((b,i) => { b.disabled = i===1 ? !state.date : i===2 ? !state.time : false; if (i===state.step) b.setAttribute('aria-current','step'); else b.removeAttribute('aria-current'); });
  summary.textContent = state.date ? `${fmtDate(state.date)}${state.time !== null ? ' à '+fmtTime(state.time) : ''} · simulation` : 'Aucun moment choisi.';
  if (state.step===0) {
    content.innerHTML = `<h3 tabindex="-1">Choisissez un jour</h3><p>Horaires de répertoire à confirmer. Les choix ne représentent pas des disponibilités réelles.</p><div class="choices">${dates().map((d,i) => `<button type="button" class="choice ${state.date && d.toDateString()===state.date.toDateString()?'selected':''}" data-date="${i}" aria-pressed="${Boolean(state.date && d.toDateString()===state.date.toDateString())}" ${slots(d).length?'':'disabled'}>${fmtDate(d)}${slots(d).length?'':'<br>aucun horaire'}</button>`).join('')}</div><div class="step-actions"><button class="primary" type="button" data-next ${state.date?'':'disabled'}>Choisir une heure →</button></div>`;
  } else if (state.step===1) {
    content.innerHTML = `<h3 tabindex="-1">Choisissez une heure</h3><p>Plages proposées dans les horaires de répertoire, sans disponibilité réelle.</p><div class="choices">${slots(state.date).map(t=>`<button type="button" class="choice ${state.time===t?'selected':''}" data-time="${t}" aria-pressed="${state.time===t}">${fmtTime(t)}</button>`).join('')}</div><div class="step-actions"><button class="secondary" type="button" data-back>← Jour</button><button class="primary" type="button" data-next ${state.time!==null?'':'disabled'}>Continuer →</button></div>`;
  } else if (state.step===2) {
    content.innerHTML = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer le parcours uniquement&nbsp;: rien ne sera transmis.</p><form novalidate><div class="field"><label for="prenom">Prénom</label><input id="prenom" name="prenom" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="erreur-prenom"><p class="error" id="erreur-prenom" aria-live="polite"></p></div><div class="field"><label for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="erreur-telephone"><p class="error" id="erreur-telephone" aria-live="polite"></p></div><div class="step-actions"><button class="secondary" type="button" data-back>← Heure</button><button class="primary" type="submit">Terminer la simulation →</button></div></form>`;
  } else {
    content.innerHTML = `<h3 tabindex="-1">Simulation terminée.</h3><p>${escapeText(state.name)}, vous avez choisi le ${fmtDate(state.date)} à ${fmtTime(state.time)}.</p><p><strong>Aucun rendez-vous n’a été pris, aucune information n’a été envoyée.</strong> Pour réserver, contactez le salon.</p><div class="step-actions"><a class="primary" href="tel:+33415811091">Appeler le salon</a><button class="secondary" type="button" data-reset>Recommencer</button></div>`;
  }
}
let timer;
function go(step) {
  clearTimeout(timer);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  content.classList.add('changing');
  timer = setTimeout(() => { state.step=step; render(); content.classList.remove('changing'); content.querySelector('h3')?.focus(); }, reduce ? 0 : 180);
}
app.hidden=false; render();
app.addEventListener('click', event => {
  const b = event.target.closest('button'); if(!b || b.disabled) return;
  if (b.dataset.date !== undefined) { const index=b.dataset.date; const hadTime=state.time!==null; state.date=dates()[Number(index)]; state.time=null; render(); content.querySelector(`[data-date="${index}"]`).focus(); status.textContent=hadTime ? 'Jour modifié. L’heure précédente a été effacée.' : 'Jour sélectionné.'; }
  else if (b.dataset.time !== undefined) { const time=b.dataset.time; state.time=Number(time); render(); content.querySelector(`[data-time="${time}"]`).focus(); status.textContent='Heure sélectionnée.'; }
  else if (b.hasAttribute('data-next')) go(state.step+1);
  else if (b.hasAttribute('data-back')) go(state.step-1);
  else if (b.dataset.go !== undefined) go(Number(b.dataset.go));
  else if (b.hasAttribute('data-reset')) { state.date=null;state.time=null;state.name='';state.phone='';go(0); }
});
app.addEventListener('input', event => { if(event.target.name==='prenom') state.name=event.target.value; if(event.target.name==='telephone') state.phone=event.target.value; });
app.addEventListener('submit', event => {
  event.preventDefault(); const name=state.name.trim(), phone=state.phone.replace(/[\s.()-]/g,'');
  const nameError=content.querySelector('#erreur-prenom'), phoneError=content.querySelector('#erreur-telephone');
  nameError.textContent=name?'':'Indiquez votre prénom.';
  phoneError.textContent=/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(phone)?'':'Indiquez un numéro de téléphone français valide.';
  if(nameError.textContent) content.querySelector('#prenom').focus();
  else if(phoneError.textContent) content.querySelector('#telephone').focus();
  else go(3);
});
