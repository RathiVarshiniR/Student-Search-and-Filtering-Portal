// If already signed in with a valid token, skip straight to the portal.
(async function checkExistingSession() {
  const token = sessionStorage.getItem('token');
  if (!token) return;
  try {
    const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) window.location.href = 'index.html';
  } catch (_) { /* stay on login */ }
})();

const form = document.getElementById('loginForm');
const errorEl = document.getElementById('authError');
const loginBtn = document.getElementById('loginBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.error || 'Sign in failed');
    }

    sessionStorage.setItem('token', body.token);
    sessionStorage.setItem('user', JSON.stringify(body.user));
    window.location.href = 'index.html';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign in';
  }
});
