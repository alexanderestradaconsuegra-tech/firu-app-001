/* FIRU · Business panel logic */
import { supabase }            from './supabase.js';
import { signOut, getSession } from './auth.js';

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function toast(msg, type = 'info', icon = '🔔') {
  const c = $('#toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="t-icon">${icon}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => { el.classList.add('hiding'); el.addEventListener('animationend', () => el.remove(), { once: true }); }, 3400);
}

function setLoading(btn, on) {
  btn.querySelector('.btn-text').hidden = on;
  btn.querySelector('.btn-loader').hidden = !on;
  btn.disabled = on;
}

const chipMap  = { clinica: 'teal', tienda: 'alt', servicio: 'cyan' };
const labelMap = { clinica: 'Clínica', tienda: 'Tienda', servicio: 'Servicio' };
const emojiMap = { clinica: '🏥', tienda: '🛍️', servicio: '✂️' };
const MESES    = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

/* ── Sesión ─────────────────────────────────── */
let currentUser = null;
let listingId   = null;

async function initBusiness() {
  const session = await getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  currentUser = session.user;
  const meta  = currentUser.user_metadata || {};
  if (meta.role !== 'business') { window.location.href = 'dashboard.html'; return; }

  $('#userName').textContent = meta.full_name || currentUser.email.split('@')[0];

  await loadListing();
  loadBizAppointments();
  loadReviews();
  loadBizNotifSettings();
}

$('#logoutBtn')?.addEventListener('click', async () => { await signOut(); window.location.href = 'index.html'; });

/* ── Nav ────────────────────────────────────── */
$$('.dash-nav-item, .bottom-nav-item').forEach(btn =>
  btn.addEventListener('click', () => {
    const s = btn.dataset.section;
    $$('.dash-section').forEach(el => el.classList.remove('active'));
    $$('.dash-nav-item, .bottom-nav-item').forEach(b => b.classList.toggle('active', b.dataset.section === s));
    $(`#sec-${s}`)?.classList.add('active');
  })
);

/* ════════════════════════════════════════════
   PERFIL / LISTING
════════════════════════════════════════════ */
async function loadListing() {
  const { data } = await supabase
    .from('directory').select('*')
    .eq('owner_id', currentUser.id)
    .single();

  if (data) {
    listingId = data.id;
    fillForm(data);
    updatePreview(data);
    updatePlanBadge(data.plan || 'free');
    updatePlanStats(data);
  } else {
    prefillFromMeta();
  }
}

function fillForm(d) {
  $('#bName').value      = d.name        || '';
  $('#bType').value      = d.type        || 'clinica';
  $('#bDesc').value      = d.description || '';
  $('#bPhone').value     = d.phone       || '';
  $('#bWebsite').value   = d.website     || '';
  $('#bAddress').value   = d.address     || '';
  $('#bHours').value     = d.hours       || '';
  $('#bPriceModel').value = d.price_model || '';

  if (d.logo_url) {
    $('#logoImg').src    = `${supabase.storageUrl}/storage/v1/object/public/business-logos/${d.logo_url}`;
    $('#logoImg').hidden = false;
    $('#logoEmoji').hidden = true;
  }
}

function prefillFromMeta() {
  const meta = currentUser.user_metadata || {};
  if (meta.biz_name)  $('#bName').value  = meta.biz_name;
  if (meta.biz_type)  $('#bType').value  = meta.biz_type;
  if (meta.biz_phone) $('#bPhone').value = meta.biz_phone;
}

function updatePreview(data) {
  const chip  = chipMap[data.type]  || '';
  const label = labelMap[data.type] || 'Negocio';
  $('#previewChip').className   = `chip ${chip}`;
  $('#previewChip').textContent = label;
  $('#previewName').textContent = data.name        || 'Tu negocio';
  $('#previewDesc').textContent = data.description || 'Tu descripción aparecerá aquí';
  $('#previewPrice').textContent = data.price_model || '—';
  $('#bizNameHeader').textContent = data.name || 'Mi negocio';
  $('#previewLogo').textContent = emojiMap[data.type] || '🏥';

  if (data.logo_url) {
    const img = $('#previewLogo').querySelector('img') || document.createElement('img');
    img.src = `${supabase.storageUrl}/storage/v1/object/public/business-logos/${data.logo_url}`;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;border-radius:inherit';
    $('#previewLogo').style.position = 'relative';
    if (!img.parentNode) $('#previewLogo').appendChild(img);
  }
}

function updatePlanBadge(plan) {
  const badge = $('#planBadge');
  badge.textContent = plan === 'premium' ? '⭐ Premium' : 'Free';
  badge.className   = `plan-badge ${plan}`;
}

function updatePlanStats(data) {
  $('#statViews').textContent  = data.views_count   || 0;
  $('#statRating').textContent = data.rating        || '—';
  const planBadgeEl = $('#planCurrent').querySelector('.plan-current-badge');
  if (planBadgeEl) {
    planBadgeEl.textContent = data.plan === 'premium' ? '⭐ Plan Premium' : 'Plan Free';
    planBadgeEl.className = `plan-current-badge ${data.plan || 'free'}`;
  }
  if (data.type === 'tienda' || data.type === 'servicio') {
    $('#premiumPrice').textContent = '$19';
  }
}

/* Logo preview */
$('#logoInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    $('#logoImg').src    = ev.target.result;
    $('#logoImg').hidden = false;
    $('#logoEmoji').hidden = true;
  };
  reader.readAsDataURL(file);
});

/* Live preview mientras escribe */
['#bName','#bDesc','#bPriceModel','#bType'].forEach(id => {
  $(id)?.addEventListener('input', () => {
    updatePreview({
      name:         $('#bName').value,
      type:         $('#bType').value,
      description:  $('#bDesc').value,
      price_model:  $('#bPriceModel').value,
      logo_url:     null,
    });
  });
});

/* Services toggle */
$$('.service-tag').forEach(tag => {
  tag.addEventListener('click', () => tag.classList.toggle('checked'));
});

/* Guardar perfil */
$('#saveProfileBtn').addEventListener('click', async () => {
  const btn = $('#saveProfileBtn');
  setLoading(btn, true);

  let logo_url = null;
  const file   = $('#logoInput').files[0];

  if (file) {
    const ext  = file.name.split('.').pop();
    const path = `${currentUser.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('business-logos').upload(path, file, { upsert: true });
    if (upErr) { toast('Error subiendo logo', 'error', '⚠️'); setLoading(btn, false); return; }
    logo_url = path;
  }

  const services = $$('.service-tag.checked').map(t => t.querySelector('input').value);

  const payload = {
    owner_id:    currentUser.id,
    name:        $('#bName').value.trim(),
    type:        $('#bType').value,
    description: $('#bDesc').value.trim()      || null,
    phone:       $('#bPhone').value.trim()     || null,
    website:     $('#bWebsite').value.trim()   || null,
    address:     $('#bAddress').value.trim()   || null,
    hours:       $('#bHours').value.trim()     || null,
    price_model: $('#bPriceModel').value.trim() || null,
    is_active:   true,
    ...(logo_url && { logo_url }),
    ...(services.length && { description: $('#bDesc').value.trim() + (services.length ? `\n\nServicios: ${services.join(', ')}` : '') }),
  };

  let error;
  if (listingId) {
    ({ error } = await supabase.from('directory').update(payload).eq('id', listingId));
  } else {
    const { data, error: insErr } = await supabase.from('directory').insert(payload).select().single();
    error     = insErr;
    listingId = data?.id;
  }

  if (error) { toast('Error guardando perfil', 'error', '⚠️'); }
  else {
    toast('Perfil actualizado ✓', 'success', '🏪');
    updatePreview(payload);
    $('#bizNameHeader').textContent = payload.name || 'Mi negocio';
  }
  setLoading(btn, false);
});

/* ════════════════════════════════════════════
   CITAS RECIBIDAS
════════════════════════════════════════════ */
let allBizAppts = [];

async function loadBizAppointments() {
  if (!listingId) return;
  const { data } = await supabase
    .from('appointments').select('*, pets(name, type)')
    .eq('business_id', listingId)
    .order('date', { ascending: true });

  allBizAppts = data || [];
  renderBizAppts(allBizAppts);

  const pending = allBizAppts.filter(a => a.status === 'pendiente').length;
  const badge   = $('#citasBadge');
  if (pending) { badge.textContent = pending; badge.removeAttribute('hidden'); }
  else badge.setAttribute('hidden', '');
  $('#statCitas').textContent = allBizAppts.length;
}

function renderBizAppts(appts) {
  const list = $('#bizApptList');
  if (!appts.length) {
    list.innerHTML = `<div class="empty-state"><span>📅</span><p>No tienes citas recibidas aún</p></div>`;
    return;
  }
  list.innerHTML = appts.map(a => {
    const d   = new Date(a.date);
    const pet = a.pets ? `🐾 ${a.pets.name}` : '';
    return `
      <div class="biz-appt-card ${a.status}">
        <div class="biz-appt-info">
          <strong>${a.title}</strong>
          <span>${d.getDate()} ${MESES[d.getMonth()]} · ${d.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}</span>
          <span>${pet}${a.vet_name ? ' · ' + a.vet_name : ''}</span>
        </div>
        <div class="biz-appt-actions">
          <span class="appt-status ${a.status}">${a.status}</span>
          ${a.status === 'pendiente' ? `
            <button class="appt-action-btn confirm" data-id="${a.id}" data-action="completada" type="button">✓ Confirmar</button>
            <button class="appt-action-btn cancel"  data-id="${a.id}" data-action="cancelada"  type="button">✗ Cancelar</button>
          ` : ''}
          ${a.status === 'completada' ? `<button class="appt-action-btn complete" data-id="${a.id}" data-action="pendiente" type="button">↩ Reabrir</button>` : ''}
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabase.from('appointments').update({ status: btn.dataset.action }).eq('id', btn.dataset.id);
      loadBizAppointments();
    });
  });
}

/* Filtros citas */
$$('.biz-appt-filters .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.biz-appt-filters .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const s = btn.dataset.status;
    renderBizAppts(s === 'all' ? allBizAppts : allBizAppts.filter(a => a.status === s));
  });
});

/* ════════════════════════════════════════════
   RESEÑAS
════════════════════════════════════════════ */
async function loadReviews() {
  if (!listingId) return;
  const { data } = await supabase
    .from('reviews').select('*')
    .eq('directory_id', listingId)
    .order('created_at', { ascending: false });

  renderReviews(data || []);
}

function renderReviews(reviews) {
  if (!reviews.length) return;

  const total = reviews.length;
  const avg   = (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1);
  const counts = [5,4,3,2,1].map(n => reviews.filter(r => r.rating === n).length);

  $('#ratingBig').textContent  = avg;
  $('#ratingTotal').textContent = `${total} reseña${total !== 1 ? 's' : ''}`;
  $('#statRating').textContent  = avg;

  $('#ratingBars').innerHTML = counts.map((c, i) => `
    <div class="rating-bar-row">
      <span>${5 - i}★</span>
      <div class="rating-bar-track">
        <div class="rating-bar-fill" style="width:${total ? Math.round(c/total*100) : 0}%"></div>
      </div>
      <span>${c}</span>
    </div>`).join('');

  $('#reviewList').innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-head">
        <span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
        <span class="review-date">${new Date(r.created_at).toLocaleDateString('es',{day:'2-digit',month:'short',year:'numeric'})}</span>
      </div>
      <p class="review-body">${r.comment || '(Sin comentario)'}</p>
      ${r.reply ? `
        <div class="review-reply">
          <strong>Tu respuesta</strong>
          ${r.reply}
        </div>` : `
        <div class="reply-form">
          <input type="text" placeholder="Responder a esta reseña…" data-review="${r.id}" />
          <button type="button" data-review="${r.id}">Responder</button>
        </div>`}
    </div>`).join('');

  $('#reviewList').querySelectorAll('.reply-form button').forEach(btn => {
    btn.addEventListener('click', async () => {
      const input = btn.previousElementSibling;
      const reply = input.value.trim();
      if (!reply) return;
      await supabase.from('reviews').update({ reply }).eq('id', btn.dataset.review);
      toast('Respuesta publicada ✓', 'success', '⭐');
      loadReviews();
    });
  });
}

/* ════════════════════════════════════════════
   PLAN — upgrade CTA
════════════════════════════════════════════ */
$('#upgradePlanBtn')?.addEventListener('click', () => {
  toast('Próximamente: activación de plan Premium con pago en línea 🚀', 'info', '💳');
});

/* ════════════════════════════════════════════
   NOTIFICACIONES — configuración
════════════════════════════════════════════ */
async function loadBizNotifSettings() {
  const { data } = await supabase
    .from('profiles')
    .select('notification_email, notification_phone, n8n_webhook_url, notif_appointments')
    .eq('id', currentUser.id)
    .single();

  if (!data) return;
  const set = (id, val) => { const el = document.querySelector(id); if (el) el.value = val || ''; };
  set('#n8nWebhook', data.n8n_webhook_url);
  set('#notifEmail',  data.notification_email);
  set('#notifPhone',  data.notification_phone);
  document.querySelector('#toggleBizAppts')?.classList.toggle('on', data.notif_appointments !== false);
  document.querySelector('#toggleBizReviews')?.classList.toggle('on', true);
}

['#toggleBizAppts', '#toggleBizReviews'].forEach(id =>
  document.querySelector(id)?.addEventListener('click', () =>
    document.querySelector(id).classList.toggle('on')
  )
);

document.querySelector('#saveNotifBtn')?.addEventListener('click', async () => {
  const btn = document.querySelector('#saveNotifBtn');
  setLoading(btn, true);

  const { error } = await supabase.from('profiles').update({
    n8n_webhook_url:    document.querySelector('#n8nWebhook')?.value.trim() || null,
    notification_email: document.querySelector('#notifEmail')?.value.trim()  || null,
    notification_phone: document.querySelector('#notifPhone')?.value.trim()  || null,
    notif_appointments: document.querySelector('#toggleBizAppts')?.classList.contains('on'),
  }).eq('id', currentUser.id);

  if (error) toast('Error guardando configuración', 'error', '⚠️');
  else toast('Configuración guardada ✓', 'success', '⚙️');
  setLoading(btn, false);
});

document.querySelector('#testWebhookBtn')?.addEventListener('click', async () => {
  const url = document.querySelector('#n8nWebhook')?.value.trim();
  if (!url) return toast('Ingresa la URL del webhook primero', 'info', '⚠️');
  const btn = document.querySelector('#testWebhookBtn');
  setLoading(btn, true);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:       'test',
        title:      '🧪 Prueba de conexión FIRU Negocios',
        owner_name: currentUser.user_metadata?.full_name || 'Negocio',
        email:      document.querySelector('#notifEmail')?.value.trim() || currentUser.email,
        pet_name:   'Cliente de prueba',
        date:       new Date().toLocaleDateString('es'),
        time:       new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
        message:    'Conexión con FIRU Negocios funcionando ✓',
      }),
    });
    if (res.ok) toast('¡Conexión exitosa! Revisa tu n8n', 'success', '✅');
    else        toast('El webhook respondió con error.', 'error', '⚠️');
  } catch (_) {
    toast('No se pudo conectar al webhook. Verifica la URL.', 'error', '⚠️');
  }
  setLoading(btn, false);
});

/* ── Arranque ───────────────────────────────── */
initBusiness();
