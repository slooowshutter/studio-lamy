(() => {
'use strict';
const services = [
 {name:'Semi-permanent mains ou pieds',category:'ongles',minutes:30,price:40},
 {name:'Dépose et pose semi-permanent',category:'ongles',minutes:60,price:45},
 {name:'Gel ou résine sur ongle naturel · couleur',category:'ongles',minutes:60,price:62},
 {name:'Gel ou résine · French ou baby-boomer',category:'ongles',minutes:60,price:67},
 {name:'Remplissage couleur',category:'ongles',minutes:60,price:52},
 {name:'Dépose gel ou résine',category:'ongles',minutes:30,price:30},
 {name:'Extensions de cils à cils',category:'regard',minutes:60,price:120},
 {name:'Rehaussement avec teinture',category:'regard',minutes:60,price:70},
 {name:'Browlift et teinture',category:'regard',minutes:45,price:50},
 {name:'Bronzag’expert · visage et décolleté',category:'bronzage',minutes:10,price:10},
 {name:'Bronzag’expert · corps entier + visage',category:'bronzage',minutes:20,price:30}
];
const priceList=document.querySelector('#price-list');
function renderPrices(filter='all') {priceList.innerHTML=services.map((s,i)=>({s,i})).filter(({s})=>filter==='all'||s.category===filter).map(({s,i})=>`<div class="price-row"><span class="ref">${String(i+1).padStart(2,'0')}</span><h3>${s.name}</h3><span class="duration">${s.minutes} min</span><strong class="price">${s.price}&nbsp;€</strong><button type="button" data-book="${i}">Choisir ↗</button></div>`).join('');}
renderPrices();
document.querySelector('.filters').addEventListener('click',e=>{const b=e.target.closest('button[data-filter]');if(!b)return;document.querySelectorAll('.filters button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});renderPrices(b.dataset.filter)});
const panel=document.querySelector('#booking-step'), summary=document.querySelector('#summary-content');
function showContact(index){
 const service=services[index];
 summary.textContent=service ? service.name : 'Choisissez une prestation sur la carte.';
 panel.innerHTML='<h3 tabindex="-1">Prendre rendez-vous</h3><p>Pour connaître les disponibilités, appelez le salon.</p><a href="tel:+33645978581">06 45 97 85 81 ↗</a>';
}
priceList.addEventListener('click',e=>{const button=e.target.closest('[data-book]');if(!button)return;showContact(Number(button.dataset.book));document.querySelector('#reserver').scrollIntoView();panel.querySelector('h3').focus({preventScroll:true});});
showContact();
requestAnimationFrame(()=>document.documentElement.classList.add('ready'));
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.15});document.querySelectorAll('.reveal').forEach((el,i)=>{el.style.transitionDelay=`${i*60}ms`;observer.observe(el)})}else{document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'))}
})();
