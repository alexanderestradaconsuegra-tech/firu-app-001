/* FIRU · Dashboard logic */
import { supabase }           from './supabase.js';
import { signOut, getSession } from './auth.js';

/* ── Utilidades ─────────────────────────────── */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function toast(msg, type = 'info', icon = '🔔') {
  const c  = $('#toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="t-icon">${icon}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => {
    el.classList.add('hiding');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, 3400);
}

function setLoading(btn, on) {
  btn.querySelector('.btn-text').hidden = on;
  btn.querySelector('.btn-loader').hidden = !on;
  btn.disabled = on;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' });
}

const petEmojis = { perro:'🐕', gato:'🐈', ave:'🦜', conejo:'🐇', pez:'🐠', otro:'🐾' };
const petChips  = { perro:'', gato:'alt', ave:'cyan', conejo:'teal', pez:'cyan', otro:'' };
const petLabels = { perro:'Perro', gato:'Gato', ave:'Ave', conejo:'Conejo', pez:'Pez', otro:'Otro' };
const reminderIcons = { comida:'🍗', agua:'💧', paseo:'🦮', bano:'🛁', medicamento:'💊', vacuna:'💉', cita:'📅', otro:'🔔' };

/* ── Sesión ─────────────────────────────────── */
let currentUser  = null;
let petsCache    = [];

async function initDash() {
  const session = await getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  currentUser = session.user;
  const name  = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
  const role  = currentUser.user_metadata?.role || 'owner';
  $('#userName').textContent = name;
  $('#userPill').querySelector('.user-avatar').textContent = role === 'business' ? '🏥' : '🐾';

  await loadPets();
  loadReminders();
  loadAppointments();
}

$('#logoutBtn')?.addEventListener('click', async () => {
  await signOut();
  window.location.href = 'index.html';
});

/* ── Navegación ─────────────────────────────── */
function goToSection(name) {
  $$('.dash-section').forEach(s => s.classList.remove('active'));
  $$('.dash-nav-item, .bottom-nav-item').forEach(b => b.classList.toggle('active', b.dataset.section === name));
  $(`#sec-${name}`)?.classList.add('active');
}

$$('.dash-nav-item, .bottom-nav-item').forEach(btn =>
  btn.addEventListener('click', () => goToSection(btn.dataset.section))
);

/* ════════════════════════════════════════════
   MASCOTAS
════════════════════════════════════════════ */
async function loadPets() {
  const { data, error } = await supabase
    .from('pets').select('*')
    .eq('user_id', currentUser.id)
    .eq('status', 'activo')
    .order('created_at', { ascending: false });

  if (error) { toast('Error cargando mascotas', 'error', '⚠️'); return; }

  petsCache = data || [];
  renderPets(petsCache);
  populatePetSelects(petsCache);

  const n = petsCache.length;
  $('#petCount').textContent = n === 0 ? 'Aún no tienes mascotas registradas' :
    `${n} mascota${n !== 1 ? 's' : ''} registrada${n !== 1 ? 's' : ''}`;
}

function renderPets(pets) {
  const grid = $('#petDashGrid');
  grid.innerHTML = '';

  if (!pets.length) {
    grid.innerHTML = `
      <div class="pet-add-card" id="addFirstPet">
        <span>🐾</span>
        <strong>Añade tu primera mascota</strong>
        <span style="font-size:0.82rem;color:var(--text-3)">Toca aquí para comenzar</span>
      </div>`;
    $('#addFirstPet').addEventListener('click', () => openPetModal());
    return;
  }

  pets.forEach(pet => grid.appendChild(buildPetCard(pet)));

  const addCard = document.createElement('div');
  addCard.className = 'pet-add-card';
  addCard.innerHTML = `<span>➕</span><strong>Añadir mascota</strong>`;
  addCard.addEventListener('click', () => openPetModal());
  grid.appendChild(addCard);
}

function buildPetCard(pet) {
  const emoji = petEmojis[pet.type] || '🐾';
  const chip  = petChips[pet.type]  || '';
  const label = petLabels[pet.type] || 'Otro';
  const url   = pet.photo_url
    ? `${supabase.storageUrl}/object/public/pet-photos/${pet.photo_url}`
    : null;

  const card  = document.createElement('article');
  card.className = 'pet-dash-card';
  card.dataset.id = pet.id;
  card.innerHTML = `
    <div class="pet-dash-photo">
      <span>${emoji}</span>
      ${url ? `<img src="${url}" alt="${pet.name}" />` : ''}
    </div>
    <div class="pet-dash-body">
      <div class="pet-dash-top">
        <div>
          <span class="chip ${chip}" style="margin-bottom:0.3rem">${label}</span>
          <h4>${pet.name}</h4>
        </div>
        <span class="status good">Activo</span>
      </div>
      <div class="pet-dash-meta">
        ${pet.age_years  ? `<span>🎂 ${pet.age_years} año${pet.age_years !== 1 ? 's' : ''}</span>` : ''}
        ${pet.weight_kg  ? `<span>⚖️ ${pet.weight_kg} kg</span>` : ''}
        ${pet.breed      ? `<span>🔖 ${pet.breed}</span>` : ''}
        ${pet.diet       ? `<span>🥗 ${pet.diet}</span>` : ''}
      </div>
      <div class="pet-dash-actions">
        <button class="edit-pet-btn"   data-id="${pet.id}" type="button">✏️ Editar</button>
        <button class="health-pet-btn-action" data-id="${pet.id}" type="button">❤️ Salud</button>
        <button class="delete-pet-btn danger" data-id="${pet.id}" type="button">🗑</button>
      </div>
    </div>`;

  card.querySelector('.edit-pet-btn').addEventListener('click', () => openPetModal(pet));
  card.querySelector('.health-pet-btn-action').addEventListener('click', () => {
    goToSection('salud');
    setTimeout(() => selectHealthPet(pet.id), 100);
  });
  card.querySelector('.delete-pet-btn').addEventListener('click', () => confirmDeletePet(pet));
  return card;
}

async function confirmDeletePet(pet) {
  if (!confirm(`¿Eliminar a ${pet.name}? Esta acción no se puede deshacer.`)) return;
  const { error } = await supabase.from('pets').update({ status: 'inactivo' }).eq('id', pet.id);
  if (error) { toast('Error eliminando mascota', 'error', '⚠️'); return; }
  toast(`${pet.name} fue eliminado/a`, 'info', '🗑');
  loadPets();
}

function populatePetSelects(pets) {
  ['#rPet', '#hPet', '#aPet'].forEach(sel => {
    const el = $(sel);
    if (!el) return;
    const first = el.querySelector('option')?.outerHTML || '';
    el.innerHTML = first + pets.map(p =>
      `<option value="${p.id}">${petEmojis[p.type] || '🐾'} ${p.name}</option>`
    ).join('');
  });

  const healthSel = $('#healthPetSelector');
  if (healthSel) {
    healthSel.innerHTML = pets.map(p => `
      <button class="health-pet-btn" data-id="${p.id}" type="button">
        ${petEmojis[p.type] || '🐾'} ${p.name}
      </button>`).join('');
    $$('.health-pet-btn').forEach(btn =>
      btn.addEventListener('click', () => selectHealthPet(btn.dataset.id))
    );
  }
}

/* ── Modal mascota ──────────────────────────── */
function openPetModal(pet = null) {
  const form = $('#petForm');
  form.reset();
  $('#petId').value       = pet?.id   || '';
  $('#pName').value       = pet?.name || '';
  $('#pType').value       = pet?.type || 'perro';
  $('#pBreed').value      = pet?.breed      || '';
  $('#pAge').value        = pet?.age_years  ?? '';
  $('#pWeight').value     = pet?.weight_kg  ?? '';
  $('#pDiet').value       = pet?.diet       || '';
  $('#pNotes').value      = pet?.notes      || '';
  $('#petModalTitle').textContent = pet ? `Editar a ${pet.name}` : 'Nueva mascota';

  const preview = $('#photoImg');
  if (pet?.photo_url) {
    preview.src = `${supabase.storageUrl}/object/public/pet-photos/${pet.photo_url}`;
    preview.hidden = false;
    $('#photoPlaceholder').hidden = true;
  } else {
    preview.hidden = true;
    $('#photoPlaceholder').hidden = false;
    $('#photoPlaceholder').textContent = petEmojis[pet?.type || 'perro'];
  }

  $('#petModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePetModal() {
  $('#petModal').classList.remove('open');
  document.body.style.overflow = '';
}

$('#addPetBtn').addEventListener('click',    () => openPetModal());
$('#closePetModal').addEventListener('click', closePetModal);
$('#cancelPetModal').addEventListener('click', closePetModal);
$('#petModal').addEventListener('click', e => { if (e.target === $('#petModal')) closePetModal(); });

/* Preview foto */
$('#photoInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    $('#photoImg').src = ev.target.result;
    $('#photoImg').hidden = false;
    $('#photoPlaceholder').hidden = true;
  };
  reader.readAsDataURL(file);
  $('#pType').dispatchEvent(new Event('change'));
});

$('#pType').addEventListener('change', () => {
  if (!$('#photoImg').hidden) return;
  $('#photoPlaceholder').textContent = petEmojis[$('#pType').value] || '🐾';
});

/* Guardar mascota */
$('#petForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#savePetBtn');
  setLoading(btn, true);

  const id   = $('#petId').value;
  const file = $('#photoInput').files[0];

  let photo_url = null;
  if (file) {
    const ext  = file.name.split('.').pop();
    const path = `${currentUser.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('pet-photos').upload(path, file, { upsert: true });
    if (upErr) { toast('Error subiendo foto', 'error', '⚠️'); setLoading(btn, false); return; }
    photo_url = path;
  }

  const payload = {
    user_id:    currentUser.id,
    name:       $('#pName').value.trim(),
    type:       $('#pType').value,
    breed:      $('#pBreed').value.trim() || null,
    age_years:  parseFloat($('#pAge').value)    || null,
    weight_kg:  parseFloat($('#pWeight').value) || null,
    diet:       $('#pDiet').value.trim()  || null,
    notes:      $('#pNotes').value.trim() || null,
    ...(photo_url && { photo_url }),
  };

  const { error } = id
    ? await supabase.from('pets').update(payload).eq('id', id)
    : await supabase.from('pets').insert(payload);

  if (error) { toast('Error guardando mascota', 'error', '⚠️'); }
  else {
    toast(id ? `${payload.name} actualizado/a ✓` : `${payload.name} agregado/a 🎉`, 'success', petEmojis[payload.type]);
    closePetModal();
    loadPets();
  }
  setLoading(btn, false);
});

/* ════════════════════════════════════════════
   RECORDATORIOS
════════════════════════════════════════════ */
async function loadReminders() {
  const { data } = await supabase
    .from('reminders').select('*, pets(name, type)')
    .eq('user_id', currentUser.id)
    .order('time_of_day', { ascending: true });

  renderReminders(data || []);
  const active = (data || []).filter(r => r.is_active).length;
  const badge  = $('#reminderBadge');
  if (active > 0) { badge.textContent = active; badge.removeAttribute('hidden'); }
  else badge.setAttribute('hidden', '');
}

function renderReminders(reminders) {
  const container = $('#reminderGroups');
  if (!reminders.length) {
    container.innerHTML = `<div class="empty-state"><span>🔔</span><p>No tienes recordatorios todavía</p></div>`;
    return;
  }

  const groups = {};
  reminders.forEach(r => {
    const key = r.pets?.name || 'General';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  container.innerHTML = Object.entries(groups).map(([name, items]) => `
    <div>
      <div class="reminder-group-title">
        ${petEmojis[items[0].pets?.type || ''] || '🔔'} ${name}
      </div>
      ${items.map(r => reminderRowHtml(r)).join('')}
    </div>
  `).join('');

  container.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id      = btn.dataset.id;
      const isOn    = btn.classList.contains('on');
      btn.classList.toggle('on', !isOn);
      btn.closest('.reminder-row').classList.toggle('inactive', isOn);
      await supabase.from('reminders').update({ is_active: !isOn }).eq('id', id);
      loadReminders();
    });
  });

  container.querySelectorAll('.delete-item-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este recordatorio?')) return;
      await supabase.from('reminders').delete().eq('id', btn.dataset.id);
      loadReminders();
      toast('Recordatorio eliminado', 'info', '🗑');
    });
  });
}

function reminderRowHtml(r) {
  const time = r.time_of_day ? r.time_of_day.slice(0,5) : '—';
  const freq = { diario:'Diario', semanal:'Semanal', mensual:'Mensual', unico:'Una vez' }[r.frequency] || r.frequency;
  return `
    <div class="reminder-row ${r.is_active ? '' : 'inactive'}">
      <span class="reminder-type-icon">${reminderIcons[r.type] || '🔔'}</span>
      <div class="reminder-info">
        <strong>${r.title}</strong>
        <span>${freq}</span>
      </div>
      <span class="reminder-time">${time}</span>
      <button class="toggle-btn ${r.is_active ? 'on' : ''}" data-id="${r.id}" type="button" title="Activar/desactivar"></button>
      <button class="delete-item-btn" data-id="${r.id}" type="button" title="Eliminar">🗑</button>
    </div>`;
}

$('#addReminderBtn').addEventListener('click', () => {
  $('#reminderForm').reset();
  $('#rTime').value = '08:00';
  $('#reminderModal').classList.add('open');
  document.body.style.overflow = 'hidden';
});
$('#closeReminderModal').addEventListener('click', closeReminderModal);
$('#cancelReminderModal').addEventListener('click', closeReminderModal);
$('#reminderModal').addEventListener('click', e => { if (e.target === $('#reminderModal')) closeReminderModal(); });

function closeReminderModal() {
  $('#reminderModal').classList.remove('open');
  document.body.style.overflow = '';
}

$('#reminderForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#saveReminderBtn');
  setLoading(btn, true);

  const petId = $('#rPet').value || null;
  const { error } = await supabase.from('reminders').insert({
    user_id:     currentUser.id,
    pet_id:      petId,
    title:       $('#rTitle').value.trim(),
    type:        $('#rType').value,
    time_of_day: $('#rTime').value || null,
    frequency:   $('#rFreq').value,
    is_active:   true,
  });

  if (error) toast('Error guardando recordatorio', 'error', '⚠️');
  else {
    toast('Recordatorio guardado ✓', 'success', '🔔');
    closeReminderModal();
    loadReminders();
  }
  setLoading(btn, false);
});

/* Auto-título recordatorio */
$('#rType').addEventListener('change', () => {
  const pet   = $('#rPet').options[$('#rPet').selectedIndex]?.text || '';
  const label = $('#rType').options[$('#rType').selectedIndex]?.text.split(' ').slice(1).join(' ') || '';
  const petName = pet !== 'Sin mascota específica' ? ` de ${pet}` : '';
  $('#rTitle').value = label + petName;
});
$('#rPet').addEventListener('change', () => $('#rType').dispatchEvent(new Event('change')));

/* ════════════════════════════════════════════
   SALUD
════════════════════════════════════════════ */
let selectedHealthPetId = null;

async function selectHealthPet(petId) {
  selectedHealthPetId = petId;
  $$('.health-pet-btn').forEach(b => b.classList.toggle('active', b.dataset.id === petId));

  const { data } = await supabase
    .from('health_records').select('*')
    .eq('pet_id', petId)
    .order('date', { ascending: false });

  const pet = petsCache.find(p => p.id === petId);
  renderHealthTimeline(data || [], pet);
}

function renderHealthTimeline(records, pet) {
  const content = $('#healthContent');
  if (!records.length) {
    content.innerHTML = `<div class="empty-state"><span>📋</span><p>No hay registros de salud para ${pet?.name || 'esta mascota'}</p></div>`;
    return;
  }
  const typeIcons = { peso:'⚖️', consulta:'🩺', cirugia:'🔬', examen:'📋', otro:'📝' };
  content.innerHTML = `<div class="health-timeline">${records.map(r => `
    <div class="timeline-item">
      <div class="timeline-dot ${r.type}">${typeIcons[r.type] || '📝'}</div>
      <div class="timeline-body">
        <strong>${r.type.charAt(0).toUpperCase() + r.type.slice(1)} ${r.value ? `— ${r.value} ${r.unit || (r.type === 'peso' ? 'kg' : '')}` : ''}</strong>
        <span>${fmtDate(r.date)}${r.vet_name ? ` · ${r.vet_name}` : ''}${r.clinic ? ` · ${r.clinic}` : ''}</span>
        ${r.notes ? `<p style="font-size:0.78rem;color:var(--text-2);margin-top:0.25rem">${r.notes}</p>` : ''}
      </div>
    </div>`).join('')}</div>`;
}

$('#addHealthBtn').addEventListener('click', () => {
  $('#healthForm').reset();
  $('#hDate').value = new Date().toISOString().split('T')[0];
  if (selectedHealthPetId) $('#hPet').value = selectedHealthPetId;
  $('#healthModal').classList.add('open');
  document.body.style.overflow = 'hidden';
});
$('#closeHealthModal').addEventListener('click', closeHealthModal);
$('#cancelHealthModal').addEventListener('click', closeHealthModal);
$('#healthModal').addEventListener('click', e => { if (e.target === $('#healthModal')) closeHealthModal(); });

function closeHealthModal() {
  $('#healthModal').classList.remove('open');
  document.body.style.overflow = '';
}

$('#healthForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#saveHealthBtn');
  setLoading(btn, true);

  const petId = $('#hPet').value;
  if (!petId) { toast('Selecciona una mascota', 'info', '⚠️'); setLoading(btn, false); return; }

  const { error } = await supabase.from('health_records').insert({
    pet_id:   petId,
    type:     $('#hType').value,
    value:    parseFloat($('#hValue').value) || null,
    date:     $('#hDate').value,
    vet_name: $('#hVet').value.trim()    || null,
    clinic:   $('#hClinic').value.trim() || null,
    notes:    $('#hNotes').value.trim()  || null,
  });

  if (error) toast('Error guardando registro', 'error', '⚠️');
  else {
    toast('Registro guardado ✓', 'success', '❤️');
    closeHealthModal();
    if (selectedHealthPetId === petId) selectHealthPet(petId);
  }
  setLoading(btn, false);
});

/* ════════════════════════════════════════════
   CITAS
════════════════════════════════════════════ */
async function loadAppointments() {
  const { data } = await supabase
    .from('appointments').select('*, pets(name, type)')
    .eq('user_id', currentUser.id)
    .order('date', { ascending: true });

  renderAppointments(data || []);
}

function renderAppointments(appts) {
  const list = $('#apptList');
  if (!appts.length) {
    list.innerHTML = `<div class="empty-state"><span>📅</span><p>No tienes citas agendadas</p></div>`;
    return;
  }
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  list.innerHTML = appts.map(a => {
    const d   = new Date(a.date);
    const pet = a.pets ? `${petEmojis[a.pets.type] || '🐾'} ${a.pets.name}` : '';
    return `
      <div class="appt-card">
        <div class="appt-date-block">
          <span class="appt-day">${d.getDate()}</span>
          <span class="appt-mon">${MESES[d.getMonth()]}</span>
        </div>
        <div class="appt-info">
          <strong>${a.title}</strong>
          <span>${pet ? pet + ' · ' : ''}${a.clinic || ''}${a.vet_name ? ' · ' + a.vet_name : ''} · ${d.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}</span>
        </div>
        <span class="appt-status ${a.status}">${a.status}</span>
      </div>`;
  }).join('');
}

$('#addApptBtn').addEventListener('click', () => {
  $('#apptForm').reset();
  const now = new Date();
  now.setMinutes(0);
  $('#aDate').value = now.toISOString().slice(0,16);
  $('#apptModal').classList.add('open');
  document.body.style.overflow = 'hidden';
});
$('#closeApptModal').addEventListener('click', closeApptModal);
$('#cancelApptModal').addEventListener('click', closeApptModal);
$('#apptModal').addEventListener('click', e => { if (e.target === $('#apptModal')) closeApptModal(); });

function closeApptModal() {
  $('#apptModal').classList.remove('open');
  document.body.style.overflow = '';
}

$('#apptForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#saveApptBtn');
  setLoading(btn, true);

  const { error } = await supabase.from('appointments').insert({
    user_id:  currentUser.id,
    pet_id:   $('#aPet').value  || null,
    title:    $('#aTitle').value.trim(),
    type:     $('#aType').value,
    date:     $('#aDate').value,
    clinic:   $('#aClinic').value.trim() || null,
    vet_name: $('#aVet').value.trim()    || null,
    status:   'pendiente',
  });

  if (error) toast('Error guardando cita', 'error', '⚠️');
  else {
    toast('Cita agendada ✓', 'success', '📅');
    closeApptModal();
    loadAppointments();
  }
  setLoading(btn, false);
});

/* Escape cierra modales */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closePetModal(); closeReminderModal(); closeHealthModal(); closeApptModal();
});

/* ── Arranque ───────────────────────────────── */
initDash();
