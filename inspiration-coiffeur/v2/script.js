(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const reveal = document.querySelectorAll('.reveal, .reveal-num');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), {threshold: 0.12});
    reveal.forEach(el => observer.observe(el));
  } else reveal.forEach(el => el.classList.add('visible'));
  let ticking = false;
  const progress = document.querySelector('.progression span');
  function updateProgress() {
    const distance = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleY(${distance > 0 ? Math.min(1, scrollY / distance) : 0})`;
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(updateProgress); ticking = true; } }, {passive:true});
  updateProgress();

  const stage = document.querySelector('#etape');
  const recap = document.querySelector('#recap');
  const nav = [...document.querySelectorAll('[data-go]')];
  const data = {service:false, date:null, time:null, name:'', phone:''};
  let current = 0;
  const dayFormat = new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'});
  const shortFormat = new Intl.DateTimeFormat('fr-FR', {weekday:'short', day:'numeric', month:'short'});
  function summary() {
    const parts = [];
    if (data.service) parts.push('Diagnostic · 15 minutes');
    if (data.date) parts.push(dayFormat.format(data.date));
    if (data.time) parts.push(data.time);
    recap.textContent = parts.length ? parts.join(' / ') : 'Votre choix apparaîtra ici.';
  }
  function slotAvailable(date, hour) {
    const slot = new Date(date); slot.setHours(hour, 0, 0, 0);
    return slot > new Date() && (hour + date.getDate()) % 4 !== 0;
  }
  function availableStep(n) { return n === 0 || (n === 1 && data.service) || (n === 2 && data.date) || (n === 3 && data.time); }
  function render(n, focus = true) {
    current = n;
    nav.forEach((button, i) => {button.disabled = !availableStep(i); if (i === n) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');});
    summary();
    let html = '<div class="etape-contenu"><h3 class="step-title" tabindex="-1">';
    if (n === 0) html += 'Choisir une prestation</h3><p>Le diagnostic est demandé avant toute prestation de mèches.</p><label class="choix"><input type="radio" name="prestation" value="diagnostic" ' + (data.service ? 'checked' : '') + '>Diagnostic avant mèches <small>15 minutes · simulation</small></label><div class="actions"><button class="bouton" type="button" id="suite">Continuer</button></div><p class="erreur" id="erreur" role="status"></p>';
    if (n === 1) {
      html += 'Choisir un jour</h3><p>Jours proposés à titre d’exemple, selon les horaires publiés sur Planity et à confirmer.</p><div class="jours">';
      const today = new Date(); today.setHours(0,0,0,0);
      for (let i=0;i<14;i++) { const d = new Date(today); d.setDate(today.getDate()+i); const closed = d.getDay() === 0; const noSlots = !Array.from({length:9}, (_, k) => k + 9).some(hour => slotAvailable(d, hour)); const disabled = closed || noSlots; html += `<button type="button" data-day="${i}" ${disabled ? 'disabled' : ''}>${shortFormat.format(d)}${closed ? '<small>fermé</small>' : noSlots ? '<small>aucun créneau fictif restant</small>' : ''}</button>`; }
      html += '</div><div class="actions"><button class="bouton secondaire" type="button" id="retour">Retour</button></div>';
    }
    if (n === 2) {
      html += 'Choisir une heure</h3><p>Créneaux et indisponibilités fictifs, sans lien avec les disponibilités réelles.</p><div class="creneaux">';
      const end = data.date.getDay() === 6 ? 18*60 : 18*60+30;
      for (let minutes=9*60; minutes+15<=end; minutes+=60) { const hour = Math.floor(minutes/60), minute = minutes%60; const t = `${String(hour).padStart(2,'0')} h ${String(minute).padStart(2,'0')}`; const disabled = !slotAvailable(data.date, hour); html += `<button type="button" data-time="${t}" ${disabled ? 'disabled' : ''}>${t}${disabled ? ' · indisponible' : ''}</button>`; }
      html += '</div><div class="actions"><button class="bouton secondaire" type="button" id="retour">Retour</button></div>';
    }
    if (n === 3) html += 'Vos coordonnées</h3><p>Ces renseignements restent dans votre navigateur et ne sont pas envoyés.</p><form id="formulaire" novalidate><label class="champ" for="prenom">Prénom<input id="prenom" name="prenom" autocomplete="given-name" required aria-describedby="erreur-prenom"></label><p class="erreur" id="erreur-prenom"></p><label class="champ" for="telephone">Téléphone<input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="erreur-telephone"></label><p class="erreur" id="erreur-telephone"></p><div class="actions"><button class="bouton secondaire" type="button" id="retour">Retour</button><button class="bouton" type="submit">Terminer la simulation</button></div></form>';
    if (n === 4) html += 'Simulation terminée</h3><p id="confirmation"></p><p>Rien n’a été envoyé et aucun rendez-vous n’a été pris. Pour réserver, contactez le salon ou utilisez sa fiche Planity.</p><div class="actions"><a class="bouton" href="https://www.planity.com/salon-inspiration-57000-metz" target="_blank" rel="noopener">Aller sur Planity ↗</a><button class="bouton secondaire" id="recommencer" type="button">Recommencer</button></div>';
    stage.innerHTML = html + '</div>';
    const content = stage.firstElementChild;
    if (!reduced.matches && focus) { content.classList.add('entrant'); requestAnimationFrame(() => requestAnimationFrame(() => content.classList.remove('entrant'))); }
    if (focus) stage.querySelector('h3').focus({preventScroll:true});
    if (n === 0) document.querySelector('#suite').addEventListener('click', () => { if (!stage.querySelector('input:checked')) {document.querySelector('#erreur').textContent = 'Choisissez le diagnostic pour continuer.'; return;} data.service = true; render(1); });
    if (n === 1) stage.querySelectorAll('[data-day]').forEach(button => button.addEventListener('click', () => { const date = new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate()+Number(button.dataset.day)); data.date = date; data.time = null; render(2); }));
    if (n === 2) stage.querySelectorAll('[data-time]').forEach(button => button.addEventListener('click', () => { data.time = button.dataset.time; render(3); }));
    const back = stage.querySelector('#retour'); if (back) back.addEventListener('click', () => render(n-1));
    if (n === 3) {
      const form = stage.querySelector('form'); form.prenom.value = data.name; form.telephone.value = data.phone;
      form.addEventListener('submit', event => { event.preventDefault(); const name = form.prenom.value.trim(); const phone = form.telephone.value.trim(); const digits = phone.replace(/[\s.()-]/g,''); const validName = name.length > 0; const validPhone = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits); document.querySelector('#erreur-prenom').textContent = validName ? '' : 'Indiquez votre prénom.'; document.querySelector('#erreur-telephone').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.'; if (!validName || !validPhone) { (validName ? form.telephone : form.prenom).focus(); return; } data.name = name; data.phone = phone; render(4); });
    }
    if (n === 4) { document.querySelector('#confirmation').textContent = `${data.name}, votre sélection : diagnostic de 15 minutes, ${dayFormat.format(data.date)} à ${data.time}.`; document.querySelector('#recommencer').addEventListener('click', () => {Object.assign(data,{service:false,date:null,time:null,name:'',phone:''}); render(0);}); }
  }
  nav.forEach(button => button.addEventListener('click', () => {const n = Number(button.dataset.go); if (availableStep(n)) render(n);}));
  render(current, false);
})();
