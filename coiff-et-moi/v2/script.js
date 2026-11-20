(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const revealItems = document.querySelectorAll('.reveal, .node-mark');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        const strands = entry.target.querySelector('.strands');
        if (strands) strands.classList.add('seen');
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12 });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('visible'));
    document.querySelector('.strands').classList.add('seen');
  }
  const path = document.querySelector('.path');
  const progress = document.querySelector('.path-progress');
  const connector = document.querySelector('.path-start path');
  const track = document.querySelector('.path-track');
  function connectPath() {
    const base = path.getBoundingClientRect();
    const letter = document.querySelector('.first-letter').getBoundingClientRect();
    const node = document.querySelector('.node-mark').getBoundingClientRect();
    const startX = letter.left - base.left;
    const startY = letter.top - base.top + letter.height * .55;
    const sideX = startX - 26;
    const nodeX = node.left - base.left + node.width / 2;
    const nodeY = node.top - base.top + node.height / 2;
    const bendY = nodeY - 54;
    connector.setAttribute('d', `M ${startX} ${startY} H ${sideX} V ${bendY} H ${nodeX} V ${nodeY}`);
    track.style.top = `${nodeY}px`;
  }
  connectPath();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(connectPath);
  let ticking = false;
  function drawPath() {
    const rect = path.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (innerHeight * .65 - rect.top - track.offsetTop) / Math.max(1, rect.height - track.offsetTop)));
    progress.style.transform = `scaleY(${fraction})`;
    ticking = false;
  }
  function requestDraw() { if (!ticking) { requestAnimationFrame(drawPath); ticking = true; } }
  addEventListener('scroll', requestDraw, { passive: true });
  addEventListener('resize', () => { connectPath(); requestDraw(); });
  requestDraw();
  const form = document.querySelector('#booking-form');
  const first = document.querySelector('#step-one');
  const second = document.querySelector('#step-two');
  const third = document.querySelector('#step-three');
  const error = document.querySelector('#booking-error');
  const label = document.querySelector('#step-label');
  let timer;
  function changeStep(from, to, number) {
    clearTimeout(timer);
    from.classList.add('leaving');
    timer = setTimeout(() => {
      from.hidden = true;
      from.classList.remove('leaving');
      to.hidden = false;
      to.classList.add('entering');
      label.textContent = `Étape ${number} / 3`;
      to.querySelector('h3').focus();
      requestAnimationFrame(() => requestAnimationFrame(() => to.classList.remove('entering')));
    }, reduced.matches ? 0 : 220);
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const selected = form.querySelector('input[name="service"]:checked');
    if (!selected) { error.textContent = 'Choisissez une prestation pour continuer.'; form.querySelector('input').focus(); return; }
    error.textContent = '';
    document.querySelector('#selection').textContent = selected.value;
    changeStep(first, second, 2);
  });
  document.querySelector('#back').addEventListener('click', () => changeStep(second, first, 1));
  document.querySelector('#finish').addEventListener('click', () => {
    document.querySelector('#final-selection').textContent = form.querySelector('input[name="service"]:checked').value;
    changeStep(second, third, 3);
  });
  document.querySelector('#restart').addEventListener('click', () => changeStep(third, first, 1));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    const radio = [...form.querySelectorAll('input[name="service"]')].find(input => input.value === link.dataset.service);
    if (radio) radio.checked = true;
    error.textContent = '';
    clearTimeout(timer);
    first.hidden = false; second.hidden = true; third.hidden = true;
    first.classList.remove('leaving', 'entering'); second.classList.remove('leaving', 'entering'); third.classList.remove('leaving', 'entering');
    label.textContent = 'Étape 1 / 3';
  }));
})();
