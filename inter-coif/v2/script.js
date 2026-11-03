(() => {
  const panels = [...document.querySelectorAll('.panel')];
  function openPanel(panel, scroll = false) {
    if (!panel) return;
    const wasOpen = panel.classList.contains('is-open');
    panels.forEach(item => {
      const open = item === panel;
      item.classList.toggle('is-open', open);
      item.querySelector('.panel-trigger').setAttribute('aria-expanded', String(open));
      item.querySelector('.panel-body').hidden = !open;
    });
    if (!wasOpen && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const inner = panel.querySelector('.panel-inner');
      inner.classList.add('panel-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => inner.classList.remove('panel-entering')));
    }
    if (scroll) panel.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  panels.forEach(panel => panel.querySelector('.panel-trigger').addEventListener('click', () => openPanel(panel)));
  document.querySelectorAll('[data-open]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); openPanel(document.getElementById(link.dataset.open), true); }));
  const content = document.getElementById('booking-content');
  const summary = document.getElementById('summary');
  const count = document.getElementById('booking-count');
  const state = { step: 0, service: '', day: '', time: '', name: '', phone: '' };
  const services = ['Cheveux bouclés ou frisés', 'Coupe et brushing femme', 'Coupe homme classique'];
  const escapeText = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateLabel = date => new Intl.DateTimeFormat('fr-FR', { weekday:'short', day:'numeric', month:'short' }).format(date);
  function days() {
    const now = new Date();
    return Array.from({length:14}, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i); return d; });
  }
  function key(d) { return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-'); }
  function render(focus = false) {
    count.textContent = state.step < 4 ? `0${state.step+1} / 04` : 'TERMINÉ';
    summary.innerHTML = state.service ? `<button type="button" data-goto="0">${escapeText(state.service)}</button>${state.day ? ` <span aria-hidden="true">·</span> <button type="button" data-goto="1">${dateLabel(new Date(state.day+'T12:00:00'))}</button>` : ''}${state.time ? ` <span aria-hidden="true">·</span> <button type="button" data-goto="2">${state.time.replace(':',' h ')}</button>` : ''}` : 'Choisissez une prestation pour commencer.';
    let html = '';
    if (state.step === 0) {
      html = `<h3 tabindex="-1">Quelle prestation&nbsp;?</h3><div class="options">${services.map(s => `<label class="option"><input type="radio" name="prestation" value="${s}" ${state.service===s?'checked':''}><span>${s}</span></label>`).join('')}</div><div class="booking-actions"><button type="button" data-next ${state.service?'':'disabled'}>Continuer →</button></div>`;
    } else if (state.step === 1) {
      html = `<h3 tabindex="-1">Quel jour&nbsp;?</h3><p class="booking-note">Dates fictives proposées du mardi au samedi. Le lundi reste à confirmer.</p><div class="dates">${days().map(d => { const k=key(d), closed=[0,1].includes(d.getDay()); return `<button class="choice" type="button" data-day="${k}" aria-pressed="${state.day===k}" ${closed?'disabled':''}>${dateLabel(d)}${closed?(d.getDay()===0?'<br>Fermé':'<br>À confirmer'):''}</button>`; }).join('')}</div><div class="booking-actions"><button class="back" type="button" data-back>← Retour</button><button type="button" data-next ${state.day?'':'disabled'}>Continuer →</button></div>`;
    } else if (state.step === 2) {
      const d = new Date(state.day+'T12:00:00'); const now = new Date();
      const times = ['10:00','11:00','14:00','15:00'];
      html = `<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p class="booking-note">Créneaux fictifs, sans lien avec les disponibilités du salon.</p><div class="times">${times.map((t,i) => { const date=new Date(d); date.setHours(...t.split(':').map(Number)); const unavailable=date <= now || ((d.getDate()+i)%5===0); return `<button class="choice" type="button" data-time="${t}" aria-pressed="${state.time===t}" ${unavailable?'disabled':''}>${t.replace(':',' h ')}${unavailable?'<br>Indisponible':''}</button>`; }).join('')}</div><div class="booking-actions"><button class="back" type="button" data-back>← Retour</button><button type="button" data-next ${state.time?'':'disabled'}>Continuer →</button></div>`;
    } else if (state.step === 3) {
      html = `<h3 tabindex="-1">Vos coordonnées</h3><p class="booking-note">Ces informations restent dans cet aperçu et ne sont pas envoyées.</p><form id="booking-form" novalidate><label class="field">Prénom<input name="prenom" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="erreur-prenom" required></label><p class="error" id="erreur-prenom" role="status"></p><label class="field">Téléphone<input name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="erreur-telephone" required></label><p class="error" id="erreur-telephone" role="status"></p><div class="booking-actions"><button class="back" type="button" data-back>← Retour</button><button type="submit">Terminer la simulation →</button></div></form>`;
    } else {
      html = `<h3 tabindex="-1">Simulation terminée.</h3><p>${escapeText(state.name)}, votre choix est prêt&nbsp;: ${escapeText(state.service)}, ${dateLabel(new Date(state.day+'T12:00:00'))} à ${state.time.replace(':',' h ')}.</p><p>Aucun rendez-vous n’a été pris et aucune information n’a été envoyée.</p><a class="book-next" href="https://www.planity.com/inter-coif-86000-poitiers">Réserver sur Planity ↗</a><div class="booking-actions"><button class="back" type="button" data-reset>Recommencer</button></div>`;
    }
    content.innerHTML = `<div class="step-enter">${html}</div>`;
    if (focus) content.querySelector('h3').focus({preventScroll:true});
  }
  summary.addEventListener('click', e => { const button=e.target.closest('[data-goto]'); if(button){state.step=Number(button.dataset.goto);render(true);} });
  content.addEventListener('change', e => { if(e.target.name === 'prestation'){ state.service=e.target.value; render(); content.querySelector('input:checked').focus(); } });
  content.addEventListener('click', e => {
    const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.day){state.day=b.dataset.day;state.time='';render();content.querySelector('[data-day="'+state.day+'"]').focus();}
    else if(b.dataset.time){state.time=b.dataset.time;render();content.querySelector('[data-time="'+state.time+'"]').focus();}
    else if(b.hasAttribute('data-next')){state.step++;render(true);}
    else if(b.hasAttribute('data-back')){state.step--;render(true);}
    else if(b.hasAttribute('data-reset')){Object.assign(state,{step:0,service:'',day:'',time:'',name:'',phone:''});render(true);}
  });
  content.addEventListener('submit', e => {
    e.preventDefault(); const form=e.target; const name=form.elements.prenom.value.trim(); const phone=form.elements.telephone.value.trim(); const digits=phone.replace(/[\s.()-]/g,'');
    const validPhone=/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits);
    form.elements.prenom.setAttribute('aria-invalid',String(!name)); form.elements.telephone.setAttribute('aria-invalid',String(!validPhone));
    document.getElementById('erreur-prenom').textContent=name?'':'Indiquez votre prénom.';
    document.getElementById('erreur-telephone').textContent=validPhone?'':'Indiquez un numéro de téléphone français valide.';
    if(!name || !validPhone){(name?form.elements.telephone:form.elements.prenom).focus();return;}
    state.name=name;state.phone=phone;state.step=4;render(true);
  });
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {state.service=button.dataset.service;state.step=0;render();openPanel(document.getElementById('rendez-vous'),true);}));
  render();
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);} }), {threshold:.1});
    document.querySelectorAll('.panel:not(:first-child) .panel-trigger').forEach(el => {el.classList.add('reveal-ready');observer.observe(el);});
  }
})();
