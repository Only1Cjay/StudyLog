/* ============================================================
   Studylog — Stage 1 app shell
   Theme, menu, toasts, offline banner, install prompt, version
   ============================================================ */

(() => {
  'use strict';

  const LS = {
    theme: 'studylog.theme',
    installDismissed: 'studylog.installDismissed'
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------------------------------------------------- */
  /* Theme                                                       */
  /* ---------------------------------------------------------- */
  const themeToggle = $('#themeToggle');
  const themeIcon = $('#themeIcon');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0D1410' : '#2F6F4E');
  }

  function initTheme() {
    const stored = localStorage.getItem(LS.theme) || 'light';
    applyTheme(stored);
  }

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem(LS.theme, next);
    applyTheme(next);
  });

  /* ---------------------------------------------------------- */
  /* Menu                                                        */
  /* ---------------------------------------------------------- */
  const menuBtn = $('#menuBtn');
  const menuDropdown = $('#menuDropdown');
  const menuBackdrop = $('#menuBackdrop');

  function openMenu() {
    menuDropdown.hidden = false;
    menuBackdrop.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    menuDropdown.hidden = true;
    menuBackdrop.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.hidden ? openMenu() : closeMenu();
  });

  menuBackdrop.addEventListener('click', closeMenu);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
      closeModal();
    }
  });

  // Menu actions — Stage 1: stubs with toasts so you can verify the shell
  $$('.menu-item').forEach((item) => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      closeMenu();
      handleMenuAction(action);
    });
  });

  function handleMenuAction(action) {
    switch (action) {
      case 'search':        toast('Search coming in Stage 5', { icon: 'fa-magnifying-glass' }); break;
      case 'calendar':      toast('Calendar coming in Stage 6', { icon: 'fa-calendar' }); break;
      case 'history':       toast('History coming in Stage 7', { icon: 'fa-clock-rotate-left' }); break;
      case 'reports':       toast('Reports coming in Stage 8', { icon: 'fa-chart-simple' }); break;
      case 'settings':      toast('Settings coming in Stage 9', { icon: 'fa-gear' }); break;
      case 'backup':        toast('Backup coming in Stage 9', { icon: 'fa-cloud-arrow-up' }); break;
      case 'restore':       toast('Restore coming in Stage 9', { icon: 'fa-cloud-arrow-down' }); break;
      case 'import-csv':    toast('Import coming in Stage 9', { icon: 'fa-file-import' }); break;
      case 'export-csv':    toast('Export coming in Stage 9', { icon: 'fa-file-export' }); break;
      case 'print':         window.print(); break;
      case 'compact':       document.body.classList.toggle('compact'); break;
      case 'clear-completed': toast('Clear completed coming in Stage 9', { icon: 'fa-trash-can' }); break;
    }
  }

  /* ---------------------------------------------------------- */
  /* Toast system                                                */
  /* ---------------------------------------------------------- */
  const toastStack = $('#toastStack');
  const MAX_TOASTS = 3;

  function toast(message, opts = {}) {
    const {
      icon = 'fa-circle-info',
      type = 'info',       // info | success | error | warn
      duration = 5000,
      action = null,       // { label, onClick }
      persist = false
    } = opts;

    // Cap stack
    const existing = $$('.toast', toastStack);
    if (existing.length >= MAX_TOASTS) {
      dismissToast(existing[0]);
    }

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <i class="fa-solid ${icon} toast-icon"></i>
      <span class="toast-msg"></span>
      ${action ? '<button class="toast-action"></button>' : ''}
      <button class="toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>
    `;
    el.querySelector('.toast-msg').textContent = message;

    if (action) {
      const btn = el.querySelector('.toast-action');
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        action.onClick?.();
        dismissToast(el);
      });
    }

    el.querySelector('.toast-close').addEventListener('click', () => dismissToast(el));

    toastStack.appendChild(el);

    if (!persist && duration > 0) {
      el._timer = setTimeout(() => dismissToast(el), duration);
    }

    return el;
  }

  function dismissToast(el) {
    if (!el || el._dismissed) return;
    el._dismissed = true;
    clearTimeout(el._timer);
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 240);
  }

  /* ---------------------------------------------------------- */
  /* Modal system                                                */
  /* ---------------------------------------------------------- */
  const modalRoot = $('#modalRoot');
  const modalSlot = $('#modalSlot');
  const modalBackdrop = $('#modalBackdrop');

  function openModal(contentEl) {
    modalSlot.innerHTML = '';
    modalSlot.appendChild(contentEl);
    modalRoot.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (modalRoot.hidden) return;
    modalRoot.hidden = true;
    modalSlot.innerHTML = '';
    document.body.style.overflow = '';
  }

  modalBackdrop.addEventListener('click', closeModal);

  /* ---------------------------------------------------------- */
  /* Offline banner                                              */
  /* ---------------------------------------------------------- */
  const offlineBanner = $('#offlineBanner');

  function updateOnlineStatus() {
    offlineBanner.classList.toggle('show', !navigator.onLine);
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  /* ---------------------------------------------------------- */
  /* Install prompt                                              */
  /* ---------------------------------------------------------- */
  const installBanner = $('#installBanner');
  const installAccept = $('#installAccept');
  const installDismiss = $('#installDismiss');
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (localStorage.getItem(LS.installDismissed) !== '1') {
      installBanner.hidden = false;
    }
  });

  installAccept.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBanner.hidden = true;
    toast(outcome === 'accepted' ? 'Installing…' : 'Install dismissed', {
      type: outcome === 'accepted' ? 'success' : 'info',
      icon: 'fa-circle-down'
    });
  });

  installDismiss.addEventListener('click', () => {
    installBanner.hidden = true;
    localStorage.setItem(LS.installDismissed, '1');
  });

  /* ---------------------------------------------------------- */
  /* Service worker + version                                    */
  /* ---------------------------------------------------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast(reg);
            }
          });
        });

        // Periodic update check (every 30 min)
        setInterval(() => reg.update(), 30 * 60 * 1000);

      }).catch((err) => {
        console.warn('SW registration failed:', err);
      });
    });
  }

  function showUpdateToast(reg) {
    const menuBadge = $('#menuBadge');

    const el = toast('New version available', {
      icon: 'fa-arrows-rotate',
      type: 'info',
      persist: true,
      action: {
        label: 'Refresh',
        onClick: () => {
          reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
          setTimeout(() => window.location.reload(), 200);
        }
      }
    });

    // After 30s, collapse to badge on hamburger
    setTimeout(() => {
      if (el && !el._dismissed) {
        dismissToast(el);
        menuBadge.hidden = false;
      }
    }, 30000);

    // Re-open from badge
    menuBadge.onclick = null;
    const reopen = () => {
      menuBadge.hidden = true;
      showUpdateToast(reg);
    };
    menuBadge.addEventListener('click', reopen, { once: true });
  }

  // Handle controller change (SW activated new version)
  let refreshing = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  /* ---------------------------------------------------------- */
  /* Summary cards = filters (Stage 2 will render the list)      */
  /* ---------------------------------------------------------- */
  let activeFilter = 'all';

  const filterLabels = {
    all: 'All topics',
    completed: 'Completed',
    inprogress: 'In Progress',
    notstarted: 'Not Started'
  };

  $$('.summary-card').forEach((card) => {
    card.addEventListener('click', () => {
      const f = card.dataset.filter;
      // Toggle off if already active (and not "all")
      activeFilter = (f === activeFilter && f !== 'all') ? 'all' : f;
      applyFilterUI();
    });
  });

  function applyFilterUI() {
    $$('.summary-card').forEach((card) => {
      const isActive = card.dataset.filter === activeFilter;
      card.setAttribute('aria-pressed', String(isActive));
    });

    const chipRow = $('#filterChipRow');
    const chipLabel = $('#filterChipLabel');
    if (activeFilter === 'all') {
      chipRow.hidden = true;
    } else {
      chipRow.hidden = false;
      chipLabel.textContent = filterLabels[activeFilter];
    }

    // Stage 2 will call renderList() here
    document.dispatchEvent(new CustomEvent('filter:change', { detail: { filter: activeFilter } }));
  }

  $('#filterChip').addEventListener('click', () => {
    activeFilter = 'all';
    applyFilterUI();
  });

  /* ---------------------------------------------------------- */
  /* Public API for later stages                                 */
  /* ---------------------------------------------------------- */
  window.Studylog = {
    toast,
    dismissToast,
    openModal,
    closeModal,
    getFilter: () => activeFilter,
    setFilter: (f) => { activeFilter = f; applyFilterUI(); }
  };

  /* ---------------------------------------------------------- */
  /* Init                                                        */
  /* ---------------------------------------------------------- */
  initTheme();
  applyFilterUI();

})();
