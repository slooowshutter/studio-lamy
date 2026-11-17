(() => {
  const root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(() => root.classList.add('ready'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const number = document.querySelector('[data-count]');
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      if (entry.target.contains(number) && !reduced.matches) {
        const start = performance.now();
        const tick = now => {
          const t = Math.min((now - start) / 650, 1);
          number.textContent = String(Math.round(3 * (1 - Math.pow(1 - t, 3)))).padStart(2, '0');
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
      observer.unobserve(entry.target);
    }), {threshold: .12});
    reveals.forEach(item => observer.observe(item));
  } else reveals.forEach(item => item.classList.add('visible'));

  const steps = [...document.querySelectorAll('.step')];
  const progress = document.getElementById('progression');
  const summary = document.getElementById('resume');
  const days = document.getElementById('jours');
  const slots = document.getElementById('heures');
  let chosenDay = null, chosenTime = '';
  const formatter = new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'});
  const dateKey = d => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  const selectedService = () => document.querySelector('input[name="prestation"]:checked')?.value || '';
  function updateSummary() {
    summary.textContent = [selectedService(), chosenDay && formatter.format(chosenDay), chosenTime && chosenTime.replace(':',' h ')].filter(Boolean).join(' · ') || 'À compléter';
    document.querySelector('[data-edit="1"]').disabled = !selectedService() || !days.children.length;
  }
  function showStep(index) {
    steps.forEach((step, i) => { step.hidden = i !== index; });
    const step = steps[index];
    progress.textContent = index === 3 ? 'Terminé' : `0${index + 1} / 03`;
    step.classList.add('entering');
    requestAnimationFrame(() => requestAnimationFrame(() => step.classList.remove('entering')));
    step.querySelector('h3').focus();
    updateSummary();
  }
  function makeDays() {
    days.replaceChildren();
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i=0; i<14; i++) {
      const day = new Date(today); day.setDate(today.getDate()+i);
      const label = document.createElement('label');
      const input = document.createElement('input'); input.type='radio'; input.name='jour'; input.value=dateKey(day);
      const span = document.createElement('span');
      const sunday = day.getDay() === 0;
      input.disabled = sunday;
      span.textContent = new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric'}).format(day) + (sunday ? ' · à confirmer' : '');
      label.append(input,span); days.append(label);
      input.addEventListener('change', () => {chosenDay=day; chosenTime=''; makeSlots(day); updateSummary();});
    }
  }
  function makeSlots(day) {
    slots.replaceChildren();
    // Plages communes aux annuaires, en évitant la pause du vendredi.
    const times = day.getDay() === 5 ? ['09:00','10:00','11:00','15:00','16:00','17:00','18:00'] : ['09:00','10:00','11:00','12:00','15:00','16:00','17:00','18:00'];
    const now = new Date();
    times.forEach((time,index) => {
      const label=document.createElement('label'), input=document.createElement('input'), span=document.createElement('span');
      input.type='radio'; input.name='heure'; input.value=time;
      const at = new Date(day); const [h,m]=time.split(':').map(Number); at.setHours(h,m,0,0);
      const unavailable = at <= now || (day.getDate()+index)%5===0;
      input.disabled=unavailable;
      span.textContent=time.replace(':',' h ') + (unavailable ? ' · indisponible' : '');
      label.append(input,span); slots.append(label);
      input.addEventListener('change',()=>{chosenTime=time;updateSummary();});
    });
  }
  document.querySelectorAll('input[name="prestation"]').forEach(input => input.addEventListener('change',updateSummary));
  document.querySelector('[data-next="0"]').addEventListener('click',()=>{
    const error=document.getElementById('erreur-prestation'); error.textContent=selectedService()?'':'Choisissez une activité pour continuer.';
    if(selectedService()) {makeDays(); chosenDay=null; chosenTime=''; slots.textContent='Choisissez d’abord un jour.';showStep(1);}
  });
  document.querySelector('[data-next="1"]').addEventListener('click',()=>{
    const error=document.getElementById('erreur-creneau'); error.textContent=chosenDay&&chosenTime?'':'Choisissez un jour et une heure pour continuer.';
    if(chosenDay&&chosenTime) showStep(2);
  });
  document.querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',()=>showStep(Number(button.dataset.edit))));
  document.querySelectorAll('[data-back]').forEach(button=>button.addEventListener('click',()=>showStep(Number(button.dataset.back))));
  document.getElementById('confirmer').addEventListener('click',()=>{
    const name=document.getElementById('prenom').value.trim();
    const phone=document.getElementById('telephone').value.replace(/[\s.()-]/g,'');
    const error=document.getElementById('erreur-coordonnees');
    if(!name || !/^(?:(?:\+33|0033)[1-9]|0[1-9])\d{8}$/.test(phone)) {error.textContent='Indiquez votre prénom et un numéro de téléphone français valide.';return;}
    error.textContent='';
    document.getElementById('confirmation').textContent=`${name}, votre choix fictif : ${selectedService()}, ${formatter.format(chosenDay)} à ${chosenTime.replace(':',' h ')}.`;
    showStep(3);
  });
  document.getElementById('recommencer').addEventListener('click',()=>{
    document.querySelectorAll('input').forEach(input=>{if(input.type==='radio') input.checked=false; else input.value='';}); chosenDay=null;chosenTime='';showStep(0);
  });
})();
