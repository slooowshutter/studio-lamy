(() => {
  'use strict';
  document.documentElement.classList.add('js');
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; });
  document.addEventListener('pointerdown', () => { keyboard = false; });
  const panels = [...document.querySelectorAll('.panel')];
  function openPanel(panel) {
    panels.forEach(item => {
      const open = item === panel;
      item.classList.toggle('is-open', open);
      item.querySelector('.panel-trigger').setAttribute('aria-expanded', String(open));
      item.querySelector('.panel-body').inert = !open;
    });
  }
  panels.forEach(panel => { panel.querySelector('.panel-body').inert = !panel.classList.contains('is-open'); panel.querySelector('.panel-trigger').addEventListener('click', () => openPanel(panel)); });
  document.querySelectorAll('[data-open]').forEach(link => link.addEventListener('click', () => openPanel(document.getElementById(link.dataset.open))));
  document.querySelectorAll('a[href="#sources"]').forEach(link => link.addEventListener('click', () => openPanel(document.getElementById('sources'))));
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), {threshold:.05});
    panels.slice(1).forEach(panel => { panel.classList.add('reveal'); observer.observe(panel); });
  }
  const stage = document.getElementById('booking-stage');
  const summary = document.getElementById('selection');
  const indicators = [...document.querySelectorAll('[data-indicator]')];
  const modifications = document.getElementById('modifications');
  const state = {step:0, service:'', day:null, time:'', name:'', phone:''};
  const services = ['Coloration végétale','Coupe femme','Coupe homme','Brushing'];
  const format = new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long', timeZone:'UTC'});
  const paris = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part = type => Number(paris.find(p => p.type === type).value);
  const today = new Date(Date.UTC(part('year'),part('month')-1,part('day'),12));
  const days = Array.from({length:14},(_,i)=>new Date(today.getTime()+(i+1)*86400000));
  const dayText = date => format.format(date);
  function render(focus = true) {
    indicators.forEach((el,i)=>el.classList.toggle('active',i===state.step));
    summary.textContent = [state.service,state.day && dayText(state.day),state.time].filter(Boolean).join(' · ') || 'À compléter';
    modifications.innerHTML = (state.service ? '<button type="button" data-modify="0">Modifier la prestation</button>' : '') + (state.day ? '<button type="button" data-modify="1">Modifier le jour</button>' : '') + (state.time ? '<button type="button" data-modify="2">Modifier l’heure</button>' : '');
    let html = '';
    if(state.step===0) html = '<h3 tabindex="-1">Choisir une prestation</h3><p>Choix présenté à titre de simulation. Tarifs auprès du salon.</p><div class="choices">'+services.map((s,i)=>`<button class="choice" type="button" data-service="${i}">${s}</button>`).join('')+'</div>';
    if(state.step===1) html = '<h3 tabindex="-1">Choisir un jour</h3><p>Dates proposées pour la simulation. Horaires et jours fériés à confirmer.</p><div class="choices">'+days.map((d,i)=>`<button class="choice" type="button" data-day="${i}" ${[0,3].includes(d.getUTCDay())?'disabled':''}>${dayText(d)}${[0,3].includes(d.getUTCDay())?' · fermé':''}</button>`).join('')+'</div><div class="booking-actions"><button class="button button-outline" data-back="0">Retour</button></div>';
    if(state.step===2) html = '<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs, sans disponibilité vérifiée.</p><div class="choices"><button class="choice" data-time="10 h">10 h</button><button class="choice" data-time="11 h">11 h</button></div><div class="booking-actions"><button class="button button-outline" data-back="1">Retour</button></div>';
    if(state.step===3) html = `<h3 tabindex="-1">Vos coordonnées</h3><p>${state.service}<br>${dayText(state.day)} à ${state.time}</p><p>Simulation uniquement : ces données restent sur cet appareil.</p><form class="booking-form" novalidate><label>Prénom<input name="prenom" autocomplete="given-name" aria-describedby="erreur-prenom"></label><span class="form-error" id="erreur-prenom"></span><label>Téléphone<input name="telephone" type="tel" autocomplete="tel" inputmode="tel" aria-describedby="erreur-telephone"></label><span class="form-error" id="erreur-telephone"></span><div class="booking-actions"><button type="button" class="button button-outline" data-back="2">Retour</button><button class="button button-light" type="submit">Terminer la simulation →</button></div></form>`;
    if(state.step===4) html = '<h3 tabindex="-1">Simulation terminée.</h3><p>Rien n’a été envoyé et aucun rendez-vous n’a été pris. Pour réserver, utilisez Fresha ou appelez le salon.</p><div class="booking-actions"><a class="button button-light" href="https://www.fresha.com/fr/a/loft-hair-reims-9-rue-ceres-apd5rk1o">Réserver sur Fresha ↗</a><button class="button button-outline" data-back="0">Recommencer</button></div>';
    stage.innerHTML=html;
    stage.classList.remove('enter'); if (!keyboard) { void stage.offsetWidth; stage.classList.add('enter'); }
    if(focus) stage.querySelector('h3').focus({preventScroll:true});
  }
  stage.addEventListener('click', e => {
    const b=e.target.closest('button'); if(!b)return;
    if(b.dataset.service!==undefined){state.service=services[+b.dataset.service];state.day=null;state.time='';state.step=1;}
    else if(b.dataset.day!==undefined){state.day=days[+b.dataset.day];state.time='';state.step=2;}
    else if(b.dataset.time){state.time=b.dataset.time;state.step=3;}
    else if(b.dataset.back!==undefined){state.step=+b.dataset.back;if(state.step===0){state.service='';state.day=null;state.time='';}}
    render();
  });
  modifications.addEventListener('click', e => { const b=e.target.closest('[data-modify]'); if(b){state.step=Number(b.dataset.modify);render();} });
  stage.addEventListener('submit', e => {
    e.preventDefault();
    const form=e.target; const name=form.elements.prenom; const phone=form.elements.telephone;
    const validName=name.value.trim().length >= 2; const digits=phone.value.replace(/[^0-9+]/g,'');
    const validPhone=/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits);
    document.getElementById('erreur-prenom').textContent=validName?'':'Indiquez votre prénom.';
    document.getElementById('erreur-telephone').textContent=validPhone?'':'Indiquez un numéro de téléphone français valide.';
    name.setAttribute('aria-invalid',String(!validName)); phone.setAttribute('aria-invalid',String(!validPhone));
    if(!validName || !validPhone){(validName?phone:name).focus();return;}
    state.name=name.value.trim(); state.phone=phone.value.trim(); state.step=4; render();
  });
  render(false);
})();
