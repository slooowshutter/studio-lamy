/* Inspiration Coiffeur — parcours local : aucune donnée transmise. */
(() => {
  'use strict';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nbsp = '\u00a0';
  const services = [
    { id: 'diagnostic', nom: 'Diagnostic avant les mèches', duree: 15 },
    { id: 'entretien', nom: 'Coupe femme entretien', duree: 30 },
    { id: 'mi-longs', nom: 'Coupe femme cheveux mi-longs', duree: 45 },
    { id: 'longs', nom: 'Coupe femme cheveux longs, épais ou transformation', duree: 60 }
  ];
  // Horaires Planity relevés dans la recherche fournie, à confirmer par le salon.
  const horaires = { 0: null, 1: [540, 1110], 2: [540, 1110], 3: [540, 1110], 4: [540, 1110], 5: [540, 1110], 6: [540, 1080] };
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const jourFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const moisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const etat = { etape: 0, service: services[0], jour: null, heure: null, prenom: '', telephone: '', termine: false };
  const panneau = $('#panneau');
  const form = $('#formulaire');
  const boutonContinuer = $('#continuer');
  const boutonPrecedent = $('#precedent');
  const etapes = $$('.etapes button');
  let generation = 0;
  let clavier = false;

  function parisMaintenant(date = new Date()) {
    const parts = Object.fromEntries(parisFormat.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
    return { date: new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12)), minutes: parts.hour * 60 + parts.minute };
  }
  const cleDate = d => d.toISOString().slice(0, 10);
  const heureFr = minutes => `${Math.floor(minutes / 60)}${nbsp}h${minutes % 60 ? `${nbsp}${String(minutes % 60).padStart(2, '0')}` : ''}`;
  const dureeFr = minutes => minutes === 60 ? `1${nbsp}h` : `${minutes}${nbsp}min`;
  const echapper = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function joursSuivants() {
    const aujourdHui = parisMaintenant().date;
    return Array.from({ length: 14 }, (_, i) => new Date(aujourdHui.getTime() + i * 86400000));
  }
  function creneauxPour(date, service = etat.service) {
    const plage = horaires[date.getUTCDay()];
    if (!plage) return [];
    const maintenant = parisMaintenant();
    const memeJour = cleDate(date) === cleDate(maintenant.date);
    const passe = cleDate(date) < cleDate(maintenant.date);
    const decalage = Math.floor(date.getTime() / 86400000);
    const liste = [];
    for (let minute = plage[0]; minute + service.duree <= plage[1]; minute += 30) {
      const expire = passe || (memeJour && minute <= maintenant.minutes);
      const indisponible = (decalage + Math.floor(minute / 30)) % 7 === 0;
      liste.push({ minute, bloque: expire || indisponible, motif: expire ? 'Heure passée' : 'Indisponible dans cet exemple' });
    }
    return liste;
  }
  function dateEncoreValide() {
    return etat.jour && joursSuivants().some(d => cleDate(d) === cleDate(etat.jour)) && creneauxPour(etat.jour).some(c => !c.bloque);
  }
  function heureEncoreValide() {
    return etat.heure !== null && dateEncoreValide() && creneauxPour(etat.jour).some(c => c.minute === etat.heure && !c.bloque);
  }
  function annoncer(texte) { $('#annonce').textContent = texte; }

  document.addEventListener('keydown', () => { clavier = true; root.classList.add('clavier'); });
  document.addEventListener('pointerdown', () => { clavier = false; root.classList.remove('clavier'); });

  function resume() {
    const description = etat.jour ? dateFormat.format(etat.jour) : 'À choisir';
    $('#resume').innerHTML = `<dt>Prestation</dt><dd>${echapper(etat.service.nom)} · ${dureeFr(etat.service.duree)}</dd><dt>Jour et heure</dt><dd>${echapper(description)}${etat.heure !== null ? `<br>${heureFr(etat.heure)}` : ''}</dd>${etat.termine ? '<dt>État</dt><dd>Essai terminé · rien n’a été envoyé</dd>' : ''}`;
    $('.sceau text:not(.sceau__min)').textContent = etat.service.duree;
    $('.sceau__quart').style.opacity = etat.service.id === 'diagnostic' ? '1' : '0';
    $('#titre-selection').textContent = etat.termine ? 'Votre essai.' : 'Le premier pas.';
    boutonContinuer.disabled = (etat.etape === 1 && !etat.jour) || (etat.etape === 2 && etat.heure === null);
    etapes.forEach((button, index) => {
      button.disabled = etat.termine || (index === 1 && !etat.service) || (index === 2 && !etat.jour) || (index === 3 && etat.heure === null);
      if (index === etat.etape && !etat.termine) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function contenuEtape() {
    if (etat.termine) {
      return `<div class="confirmation"><p class="repere">Simulation terminée</p><h3 class="confirmation__titre">${etat.service.id === 'diagnostic' ? 'Le diagnostic est choisi.' : 'La coupe est choisie.'} L’essai s’arrête ici.</h3><p class="recapitulatif">${echapper(etat.service.nom)} · ${dureeFr(etat.service.duree)}<br>${echapper(dateFormat.format(etat.jour))} à ${heureFr(etat.heure)}</p><p class="confirmation__note">Ce rendez-vous n’existe pas. Rien n’a été envoyé au salon et vos coordonnées ne sont pas conservées. Pour réserver réellement, choisissez Planity ou appelez le salon.</p><a class="bouton bouton--menthe" href="https://www.planity.com/salon-inspiration-57000-metz" target="_blank" rel="noopener">Prendre rendez-vous sur Planity <span aria-hidden="true">↗</span></a><button class="lien" type="button" id="recommencer">Recommencer la simulation <span aria-hidden="true">↺</span></button></div>`;
    }
    if (etat.etape === 0) return `<h3 id="titre-etape">Quelle prestation&nbsp;?</h3><p class="panneau__aide">Pour les mèches, commencez par le diagnostic de 15 minutes.</p><fieldset class="liste-choix"><legend class="sr-only">Choisissez une prestation pour cette simulation</legend>${services.map(s => `<label class="choix"><input type="radio" name="prestation" value="${s.id}" ${etat.service.id === s.id ? 'checked' : ''}><span>${echapper(s.nom)}</span><span class="choix__duree">${dureeFr(s.duree)}</span></label>`).join('')}</fieldset>`;
    if (etat.etape === 1) return `<h3 id="titre-etape">Quel jour vous conviendrait&nbsp;?</h3><p class="panneau__aide">Jours proposés pour l’essai. Horaires Planity, à confirmer.</p><div class="grille-jours" role="group" aria-label="Choisir un jour fictif">${joursSuivants().map(d => {
      const ferme = !horaires[d.getUTCDay()];
      const fini = !ferme && !creneauxPour(d).some(c => !c.bloque);
      const selectionne = etat.jour && cleDate(d) === cleDate(etat.jour);
      return `<button type="button" class="jour" data-date="${cleDate(d)}" aria-label="${echapper(dateFormat.format(d))}${ferme ? ', fermé' : fini ? ', aucun créneau restant dans cet exemple' : ', simulation'}" aria-pressed="${Boolean(selectionne)}" ${ferme || fini ? 'disabled' : ''}><span>${jourFormat.format(d)}</span><strong>${d.getUTCDate()}</strong><span>${moisFormat.format(d)}</span>${ferme || fini ? `<span class="jour__etat">${ferme ? 'Fermé' : 'Écoulé'}</span>` : ''}</button>`;
    }).join('')}</div>`;
    if (etat.etape === 2) return `<h3 id="titre-etape">À quelle heure&nbsp;?</h3><p class="panneau__aide">${echapper(dateFormat.format(etat.jour))} · ${dureeFr(etat.service.duree)}. Créneaux fictifs, aucune disponibilité réelle.</p><div class="creneaux" role="group" aria-label="Choisir une heure fictive">${creneauxPour(etat.jour).map(c => `<button type="button" class="creneau" data-minute="${c.minute}" aria-label="${heureFr(c.minute)}${c.bloque ? `, ${c.motif}` : ', simulation'}" aria-pressed="${etat.heure === c.minute}" ${c.bloque ? 'disabled' : ''}>${heureFr(c.minute)}</button>`).join('')}</div><p class="legende">Les heures barrées ne sont pas sélectionnables dans cet exemple.</p>`;
    return `<h3 id="titre-etape">Pour terminer l’essai.</h3><p class="panneau__aide">Vous pouvez saisir des coordonnées fictives. Rien n’est envoyé.</p><p class="recapitulatif">${echapper(etat.service.nom)} · ${dureeFr(etat.service.duree)}<br>${echapper(dateFormat.format(etat.jour))} à ${heureFr(etat.heure)}</p><div class="champs"><div class="champ"><label for="prenom">Prénom</label><input id="prenom" name="prenom" type="text" autocomplete="given-name" maxlength="60" value="${echapper(etat.prenom)}" aria-describedby="erreur-prenom" required><p class="erreur" id="erreur-prenom" aria-live="polite"></p></div><div class="champ"><label for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" maxlength="25" value="${echapper(etat.telephone)}" aria-describedby="aide-telephone erreur-telephone" required><p class="donnees" id="aide-telephone">Format français&nbsp;: dix chiffres, ou indicatif +33.</p><p class="erreur" id="erreur-telephone" aria-live="polite"></p></div></div><p class="donnees">Aucune donnée n’est enregistrée. Le formulaire reste dans votre navigateur, le temps de cet essai.</p>`;
  }

  function memoriser() {
    if ($('#prenom')) etat.prenom = $('#prenom').value;
    if ($('#telephone')) etat.telephone = $('#telephone').value;
  }
  function afficher(deplacerFocus = false) {
    panneau.innerHTML = contenuEtape();
    $('#commandes').hidden = etat.termine;
    boutonPrecedent.hidden = etat.etape === 0;
    const labels = ['Choisir le jour', 'Choisir l’heure', 'Continuer', 'Terminer la simulation'];
    boutonContinuer.innerHTML = `${labels[etat.etape]} <span aria-hidden="true">→</span>`;
    resume();
    if (deplacerFocus) {
      const heading = $('h3', panneau);
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
      const top = panneau.getBoundingClientRect().top;
      if (top < 16 || top > window.innerHeight - 140) panneau.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }
  function aller(etape, message) {
    memoriser();
    etat.etape = etape;
    const jeton = ++generation;
    panneau.classList.remove('is-entering');
    // État et contenu changent ensemble : même une double validation reste cohérente.
    if (reduce.matches || clavier) {
      afficher(true);
    } else {
      panneau.classList.add('is-entering');
      afficher(true);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (jeton === generation) panneau.classList.remove('is-entering');
      }));
    }
    annoncer(message || (etat.termine ? 'Simulation terminée. Rien n’a été envoyé.' : `Étape ${etape + 1} sur 4.`));
  }

  panneau.addEventListener('change', event => {
    if (event.target.name !== 'prestation') return;
    etat.service = services.find(s => s.id === event.target.value);
    etat.heure = null;
    if (!dateEncoreValide()) etat.jour = null;
    resume();
    annoncer(`${etat.service.nom}, ${dureeFr(etat.service.duree)} sélectionnés.`);
  });
  panneau.addEventListener('click', event => {
    const jour = event.target.closest('[data-date]');
    const heure = event.target.closest('[data-minute]');
    if (jour && !jour.disabled) {
      etat.jour = new Date(`${jour.dataset.date}T12:00:00Z`);
      etat.heure = null;
      $$('.jour', panneau).forEach(b => b.setAttribute('aria-pressed', String(b === jour)));
      resume();
      annoncer(`${dateFormat.format(etat.jour)} sélectionné pour la simulation.`);
    }
    if (heure && !heure.disabled) {
      etat.heure = Number(heure.dataset.minute);
      $$('.creneau', panneau).forEach(b => b.setAttribute('aria-pressed', String(b === heure)));
      resume();
      annoncer(`${heureFr(etat.heure)} sélectionné pour la simulation.`);
    }
    if (event.target.closest('#recommencer')) {
      etat.termine = false;
      etat.service = services[0];
      etat.jour = null;
      etat.heure = null;
      etat.prenom = '';
      etat.telephone = '';
      aller(0, 'Nouvelle simulation. Choisissez une prestation.');
    }
  });
  panneau.addEventListener('input', event => {
    if (!['prenom', 'telephone'].includes(event.target.id)) return;
    event.target.removeAttribute('aria-invalid');
    $(`#erreur-${event.target.id}`).textContent = '';
  });
  boutonPrecedent.addEventListener('click', () => aller(Math.max(0, etat.etape - 1)));
  etapes.forEach(button => button.addEventListener('click', () => aller(Number(button.dataset.etape))));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    memoriser();
    etat.service = services.find(s => s.id === link.dataset.service);
    etat.jour = null;
    etat.heure = null;
    etat.termine = false;
    aller(0, `${etat.service.nom} sélectionné pour la simulation.`);
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (etat.termine) return;
    if (etat.etape === 0) return aller(1);
    if (etat.etape === 1) {
      if (!dateEncoreValide()) { etat.jour = null; afficher(); annoncer('Choisissez un jour proposant encore des heures dans cet exemple.'); return; }
      return aller(2);
    }
    if (etat.etape === 2) {
      if (!heureEncoreValide()) { etat.heure = null; afficher(); annoncer('Cette heure n’est plus sélectionnable. Choisissez une autre heure.'); return; }
      return aller(3);
    }
    memoriser();
    const erreurs = [];
    if (!etat.prenom.trim()) erreurs.push(['prenom', 'Indiquez un prénom, fictif si vous le souhaitez.']);
    const numero = etat.telephone.replace(/[\s.()\-]/g, '');
    if (!/^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(numero)) erreurs.push(['telephone', 'Saisissez dix chiffres commençant par 0, ou un numéro avec +33.']);
    erreurs.forEach(([id, texte]) => { $(`#${id}`).setAttribute('aria-invalid', 'true'); $(`#erreur-${id}`).textContent = texte; });
    if (erreurs.length) { $(`#${erreurs[0][0]}`).focus(); annoncer('Vérifiez les champs indiqués. Rien n’a été envoyé.'); return; }
    if (!heureEncoreValide()) { etat.heure = null; return aller(2, 'L’heure choisie est passée. Choisissez une nouvelle heure fictive.'); }
    etat.prenom = '';
    etat.telephone = '';
    // Effacer aussi les champs avant la transition ; rien n’est stocké ni envoyé.
    $('#prenom').value = '';
    $('#telephone').value = '';
    etat.termine = true;
    aller(3);
  });

  // Le contenu n’est masqué pour les révélations qu’une fois le script prêt.
  $('#simulateur').hidden = false;
  $('#sans-script').hidden = true;
  afficher();
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));
  const reveles = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold: .1, rootMargin: '0px 0px -20px 0px' });
    reveles.forEach((element, i) => {
      element.style.transitionDelay = `${(i % 2) * 60}ms`;
      observer.observe(element);
    });
  } else reveles.forEach(element => element.classList.add('is-visible'));
  reduce.addEventListener('change', () => {
    if (reduce.matches) reveles.forEach(element => element.classList.add('is-visible'));
  });
})();
