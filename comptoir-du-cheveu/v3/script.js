(() => {
  'use strict';

  const racine = document.documentElement;
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');

  requestAnimationFrame(() => racine.classList.add('page-prete'));

  const elementsReveles = document.querySelectorAll('.revele, .plan-rue');
  if (mouvementReduit.matches || !('IntersectionObserver' in window)) {
    elementsReveles.forEach((element) => element.classList.add('est-visible'));
  } else {
    const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('est-visible');
        observateur.unobserve(entree.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -36px 0px' });
    elementsReveles.forEach((element) => observateurRevelation.observe(element));
  }

  const boutonMenu = document.querySelector('.bouton-menu');
  const navigation = document.querySelector('#navigation-principale');
  const liensNavigation = navigation ? navigation.querySelectorAll('a') : [];
  const afficherMenu = (ouvert) => {
    if (!boutonMenu || !navigation) return;
    boutonMenu.setAttribute('aria-expanded', String(ouvert));
    boutonMenu.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
    navigation.classList.toggle('est-ouverte', ouvert);
  };
  if (boutonMenu && navigation) {
    boutonMenu.addEventListener('click', () => {
      afficherMenu(boutonMenu.getAttribute('aria-expanded') !== 'true');
    });
    liensNavigation.forEach((lien) => lien.addEventListener('click', () => afficherMenu(false)));
    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true') {
        afficherMenu(false);
        boutonMenu.focus();
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 680) afficherMenu(false);
    }, { passive: true });
  }

  const sectionReservation = document.querySelector('#reservation');
  const piedPage = document.querySelector('.pied-page');
  const lienHero = document.querySelector('.hero .lien-discret');
  const barreMobile = document.querySelector('.barre-mobile');
  if (barreMobile && lienHero && 'IntersectionObserver' in window) {
    let heroVisible = true;
    let reservationVisible = false;
    let piedVisible = false;
    const actualiserBarre = () => {
      barreMobile.classList.toggle('est-visible', !heroVisible && !reservationVisible && !piedVisible);
    };
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target === lienHero) heroVisible = entree.isIntersecting;
        if (entree.target === sectionReservation) reservationVisible = entree.isIntersecting;
        if (entree.target === piedPage) piedVisible = entree.isIntersecting;
      });
      actualiserBarre();
    }, { threshold: 0.04 });
    observateurBarre.observe(lienHero);
    if (sectionReservation) observateurBarre.observe(sectionReservation);
    if (piedPage) observateurBarre.observe(piedPage);
  } else if (barreMobile) {
    barreMobile.classList.add('est-visible');
  }

  const module = document.querySelector('.module-reservation');
  if (module) {
    module.addEventListener('submit', (evenement) => evenement.preventDefault());
    module.querySelectorAll('input[name="prestation"]').forEach((choix) => {
      choix.addEventListener('change', () => {
        document.querySelector('#resume-prestation').textContent = choix.value;
      });
    });
  }
})();
