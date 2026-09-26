/* ============================================================
   Studylog — app shell + Stage 2/3/4 (data, list, form, detail)
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
  /* State                                                       */
  /* ---------------------------------------------------------- */
  const state = {
    topics: [],
    filter: 'all',      // all | completed | inprogress | notstarted
    editingId: null     // when the form is open for edit
  };

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
      case 'export-csv':    exportCSV(); break;
      case 'print':         window.print(); break;
      case 'compact':       document.body.classList.toggle('compact'); break;
      case 'clear-completed': clearCompleted(); break;
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
      type = 'info',
      duration = 5000,
      action = null,
      persist = false
    } = opts;

    const existing = $$('.toast', toastStack);
    if (existing.length >= MAX_TOASTS) dismissToast(existing[0]);

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
  /* Service worker + update toast                               */
  /* ---------------------------------------------------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast(reg);
            }
          });
        });
        setInterval(() => reg.update(), 30 * 60 * 1000);
      }).catch((err) => console.warn('SW registration failed:', err));
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

    setTimeout(() => {
      if (el && !el._dismissed) {
        dismissToast(el);
        menuBadge.hidden = false;
      }
    }, 30000);

    menuBadge.addEventListener('click', () => {
      menuBadge.hidden = true;
      showUpdateToast(reg);
    }, { once: true });
  }

  let refreshing = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  /* ---------------------------------------------------------- */
  /* Data → state                                                */
  /* ---------------------------------------------------------- */
  function refreshData() {
    state.topics = Storage.getAll();
    renderAll();
  }

  function renderAll() {
    renderStats();
    renderStreak();
    renderList();
  }

  function renderStats() {
    const t = state.topics;
    const total = t.length;
    const completed = t.filter((x) => Storage.deriveStatus(x) === 'completed').length;
    const inprogress = t.filter((x) => Storage.deriveStatus(x) === 'inprogress').length;

    $('#statTotal').textContent = total;
    $('#statDone').textContent = completed;
    $('#statProg').textContent = inprogress;

    // Update "all" card label to reflect total
    const allCard = $('.summary-card[data-filter="all"] .summary-lbl');
    if (allCard) allCard.textContent = total === 1 ? 'Topic' : 'Topics';
  }

  function renderStreak() {
    $('#streakCount').textContent = Storage.getStreak();
  }

  /* ---------------------------------------------------------- */
  /* Filtering                                                   */
  /* ---------------------------------------------------------- */
  const FILTER_LABELS = {
    all: 'All topics',
    completed: 'Completed',
    inprogress: 'In Progress',
    notstarted: 'Not Started'
  };

  $$('.summary-card').forEach((card) => {
    card.addEventListener('click', () => {
      const f = card.dataset.filter;
      state.filter = (f === state.filter && f !== 'all') ? 'all' : f;
      applyFilterUI();
      renderList();
    });
  });

  $('#filterChip').addEventListener('click', () => {
    state.filter = 'all';
    applyFilterUI();
    renderList();
  });

  function applyFilterUI() {
    $$('.summary-card').forEach((card) => {
      const isActive = card.dataset.filter === state.filter;
      card.setAttribute('aria-pressed', String(isActive));
    });

    const chipRow = $('#filterChipRow');
    const chipLabel = $('#filterChipLabel');
    if (state.filter === 'all') {
      chipRow.hidden = true;
    } else {
      chipRow.hidden = false;
      chipLabel.textContent = FILTER_LABELS[state.filter];
    }
  }

  function getVisibleTopics() {
    if (state.filter === 'all') return state.topics;
    return state.topics.filter((t) => Storage.deriveStatus(t) === state.filter);
  }

  /* ---------------------------------------------------------- */
  /* Rendering the list                                          */
  /* ---------------------------------------------------------- */
  const topicList = $('#topicList');

  const EMPTY_STATES = {
    all: {
      title: 'No topics yet',
      sub: 'Tap <strong>Add Topic</strong> to start tracking.',
      icon: 'book'
    },
    completed: {
      title: 'Nothing completed yet',
      sub: 'Finish all 4 steps on a topic to see it here.',
      icon: 'check'
    },
    inprogress: {
      title: 'Nothing in progress',
      sub: 'Start a topic to see it here.',
      icon: 'clock'
    },
    notstarted: {
      title: 'All caught up',
      sub: 'Every topic has been started. Nice.',
      icon: 'star'
    }
  };

  function renderList() {
    const visible = getVisibleTopics();
    topicList.innerHTML = '';

    if (!visible.length) {
      topicList.innerHTML = emptyStateHTML(state.filter);
      return;
    }

    visible.forEach((t) => topicList.appendChild(renderCard(t)));
  }

  function emptyStateHTML(filterKey) {
    const e = EMPTY_STATES[filterKey] || EMPTY_STATES.all;
    const icons = {
      book: `<svg class="empty-icon" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="24" y="30" width="72" height="60" rx="8" stroke="currentColor" stroke-width="3"/><path d="M24 46h72" stroke="currentColor" stroke-width="3"/><path d="M40 30v16M80 30v16" stroke="currentColor" stroke-width="3"/><path d="M48 66h24M48 76h16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
      check: `<svg class="empty-icon" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="38" stroke="currentColor" stroke-width="3"/><path d="M42 60l12 12 24-24" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      clock: `<svg class="empty-icon" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="38" stroke="currentColor" stroke-width="3"/><path d="M60 40v22l14 8" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`,
      star:  `<svg class="empty-icon" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M60 26l10 22 24 3-18 17 5 24-21-12-21 12 5-24-18-17 24-3 10-22z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>`
    };
    return `
      <div class="empty-state">
        ${icons[e.icon] || icons.book}
        <div class="empty-title">${e.title}</div>
        <div class="empty-sub">${e.sub}</div>
      </div>`;
  }

  function renderCard(t) {
    const status = Storage.deriveStatus(t);
    const done = Storage.stepsDoneCount(t);
    const pct = Math.round((done / 4) * 100);
    const color = Storage.subjectColor(t.subject);

    const card = document.createElement('article');
    card.className = `topic-card ${status}`;
    card.dataset.id = t.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const checksHTML = Storage.STEP_KEYS.map((key) => {
      const step = t.steps[key];
      return `
        <label class="step-check" data-step="${key}">
          <input type="checkbox" ${step.done ? 'checked' : ''} tabindex="-1">
          <span class="step-box"><i class="fa-solid fa-check"></i></span>
          <span class="step-label">${Storage.STEP_LABELS[key]}</span>
        </label>`;
    }).join('');

    card.innerHTML = `
      <div class="card-top">
        <div class="subject-line">
          <span class="subject-dot" style="background:${color}"></span>
          <span class="subject-name">${escapeHTML(t.subject)}</span>
        </div>
        <button class="card-menu-btn" aria-label="Topic actions" tabindex="0">
          <i class="fa-solid fa-ellipsis"></i>
        </button>
      </div>
      <h3 class="topic-title">${escapeHTML(t.topic) || '<span class="muted">Untitled</span>'}</h3>
      <div class="status-row">
        <span class="status-pill">${statusLabel(status)}</span>
        <span class="step-count">${done}/4</span>
      </div>
      <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
      <div class="checks">${checksHTML}</div>
    `;

    // Checkbox toggle — stop propagation so it doesn't open detail view
    card.querySelectorAll('.step-check').forEach((label) => {
      label.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      label.querySelector('input').addEventListener('change', (e) => {
        e.stopPropagation();
        toggleStep(t.id, label.dataset.step);
      });
    });

    // Card menu button — stop propagation
    const menuBtnEl = card.querySelector('.card-menu-btn');
    menuBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      openCardMenu(t, menuBtnEl);
    });

    // Card tap → detail view
    card.addEventListener('click', () => openDetail(t.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetail(t.id);
      }
    });

    return card;
  }

  function statusLabel(status) {
    return status === 'completed' ? 'Completed'
         : status === 'inprogress' ? 'In Progress'
         : 'Not Started';
  }

  function escapeHTML(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------------------------------------------------------- */
  /* Toggle a step                                               */
  /* ---------------------------------------------------------- */
  function toggleStep(id, stepKey) {
    const updated = Storage.toggleStep(id, stepKey);
    if (!updated) {
      toast('Could not update', { type: 'error', icon: 'fa-triangle-exclamation' });
      return;
    }
    refreshData();
  }

  /* ---------------------------------------------------------- */
  /* Card overflow menu                                          */
  /* ---------------------------------------------------------- */
  function openCardMenu(topic, anchor) {
    const menu = document.createElement('div');
    menu.className = 'card-menu-popover';
    menu.innerHTML = `
      <button data-act="edit"><i class="fa-solid fa-pen"></i>Edit</button>
      <button data-act="reset"><i class="fa-solid fa-rotate-left"></i>Reset steps</button>
      <button data-act="delete" class="danger"><i class="fa-solid fa-trash-can"></i>Delete</button>
    `;

    const rect = anchor.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.left = `${Math.max(12, rect.right - 180)}px`;
    menu.style.zIndex = 65;
    document.body.appendChild(menu);

    const close = () => menu.remove();
    const onDocClick = (e) => {
      if (!menu.contains(e.target)) {
        close();
        document.removeEventListener('click', onDocClick);
      }
    };
    setTimeout(() => document.addEventListener('click', onDocClick), 0);

    menu.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        close();
        if (act === 'edit') openForm({ editingId: topic.id });
        if (act === 'reset') resetSteps(topic);
        if (act === 'delete') confirmDelete(topic);
      });
    });
  }

  function resetSteps(topic) {
    Storage.resetSteps(topic.id);
    refreshData();
    toast('Steps reset', { type: 'info', icon: 'fa-rotate-left' });
  }

  /* ---------------------------------------------------------- */
  /* Delete + undo                                               */
  /* ---------------------------------------------------------- */
  function confirmDelete(topic) {
    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet confirm-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">Delete topic?</h3>
      <p class="sheet-body">
        "<strong>${escapeHTML(topic.topic)}</strong>" will be removed. You'll have 5 seconds to undo.
      </p>
      <div class="sheet-actions">
        <button class="btn-ghost" data-act="cancel">Cancel</button>
        <button class="btn-danger" data-act="confirm">Delete</button>
      </div>
    `;
    openModal(sheet);

    sheet.querySelector('[data-act="cancel"]').addEventListener('click', closeModal);
    sheet.querySelector('[data-act="confirm"]').addEventListener('click', () => {
      closeModal();
      doDeleteWithUndo(topic);
    });
  }

  function doDeleteWithUndo(topic) {
    Storage.remove(topic.id);
    refreshData();

    toast('Topic removed', {
      type: 'info',
      icon: 'fa-trash-can',
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          // Re-add with same id + data
          const list = Storage._raw.readAll();
          list.push(topic);
          Storage._raw.writeAll(list);
          refreshData();
          toast('Restored', { type: 'success', icon: 'fa-rotate-left' });
        }
      }
    });
  }

  /* ---------------------------------------------------------- */
  /* Clear completed (bulk)                                      */
  /* ---------------------------------------------------------- */
  function clearCompleted() {
    const completed = state.topics.filter((t) => Storage.deriveStatus(t) === 'completed');
    if (!completed.length) {
      toast('No completed topics to clear', { type: 'info', icon: 'fa-circle-check' });
      return;
    }

    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet confirm-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">Clear completed?</h3>
      <p class="sheet-body">
        This will permanently remove <strong>${completed.length}</strong>
        completed topic${completed.length === 1 ? '' : 's'}. This can't be undone.
      </p>
      <label class="confirm-input-label">
        Type <code>DELETE</code> to confirm
        <input type="text" id="confirmDeleteInput" autocomplete="off" autocapitalize="characters" spellcheck="false">
      </label>
      <div class="sheet-actions">
        <button class="btn-ghost" data-act="cancel">Cancel</button>
        <button class="btn-danger" data-act="confirm" disabled>Clear</button>
      </div>
    `;
    openModal(sheet);

    const input = sheet.querySelector('#confirmDeleteInput');
    const confirmBtn = sheet.querySelector('[data-act="confirm"]');

    input.addEventListener('input', () => {
      confirmBtn.disabled = input.value.trim().toUpperCase() !== 'DELETE';
    });

    sheet.querySelector('[data-act="cancel"]').addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', () => {
      const removed = Storage.removeMany(completed.map((t) => t.id));
      closeModal();
      refreshData();
      toast(`Cleared ${removed} topic${removed === 1 ? '' : 's'}`, {
        type: 'success',
        icon: 'fa-broom'
      });
    });
  }

  /* ---------------------------------------------------------- */
  /* Add/Edit form                                               */
  /* ---------------------------------------------------------- */
  const addTopicBtn = $('#addTopicBtn');
  addTopicBtn.addEventListener('click', () => openForm({}));

  function openForm({ editingId = null } = {}) {
    const editing = editingId ? Storage.getById(editingId) : null;
    state.editingId = editingId;

    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet form-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">${editing ? 'Edit topic' : 'Add topic'}</h3>

      <label class="field">
        <span class="field-label">Subject</span>
        <div class="autocomplete-wrap">
          <input type="text" id="fSubject" autocomplete="off" placeholder="e.g. Anatomy" value="${editing ? escapeHTML(editing.subject) : ''}">
          <div class="autocomplete-list" id="subjectSuggest" hidden></div>
        </div>
      </label>

      <label class="field">
        <span class="field-label">Topic</span>
        <input type="text" id="fTopic" autocomplete="off" placeholder="e.g. Upper Limb" value="${editing ? escapeHTML(editing.topic) : ''}">
      </label>

      <label class="field">
        <span class="field-label">Notes <span class="opt">(optional)</span></span>
        <textarea id="fNotes" rows="3" placeholder="Anything you want to remember…">${editing ? escapeHTML(editing.notes || '') : ''}</textarea>
      </label>

      <div class="form-error" id="formError" hidden></div>

      <div class="sheet-actions">
        <button class="btn-ghost" data-act="cancel">Cancel</button>
        <button class="btn-primary" data-act="save">${editing ? 'Save' : 'Add'}</button>
      </div>
    `;
    openModal(sheet);

    const subjectInput = sheet.querySelector('#fSubject');
    const topicInput = sheet.querySelector('#fTopic');
    const notesInput = sheet.querySelector('#fNotes');
    const suggestBox = sheet.querySelector('#subjectSuggest');
    const errBox = sheet.querySelector('#formError');

    // Autocomplete
    const subjects = Storage.getSubjects();
    function renderSuggestions(q) {
      const query = q.trim().toLowerCase();
      const matches = subjects
        .filter((s) => s.toLowerCase().includes(query) && s.toLowerCase() !== query)
        .slice(0, 6);

      if (!matches.length) {
        suggestBox.hidden = true;
        return;
      }
      suggestBox.innerHTML = matches.map((s) => `<button type="button">${escapeHTML(s)}</button>`).join('');
      suggestBox.hidden = false;
      suggestBox.querySelectorAll('button').forEach((b) => {
        b.addEventListener('click', () => {
          subjectInput.value = b.textContent;
          suggestBox.hidden = true;
          topicInput.focus();
        });
      });
    }

    subjectInput.addEventListener('input', () => renderSuggestions(subjectInput.value));
    subjectInput.addEventListener('focus', () => renderSuggestions(subjectInput.value));

    sheet.addEventListener('click', (e) => {
      if (!e.target.closest('.autocomplete-wrap')) suggestBox.hidden = true;
    });

    // Cancel
    sheet.querySelector('[data-act="cancel"]').addEventListener('click', closeModal);

    // Save
    sheet.querySelector('[data-act="save"]').addEventListener('click', () => {
      const subject = subjectInput.value.trim();
      const topic = topicInput.value.trim();
      const notes = notesInput.value;

      errBox.hidden = true;

      if (!subject) return showError('Please add a subject.');
      if (!topic) return showError('Please add a topic.');

      if (editing) {
        Storage.update(editing.id, { subject, topic, notes });
        toast('Topic updated', { type: 'success', icon: 'fa-check' });
      } else {
        Storage.add({ subject, topic, notes });
        toast('Topic added', { type: 'success', icon: 'fa-plus' });
      }
      closeModal();
      refreshData();
    });

    function showError(msg) {
      errBox.textContent = msg;
      errBox.hidden = false;
    }

    // Focus appropriate field
    setTimeout(() => {
      (editing ? topicInput : subjectInput).focus();
    }, 250);
  }

  /* ---------------------------------------------------------- */
  /* Detail view                                                 */
  /* ---------------------------------------------------------- */
  function openDetail(id) {
    const t = Storage.getById(id);
    if (!t) return;

    const status = Storage.deriveStatus(t);
    const done = Storage.stepsDoneCount(t);
    const pct = Math.round((done / 4) * 100);
    const color = Storage.subjectColor(t.subject);

    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet detail-sheet';

    const stepsHTML = Storage.STEP_KEYS.map((key) => {
      const step = t.steps[key];
      const when = step.at ? relativeTime(step.at) : 'Not yet';
      return `
        <button class="detail-step ${step.done ? 'done' : ''}" data-step="${key}">
          <span class="detail-step-icon"><i class="fa-solid ${step.done ? 'fa-check' : 'fa-circle'}"></i></span>
          <span class="detail-step-body">
            <span class="detail-step-label">${Storage.STEP_LABELS[key]}</span>
            <span class="detail-step-time">${when}</span>
          </span>
        </button>`;
    }).join('');

    sheet.innerHTML = `
      <div class="sheet-handle"></div>

      <div class="detail-head">
        <div class="subject-line">
          <span class="subject-dot" style="background:${color}"></span>
          <span class="subject-name">${escapeHTML(t.subject)}</span>
        </div>
        <button class="icon-btn" data-act="close" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <h2 class="detail-title">${escapeHTML(t.topic) || 'Untitled'}</h2>

      <div class="status-row">
        <span class="status-pill">${statusLabel(status)}</span>
        <span class="step-count">${done}/4</span>
      </div>
      <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>

      <div class="detail-steps">${stepsHTML}</div>

      ${t.notes ? `
        <div class="detail-notes">
          <div class="detail-notes-label"><i class="fa-solid fa-note-sticky"></i> Notes</div>
          <div class="detail-notes-body">${escapeHTML(t.notes)}</div>
        </div>` : ''}

      <div class="detail-meta">
        Created ${relativeTime(t.createdAt)} · Updated ${relativeTime(t.updatedAt)}
      </div>

      <div class="sheet-actions">
        <button class="btn-ghost" data-act="edit"><i class="fa-solid fa-pen"></i> Edit</button>
        <button class="btn-primary" data-act="close2">Done</button>
      </div>
    `;
    openModal(sheet);

    sheet.querySelector('[data-act="close"]').addEventListener('click', closeModal);
    sheet.querySelector('[data-act="close2"]').addEventListener('click', closeModal);

    sheet.querySelector('[data-act="edit"]').addEventListener('click', () => {
      closeModal();
      setTimeout(() => openForm({ editingId: t.id }), 100);
    });

    sheet.querySelectorAll('.detail-step').forEach((btn) => {
      btn.addEventListener('click', () => {
        toggleStep(t.id, btn.dataset.step);
        closeModal();
        setTimeout(() => openDetail(t.id), 100);
      });
    });
  }

  /* ---------------------------------------------------------- */
  /* Relative time formatting                                    */
  /* ---------------------------------------------------------- */
  function relativeTime(iso) {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  /* ---------------------------------------------------------- */
  /* CSV export (from menu)                                      */
  /* ---------------------------------------------------------- */
  function exportCSV() {
    const rows = [['Subject', 'Topic', 'Status', 'Blind Recon', 'Deep Read', 'Blurted', 'Anki Digitized', 'Notes', 'Created', 'Updated']];
    state.topics.forEach((t) => {
      rows.push([
        t.subject, t.topic, statusLabel(Storage.deriveStatus(t)),
        t.steps.blindRecon.done, t.steps.deepRead.done,
        t.steps.blurted.done, t.steps.ankiDigitized.done,
        t.notes || '', t.createdAt, t.updatedAt
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studylog-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported', { type: 'success', icon: 'fa-file-export' });
  }

  /* ---------------------------------------------------------- */
  /* Init                                                        */
  /* ---------------------------------------------------------- */
  function init() {
    applyTheme(localStorage.getItem(LS.theme) || 'light');
    applyFilterUI();
    refreshData();
  }

  init();

  /* ---------------------------------------------------------- */
  /* Public API (for later stages)                               */
  /* ---------------------------------------------------------- */
  window.Studylog = {
    toast, dismissToast, openModal, closeModal,
    refreshData, relativeTime, escapeHTML,
    getState: () => state
  };

})();
