document.documentElement.classList.add('js');
const reveals = document.querySelectorAll('.reveal:not(.in-view)');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), {threshold: 0.08});
  reveals.forEach(item => observer.observe(item));
} else reveals.forEach(item => item.classList.add('visible'));

const area = document.querySelector('#etape');
const recap = document.querySelector('#recap');
const progress = [...document.querySelectorAll('[data-go]')];
const state = { service: '', date: '', time: '', name: '', phone: '' };
let step = 0;
let furthest = 0;
const services = ['Coupe femme', 'Coupe enfant', 'Mèches'];
const dateLabel = date => new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'}).format(new Date(`${date}T12:00:00`));
const escapeText = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function updateSummary() {
  const lines = [state.service, state.date && dateLabel(state.date), state.time, state.name].filter(Boolean).map(escapeText);
  recap.innerHTML = lines.length ? lines.join('<br>') : 'Votre ticket se remplira ici.';
}
function render(focus = true) {
  progress.forEach((button, index) => { button.disabled = index > furthest; if(index === step) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current'); });
  let content = '';
  if (step === 0) {
    content = `<h3 tabindex="-1">Choisir une prestation</h3><p>Prestations relevées dans les annuaires, à confirmer avec le salon.</p><div class="choices">${services.map(s => `<label class="choice"><input type="radio" name="service" value="${s}" ${state.service === s ? 'checked' : ''}> ${s}</label>`).join('')}</div><button class="next" type="button" ${state.service ? '' : 'disabled'}>Choisir un jour →</button>`;
  } else if (step === 1) {
    const today = new Date(); today.setHours(0,0,0,0);
    let days = '';
    for(let i=0;i<14;i++) { const d = new Date(today); d.setDate(today.getDate()+i); const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; const closed = d.getDay()===0 || d.getDay()===1; days += `<label class="choice ${closed?'disabled':''}"><input type="radio" name="date" value="${iso}" ${closed?'disabled':''} ${state.date===iso?'checked':''}><span>${dateLabel(iso)}${closed?' · fermé selon l’annuaire':''}</span></label>`; }
    content = `<h3 tabindex="-1">Choisir un jour</h3><p>Jours selon l’annuaire, à confirmer. Ceci est une simulation.</p><div class="choices days">${days}</div><button class="next" type="button" ${state.date?'':'disabled'}>Choisir une heure →</button>`;
  } else if (step === 2) {
    const now = new Date(); const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const times = ['10:00','14:00','16:00'];
    content = `<h3 tabindex="-1">Choisir une heure</h3><p>Exemples dans les horaires de l’annuaire, à confirmer&nbsp;: aucune disponibilité réelle n’est affichée.</p><div class="choices">${times.map(t => { const past = state.date===today && t <= `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`; return `<label class="choice ${past?'disabled':''}"><input type="radio" name="time" value="${t}" ${past?'disabled':''} ${state.time===t&&!past?'checked':''}> ${t.replace(':',' h ')}${past?' · heure passée':''}</label>`; }).join('')}</div><button class="next" type="button" ${state.time?'':'disabled'}>Vos coordonnées →</button>`;
  } else if (step === 3) {
    content = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer le ticket&nbsp;: ces informations restent sur cet appareil et ne sont pas envoyées.</p><form id="formulaire" novalidate><label class="field" for="prenom">Prénom</label><input id="prenom" name="prenom" type="text" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="erreur"><label class="field" for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" value="${escapeText(state.phone)}" aria-describedby="erreur"><p id="erreur" class="error" role="status"></p><button class="next" type="submit">Imprimer mon ticket →</button></form>`;
  } else {
    content = `<h3 tabindex="-1">Voici votre ticket</h3><div class="printed"><span>SIMULATION · RIEN N’EST ENVOYÉ</span><br><strong>Salon Floo Coiffure</strong><p>${escapeText(state.service)}<br>${escapeText(dateLabel(state.date))} · ${escapeText(state.time.replace(':',' h '))}<br>${escapeText(state.name)}</p></div><p>Ce ticket ne confirme aucun rendez-vous. Pour joindre le salon, appelez le <a href="tel:+33143484822">01 43 48 48 22</a>.</p><button type="button" class="restart">Recommencer</button>`;
  }
  area.innerHTML = content; area.classList.remove('enter'); void area.offsetWidth; area.classList.add('enter'); updateSummary();
  if(focus) area.querySelector('h3').focus({preventScroll:true});
}
area.addEventListener('change', event => {
  const {name,value} = event.target;
  if(name==='service') { state.service=value; state.date=''; state.time=''; furthest=0; }
  if(name==='date') { state.date=value; state.time=''; furthest=Math.min(furthest,1); }
  if(name==='time') { state.time=value; furthest=Math.min(furthest,2); }
  const next=area.querySelector('.next'); if(next) next.disabled=false; updateSummary();
});
area.addEventListener('click', event => {
  if(event.target.matches('.next') && step < 3) { step++; furthest=Math.max(furthest,step); render(); }
  if(event.target.matches('.restart')) { Object.assign(state,{service:'',date:'',time:'',name:'',phone:''}); step=0; furthest=0; render(); }
});
area.addEventListener('submit', event => {
  event.preventDefault(); const name=area.querySelector('#prenom').value.trim(); const phone=area.querySelector('#telephone').value.trim();
  const digits=phone.replace(/[\s.()-]/g,'');
  if(!name || !/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits)) { area.querySelector('#erreur').textContent='Indiquez un prénom et un numéro de téléphone français valide.'; return; }
  const chosen = new Date(`${state.date}T${state.time}:00`);
  if (chosen <= new Date()) { state.time=''; step=2; furthest=2; render(); const note=document.createElement('p'); note.className='error'; note.setAttribute('role','status'); note.textContent='Cette heure est passée. Choisissez une autre heure ou un autre jour.'; area.querySelector('h3').after(note); return; }
  state.name=name; state.phone=phone; step=4; render();
});
progress.forEach(button => button.addEventListener('click', () => { step=Number(button.dataset.go); render(); }));
document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => { state.service=link.dataset.service; state.date=''; state.time=''; step=0; furthest=0; render(false); }));
render(false);
