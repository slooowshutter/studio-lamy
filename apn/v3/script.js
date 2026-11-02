(() => {
  const doc = document;
  const root = doc.documentElement;
  const body = doc.body;
  const motionReduite = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $$ = (selecteur, contexte = doc) => Array.from(contexte.querySelectorAll(selecteur));
  const $ = (selecteur, contexte = doc) => contexte.querySelector(selecteur);
  const nb = '\u00a0';

  root.classList.add('js');

  const reveils = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !motionReduite.matches) {
    const observateur = new IntersectionObserver((entrees, observe) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        observe.unobserve(entree.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    reveils.forEach((element) => observateur.observe(element));
  } else {
    reveils.forEach((element) => element.classList.add('is-visible'));
  }

  const menuMobile = $('.mobile-nav');
  if (menuMobile) {
    menuMobile.addEventListener('click', (evenement) => {
      if (evenement.target.closest('a')) menuMobile.open = false;
    });
    menuMobile.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'Escape' || !menuMobile.open) return;
      menuMobile.open = false;
      $('summary', menuMobile).focus();
    });
  }

  const entree = () => requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('is-ready')));
  if (doc.fonts && doc.fonts.ready) {
    Promise.race([
      doc.fonts.ready,
      new Promise((resoudre) => window.setTimeout(resoudre, 550))
    ]).then(entree);
  } else {
    entree();
  }

  const barreMobile = $('.mobile-bar');
  const zonesMasquees = [$('#reserver'), $('.site-footer')].filter(Boolean);
  if (barreMobile && 'IntersectionObserver' in window) {
    const visibles = new Set();
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entreeCourante) => {
        if (entreeCourante.isIntersecting) visibles.add(entreeCourante.target);
        else visibles.delete(entreeCourante.target);
      });
      if (visibles.size) barreMobile.dataset.discrete = 'oui';
      else delete barreMobile.dataset.discrete;
    }, { threshold: 0.01 });
    zonesMasquees.forEach((zone) => observateurBarre.observe(zone));
  }

  const module = $('.booking-demo');
  if (!module) return;

  const etapes = $$('[data-step]', module);
  const radios = $$('input[name="prestation"]', module);
  const choixJours = $('[data-jours]', module);
  const choixHeures = $('[data-heures]', module);
  const resumePrestation = $('[data-resume-prestation]', module);
  const resumeJour = $('[data-resume-jour]', module);
  const resumeHeure = $('[data-resume-heure]', module);
  const etat = { prestation: null, jour: null, heure: null };

  const datePartsFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const jourCourtFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'short'
  });
  const jourLongFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
  });

  function partiesParis(date = new Date()) {
    const morceaux = {};
    datePartsFormatter.formatToParts(date).forEach((partie) => { morceaux[partie.type] = partie.value; });
    return {
      annee: Number(morceaux.year),
      mois: Number(morceaux.month),
      jour: Number(morceaux.day),
      heure: Number(morceaux.hour) % 24,
      minute: Number(morceaux.minute)
    };
  }

  function cleDate(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function depuisCle(cle) {
    const [annee, mois, jour] = cle.split('-').map(Number);
    return new Date(Date.UTC(annee, mois - 1, jour, 12));
  }

  function heureFr(minutes) {
    const heures = Math.floor(minutes / 60);
    const minutesRestantes = minutes % 60;
    return `${heures}${nb}h${nb}${String(minutesRestantes).padStart(2, '0')}`;
  }

  function jourLong(cle) {
    const libelle = jourLongFormatter.format(depuisCle(cle));
    return libelle.charAt(0).toLocaleUpperCase('fr-FR') + libelle.slice(1);
  }

  function mettreAJourResume() {
    resumePrestation.textContent = etat.prestation ? etat.prestation.nom : 'Prestation à choisir';
    resumeJour.textContent = etat.jour ? jourLong(etat.jour) : 'Jour à choisir';
    resumeHeure.textContent = etat.heure ? `À ${heureFr(etat.heure)}` : 'Heure à choisir';
  }

  function afficherEtape(numero) {
    const prochaine = etapes.find((etape) => Number(etape.dataset.step) === numero);
    if (!prochaine) return;
    etapes.forEach((etape) => { etape.hidden = etape !== prochaine; });
    prochaine.classList.add('is-entering');
    requestAnimationFrame(() => requestAnimationFrame(() => prochaine.classList.remove('is-entering')));
    const titre = $('h4', prochaine);
    titre.focus({ preventScroll: true });
    mettreAJourResume();
  }

  function genererJours() {
    const aujourdHui = partiesParis();
    const base = new Date(Date.UTC(aujourdHui.annee, aujourdHui.mois - 1, aujourdHui.jour, 12));
    const cleAujourdHui = cleDate(base);
    choixJours.replaceChildren();

    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(base.getTime() + decalage * 86400000);
      const cle = cleDate(date);
      const court = jourCourtFormatter.format(date).replace('.', '');
      const bouton = doc.createElement('button');
      bouton.type = 'button';
      bouton.className = 'day-option';
      bouton.dataset.jour = cle;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', `Choisir ${jourLong(cle).toLocaleLowerCase('fr-FR')}`);

      const nomJour = doc.createElement('span');
      nomJour.textContent = court;
      const numero = doc.createElement('span');
      numero.textContent = String(date.getUTCDate());
      bouton.append(nomJour, numero);

      if (cle === cleAujourdHui) bouton.setAttribute('aria-current', 'date');
      bouton.addEventListener('click', () => {
        $$('.day-option', choixJours).forEach((jour) => jour.setAttribute('aria-pressed', 'false'));
        bouton.setAttribute('aria-pressed', 'true');
        etat.jour = cle;
        etat.heure = null;
        $('[data-erreur-jour]', module).hidden = true;
        genererHeures();
        mettreAJourResume();
      });
      choixJours.append(bouton);
    }
  }

  function empreinte(texte) {
    let valeur = 0;
    for (let index = 0; index < texte.length; index += 1) {
      valeur = ((valeur << 5) - valeur + texte.charCodeAt(index)) | 0;
    }
    return Math.abs(valeur);
  }

  function genererHeures() {
    choixHeures.replaceChildren();
    if (!etat.jour || !etat.prestation) return;

    const paris = partiesParis();
    const cleAujourdHui = `${paris.annee}-${String(paris.mois).padStart(2, '0')}-${String(paris.jour).padStart(2, '0')}`;
    const maintenant = paris.heure * 60 + paris.minute;
    const debut = 9 * 60;
    const fin = 19 * 60;
    const duree = etat.prestation.duree;
    const baseHasard = empreinte(`${etat.jour}-${etat.prestation.identifiant}`);
    let nombreDisponible = 0;

    for (let minutes = debut; minutes + duree <= fin; minutes += 30) {
      const pris = (baseHasard + Math.floor(minutes / 30) * 7) % 6 === 0;
      const passe = etat.jour === cleAujourdHui && minutes <= maintenant;
      const bouton = doc.createElement('button');
      bouton.type = 'button';
      bouton.className = 'time-option';
      bouton.textContent = heureFr(minutes);
      bouton.dataset.heure = String(minutes);
      bouton.setAttribute('aria-pressed', 'false');

      if (pris) {
        bouton.disabled = true;
        bouton.dataset.pris = 'pris';
        bouton.setAttribute('aria-label', `${heureFr(minutes)}, déjà pris dans cette simulation`);
      } else if (passe) {
        bouton.disabled = true;
        bouton.setAttribute('aria-label', `${heureFr(minutes)}, heure passée`);
      } else {
        nombreDisponible += 1;
        bouton.addEventListener('click', () => {
          $$('.time-option', choixHeures).forEach((heure) => heure.setAttribute('aria-pressed', 'false'));
          bouton.setAttribute('aria-pressed', 'true');
          etat.heure = minutes;
          $('[data-erreur-heure]', module).hidden = true;
          mettreAJourResume();
        });
      }
      choixHeures.append(bouton);
    }

    const dateChoisie = $('[data-jour-selectionne]', module);
    dateChoisie.textContent = `${jourLong(etat.jour)} · les heures sont données à titre de simulation.`;
    if (!nombreDisponible) {
      const note = doc.createElement('p');
      note.className = 'form-error';
      note.textContent = 'Aucune heure ne reste à proposer pour ce jour dans cette simulation.';
      choixHeures.append(note);
    }
  }

  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      etat.prestation = {
        identifiant: radio.value,
        nom: radio.dataset.nom,
        duree: Number(radio.dataset.duree)
      };
      etat.jour = null;
      etat.heure = null;
      mettreAJourResume();
      genererJours();
    });
  });

  $$('[data-suivant]', module).forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const cible = Number(bouton.dataset.suivant);
      if (cible === 2 && !etat.prestation) {
        $('[data-erreur-prestation]', module).hidden = false;
        radios[0].focus();
        return;
      }
      if (cible === 3 && !etat.jour) {
        $('[data-erreur-jour]', module).hidden = false;
        const premierJour = $('.day-option', choixJours);
        if (premierJour) premierJour.focus();
        return;
      }
      if (cible === 3) genererHeures();
      if (cible === 4 && !etat.heure) {
        $('[data-erreur-heure]', module).hidden = false;
        const premiereHeure = $('.time-option:not(:disabled)', choixHeures);
        if (premiereHeure) premiereHeure.focus();
        return;
      }
      afficherEtape(cible);
    });
  });

  $$('[data-precedent]', module).forEach((bouton) => {
    bouton.addEventListener('click', () => afficherEtape(Number(bouton.dataset.precedent)));
  });

  $('[data-confirmer]', module).addEventListener('click', () => {
    const prenom = $('#prenom', module).value.trim();
    const telephone = $('#telephone', module).value.trim();
    const mobileFrancais = /^(?:(?:\+33|0033)\s?[67]|0[67])(?:[\s.-]?\d{2}){4}$/.test(telephone);
    if (!prenom || !mobileFrancais) {
      $('[data-erreur-coordonnees]', module).hidden = false;
      if (!prenom) $('#prenom', module).focus();
      else $('#telephone', module).focus();
      return;
    }

    $('[data-erreur-coordonnees]', module).hidden = true;
    $('[data-confirmation]', module).textContent = `${prenom}, votre simulation pour ${etat.prestation.nom.toLocaleLowerCase('fr-FR')} le ${jourLong(etat.jour).toLocaleLowerCase('fr-FR')} à ${heureFr(etat.heure)} est prête.`;
    afficherEtape(5);
  });

  $('[data-recommencer]', module).addEventListener('click', () => {
    etat.prestation = null;
    etat.jour = null;
    etat.heure = null;
    radios.forEach((radio) => { radio.checked = false; });
    $('#prenom', module).value = '';
    $('#telephone', module).value = '';
    $('[data-erreur-prestation]', module).hidden = true;
    $('[data-erreur-jour]', module).hidden = true;
    $('[data-erreur-heure]', module).hidden = true;
    $('[data-erreur-coordonnees]', module).hidden = true;
    mettreAJourResume();
    afficherEtape(1);
  });

  genererJours();
  mettreAJourResume();
})();
