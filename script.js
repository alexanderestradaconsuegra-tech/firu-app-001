/* FIRU · Interactive layer */
import { supabase } from './supabase.js';
import { signOut, onAuthChange } from './auth.js';

/* ================================================================
   Auth state — nav
   ================================================================ */
const authNav = document.getElementById('authNav');

function renderAuthNav(session) {
  if (!authNav) return;
  if (session?.user) {
    const name  = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
    const role  = session.user.user_metadata?.role || 'owner';
    const label = role === 'business' ? '🏥' : '🐾';
    authNav.innerHTML = `
      <div class="user-pill">
        <span class="user-avatar">${label}</span>
        <span class="user-name">${name}</span>
        <button class="ghost-btn logout-btn" id="logoutBtn" type="button" title="Cerrar sesión">↩</button>
      </div>
    `;
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      await signOut();
      renderAuthNav(null);
      toast('Sesión cerrada. ¡Hasta pronto!', 'info', '👋');
    });
  } else {
    authNav.innerHTML = `<a class="primary-btn" href="login.html">Entrar</a>`;
  }
}

onAuthChange(session => renderAuthNav(session));
supabase.auth.getSession().then(({ data }) => renderAuthNav(data.session));

const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

/* ================================================================
   Toast notification
   ================================================================ */
function toast(msg, type = 'info', icon = '🔔') {
  const container = $('#toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="t-icon">${icon}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('hiding');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, 3400);
}

/* ================================================================
   Mobile menu
   ================================================================ */
const menuBtn = $('#menuBtn');
const mobileNav = $('#mobileNav');

menuBtn?.addEventListener('click', () => {
  const isOpen = menuBtn.classList.toggle('open');
  mobileNav?.classList.toggle('open', isOpen);
});

$$('.mobile-nav a').forEach(a => a.addEventListener('click', () => {
  menuBtn?.classList.remove('open');
  mobileNav?.classList.remove('open');
}));

/* ================================================================
   Reminder items
   ================================================================ */
const alertTitle = $('#alertTitle');
const alertText  = $('#alertText');

const reminderMessages = {
  'Comida · 08:00':       { title: 'Rutina de comida',   text: 'Es hora del desayuno de Luna y Milo.' },
  'Agua · cada 3 h':      { title: 'Hidratación',         text: 'Verifica que los bebederos tengan agua fresca.' },
  'Paseo · 19:00':        { title: 'Paseo de Luna',       text: 'Es hora del paseo de Luna. Nivel de energía alto.' },
  'Baño · sábado':        { title: 'Baño programado',     text: 'Baño de Luna y Milo este fin de semana.' },
  'Medicamento · 08:00':  { title: 'Medicamento',         text: 'Milo tiene medicamento pendiente · dar con comida.' },
  'Cita · 15 junio':      { title: 'Cita veterinaria',    text: 'Milo · Refuerzo de vacuna en Vet Norte.' },
};

$$('.reminder-item').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.reminder-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const msg = reminderMessages[btn.textContent.trim()];
    if (msg && alertTitle && alertText) {
      const banner = alertTitle.closest('.alert-banner');
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-4px)';
      setTimeout(() => {
        alertTitle.textContent = msg.title;
        alertText.textContent = msg.text;
        banner.style.opacity = '1';
        banner.style.transform = 'translateY(0)';
      }, 200);
    }
  });
});

/* ================================================================
   Alert banner auto-cycling
   ================================================================ */
const autoAlerts = [
  { title: 'Mensaje FIRU',      text: 'Es hora del paseo de Luna. Nivel de energía alto.' },
  { title: 'Recordatorio',      text: 'Milo tiene vacuna de refuerzo en 12 días.' },
  { title: 'Rutina',            text: 'Nube necesita su mezcla de semillas + fruta.' },
  { title: 'Alerta de salud',   text: 'Luna · Revisión de peso recomendada este mes.' },
  { title: 'Cita próxima',      text: 'Vet Norte · 15 de junio, 10:00 AM — Milo.' },
];
let alertIndex = 0;

function cycleAlert() {
  if (!alertTitle || !alertText) return;
  alertIndex = (alertIndex + 1) % autoAlerts.length;
  const banner = alertTitle.closest('.alert-banner');
  banner.style.opacity = '0';
  banner.style.transform = 'translateY(-4px)';
  setTimeout(() => {
    alertTitle.textContent = autoAlerts[alertIndex].title;
    alertText.textContent  = autoAlerts[alertIndex].text;
    banner.style.opacity   = '1';
    banner.style.transform = 'translateY(0)';
  }, 250);
}

setInterval(cycleAlert, 5000);

/* ================================================================
   Sound chime — Web Audio API
   ================================================================ */
let audioCtx = null;

function playChime() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    notes.forEach((freq, i) => {
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.14;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(t);
      osc.stop(t + 0.6);
    });
    toast('Sonido FIRU reproducido', 'info', '🔔');
  } catch (e) {
    toast('Activa el audio del navegador para escuchar el tono', 'info', '🔇');
  }
}

$('#playTone')?.addEventListener('click', playChime);

/* ================================================================
   Pet filter tabs
   ================================================================ */
$$('.filter-btn[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    $$('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.pet-card').forEach(card => {
      const match = filter === 'all' || card.dataset.pet === filter;
      card.style.display = match ? '' : 'none';
    });
  });
});

/* ================================================================
   Directory search + category filter
   ================================================================ */
const searchInput = $('#dirSearch');

function applyDirFilters() {
  const q      = (searchInput?.value || '').toLowerCase();
  const active = $('.dir-filter-btn.active')?.dataset.type || 'all';
  $$('.directory-card').forEach(card => {
    const text  = card.textContent.toLowerCase();
    const type  = card.dataset.type || '';
    const ok    = (!q || text.includes(q)) && (active === 'all' || type === active);
    card.style.display = ok ? '' : 'none';
  });
}

searchInput?.addEventListener('input', applyDirFilters);

$$('.dir-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.dir-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyDirFilters();
  });
});

/* ================================================================
   Add pet modal
   ================================================================ */
const addPetModal = $('#addPetModal');
const petForm     = $('#petForm');
const petGrid     = $('#petGrid');

function openModal()  { addPetModal?.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal() { addPetModal?.classList.remove('open'); document.body.style.overflow = ''; }

$('#addPetBtn')?.addEventListener('click', openModal);
$('#closeModal')?.addEventListener('click', closeModal);
$('#cancelModal')?.addEventListener('click', closeModal);
addPetModal?.addEventListener('click', e => { if (e.target === addPetModal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

const petEmoji = { perro: '🐕', gato: '🐈', ave: '🦜', conejo: '🐇', pez: '🐠', otro: '🐾' };
const petChip  = { perro: '',    gato: 'alt', ave: 'cyan', conejo: 'teal', pez: 'cyan', otro: '' };
const petLabel = { perro: 'Perro', gato: 'Gato', ave: 'Ave', conejo: 'Conejo', pez: 'Pez', otro: 'Otro' };

petForm?.addEventListener('submit', e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(petForm));
  if (!d.name?.trim()) return;

  const emoji = petEmoji[d.type] || '🐾';
  const chip  = petChip[d.type] ?? '';
  const label = petLabel[d.type] || 'Otro';

  const card = document.createElement('article');
  card.className = 'pet-card card reveal';
  card.dataset.pet = d.type;
  card.innerHTML = `
    <div class="pet-emoji">${emoji}</div>
    <div class="pet-top">
      <div>
        <span class="chip ${chip}">${label}</span>
        <h4>${d.name.trim()}</h4>
      </div>
      <span class="status good">Nuevo</span>
    </div>
    <ul>
      <li><span>Edad</span><strong>${d.age || '—'}</strong></li>
      <li><span>Peso</span><strong>${d.weight ? d.weight + ' kg' : '—'}</strong></li>
      <li><span>Vacunas</span><strong>Por registrar</strong></li>
      <li><span>Dieta</span><strong>${d.diet || 'Por definir'}</strong></li>
    </ul>
    <div class="pet-health-bar">
      <label><span>Salud general</span><span>—</span></label>
      <div class="progress-track"><div class="progress-fill" style="width:0%"></div></div>
    </div>
    <div class="pet-card-actions">
      <button class="ghost-btn" type="button">Editar</button>
      <button class="ghost-btn" type="button">Recordatorio</button>
    </div>
  `;

  petGrid?.appendChild(card);
  requestAnimationFrame(() => {
    card.classList.add('visible');
    card.querySelector('.progress-fill').style.width = '55%';
  });

  petForm.reset();
  closeModal();
  toast(`${d.name.trim()} fue agregado/a a tu familia 🎉`, 'success', emoji);
});

/* ================================================================
   Scroll reveal — IntersectionObserver
   ================================================================ */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      /* Animate progress bars on enter */
      $$('.progress-fill', entry.target).forEach(bar => {
        const target = bar.dataset.width || bar.style.width;
        bar.style.width = '0';
        requestAnimationFrame(() => { bar.style.width = target; });
      });
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

$$('.reveal').forEach(el => revealObs.observe(el));

/* ================================================================
   Hero counter animation
   ================================================================ */
function animateCount(el) {
  const text = el.textContent.trim();
  const num = parseFloat(text);
  if (isNaN(num)) return;
  const dec = (text.split('.')[1] || '').length;
  const suffix = text.replace(/[\d.]+/, '');
  let start = null;
  const dur = 1100;
  (function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = (num * e).toFixed(dec) + suffix;
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
}

const heroObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      $$('.hero-metrics strong', entry.target).forEach(animateCount);
      heroObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.4 });

const heroEl = $('.hero');
if (heroEl) heroObs.observe(heroEl);

/* ================================================================
   Live clock in phone mockup
   ================================================================ */
function updateClock() {
  const el = $('#phoneClock');
  if (!el) return;
  const now = new Date();
  el.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
}
updateClock();
setInterval(updateClock, 20000);

/* ================================================================
   Progress bars — initial animate on page load (visible ones)
   ================================================================ */
window.addEventListener('load', () => {
  $$('.progress-fill[data-width]').forEach(bar => {
    const rect = bar.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      bar.style.width = bar.dataset.width;
    }
  });
});

/* ================================================================
   Directorio — cargar desde Supabase
   ================================================================ */
const chipMap  = { clinica: 'teal', tienda: 'alt', servicio: 'cyan' };
const labelMap = { clinica: 'Clínica', tienda: 'Tienda', servicio: 'Servicio' };

function starsHtml(rating) {
  const full  = Math.floor(rating);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
}

async function loadDirectory() {
  const grid = $('#petGrid')?.closest('section')?.nextElementSibling?.nextElementSibling?.querySelector('.directory-grid');
  const dirGrid = document.querySelector('.directory-grid');
  if (!dirGrid) return;

  const { data, error } = await supabase.from('directory').select('*').eq('is_active', true).order('is_featured', { ascending: false });
  if (error || !data?.length) return;

  dirGrid.innerHTML = '';
  data.forEach(item => {
    const chip  = chipMap[item.type]  || '';
    const label = labelMap[item.type] || item.type;
    const card  = document.createElement('article');
    card.className = 'card directory-card reveal';
    card.dataset.type = item.type;
    card.innerHTML = `
      <span class="chip ${chip}">${label}</span>
      <h4>${item.name}</h4>
      <div class="dir-rating">${starsHtml(item.rating)} <span style="color:var(--text-3);margin-left:0.2rem">${item.rating} (${item.review_count})</span></div>
      <p>${item.description || ''}</p>
      <div class="dir-tags">
        ${item.hours ? `<span class="dir-tag">${item.hours}</span>` : ''}
        ${item.phone ? `<span class="dir-tag">${item.phone}</span>` : ''}
      </div>
      <strong class="price">${item.price_model || '—'}</strong>
    `;
    dirGrid.appendChild(card);
    requestAnimationFrame(() => card.classList.add('visible'));
  });

  // re-apply filters after load
  applyDirFilters();
}

loadDirectory();
