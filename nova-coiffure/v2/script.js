const services = {
  coupe: {name: 'Coupe homme', duration: 30},
  barbe: {name: 'Taille de barbe', duration: 25},
  ensemble: {name: 'Coupe et taille de barbe', duration: 45}
};
const state = {step: 0, service: null, date: null, time: null, firstName: '', phone: ''};
const content = document.querySelector('#booking-content');
const summaryService = document.querySelector('#summary-service');
const summaryDate = document.querySelector('#summary-date');
const summaryTime = document.querySelector('#summary-time');
const stepButtons = [...document.querySelectorAll('[data-step]')];
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'});
const shortFormatter = new Intl.DateTimeFormat('fr-FR', {weekday: 'short', day: 'numeric', month: 'short'});
const localKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function updateSummary() {
  summaryService.textContent = state.service ? `${services[state.service].name} · ${services[state.service].duration} min` : 'Prestation à choisir';
  summaryDate.textContent = state.date ? dateFormatter.format(state.date) : 'Jour à choisir';
  summaryTime.textContent = state.time || 'Heure à choisir';
  stepButtons.forEach((button, i) => {
    button.disabled = i > 0 && (!state.service || (i > 1 && !state.date) || (i > 2 && !state.time));
    if (i === state.step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
  });
}
function render(focus = true) {
  updateSummary();
  let markup = '';
  if (state.step === 0) {
    markup = `<h3 tabindex="-1">Choisir une prestation</h3><p>Durées publiées sur une fiche tierce, à confirmer avec le salon.</p><div class="choices">${Object.entries(services).map(([id, item]) => `<label><input type="radio" name="prestation" value="${id}" ${state.service === id ? 'checked' : ''}><span>${item.name}</span><span>${item.duration} min</span></label>`).join('')}</div><button class="flow-button" id="next-service" ${state.service ? '' : 'disabled'}>Choisir un jour →</button>`;
  } else if (state.step === 1) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Array.from({length: 14}, (_, i) => {const d = new Date(today); d.setDate(today.getDate() + i); return d;});
    markup = `<h3 tabindex="-1">Choisir un jour</h3><p>Horaires publiés&nbsp;: lundi à samedi, de 9 h à 21 h. À confirmer.</p><div class="days">${days.map(d => `<button type="button" data-date="${localKey(d)}" ${d.getDay() === 0 ? 'disabled' : ''} class="${state.date && localKey(state.date) === localKey(d) ? 'selected' : ''}" aria-pressed="${Boolean(state.date && localKey(state.date) === localKey(d))}">${shortFormatter.format(d)}${d.getDay() === 0 ? '<br>fermé' : ''}</button>`).join('')}</div><button class="flow-button flow-back" data-back="0">← Prestation</button><button class="flow-button" id="next-date" ${state.date ? '' : 'disabled'}>Choisir une heure →</button>`;
  } else if (state.step === 2) {
    const now = new Date();
    const options = [];
    for (let minutes = 9 * 60; minutes + services[state.service].duration <= 21 * 60; minutes += 30) {
      const hours = Math.floor(minutes / 60), mins = minutes % 60;
      const value = `${String(hours).padStart(2, '0')} h ${String(mins).padStart(2, '0')}`;
      const when = new Date(state.date); when.setHours(hours, mins, 0, 0);
      const unavailable = when <= now || (minutes / 30 + state.date.getDate()) % 5 === 0;
      options.push(`<button type="button" data-time="${value}" ${unavailable ? 'disabled title="Indisponible dans cet exemple"' : ''} class="${state.time === value ? 'selected' : ''}" aria-pressed="${state.time === value}">${value}${unavailable ? '<br>indisponible' : ''}</button>`);
    }
    markup = `<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs dans les horaires publiés. Ils ne reflètent aucune disponibilité réelle.</p><div class="slots">${options.join('')}</div><button class="flow-button flow-back" data-back="1">← Jour</button><button class="flow-button" id="next-time" ${state.time ? '' : 'disabled'}>Vos coordonnées →</button>`;
  } else if (state.step === 3) {
    markup = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer la dernière étape. Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><form id="details" novalidate><div class="form-field"><label for="first-name">Prénom</label><input id="first-name" name="prenom" autocomplete="given-name" required><span class="error" id="name-error"></span></div><div class="form-field"><label for="phone">Téléphone</label><input id="phone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" aria-describedby="phone-error" required><span class="error" id="phone-error"></span></div><button class="flow-button flow-back" type="button" data-back="2">← Heure</button><button class="flow-button" type="submit">Terminer la simulation →</button></form>`;
  } else {
    markup = `<h3 tabindex="-1">Simulation terminée.</h3><p>Rien n’a été envoyé. Aucun rendez-vous n’a été pris.</p><p>${services[state.service].name} · ${dateFormatter.format(state.date)} · ${state.time}</p><p>Pour prendre rendez-vous, appelez le <a href="tel:+33753970468">07 53 97 04 68</a>.</p><button class="flow-button" id="restart">Recommencer →</button>`;
  }
  content.innerHTML = `<div class="flow-enter entering">${markup}</div>`;
  const panel = content.firstElementChild;
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('entering')));
  if (focus) content.querySelector('h3').focus();
  content.querySelectorAll('input[name="prestation"]').forEach(input => input.addEventListener('change', () => {state.service = input.value; state.date = null; state.time = null; updateSummary(); document.querySelector('#next-service').disabled = false;}));
  content.querySelector('#next-service')?.addEventListener('click', () => {state.step = 1; render();});
  content.querySelectorAll('[data-date]').forEach(button => button.addEventListener('click', () => {const [y,m,d] = button.dataset.date.split('-').map(Number); state.date = new Date(y,m-1,d); state.time = null; render(false); content.querySelector(`[data-date="${button.dataset.date}"]`).focus();}));
  content.querySelector('#next-date')?.addEventListener('click', () => {state.step = 2; render();});
  content.querySelectorAll('[data-time]').forEach(button => button.addEventListener('click', () => {state.time = button.dataset.time; render(false); content.querySelector(`[data-time="${button.dataset.time}"]`).focus();}));
  content.querySelector('#next-time')?.addEventListener('click', () => {state.step = 3; render();});
  content.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => {state.step = Number(button.dataset.back); render();}));
  const nameField = content.querySelector('#first-name');
  const phoneField = content.querySelector('#phone');
  if (nameField && phoneField) {
    nameField.value = state.firstName; phoneField.value = state.phone;
    nameField.addEventListener('input', () => {state.firstName = nameField.value;});
    phoneField.addEventListener('input', () => {state.phone = phoneField.value;});
  }
  content.querySelector('#details')?.addEventListener('submit', event => {
    event.preventDefault();
    const name = content.querySelector('#first-name'), phone = content.querySelector('#phone');
    const digits = phone.value.replace(/[\s.()-]/g, '');
    const validName = name.value.trim().length > 0;
    const validPhone = /^(?:\+33|0)[1-9]\d{8}$/.test(digits);
    content.querySelector('#name-error').textContent = validName ? '' : 'Indiquez votre prénom.';
    content.querySelector('#phone-error').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
    name.setAttribute('aria-invalid', String(!validName)); phone.setAttribute('aria-invalid', String(!validPhone));
    name.setAttribute('aria-describedby', 'name-error');
    if (!validName || !validPhone) {(!validName ? name : phone).focus(); return;}
    state.firstName = name.value.trim(); state.phone = phone.value.trim(); state.step = 4; render();
  });
  content.querySelector('#restart')?.addEventListener('click', () => {Object.assign(state, {step:0, service:null, date:null, time:null, firstName:'', phone:''}); render();});
}
stepButtons.forEach(button => button.addEventListener('click', () => {state.step = Number(button.dataset.step); render();}));
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => {item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button));});
  document.querySelectorAll('.service-row').forEach(row => {row.hidden = button.dataset.filter !== 'tout' && !row.dataset.category.split(' ').includes(button.dataset.filter);});
}));
document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {state.service = button.dataset.service; state.date = null; state.time = null; state.step = 1; render(); document.querySelector('#reservation').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});}));
render(false);
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {if (entry.isIntersecting) {entry.target.classList.add('visible'); observer.unobserve(entry.target);}}), {threshold: .12});
  document.querySelectorAll('.reveal').forEach((element, index) => {element.style.transitionDelay = `${index * 70}ms`; observer.observe(element);});
} else document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
