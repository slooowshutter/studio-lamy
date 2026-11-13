(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = {
    coupe: {
      short: 'Coupe & brushing', family: 'Coupe femme',
      name: 'Coupe, shampooing, soin et brushing',
      detail: 'La carte publiée distingue les longueurs de cheveux et la coupe transformation.',
      duration: '30 min à 1 h selon la prestation', minutes: 60
    },
    brushing: {
      short: 'Soin & brushing', family: 'Coiffage femme',
      name: 'Shampooing, soin et brushing',
      detail: 'Un shampooing, un soin et un brushing, avec une durée qui varie selon la longueur des cheveux.',
      duration: '30 à 45 min selon la longueur', minutes: 45
    },
    homme: {
      short: 'Coupe homme', family: 'Coupe homme',
      name: 'Shampooing, coupe, coiffage et après-shampooing',
      detail: 'La prestation homme publiée sur Treatwell réunit le shampooing, la coupe, le coiffage et l’après-shampooing.',
      duration: '30 min', minutes: 30
    },
    blond: {
      short: 'Blond polaire', family: 'Couleur',
      name: 'Blond polaire, patine et Olaplex',
      detail: 'La prestation publiée comprend aussi le shampooing, le soin et le brushing. La durée dépend de la longueur des cheveux.',
      duration: '3 h 15 à 4 h 45 selon la longueur', minutes: 285
    }
  };
  // Minutes depuis minuit, d’après les horaires Treatwell repris dans la recherche.
  const hours = { 0: null, 1: null, 2: [540,1140], 3: [540,780], 4: [600,1200], 5: [540,1140], 6: [540,1140] };
  const state = { service: '', day: '', time: null, step: 0, name: '', phone: '', complete: false };
  let viewedService = 'coupe';
  let keyboardAction = false;
  let transitionTimer;
  let renderBusy = false;
  let renderGeneration = 0;
  const $ = selector => document.querySelector(selector);
  const screen = $('#ecran-etape');
  const app = $('#parcours');
  const next = $('#suite-etape');
  const back = $('#retour-etape');
  const error = $('#erreur-parcours');
  const announcer = $('#annonce-parcours');
  const escapeText = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const timeLabel = minutes => `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2,'0')}` : ''}`;
  const minuteDuration = minutes => minutes < 60 ? `${minutes}\u00a0min` : `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2,'0')}` : ''}`;
  const dayDate = key => new Date(`${key}T12:00:00Z`);
  const dayLabel = key => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(dayDate(key));
  const dateKey = date => date.toISOString().slice(0,10);
  function parisNow() {
    const parts = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type,part.value]));
    return { key:`${values.year}-${values.month}-${values.day}`, minutes:Number(values.hour)*60+Number(values.minute) };
  }
  function nextDays() {
    const today = dayDate(parisNow().key);
    return Array.from({length:14},(_,index) => {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate()+index);
      return dateKey(date);
    });
  }
  function slotsFor(key,serviceKey) {
    const range = hours[dayDate(key).getUTCDay()];
    if (!range || !services[serviceKey]) return [];
    const now = parisNow();
    const seed = Math.floor(dayDate(key).getTime()/86400000);
    const slots = [];
    for (let minute=range[0],index=0;minute+services[serviceKey].minutes<=range[1];minute+=30,index++) {
      const past = key < now.key || (key === now.key && minute <= now.minutes);
      const unavailable = (seed+index*7)%9 === 0;
      slots.push({minute,disabled:past||unavailable,reason:past?'Passé':unavailable?'Exemple indisponible':''});
    }
    return slots;
  }
  function saveFields() {
    if ($('#prenom')) state.name = $('#prenom').value;
    if ($('#telephone')) state.phone = $('#telephone').value;
  }
  function updateSummary() {
    $('#resume-prestation').textContent = state.service ? services[state.service].name : 'À choisir';
    $('#resume-jour').textContent = state.day ? dayLabel(state.day) : 'À choisir';
    $('#resume-heure').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    document.querySelectorAll('[data-step]').forEach(button => {
      const step = Number(button.dataset.step);
      const allowed = step===0 || (step===1 && state.service) || (step===2 && state.day) || (step===3 && state.time!==null);
      button.disabled = !allowed || state.complete || renderBusy;
      if (step===state.step && !state.complete) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    });
  }
  function serviceScreen() {
    return `<h3 tabindex="-1" id="titre-etape">Quelle envie aujourd’hui\u00a0?</h3>
      <p class="step-description">Prestations et durées publiées sur Treatwell. Pour les tarifs, appelez le salon. Cet essai ne réserve rien.</p>
      <fieldset class="choices"><legend>Choisissez une prestation</legend>${Object.entries(services).map(([key,service]) => `<label class="radio-card"><input type="radio" name="prestation" value="${key}" ${state.service===key?'checked':''}><span>${escapeText(service.short)}<small>${escapeText(service.duration)}</small></span></label>`).join('')}</fieldset>`;
  }
  function dayScreen() {
    const weekdays = new Intl.DateTimeFormat('fr-FR',{weekday:'short',timeZone:'UTC'});
    const month = new Intl.DateTimeFormat('fr-FR',{month:'short',timeZone:'UTC'});
    return `<h3 tabindex="-1" id="titre-etape">Quel jour vous irait\u00a0?</h3><p class="step-description">Dates d’essai dans les horaires publiés. Les jours fermés restent visibles. Un jour «\u00a0Sans essai\u00a0» ne propose aucun créneau adapté à cette durée.</p><fieldset class="choices"><legend>Les prochains jours · simulation</legend><div class="days">${nextDays().map(key => {
      const date = dayDate(key);
      const closed = !hours[date.getUTCDay()];
      const possible = !closed && slotsFor(key,state.service).some(slot => !slot.disabled);
      const reason = closed ? 'Fermé' : !possible ? 'Sans essai' : month.format(date);
      return `<label class="day-choice"><input type="radio" name="jour" value="${key}" aria-label="${escapeText(dayLabel(key))}${!possible?`, ${reason}`:''}" ${!possible?'disabled':''} ${state.day===key?'checked':''}><span><span>${weekdays.format(date)}</span><b>${date.getUTCDate()}</b><small>${reason}</small></span></label>`;
    }).join('')}</div></fieldset>`;
  }
  function timeScreen() {
    const slots = slotsFor(state.day,state.service);
    const range = hours[dayDate(state.day).getUTCDay()];
    const duration = services[state.service].minutes;
    return `<h3 tabindex="-1" id="titre-etape">À quelle heure\u00a0?</h3><p class="step-description">${escapeText(dayLabel(state.day))} · ${timeLabel(range[0])} – ${timeLabel(range[1])}. Créneaux fictifs\u00a0: «\u00a0indisponible\u00a0» est aussi un exemple, sans lien avec l’agenda du salon.</p><p class="step-description">Calcul prudent sur ${minuteDuration(duration)}${['coupe','brushing','blond'].includes(state.service)?', la durée maximale publiée pour cette sélection':''}, pour finir avant la fermeture.</p><fieldset class="choices"><legend>Choisissez une heure d’essai</legend><div class="slots">${slots.map(slot => `<label class="slot-choice"><input type="radio" name="heure" value="${slot.minute}" aria-label="${timeLabel(slot.minute)}${slot.reason?`, ${slot.reason}`:''}" ${slot.disabled?'disabled':''} ${state.time===slot.minute?'checked':''}><span><time datetime="${String(Math.floor(slot.minute/60)).padStart(2,'0')}:${String(slot.minute%60).padStart(2,'0')}">${timeLabel(slot.minute)}</time>${slot.disabled?`<small>${slot.reason==='Passé'?'Passé':'Indisponible'}</small>`:''}</span></label>`).join('')}</div></fieldset>`;
  }
  function contactScreen() {
    return `<h3 tabindex="-1" id="titre-etape">Le dernier petit détail.</h3><p class="step-description">Les champs servent uniquement à tester le parcours. Leur contenu reste dans cette page, sans envoi ni conservation.</p>
      <form id="coordonnees" novalidate><div class="contact-fields"><div><label for="prenom">Prénom</label><input id="prenom" name="prenom" type="text" autocomplete="given-name" maxlength="80" value="${escapeText(state.name)}" aria-describedby="erreur-prenom" required><p id="erreur-prenom" class="field-error"></p></div><div><label for="telephone">Téléphone portable</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" maxlength="25" value="${escapeText(state.phone)}" aria-describedby="aide-telephone erreur-telephone" required><p id="aide-telephone" class="field-hint">Numéro français commençant par 06, 07, +33 6 ou +33 7.</p><p id="erreur-telephone" class="field-error"></p></div></div><div class="confirm-recap"><strong>Récapitulatif de l’essai</strong><p>${escapeText(services[state.service].name)}<br>${escapeText(dayLabel(state.day))} à ${timeLabel(state.time)}<br>Atelier An'angelo · 1 rue Edmond Gondinet, Paris</p></div></form>`;
  }
  function successScreen() {
    return `<h3 tabindex="-1" id="titre-etape">Essai terminé.<br>Rien n’est réservé.</h3><p class="success-note">Aucun message n’a été envoyé à Ariane. Aucune donnée n’a été conservée.</p><div class="confirm-recap"><strong>Votre sélection d’essai</strong><p>${escapeText(services[state.service].name)}<br>${escapeText(dayLabel(state.day))} à ${timeLabel(state.time)}</p></div><p class="success-note">Pour un vrai rendez-vous, contactez le salon ou consultez Treatwell.</p><div class="success-links"><a class="button button-apricot" href="https://www.treatwell.fr/salon/atelier-an-angelo/" target="_blank" rel="noopener">Ouvrir Treatwell ↗</a><a class="text-link" href="tel:+33669336113">06 69 33 61 13 ↗</a><button type="button" class="text-button" id="recommencer">Recommencer l’essai →</button></div>`;
  }
  function render(focus=false) {
    clearTimeout(transitionTimer);
    const generation = ++renderGeneration;
    const animate = focus && !reducedMotion.matches && !keyboardAction;
    renderBusy = animate;
    next.disabled = animate;
    back.disabled = animate;
    screen.inert = animate;
    screen.setAttribute('aria-busy',String(animate));
    updateSummary();
    const apply = () => {
      if (generation!==renderGeneration) return;
      screen.innerHTML = state.complete ? successScreen() : [serviceScreen,dayScreen,timeScreen,contactScreen][state.step]();
      renderBusy = false;
      next.disabled = false;
      back.disabled = false;
      screen.inert = false;
      screen.setAttribute('aria-busy','false');
      screen.classList.remove('changing');
      back.hidden = state.step===0;
      $('#actions-parcours').hidden = state.complete;
      next.innerHTML = state.step===3 ? 'Terminer l’essai <span aria-hidden="true">→</span>' : 'Continuer <span aria-hidden="true">→</span>';
      error.textContent = '';
      updateSummary();
      if (focus) {
        $('#titre-etape').focus({preventScroll:true});
        screen.scrollIntoView({block:'nearest',behavior:'instant'});
        announcer.textContent = state.complete ? 'Essai terminé. Rien n’est réservé et aucune donnée n’a été envoyée.' : `Étape ${state.step+1} sur 4. ${$('#titre-etape').textContent}`;
      }
    };
    if (animate) {
      screen.classList.add('changing');
      transitionTimer = setTimeout(apply,90);
    } else apply();
  }
  function goToStep(step) {
    if (renderBusy || state.complete) return;
    saveFields();
    state.step = step;
    render(true);
  }
  function showError(message) {
    error.textContent = message;
    screen.querySelector('input:not(:disabled)')?.focus({preventScroll:true});
  }
  function validateContact() {
    saveFields();
    const nameValid = /\p{L}/u.test(state.name.trim()) && !/[<>]/.test(state.name);
    const normalizedPhone = state.phone.replace(/[\s.()\-]/g,'');
    const phoneValid = /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(normalizedPhone);
    $('#erreur-prenom').textContent = nameValid ? '' : 'Indiquez un prénom pour essayer la dernière étape.';
    $('#erreur-telephone').textContent = phoneValid ? '' : 'Vérifiez le numéro\u00a0: 10 chiffres commençant par 06 ou 07, ou son format +33.';
    $('#prenom').setAttribute('aria-invalid',String(!nameValid));
    $('#telephone').setAttribute('aria-invalid',String(!phoneValid));
    if (!nameValid || !phoneValid) {
      (!nameValid?$('#prenom'):$('#telephone')).focus();
      announcer.textContent = 'Vérifiez les champs signalés avant de terminer l’essai.';
      return false;
    }
    return true;
  }
  function advance() {
    if (state.complete || renderBusy) return;
    if (state.step===0 && !state.service) return showError('Choisissez une prestation pour poursuivre l’essai.');
    if (state.step===1 && !state.day) return showError('Choisissez un jour ouvert pour poursuivre l’essai.');
    if (state.step===2 && state.time===null) return showError('Choisissez une heure pour poursuivre l’essai.');
    if (state.step>=2 && !slotsFor(state.day,state.service).some(slot => slot.minute===state.time && !slot.disabled) && state.time!==null) {
      state.time = null;
      state.step = 2;
      render();
      $('#titre-etape').focus({preventScroll:true});
      error.textContent = 'Cette heure est passée. Choisissez une autre heure d’essai.';
      announcer.textContent = error.textContent;
      return;
    }
    if (state.step===3) {
      if (!validateContact()) return;
      state.name = '';
      state.phone = '';
      state.complete = true;
      render(true);
    } else goToStep(state.step+1);
  }
  next.addEventListener('click',advance);
  back.addEventListener('click',() => goToStep(Math.max(0,state.step-1)));
  document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click',() => goToStep(Number(button.dataset.step))));
  app.addEventListener('submit',event => { event.preventDefault(); advance(); });
  app.addEventListener('change',event => {
    if (renderBusy) return;
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    error.textContent = '';
    if (input.name==='prestation') {
      if (input.value!==state.service) { state.service=input.value;state.day='';state.time=null; }
    } else if (input.name==='jour') {
      if (input.value!==state.day) { state.day=input.value;state.time=null; }
    } else if (input.name==='heure') state.time=Number(input.value);
    updateSummary();
  });
  app.addEventListener('input',event => {
    const input = event.target;
    if (input.id==='prenom' || input.id==='telephone') {
      input.removeAttribute('aria-invalid');
      $(`#erreur-${input.id}`).textContent = '';
    }
  });
  app.addEventListener('click',event => {
    if (!event.target.closest('#recommencer')) return;
    Object.assign(state,{service:'',day:'',time:null,step:0,name:'',phone:'',complete:false});
    render(true);
  });

  function chooseService(key) {
    viewedService = key;
    document.querySelectorAll('[data-service]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.service===key)));
    $('#detail-famille').textContent = services[key].family;
    $('#detail-nom').textContent = services[key].name;
    $('#detail-texte').textContent = services[key].detail;
    $('#detail-duree').textContent = services[key].duration;
  }
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click',() => chooseService(button.dataset.service)));
  $('#essayer-prestation').addEventListener('click',() => {
    saveFields();
    state.service=viewedService;
    state.day='';state.time=null;state.step=0;state.complete=false;
    render();
    setTimeout(() => $('#titre-etape').focus({preventScroll:true}),0);
  });
  document.addEventListener('keydown',() => { keyboardAction=true;root.classList.add('keyboard-action'); },true);
  document.addEventListener('pointerdown',() => { keyboardAction=false;root.classList.remove('keyboard-action'); },true);

  app.hidden = false;
  render();
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    }),{threshold:.12});
    document.querySelectorAll('[data-reveal]').forEach((element,index) => {
      if (element.dataset.reveal==='chip') element.style.transitionDelay=`${(index-1)%4*60}ms`;
      observer.observe(element);
    });
  } else document.querySelectorAll('[data-reveal]').forEach(element => element.classList.add('revealed'));

  // Le fond seul accompagne légèrement le défilement ; aucune mesure après écriture.
  const blobs = [...document.querySelectorAll('[data-blob]')];
  let scrollQueued = false;
  function positionBlobs() {
    scrollQueued = false;
    if (reducedMotion.matches || keyboardAction) { blobs.forEach(blob => blob.style.removeProperty('transform')); return; }
    const positions = blobs.map(blob => blob.parentElement.getBoundingClientRect());
    positions.forEach((rect,index) => {
      const progress = Math.max(-1,Math.min(1,(window.innerHeight/2-rect.top-rect.height/2)/window.innerHeight));
      const baseRotation = index===0 ? -7 : 0;
      blobs[index].style.transform = `rotate(${baseRotation+progress*3}deg) scale(${1+Math.abs(progress)*.015},${1-Math.abs(progress)*.012})`;
    });
  }
  function queueScroll() { if (!scrollQueued) { scrollQueued=true;requestAnimationFrame(positionBlobs); } }
  window.addEventListener('scroll',queueScroll,{passive:true});
  window.addEventListener('resize',queueScroll,{passive:true});
  reducedMotion.addEventListener('change',() => { positionBlobs();if (renderBusy) render(true); });
  positionBlobs();

  const mobileBar = $('.mobile-bar');
  let bookingVisible = false;
  let footerVisible = false;
  function updateMobileBar() {
    mobileBar.hidden = bookingVisible || footerVisible || app.contains(document.activeElement);
  }
  if ('IntersectionObserver' in window) {
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id==='rendez-vous') bookingVisible=entry.isIntersecting;
        if (entry.target.id==='pied-page') footerVisible=entry.isIntersecting;
      });
      updateMobileBar();
    });
    barObserver.observe($('#rendez-vous'));
    barObserver.observe($('#pied-page'));
  }
  document.addEventListener('focusin',updateMobileBar);
  document.addEventListener('focusout',() => requestAnimationFrame(updateMobileBar));
})();
