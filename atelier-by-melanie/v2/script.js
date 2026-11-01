(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const services = ['Coupe femme', 'Brushing', 'Coloration'];
  const content = document.querySelector('#step-content');
  const summary = document.querySelector('#summary-text');
  function selectService(index) {
    summary.textContent = services[index];
    const input = content.querySelector(`input[value="${index}"]`);
    if (input) input.checked = true;
  }
  content.innerHTML = `<h3 tabindex="-1">Quelle prestation&nbsp;?</h3><p>Horaires et tarifs : appelez le salon au 04 83 99 13 03.</p><div class="service-options">${services.map((name, index) => `<label class="choice"><input type="radio" name="service" value="${index}"><span>${name}</span><b>Sur appel</b></label>`).join('')}</div><a class="action" href="tel:+33483991303">Appeler le salon →</a>`;
  content.addEventListener('change', event => { if (event.target.name === 'service') selectService(Number(event.target.value)); });
  document.querySelectorAll('.price-row').forEach(button => button.addEventListener('click', () => {
    selectService(Number(button.dataset.service));
    document.querySelector('#reservation').scrollIntoView();
  }));
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'all' && row.dataset.category !== button.dataset.filter; });
  }));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    document.querySelectorAll('.reveal').forEach((element, index) => { element.style.transitionDelay = `${index * 70}ms`; observer.observe(element); });
  } else document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
})();
