(() => {
  const key = 'portfolio-theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  let choice;
  try { choice = localStorage.getItem(key); } catch {}
  function apply() {
    const dark = choice === 'dark' || (choice !== 'light' && system.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      toggle.hidden = false;
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
      toggle.textContent = dark ? '☀' : '☾';
    }
  }
  apply();
  system.addEventListener('change', apply);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { choice = event.newValue; apply(); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
      choice = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, choice); } catch {}
      apply();
    });
  });
})();
