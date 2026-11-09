document.documentElement.classList.add('js');
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: 0.12 });
  reveals.forEach((el, index) => { el.style.transitionDelay = `${(index % 4) * 60}ms`; observer.observe(el); });
  window.setTimeout(() => reveals.forEach(el => el.classList.add('visible')), 2500);
} else reveals.forEach(el => el.classList.add('visible'));

const content = document.querySelector('#booking-content');
const selection = document.querySelector('#selection');
const steps = [...document.querySelectorAll('[data-go]')];
const services = ['Coupe femme', 'Coupe homme', 'Coupe enfant', 'Coloration', 'Mèches', 'Chignon', 'Permanente'];
const state = { step: 0, service: '', date: '', time: '', name: '', phone: '' };
const formatDate = date => new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' }).format(date);
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const dateFromKey = key => { const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d); };
function render(moveFocus = true) {
  steps.forEach((button, i) => { button.disabled = i > state.step && !(i === 1 && state.service) && !(i === 2 && state.date) && !(i === 3 && state.time); button.toggleAttribute('aria-current', i === state.step); if (i === state.step) button.setAttribute('aria-current','step'); });
  selection.textContent = [state.service, state.date && formatDate(dateFromKey(state.date)), state.time].filter(Boolean).join(' · ') || 'À compléter';
  if (state.step === 0) {
    content.innerHTML = `<h3 tabindex="-1">Choisir une prestation</h3><p>Prestations à confirmer. Tarifs sur appel au salon.</p><div class="choices">${services.map((s,i)=>`<label class="choice"><input type="radio" name="prestation" value="${i}" ${state.service===s?'checked':''}>${s}</label>`).join('')}</div><button class="booking-button" type="button" id="next" ${state.service?'':'disabled'}>Choisir un jour →</button>`;
    content.querySelectorAll('input').forEach(input => input.addEventListener('change', () => { state.service = services[Number(input.value)]; content.querySelector('#next').disabled = false; selection.textContent = state.service; }));
    content.querySelector('#next').onclick = () => { state.step=1; render(); };
  } else if (state.step === 1) {
    const today = new Date(); today.setHours(0,0,0,0);
    const days = Array.from({length:14},(_,i)=>{const d=new Date(today); d.setDate(d.getDate()+i); return d;});
    content.innerHTML = `<h3 tabindex="-1">Choisir un jour</h3><p>Horaires d’annuaire à confirmer. Les jours fermés ne sont pas proposés.</p><div class="choices">${days.map(d=>{const key=dateKey(d), closed=d.getDay()===0||d.getDay()===1; return `<label class="choice"><input type="radio" name="jour" value="${key}" ${closed?'disabled':''} ${state.date===key?'checked':''}>${formatDate(d)}${closed?' · fermé':''}</label>`}).join('')}</div><button class="booking-button" type="button" id="next" ${state.date?'':'disabled'}>Choisir une heure →</button>`;
    content.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{state.date=input.value;state.time='';selection.textContent=[state.service, formatDate(dateFromKey(state.date))].join(' · ');content.querySelector('#next').disabled=false;}));
    content.querySelector('#next').onclick=()=>{state.step=2;render();};
  } else if (state.step === 2) {
    const day=dateFromKey(state.date), now=new Date();
    const times=['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30'];
    content.innerHTML=`<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs dans les horaires publiés, à confirmer avec le salon.</p><div class="choices">${times.map((t,i)=>{const [h,m]=t.split(':').map(Number), dt=new Date(day); dt.setHours(h,m); const taken=(i+day.getDate())%5===0 || dt<=now; return `<label class="choice"><input type="radio" name="heure" value="${t}" ${taken?'disabled':''} ${state.time===t?'checked':''}>${t.replace(':',' h ')}${taken?' · indisponible':''}</label>`}).join('')}</div><button class="booking-button" type="button" id="next" ${state.time?'':'disabled'}>Continuer →</button>`;
    content.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{state.time=input.value;content.querySelector('#next').disabled=false;}));
    content.querySelector('#next').onclick=()=>{state.step=3;render();};
  } else if (state.step === 3) {
    content.innerHTML=`<h3 tabindex="-1">Vos coordonnées</h3><p>Pour cette démonstration, rien ne sera transmis.</p><form id="form" novalidate><div class="fields"><label>Prénom<input name="prenom" autocomplete="given-name" required aria-describedby="erreur-prenom"><span id="erreur-prenom" class="error"></span></label><label>Téléphone<input name="telephone" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="erreur-telephone"><span id="erreur-telephone" class="error"></span></label></div><p id="erreur-creneau" class="error" role="status"></p><button class="booking-button" type="submit">Confirmer la simulation →</button></form>`;
    const form = content.querySelector('#form');
    form.elements.prenom.value = state.name; form.elements.telephone.value = state.phone;
    form.elements.prenom.addEventListener('input', e => { state.name = e.target.value; });
    form.elements.telephone.addEventListener('input', e => { state.phone = e.target.value; });
    form.onsubmit=e=>{e.preventDefault();const f=e.currentTarget, name=f.elements.prenom.value.trim(), phone=f.elements.telephone.value.trim();const validPhone=/^(?:(?:\+33|0033)\s*\(?0?\)?|0)[1-9](?:[\s.\-]*\d{2}){4}$/.test(phone);content.querySelector('#erreur-prenom').textContent=name?'':'Indiquez votre prénom.';content.querySelector('#erreur-telephone').textContent=validPhone?'':'Indiquez un numéro de téléphone français valide.';f.elements.prenom.setAttribute('aria-invalid', String(!name));f.elements.telephone.setAttribute('aria-invalid', String(!validPhone));if(!name||!validPhone){(name?f.elements.telephone:f.elements.prenom).focus();return;}const chosen=dateFromKey(state.date), [h,m]=state.time.split(':').map(Number);chosen.setHours(h,m);if(chosen<=new Date()){content.querySelector('#erreur-creneau').textContent='Cette heure est passée. Choisissez une autre heure.';return;}state.name=name;state.phone=phone;state.step=4;render();};
  } else {
    content.innerHTML='<h3 tabindex="-1">Simulation terminée</h3><p>Votre sélection est récapitulée ci-dessous. Aucune demande n’a été envoyée et aucun rendez-vous n’a été pris.</p><a class="arrow-link" href="tel:+33240497139">Appeler le salon ↗</a><p><button class="booking-button" type="button" id="restart">Recommencer</button></p>';
    content.querySelector('#restart').onclick=()=>{Object.assign(state,{step:0,service:'',date:'',time:'',name:'',phone:''});render();};
  }
  content.classList.remove('step-enter'); void content.offsetWidth; content.classList.add('step-enter');
  if (moveFocus) content.querySelector('h3').focus({preventScroll:true});
}
steps.forEach(button=>button.addEventListener('click',()=>{state.step=Number(button.dataset.go);render();}));
render(false);
