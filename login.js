/* FIRU · Login page logic */
import { signIn, signUp, getSession, onAuthChange } from './auth.js';

const $ = s => document.querySelector(s);

/* Si ya hay sesión, redirigir al inicio */
getSession().then(session => {
  if (session) window.location.href = 'index.html';
});

/* ── Tabs ─────────────────────────────────────── */
$$('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});
$$('.link-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.switch));
});

function switchTab(name) {
  $$('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  $('#loginForm').classList.toggle('hidden', name !== 'login');
  $('#registerForm').classList.toggle('hidden', name !== 'register');
  clearMsg();
}

function $$(s) { return [...document.querySelectorAll(s)]; }

/* ── Mensajes ─────────────────────────────────── */
function showMsg(text, type = 'error') {
  const el = $('#authMsg');
  el.textContent = text;
  el.className = `auth-msg ${type}`;
}
function clearMsg() {
  const el = $('#authMsg');
  el.className = 'auth-msg';
  el.textContent = '';
}

/* ── Mostrar / ocultar contraseña ─────────────── */
$$('.eye-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = $(`#${btn.dataset.target}`);
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? '👁' : '🙈';
  });
});

/* ── Selector de rol ──────────────────────────── */
$$('.role-card').forEach(card => {
  card.addEventListener('click', () => {
    $$('.role-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    card.querySelector('input[type=radio]').checked = true;

    const bizFields = $('#businessFields');
    if (card.dataset.role === 'business') {
      bizFields.removeAttribute('hidden');
      requestAnimationFrame(() => bizFields.classList.add('visible'));
    } else {
      bizFields.classList.remove('visible');
      setTimeout(() => bizFields.setAttribute('hidden', ''), 380);
    }
  });
});

/* ── Loading state ────────────────────────────── */
function setLoading(btn, loading) {
  btn.querySelector('.btn-text').hidden = loading;
  btn.querySelector('.btn-loader').hidden = !loading;
  btn.disabled = loading;
}

/* ── Login ────────────────────────────────────── */
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearMsg();
  const btn   = $('#loginBtn');
  const email = $('#loginEmail').value.trim();
  const pass  = $('#loginPassword').value;

  if (!email || !pass) return showMsg('Completa todos los campos.');

  setLoading(btn, true);
  try {
    await signIn(email, pass);
    showMsg('¡Bienvenido de vuelta! Redirigiendo…', 'success');
    setTimeout(() => window.location.href = 'index.html', 1000);
  } catch (err) {
    const msgs = {
      'Invalid login credentials': 'Correo o contraseña incorrectos.',
      'Email not confirmed':        'Confirma tu correo antes de entrar.',
    };
    showMsg(msgs[err.message] || 'Error al iniciar sesión. Intenta de nuevo.');
  } finally {
    setLoading(btn, false);
  }
});

/* ── Registro ─────────────────────────────────── */
$('#registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearMsg();
  const btn      = $('#registerBtn');
  const role     = $('input[name=role]:checked')?.value || 'owner';
  const fullName = $('#regName').value.trim();
  const email    = $('#regEmail').value.trim();
  const pass     = $('#regPassword').value;

  if (!fullName || !email || !pass) return showMsg('Completa todos los campos.');
  if (pass.length < 6) return showMsg('La contraseña debe tener al menos 6 caracteres.');

  const meta = {
    full_name: fullName,
    role,
    ...(role === 'business' && {
      biz_name:  $('#bizName').value.trim(),
      biz_type:  $('#bizType').value,
      biz_phone: $('#bizPhone').value.trim(),
    }),
  };

  setLoading(btn, true);
  try {
    await signUp(email, pass, meta);
    showMsg('¡Cuenta creada! Revisa tu correo para confirmar.', 'success');
    setTimeout(() => switchTab('login'), 2500);
  } catch (err) {
    const msgs = {
      'User already registered': 'Ya existe una cuenta con ese correo.',
    };
    showMsg(msgs[err.message] || 'Error al registrarse. Intenta de nuevo.');
  } finally {
    setLoading(btn, false);
  }
});

/* ── Olvidé contraseña ────────────────────────── */
$('#forgotLink')?.addEventListener('click', async e => {
  e.preventDefault();
  const email = $('#loginEmail').value.trim();
  if (!email) return showMsg('Escribe tu correo primero.', 'info');
  const { supabase } = await import('./supabase.js');
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return showMsg('No se pudo enviar el correo.');
  showMsg('Te enviamos un enlace para restablecer tu contraseña.', 'success');
});
