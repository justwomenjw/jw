/* js/i18n.js */
(function () {
  'use strict';

  console.log('[i18n] init');

  const STORAGE_KEY = 'jw-lang';
  const DEFAULT_LANG = 'en';
  const SUPPORTED = ['en', 'fa', 'ps', 'fr'];
  const RTL = ['fa', 'ps'];
  const LOCALES_PATH = "";

  const PAGE_ALIAS = {
    '': 'home', 'index': 'home', 'home': 'home',
    'about': 'about', 'media': 'media', 'education': 'education',
    'team': 'team', 'story': 'story', 'partner': 'partner','donate': 'donate', 'contact': 'contact'
  };

  let translations = {};
  let currentLang = DEFAULT_LANG;
  let currentPage = 'home';

  function detectPage() {
    const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const base = file.replace(/\.html?$/i, '') || 'index';
    return PAGE_ALIAS[base] || base;
  }

  function detectLanguage() {
    try {
      const q = new URLSearchParams(location.search).get('lang');
      if (SUPPORTED.includes(q)) return q;
      const s = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.includes(s)) return s;
      const b = (navigator.language || 'en').slice(0, 2);
      if (SUPPORTED.includes(b)) return b;
    } catch (e) { console.warn('[i18n] detectLanguage:', e); }
    return DEFAULT_LANG;
  }

  async function fetchJSON(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        console.warn(`[i18n] ${res.status} — ${url}`);
        return null;
      }
      return await res.json();
    } catch (e) {
      console.error(`[i18n] failed to load ${url}: ${e.message}`);
      return null;
    }
  }

  async function loadPageLanguage(lang) {
    currentPage = detectPage();
    const commonUrl = `${LOCALES_PATH}common_${lang}.json`;
    const pageUrl = `${LOCALES_PATH}${currentPage}_${lang}.json`;
    console.log(`[i18n] loading: ${commonUrl} + ${pageUrl}`);

    const [common, page] = await Promise.all([
      fetchJSON(commonUrl),
      fetchJSON(pageUrl)
    ]);

    if (!common && !page) {
      console.warn(`[i18n] no JSON found for "${currentPage}" in "${lang}" — English fallback in HTML will remain.`);
      translations = {};
      return false;
    }

    translations = Object.assign({}, common, page);
    console.log(`[i18n] loaded ${Object.keys(translations).length} keys for ${lang}/${currentPage}`);
    return true;
  }

  function applyTranslations() {
    let applied = 0;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (translations[k] != null) { el.textContent = translations[k]; applied++; }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const k = el.getAttribute('data-i18n-placeholder');
      if (translations[k] != null) el.setAttribute('placeholder', translations[k]);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const k = el.getAttribute('data-i18n-aria-label');
      if (translations[k] != null) el.setAttribute('aria-label', translations[k]);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const k = el.getAttribute('data-i18n-title');
      if (translations[k] != null) document.title = translations[k];
    });
    console.log(`[i18n] applied ${applied} translations`);
  }

  function applyDirection() {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = RTL.includes(currentLang) ? 'rtl' : 'ltr';
  }

  function updateSwitchers() {
    document.querySelectorAll('[data-lang-switch]').forEach(btn => {
      const active = btn.getAttribute('data-lang-switch') === currentLang;
      btn.setAttribute('aria-pressed', String(active));
      if (active) {
        btn.classList.add('text-[#D4AF63]');
        btn.classList.remove('text-white/70');
      } else {
        btn.classList.remove('text-[#D4AF63]');
        btn.classList.add('text-white/70');
      }
    });
  }
  async function load(lang) {
    if (!SUPPORTED.includes(lang)) {
      console.warn(`[i18n] unsupported language: ${lang}`);
      return;
    }
    console.log(`[i18n] switching to ${lang}`);
    await loadPageLanguage(lang);
    currentLang = lang;
    applyDirection();
    applyTranslations();
    updateSwitchers();
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.dispatchEvent(new CustomEvent('languagechange', {
      detail: { lang, page: currentPage }
    }));
  }

  window.i18n = {
    t: k => (translations[k] != null ? translations[k] : k),
    get lang() { return currentLang; },
    get page() { return currentPage; },
    setLanguage: l => load(l),
    reload: () => load(currentLang)
  };

  document.addEventListener('DOMContentLoaded', () => {
    load(detectLanguage());
    document.querySelectorAll('[data-lang-switch]').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang-switch');
        window.i18n.setLanguage(lang);
      });
    });
  });
})();