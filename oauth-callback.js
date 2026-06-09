/* FIRU · OAuth callback handler */
import { supabase } from './supabase.js';

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function show(id) {
  ['stateLoading', 'stateRole', 'stateError'].forEach(sid =>
    $(sid) && ($(sid).hidden = sid !== id)
  );
}

function redirectByRole(role) {
  window.location.replace(role === 'business' ? 'business.html' : 'dashboard.html');
}

async function handleNewUser(user) {
  show('stateRole');

  const fullName = user.user_metadata?.full_name
                || user.user_metadata?.name
                || user.email?.split('@')[0]
                || '';

  $$('.cb-role-card').forEach(card => {
    const activate = () => {
      $$('.cb-role-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      card.querySelector('input[type=radio]').checked = true;
    };
    card.addEventListener('click', activate);
    card.addEventListener('keydown', e => e.key === 'Enter' && activate());
  });

  $('#continueBtn')?.addEventListener('click', async () => {
    const selectedRole = $('input[name=cbRole]:checked')?.value;
    if (!selectedRole) return;

    const btn = $('#continueBtn');
    btn.querySelector('.btn-text').hidden = true;
    btn.querySelector('.btn-loader').hidden = false;
    btn.disabled = true;

    await supabase.auth.updateUser({
      data: { role: selectedRole, full_name: fullName },
    });

    await supabase.from('profiles').upsert(
      { id: user.id, full_name: fullName, role: selectedRole },
      { onConflict: 'id' }
    );

    redirectByRole(selectedRole);
  });
}

async function init() {
  const errorTimer = setTimeout(() => show('stateError'), 12000);

  try {
    // Check for existing session (returning user or fast exchange)
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      clearTimeout(errorTimer);
      const role = session.user.user_metadata?.role;
      if (role) { redirectByRole(role); return; }
      await handleNewUser(session.user);
      return;
    }

    // Wait for Supabase to exchange the OAuth code in the URL
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' || !session) return;
      clearTimeout(errorTimer);
      const role = session.user.user_metadata?.role;
      if (role) { redirectByRole(role); return; }
      await handleNewUser(session.user);
    });

  } catch (e) {
    clearTimeout(errorTimer);
    show('stateError');
  }
}

init();
