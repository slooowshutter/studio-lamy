(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const targets = document.querySelectorAll('.reveal-num, .reveal-texte, .reveal-repere');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('en-attente'); observer.unobserve(entry.target); }
    }), {threshold: 0.12});
    targets.forEach(el => { el.classList.add('en-attente'); observer.observe(el); });
  }
  const progress = document.getElementById('progression');
  let scheduled = false;
  function updateProgress() {
    const extent = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleY(${extent > 0 ? Math.min(1, Math.max(0, scrollY / extent)) : 0})`;
    scheduled = false;
  }
  addEventListener('scroll', () => { if (!scheduled) { requestAnimationFrame(updateProgress); scheduled = true; } }, {passive:true});
  updateProgress();

  const prestations = [
    {nom:'Cheveux courts', duree:30},
    {nom:'Barbe courte ou longue sans rasage', duree:30},
    {nom:'Rasage barbe complet à l’ancienne', duree:40}
  ];
  const horaires = {2:[8,19], 3:[8,19], 4:[8,18], 5:[8,18], 6:[9,17]};
  const state = {etape:0, prestation:null, jour:null, heure:null, prenom:'', telephone:''};
  const zone = document.getElementById('formulaire');
  const resume = document.getElementById('resume');
  const boutonsEtapes = [...document.querySelectorAll('[data-etape]')];
  const formatJour = d => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(d);
  const formatHeure = minutes => `${String(Math.floor(minutes / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`;
  function dateAt(offset) { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+offset); return d; }
  function slotsPour(d) {
    const plage = horaires[d.getDay()];
    if (!plage || state.prestation === null) return [];
    const slots = [];
    for (let t=plage[0]*60; t+prestations[state.prestation].duree<=plage[1]*60; t+=60) {
      const instant = new Date(d); instant.setHours(Math.floor(t/60),t%60);
      if (instant > new Date()) slots.push(t);
    }
    return slots;
  }
  function escapeHTML(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function syncResume() {
    const parts = [];
    if (state.prestation !== null) parts.push(prestations[state.prestation].nom);
    if (state.jour) parts.push(formatJour(state.jour));
    if (state.heure !== null) parts.push(formatHeure(state.heure));
    resume.textContent = parts.length ? parts.join(' · ') : 'Votre choix apparaîtra ici.';
    boutonsEtapes.forEach((b,i) => {
      b.disabled = i > state.etape && (i === 1 ? state.prestation === null : i === 2 ? !state.jour : i === 3 ? state.heure === null : true);
      b.classList.toggle('actif', i === state.etape);
      if (i === state.etape) b.setAttribute('aria-current','step'); else b.removeAttribute('aria-current');
    });
  }
  function afficher(focus = true) {
    syncResume();
    let contenu = '';
    if (state.etape === 0) {
      contenu = `<h3 tabindex="-1">Choisir une prestation</h3><p class="note">Prestations publiées sur Planity, à confirmer avec le salon.</p><div class="choix">${prestations.map((p,i)=>`<label><input type="radio" name="prestation" value="${i}" ${state.prestation === i ? 'checked' : ''}><strong>${p.nom}</strong><span>${p.duree} min</span></label>`).join('')}</div><div class="boutons"><button class="bouton" type="button" data-action="suivant">Choisir un jour →</button></div>`;
    } else if (state.etape === 1) {
      contenu = `<h3 tabindex="-1">Choisir un jour</h3><p class="note">Jours proposés à titre de simulation selon les horaires publiés, à confirmer.</p><div class="choix">${Array.from({length:14},(_,i)=>{const d=dateAt(i), ouvert=!!horaires[d.getDay()], disponible=ouvert && slotsPour(d).length>0; return `<label><input type="radio" name="jour" value="${i}" ${!disponible?'disabled':''} ${state.jour && state.jour.getTime()===d.getTime()?'checked':''}><strong>${formatJour(d)}</strong><span>${!ouvert?'Fermé':disponible?'À confirmer':'Aucun créneau d’exemple'}</span></label>`;}).join('')}</div><div class="boutons"><button class="bouton secondaire" type="button" data-action="retour">← Retour</button><button class="bouton" type="button" data-action="suivant">Choisir une heure →</button></div>`;
    } else if (state.etape === 2) {
      const slots = slotsPour(state.jour);
      contenu = `<h3 tabindex="-1">Choisir une heure</h3><p class="note">Créneaux fictifs pour le ${formatJour(state.jour)}. Disponibilités réelles à confirmer.</p>${slots.length ? `<div class="choix">${slots.map(t=>`<label><input type="radio" name="heure" value="${t}" ${state.heure===t?'checked':''}><strong>${formatHeure(t)}</strong><span>Exemple</span></label>`).join('')}</div>` : '<p>Aucun créneau d’exemple restant ce jour. Choisissez un autre jour.</p>'}<div class="boutons"><button class="bouton secondaire" type="button" data-action="retour">← Retour</button>${slots.length?'<button class="bouton" type="button" data-action="suivant">Vos coordonnées →</button>':''}</div>`;
    } else if (state.etape === 3) {
      contenu = `<h3 tabindex="-1">Vos coordonnées</h3><p class="note">Pour essayer la dernière étape. Ces informations restent dans votre navigateur.</p><form id="coordonnees" novalidate><div class="champ"><label for="prenom">Prénom</label><input id="prenom" name="prenom" autocomplete="given-name" value="${escapeHTML(state.prenom)}" aria-describedby="erreur-prenom"><span class="erreur" id="erreur-prenom"></span></div><div class="champ"><label for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" value="${escapeHTML(state.telephone)}" aria-describedby="erreur-telephone"><span class="erreur" id="erreur-telephone"></span></div><div class="boutons"><button class="bouton secondaire" type="button" data-action="retour">← Retour</button><button class="bouton" type="submit">Terminer la simulation →</button></div></form>`;
    } else {
      contenu = `<h3 tabindex="-1">Simulation terminée</h3><p>Merci ${escapeHTML(state.prenom)}. Votre sélection&nbsp;: ${escapeHTML(prestations[state.prestation].nom)}, le ${formatJour(state.jour)} à ${formatHeure(state.heure)}.</p><p><strong>Aucun rendez-vous n’a été pris et rien n’a été envoyé.</strong> Pour réserver, appelez le salon ou passez par Planity.</p><div class="boutons"><a class="bouton" href="tel:+33982372127">Appeler le salon</a><button class="bouton secondaire" type="button" data-action="recommencer">Recommencer</button></div>`;
    }
    zone.classList.add('change');
    zone.innerHTML = contenu;
    requestAnimationFrame(() => requestAnimationFrame(() => zone.classList.remove('change')));
    if(focus) zone.querySelector('h3').focus({preventScroll:true});
  }
  zone.addEventListener('change', e => {
    if(e.target.name==='prestation'){const v=Number(e.target.value);if(state.prestation!==v){state.prestation=v;state.jour=null;state.heure=null;}}
    if(e.target.name==='jour'){const d=dateAt(Number(e.target.value));if(!state.jour || state.jour.getTime()!==d.getTime()){state.jour=d;state.heure=null;}}
    if(e.target.name==='heure') state.heure=Number(e.target.value);
    syncResume();
  });
  zone.addEventListener('click', e => {
    const action=e.target.closest('[data-action]')?.dataset.action; if(!action)return;
    if(action==='recommencer'){Object.assign(state,{etape:0,prestation:null,jour:null,heure:null,prenom:'',telephone:''});afficher();return;}
    if(action==='retour'){if(state.etape===3){state.prenom=document.getElementById('prenom').value;state.telephone=document.getElementById('telephone').value;}state.etape--;afficher();return;}
    if(action==='suivant'){
      const selected = state.etape===0 ? state.prestation!==null : state.etape===1 ? !!state.jour : state.heure!==null;
      if(!selected){let warning=zone.querySelector('.selection-erreur');if(!warning){warning=document.createElement('p');warning.className='erreur selection-erreur';warning.setAttribute('role','alert');zone.querySelector('.boutons').before(warning);}warning.textContent='Veuillez faire un choix pour continuer.';return;}
      state.etape++;afficher();
    }
  });
  zone.addEventListener('submit', e => {
    e.preventDefault(); state.prenom=document.getElementById('prenom').value.trim();state.telephone=document.getElementById('telephone').value.trim();
    const digits=state.telephone.replace(/[\s.()-]/g,''); const validName=state.prenom.length>0; const validPhone=/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits);
    document.getElementById('erreur-prenom').textContent=validName?'':'Indiquez votre prénom.';
    document.getElementById('erreur-telephone').textContent=validPhone?'':'Indiquez un numéro de téléphone français valide.';
    document.getElementById('prenom').setAttribute('aria-invalid',String(!validName));document.getElementById('telephone').setAttribute('aria-invalid',String(!validPhone));
    if(!validName || !validPhone){document.getElementById(!validName?'prenom':'telephone').focus();return;}
    state.etape=4;afficher();
  });
  boutonsEtapes.forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.etape);if(n===state.etape)return;if(state.etape===3){state.prenom=document.getElementById('prenom').value;state.telephone=document.getElementById('telephone').value;}state.etape=n;afficher();}));
  afficher(false);
})();
