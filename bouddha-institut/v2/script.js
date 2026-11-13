const root = document.documentElement;
root.classList.add('js');
requestAnimationFrame(() => document.querySelector('.hero').classList.add('ready'));
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), {threshold: .08});
  reveals.forEach(el => observer.observe(el));
} else reveals.forEach(el => el.classList.add('visible'));

const content = document.querySelector('#booking-content');
const tabs = [...document.querySelectorAll('[data-goto]')];
const state = {step:0, service:'', date:null, time:'', first:'', phone:''};
const services = ['Manucure', 'Pédicure', 'Épilation', 'Soin du visage', 'Massage'];
const formatDate = date => new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'}).format(date);
const formatHour = hour => `${Math.floor(hour / 60)} h${hour % 60 ? ' 30' : ''}`;
function dates() {
  const result = [];
  for (let i=0; i<14; i++) { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+i); result.push(d); }
  return result;
}
function slots(date) {
  const end = date.getDay() === 0 ? 19*60 : 19*60+30;
  const now = new Date(); const out=[];
  for(let m=10*60; m<end; m+=30) {
    const moment = new Date(date); moment.setHours(Math.floor(m/60),m%60,0,0);
    out.push({value:m, disabled:moment<=now || ((m/30 + date.getDate()) % 5 === 0)});
  }
  return out;
}
function updateSummary() {
  document.querySelector('#summary-service').textContent = state.service || 'Prestation —';
  document.querySelector('#summary-date').textContent = state.date ? formatDate(state.date) : 'Jour —';
  document.querySelector('#summary-time').textContent = state.time ? formatHour(Number(state.time)) : 'Heure —';
  const accessible = [true, !!state.service, !!state.date, !!state.time];
  tabs.forEach((tab,i) => {tab.disabled = !accessible[i] || state.step === 4; if(i===state.step) tab.setAttribute('aria-current','step'); else tab.removeAttribute('aria-current');});
}
function render(focus=true) {
  updateSummary();
  let html='';
  if(state.step===0) html=`<h3 tabindex="-1">Choisissez une prestation</h3><p>Une sélection pour essayer le parcours.</p><fieldset><legend class="visually-hidden">Prestation</legend><div class="choices">${services.map((s,i)=>`<label class="choice"><input type="radio" name="prestation" value="${i}" ${state.service===s?'checked':''}><span>${s}</span></label>`).join('')}</div></fieldset><div class="flow-actions"><button type="button" data-next ${state.service?'':'disabled'}>Choisir un jour →</button></div>`;
  if(state.step===1) html=`<h3 tabindex="-1">Choisissez un jour</h3><p>Horaires à confirmer. Le mardi, l’institut est indiqué fermé.</p><div class="date-grid">${dates().map((d,i)=>`<button type="button" data-date="${i}" ${d.getDay()===2?'disabled':''} class="${state.date && d.getTime()===state.date.getTime()?'selected':''}" aria-pressed="${!!state.date && d.getTime()===state.date.getTime()}">${formatDate(d)}${d.getDay()===2?'<br>Fermé':''}</button>`).join('')}</div><div class="flow-actions"><button class="secondary" type="button" data-back>Retour</button><button type="button" data-next ${state.date?'':'disabled'}>Choisir une heure →</button></div>`;
  if(state.step===2) html=`<h3 tabindex="-1">Choisissez une heure</h3><p>Créneaux fictifs pour la simulation uniquement : ils ne représentent pas les disponibilités de l’institut. Horaires à confirmer.</p><div class="time-grid">${slots(state.date).map(s=>`<button type="button" data-time="${s.value}" ${s.disabled?'disabled':''} class="${state.time===String(s.value)?'selected':''}" aria-pressed="${state.time===String(s.value)}">${formatHour(s.value)}${s.disabled?' · indisponible':''}</button>`).join('')}</div><div class="flow-actions"><button class="secondary" type="button" data-back>Retour</button><button type="button" data-next ${state.time?'':'disabled'}>Vos coordonnées →</button></div>`;
  if(state.step===3) html=`<h3 tabindex="-1">Vos coordonnées</h3><p>Pour cette démonstration, rien ne sera transmis.</p><form novalidate><label class="field">Prénom<input name="prenom" autocomplete="given-name" required value="${escapeText(state.first)}" aria-describedby="erreur-prenom"><span class="error" id="erreur-prenom"></span></label><label class="field">Téléphone<input name="telephone" type="tel" inputmode="tel" autocomplete="tel" required value="${escapeText(state.phone)}" aria-describedby="erreur-telephone"><span class="error" id="erreur-telephone"></span></label><div class="flow-actions"><button class="secondary" type="button" data-back>Retour</button><button type="submit">Confirmer la simulation →</button></div></form>`;
  if(state.step===4) html=`<h3 tabindex="-1">Simulation terminée</h3><p>Merci ${escapeText(state.first)}. Votre choix&nbsp;: ${escapeText(state.service)}, le ${formatDate(state.date)} à ${formatHour(Number(state.time))}.</p><p><strong>Aucune demande n’a été envoyée.</strong> Pour prendre rendez-vous, utilisez Treatwell ou appelez l’institut.</p><div class="flow-actions"><a class="button button-dark" href="https://bouddhainstitut.mytreatwell.fr/"><span>Aller sur Treatwell</span><span aria-hidden="true">↗</span></a><button class="secondary" type="button" data-reset>Recommencer</button></div>`;
  content.innerHTML = `<div class="booking-panel enter">${html}</div>`;
  const panel=content.firstElementChild; requestAnimationFrame(()=>panel.classList.remove('enter'));
  if(focus) panel.querySelector('h3').focus({preventScroll:true});
}
function escapeText(str){return str.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
content.addEventListener('change',e=>{if(e.target.name==='prestation'){state.service=services[Number(e.target.value)];state.date=null;state.time='';render(false);content.querySelector(`input[value="${e.target.value}"]`).focus({preventScroll:true});}});
content.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return;
  if(b.hasAttribute('data-date')){state.date=dates()[Number(b.dataset.date)];state.time='';const choice=b.dataset.date;render(false);content.querySelector(`[data-date="${choice}"]`).focus({preventScroll:true});}
  if(b.hasAttribute('data-time')){state.time=b.dataset.time;const choice=b.dataset.time;render(false);content.querySelector(`[data-time="${choice}"]`).focus({preventScroll:true});}
  if(b.hasAttribute('data-next')){state.step++;render();}
  if(b.hasAttribute('data-back')){state.step--;render();}
  if(b.hasAttribute('data-reset')){Object.assign(state,{step:0,service:'',date:null,time:'',first:'',phone:''});render();}
});
tabs.forEach(tab=>tab.addEventListener('click',()=>{state.step=Number(tab.dataset.goto);render();}));
content.addEventListener('submit',e=>{
  e.preventDefault(); const form=e.target; state.first=form.prenom.value.trim();state.phone=form.telephone.value.trim();
  const validName=state.first.length>0; const validPhone=/^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.phone);
  form.querySelector('#erreur-prenom').textContent=validName?'':'Indiquez votre prénom.';
  form.querySelector('#erreur-telephone').textContent=validPhone?'':'Indiquez un numéro de téléphone français valide.';
  form.prenom.setAttribute('aria-invalid',String(!validName));form.telephone.setAttribute('aria-invalid',String(!validPhone));
  if(!validName) form.prenom.focus(); else if(!validPhone) form.telephone.focus(); else {state.step=4;render();}
});
render(false);
