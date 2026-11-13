document.documentElement.classList.add('js');

const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const commandeNavigation = document.querySelector('.navigation__commande');
const navigationMobile = document.querySelector('#navigation-mobile');

if (commandeNavigation && navigationMobile) {
  navigationMobile.hidden = true;

  const fermerNavigation = (rendreLeFocus = false) => {
    navigationMobile.hidden = true;
    commandeNavigation.setAttribute('aria-expanded', 'false');
    commandeNavigation.setAttribute('aria-label', 'Ouvrir la navigation');
    if (rendreLeFocus) commandeNavigation.focus();
  };

  commandeNavigation.addEventListener('click', () => {
    const ouvrir = commandeNavigation.getAttribute('aria-expanded') !== 'true';
    navigationMobile.hidden = !ouvrir;
    commandeNavigation.setAttribute('aria-expanded', String(ouvrir));
    commandeNavigation.setAttribute('aria-label', ouvrir ? 'Fermer la navigation' : 'Ouvrir la navigation');
    if (ouvrir) navigationMobile.querySelector('a')?.focus();
  });

  navigationMobile.addEventListener('click', (evenement) => {
    if (evenement.target.closest('a')) fermerNavigation();
  });

  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && !navigationMobile.hidden) fermerNavigation(true);
  });
}

const entreesHero = [...document.querySelectorAll('.hero [data-entree]')];
if (mouvementReduit) {
  entreesHero.forEach((element) => element.classList.add('visible'));
} else {
  entreesHero.forEach((element, index) => {
    window.setTimeout(() => element.classList.add('visible'), 70 + index * 65);
  });
}

const cartesPrestations = [...document.querySelectorAll('[data-revele="prestation"]')];
const blocsRepere = [...document.querySelectorAll('.hero__fait, [data-repere]')];

if ('IntersectionObserver' in window && !mouvementReduit) {
  const apparition = new IntersectionObserver((entrees, observateur) => {
    entrees.forEach((entree) => {
      if (!entree.isIntersecting) return;
      const element = entree.target;
      if (element.matches('[data-revele="prestation"]')) {
        const position = cartesPrestations.indexOf(element);
        element.style.setProperty('--delai-entree', `${Math.max(0, position) * 58}ms`);
        element.classList.add('visible');
      } else {
        element.classList.add('is-visible');
      }
      observateur.unobserve(element);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });

  [...cartesPrestations, ...blocsRepere].forEach((element) => apparition.observe(element));
} else {
  cartesPrestations.forEach((element) => element.classList.add('visible'));
  blocsRepere.forEach((element) => element.classList.add('is-visible'));
}

const etapePrestation = document.querySelector('#etape-prestation');
const etapeAppel = document.querySelector('#etape-appel');
const boutonContinuer = document.querySelector('[data-action="continuer"]');
const boutonRetour = document.querySelector('[data-action="retour"]');
const recapitulatif = document.querySelector('[data-recapitulatif]');
const annonce = document.querySelector('[data-annonce]');
const messagePrestation = document.querySelector('#erreur-prestation');
const choixPrestations = [...document.querySelectorAll('input[name="prestation"]')];

function choixActuel() {
  return choixPrestations.find((choix) => choix.checked)?.value || '';
}

function actualiserChoix() {
  const choix = choixActuel();
  if (boutonContinuer) boutonContinuer.disabled = !choix;
  if (messagePrestation) messagePrestation.textContent = choix ? '' : 'Choisissez une prestation pour continuer.';
  if (annonce && choix) annonce.textContent = `Demande choisie : ${choix}. Aucune demande n’est transmise.`;
}

function changerEtape(etapeSortante, etapeEntrante, annonceTexte) {
  if (!etapeSortante || !etapeEntrante) return;

  etapeSortante.classList.remove('active');
  etapeSortante.classList.add('sortie');
  etapeSortante.setAttribute('aria-hidden', 'true');
  etapeEntrante.hidden = false;
  etapeEntrante.setAttribute('aria-hidden', 'false');

  requestAnimationFrame(() => etapeEntrante.classList.add('active'));
  window.setTimeout(() => {
    etapeSortante.hidden = true;
    etapeSortante.classList.remove('sortie');
  }, mouvementReduit ? 0 : 225);

  const titreEtape = etapeEntrante.querySelector('h3');
  titreEtape?.focus({ preventScroll: true });
  if (annonce) annonce.textContent = annonceTexte;
}

choixPrestations.forEach((choix) => choix.addEventListener('change', actualiserChoix));

boutonContinuer?.addEventListener('click', () => {
  const choix = choixActuel();
  if (!choix) {
    messagePrestation.textContent = 'Choisissez une prestation pour continuer.';
    choixPrestations[0]?.focus();
    return;
  }
  if (recapitulatif) recapitulatif.textContent = choix;
  changerEtape(etapePrestation, etapeAppel, `Étape 2 sur 2. ${choix}. Appelez le salon pour convenir du jour et de l’heure.`);
});

boutonRetour?.addEventListener('click', () => {
  changerEtape(etapeAppel, etapePrestation, 'Étape 1 sur 2. Vous pouvez modifier votre demande.');
});

document.querySelectorAll('[data-prestation]').forEach((lien) => {
  lien.addEventListener('click', () => {
    const choix = choixPrestations.find((element) => element.value === lien.dataset.prestation);
    if (!choix) return;
    choix.checked = true;
    choix.dispatchEvent(new Event('change', { bubbles: true }));
    if (etapeAppel && !etapeAppel.hidden) {
      changerEtape(etapeAppel, etapePrestation, `Demande modifiée : ${choix.value}. Choisissez de nouveau « Continuer » pour préparer votre appel.`);
    }
  });
});

const barreMobile = document.querySelector('.barre-mobile');
const zonesSansBarre = [document.querySelector('#rendez-vous'), document.querySelector('.pied-page')].filter(Boolean);

if (barreMobile && 'IntersectionObserver' in window) {
  const zonesVisibles = new Set();
  const observationBarre = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
      if (entree.isIntersecting) zonesVisibles.add(entree.target);
      else zonesVisibles.delete(entree.target);
    });
    const masquer = zonesVisibles.size > 0;
    barreMobile.setAttribute('aria-hidden', String(masquer));
    barreMobile.inert = masquer;
  }, { threshold: 0.08 });

  zonesSansBarre.forEach((zone) => observationBarre.observe(zone));
}
