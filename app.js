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
      if (!$('#viewRoot').hidden) { closeView(); return; }
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
      case 'search':        openView('search'); break;
      case 'calendar':      openView('calendar'); break;
      case 'history':       openView('history'); break;
      case 'reports':       openView('reports'); break;
      case 'settings':      openView('settings'); break;
      case 'tools':         openToolsSheet(); break;
      case 'backup':        backupToFile(); break;
      case 'restore':       restoreFromFile(); break;
      case 'import-csv':    importCSVFromFile(); break;
      case 'export-csv':    exportCSV(); break;
      case 'print':         window.print(); break;
      case 'compact':       toggleCompact(); break;
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
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    if (modalRoot.hidden) return;
    modalRoot.hidden = true;
    modalSlot.innerHTML = '';
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
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
  function toggleCompact(force) {
    const next = typeof force === 'boolean'
      ? force
      : !document.body.classList.contains('compact');
    document.body.classList.toggle('compact', next);
    return next;
  }

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

  /* ============================================================ */
  /* Tools sheet                                                  */
  /* ============================================================ */
  function openToolsSheet() {
    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet tools-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">Tools</h3>
      <div class="tools-grid">
        <button class="tool-tile" data-act="backup">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <span>Backup</span>
        </button>
        <button class="tool-tile" data-act="restore">
          <i class="fa-solid fa-cloud-arrow-down"></i>
          <span>Restore</span>
        </button>
        <button class="tool-tile" data-act="import-csv">
          <i class="fa-solid fa-file-import"></i>
          <span>Import CSV</span>
        </button>
        <button class="tool-tile" data-act="export-csv">
          <i class="fa-solid fa-file-export"></i>
          <span>Export CSV</span>
        </button>
        <button class="tool-tile" data-act="print">
          <i class="fa-solid fa-print"></i>
          <span>Print</span>
        </button>
        <button class="tool-tile" data-act="compact">
          <i class="fa-solid fa-list"></i>
          <span>Compact</span>
        </button>
        <button class="tool-tile danger" data-act="clear-completed">
          <i class="fa-solid fa-trash-can"></i>
          <span>Clear Completed</span>
        </button>
      </div>
    `;
    openModal(sheet);

    sheet.querySelectorAll('.tool-tile').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        closeModal();
        setTimeout(() => handleMenuAction(act), 100);
      });
    });
  }

  /* ============================================================ */
  /* Views system                                                 */
  /* ============================================================ */
  const viewRoot = $('#viewRoot');

  function openView(name, payload = {}) {
    viewRoot.innerHTML = '';
    viewRoot.hidden = false;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('view-open');

    const el = document.createElement('div');
    el.className = 'view';
    viewRoot.appendChild(el);

    if (name === 'search') renderSearchView(el);
    else if (name === 'calendar') renderCalendarView(el, payload);
    else if (name === 'history') renderHistoryView(el, payload);
    else if (name === 'reports') renderReportsView(el);
    else if (name === 'settings') renderSettingsView(el);
  }

  function closeView() {
    viewRoot.hidden = true;
    viewRoot.innerHTML = '';
    document.body.style.overflow = '';
    document.body.classList.remove('view-open');
  }

  function viewHeaderHTML(title, rightHTML = '') {
    return `
      <div class="view-header">
        <button class="view-back" data-act="back" aria-label="Back">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h2 class="view-title">${escapeHTML(title)}</h2>
        <div class="view-actions">${rightHTML}</div>
      </div>`;
  }

  function highlightMatch(text, query) {
    const t = String(text || '');
    if (!query) return escapeHTML(t);
    const lc = t.toLowerCase();
    const lq = query.toLowerCase();
    const idx = lc.indexOf(lq);
    if (idx === -1) return escapeHTML(t);
    return escapeHTML(t.slice(0, idx)) +
           '<mark>' + escapeHTML(t.slice(idx, idx + query.length)) + '</mark>' +
           escapeHTML(t.slice(idx + query.length));
  }

  /* ---------------------------------------------------------- */
  /* Search view (Stage 5)                                       */
  /* ---------------------------------------------------------- */
  function renderSearchView(root) {
    root.innerHTML = `
      <div class="view-header view-header-search">
        <button class="view-back" data-act="back" aria-label="Back">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <div class="search-input-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="searchViewInput" placeholder="Search subject, topic, notes…" autocomplete="off" spellcheck="false">
          <button class="search-clear" id="searchClear" hidden aria-label="Clear">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
      <div class="view-body" id="searchResults"></div>
    `;

    const input = root.querySelector('#searchViewInput');
    const clearBtn = root.querySelector('#searchClear');
    const results = root.querySelector('#searchResults');

    root.querySelector('[data-act="back"]').addEventListener('click', closeView);

    const initial = '';
    input.value = initial;
    input.focus();

    function render() {
      const q = input.value.trim();
      clearBtn.hidden = !q;

      if (!q) {
        results.innerHTML = `
          <div class="search-hint">
            <i class="fa-solid fa-magnifying-glass"></i>
            <div class="search-hint-title">Search your topics</div>
            <div class="search-hint-sub">Try a subject, a topic name, or words from your notes.</div>
          </div>`;
        return;
      }

      const lq = q.toLowerCase();
      const matches = state.topics.filter((t) => {
        return (t.subject || '').toLowerCase().includes(lq)
            || (t.topic || '').toLowerCase().includes(lq)
            || (t.notes || '').toLowerCase().includes(lq);
      });

      if (!matches.length) {
        results.innerHTML = `
          <div class="search-hint">
            <i class="fa-solid fa-face-frown"></i>
            <div class="search-hint-title">No matches</div>
            <div class="search-hint-sub">Nothing found for "<strong>${escapeHTML(q)}</strong>".</div>
          </div>`;
        return;
      }

      results.innerHTML = '';
      matches.forEach((t) => {
        const status = Storage.deriveStatus(t);
        const color = Storage.subjectColor(t.subject);
        const row = document.createElement('button');
        row.className = 'search-result';
        row.innerHTML = `
          <span class="subject-dot" style="background:${color}"></span>
          <span class="search-result-body">
            <span class="search-result-topic">${highlightMatch(t.topic, q)}</span>
            <span class="search-result-sub">${highlightMatch(t.subject, q)}</span>
          </span>
          <span class="status-pill">${statusLabel(status)}</span>
        `;
        row.addEventListener('click', () => {
          closeView();
          setTimeout(() => openDetail(t.id), 100);
        });
        results.appendChild(row);
      });
    }

    input.addEventListener('input', render);
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
      render();
    });

    render();
  }

  /* ---------------------------------------------------------- */
  /* Calendar view (Stage 6)                                     */
  /* ---------------------------------------------------------- */
  function renderCalendarView(root, payload) {
    let month = payload.month ? new Date(payload.month) : new Date();
    month.setDate(1);

    root.innerHTML = `
      ${viewHeaderHTML('Calendar')}
      <div class="cal-nav">
        <button class="cal-arrow" data-act="prev" aria-label="Previous month">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <div class="cal-month" id="calMonth"></div>
        <button class="cal-arrow" data-act="next" aria-label="Next month">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
      <div class="cal-today-wrap">
        <button class="cal-today-btn" data-act="today">Today</button>
      </div>
      <div class="view-body">
        <div class="cal-grid" id="calGrid"></div>
      </div>
    `;

    root.querySelector('[data-act="back"]').addEventListener('click', closeView);
    root.querySelector('[data-act="prev"]').addEventListener('click', () => {
      month.setMonth(month.getMonth() - 1);
      render();
    });
    root.querySelector('[data-act="next"]').addEventListener('click', () => {
      month.setMonth(month.getMonth() + 1);
      render();
    });
    root.querySelector('[data-act="today"]').addEventListener('click', () => {
      month = new Date();
      month.setDate(1);
      render();
    });

    const monthLabel = root.querySelector('#calMonth');
    const grid = root.querySelector('#calGrid');

    function render() {
      const year = month.getFullYear();
      const m = month.getMonth();

      monthLabel.textContent = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

      const firstDow = new Date(year, m, 1).getDay();
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      const prevMonthDays = new Date(year, m, 0).getDate();

      // Build completion map for this month
      const completions = Storage.getCompletions();
      const counts = {};
      completions.forEach((c) => {
        const d = new Date(c.at);
        if (d.getFullYear() === year && d.getMonth() === m) {
          const k = d.getDate();
          counts[k] = (counts[k] || 0) + 1;
        }
      });

      const today = new Date();
      const isThisMonth = today.getFullYear() === year && today.getMonth() === m;

      const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      let html = weekdays.map((w) => `<div class="cal-weekday">${w}</div>`).join('');

      // Leading days from previous month
      for (let i = firstDow - 1; i >= 0; i--) {
        html += `<div class="cal-day out">${prevMonthDays - i}</div>`;
      }

      // Days of the month
      for (let d = 1; d <= daysInMonth; d++) {
        const count = counts[d] || 0;
        const cls = [
          'cal-day',
          count ? 'has' : '',
          isThisMonth && today.getDate() === d ? 'today' : ''
        ].filter(Boolean).join(' ');
        html += `
          <button class="${cls}" data-day="${d}" ${count ? '' : 'disabled'}>
            <span class="cal-day-num">${d}</span>
            ${count ? `<span class="cal-day-count">${count}</span>` : ''}
          </button>`;
      }

      // Trailing days
      const used = firstDow + daysInMonth;
      const trailing = (7 - (used % 7)) % 7;
      for (let i = 1; i <= trailing; i++) {
        html += `<div class="cal-day out">${i}</div>`;
      }

      grid.innerHTML = html;

      grid.querySelectorAll('.cal-day.has').forEach((cell) => {
        cell.addEventListener('click', () => {
          showDayDetail(year, m, Number(cell.dataset.day));
        });
      });
    }

    function showDayDetail(year, m, day) {
      const dayStart = new Date(year, m, day, 0, 0, 0, 0).getTime();
      const dayEnd = dayStart + 86400000;
      const items = Storage.getCompletions().filter((c) => {
        const t = new Date(c.at).getTime();
        return t >= dayStart && t < dayEnd;
      });

      const sheet = document.createElement('div');
      sheet.className = 'modal-sheet day-sheet';
      const dateLabel = new Date(year, m, day).toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric'
      });

      sheet.innerHTML = `
        <div class="sheet-handle"></div>
        <h3 class="sheet-title">${escapeHTML(dateLabel)}</h3>
        <div class="day-list">
          ${items.map((c) => {
            const color = Storage.subjectColor(c.subject);
            const time = new Date(c.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
            return `
              <button class="day-entry" data-topic-id="${c.topicId}">
                <span class="subject-dot" style="background:${color}"></span>
                <span class="day-entry-body">
                  <span class="day-entry-step">${escapeHTML(c.stepLabel)}</span>
                  <span class="day-entry-topic">${escapeHTML(c.topic)} · ${escapeHTML(c.subject)}</span>
                </span>
                <span class="day-entry-time">${escapeHTML(time)}</span>
              </button>`;
          }).join('')}
        </div>
        <div class="sheet-actions">
          <button class="btn-primary" data-act="close">Done</button>
        </div>
      `;
      openModal(sheet);

      sheet.querySelector('[data-act="close"]').addEventListener('click', closeModal);
      sheet.querySelectorAll('.day-entry').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.topicId;
          closeModal();
          closeView();
          setTimeout(() => openDetail(id), 120);
        });
      });
    }

    render();
  }

  /* ---------------------------------------------------------- */
  /* History view (Stage 7)                                      */
  /* ---------------------------------------------------------- */
  function renderHistoryView(root) {
    let filter = 'all';

    root.innerHTML = `
      ${viewHeaderHTML('History')}
      <div class="history-filter" id="historyFilter"></div>
      <div class="view-body" id="historyBody"></div>
    `;

    root.querySelector('[data-act="back"]').addEventListener('click', closeView);

    const filterBar = root.querySelector('#historyFilter');
    const body = root.querySelector('#historyBody');

    // Last 30 days
    const cutoff = Date.now() - 30 * 86400000;

    function buildSubjectList() {
      const subjects = Array.from(new Set(
        Storage.getCompletions().map((c) => c.subject).filter(Boolean)
      )).sort((a, b) => a.localeCompare(b));
      return subjects;
    }

    function renderFilters() {
      const subjects = buildSubjectList();
      const chips = ['all', ...subjects];
      filterBar.innerHTML = chips.map((s) => {
        const label = s === 'all' ? 'All' : s;
        return `<button class="history-chip ${s === filter ? 'active' : ''}" data-filter="${escapeHTML(s)}">${escapeHTML(label)}</button>`;
      }).join('');

      filterBar.querySelectorAll('.history-chip').forEach((c) => {
        c.addEventListener('click', () => {
          filter = c.dataset.filter;
          renderFilters();
          renderEntries();
        });
      });
    }

    function dayKey(iso) {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function dayLabel(iso) {
      const d = new Date(iso);
      const today = new Date();
      const yesterday = new Date(Date.now() - 86400000);
      const sameDay = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
      if (sameDay(d, today)) return 'Today';
      if (sameDay(d, yesterday)) return 'Yesterday';
      return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    }

    function renderEntries() {
      let items = Storage.getCompletions().filter((c) => new Date(c.at).getTime() >= cutoff);
      if (filter !== 'all') {
        items = items.filter((c) => c.subject === filter);
      }

      if (!items.length) {
        body.innerHTML = `
          <div class="search-hint">
            <i class="fa-solid fa-clock-rotate-left"></i>
            <div class="search-hint-title">No history yet</div>
            <div class="search-hint-sub">Completed steps from the last 30 days will appear here.</div>
          </div>`;
        return;
      }

      // Group by day
      const groups = new Map();
      items.forEach((c) => {
        const k = dayKey(c.at);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(c);
      });

      body.innerHTML = '';
      groups.forEach((entries, key) => {
        const day = document.createElement('div');
        day.className = 'history-day';
        day.innerHTML = `
          <div class="history-day-label">${escapeHTML(dayLabel(entries[0].at))}</div>
          <div class="history-entries"></div>
        `;
        const list = day.querySelector('.history-entries');

        entries.forEach((c) => {
          const color = Storage.subjectColor(c.subject);
          const time = new Date(c.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
          const row = document.createElement('button');
          row.className = 'history-entry';
          row.innerHTML = `
            <span class="subject-dot" style="background:${color}"></span>
            <span class="history-entry-body">
              <span class="history-entry-step">${escapeHTML(c.stepLabel)}</span>
              <span class="history-entry-topic">${escapeHTML(c.topic)} · ${escapeHTML(c.subject)}</span>
            </span>
            <span class="history-entry-time">${escapeHTML(time)}</span>
          `;
          row.addEventListener('click', () => {
            closeView();
            setTimeout(() => openDetail(c.topicId), 100);
          });
          list.appendChild(row);
        });

        body.appendChild(day);
      });
    }

    renderFilters();
    renderEntries();
  }

  /* ============================================================ */
  /* Reports view (Stage 8)                                       */
  /* ============================================================ */
  function renderReportsView(root) {
    root.innerHTML = `
      ${viewHeaderHTML('Reports')}
      <div class="view-body" id="reportsBody"></div>
    `;
    root.querySelector('[data-act="back"]').addEventListener('click', closeView);

    const body = root.querySelector('#reportsBody');
    const topics = state.topics;
    const completions = Storage.getCompletions();

    /* --- Stats block --- */
    const total = topics.length;
    const completed = topics.filter((t) => Storage.deriveStatus(t) === 'completed').length;
    const completionPct = total ? Math.round((completed / total) * 100) : 0;
    const currentStreak = Storage.getStreak();
    const longestStreak = computeLongestStreak(completions);

    const statsHTML = `
      <div class="stats-grid">
        <div class="stat-tile">
          <div class="stat-tile-num">${currentStreak}</div>
          <div class="stat-tile-lbl"><i class="fa-solid fa-fire"></i> Current streak</div>
        </div>
        <div class="stat-tile">
          <div class="stat-tile-num">${longestStreak}</div>
          <div class="stat-tile-lbl"><i class="fa-solid fa-trophy"></i> Longest</div>
        </div>
        <div class="stat-tile">
          <div class="stat-tile-num">${completed}<span class="stat-tile-sub">/${total}</span></div>
          <div class="stat-tile-lbl"><i class="fa-solid fa-circle-check"></i> Completed</div>
        </div>
        <div class="stat-tile">
          <div class="stat-tile-num">${completionPct}<span class="stat-tile-sub">%</span></div>
          <div class="stat-tile-lbl"><i class="fa-solid fa-percent"></i> Progress</div>
        </div>
      </div>
    `;

    /* --- Weekly activity --- */
    const weeklyHTML = `
      <section class="report-section">
        <div class="report-section-head">
          <h3 class="report-section-title">Activity</h3>
          <div class="segmented" id="activityRange">
            <button class="seg-btn active" data-range="7">7d</button>
            <button class="seg-btn" data-range="30">30d</button>
          </div>
        </div>
        <div class="activity-chart" id="activityChart"></div>
      </section>
    `;

    /* --- Subject progress --- */
    const groups = {};
    topics.forEach((t) => {
      const s = t.subject || 'Unlabeled';
      if (!groups[s]) groups[s] = { total: 0, completed: 0 };
      groups[s].total += 1;
      if (Storage.deriveStatus(t) === 'completed') groups[s].completed += 1;
    });

    const subjectRows = Object.keys(groups).sort().map((s) => {
      const g = groups[s];
      const pct = g.total ? Math.round((g.completed / g.total) * 100) : 0;
      const color = Storage.subjectColor(s);
      return `
        <div class="subject-progress-row">
          <div class="subject-progress-label">
            <span class="subject-dot" style="background:${color}"></span>
            <span class="subject-progress-name">${escapeHTML(s)}</span>
            <span class="subject-progress-count">${g.completed}/${g.total}</span>
          </div>
          <div class="prog-track">
            <div class="prog-fill" style="width:${pct}%; background:${color}"></div>
          </div>
        </div>`;
    }).join('') || `<div class="report-empty">No subjects yet</div>`;

    const subjectHTML = `
      <section class="report-section">
        <h3 class="report-section-title">Subject progress</h3>
        <div class="subject-progress-list">${subjectRows}</div>
      </section>
    `;

    /* --- Heatmap --- */
    const heatmapHTML = `
      <section class="report-section">
        <h3 class="report-section-title">Last 90 days</h3>
        <div class="heatmap-wrap">
          <div class="heatmap" id="heatmap"></div>
          <div class="heatmap-legend">
            <span>Less</span>
            <span class="heat-cell lvl-0"></span>
            <span class="heat-cell lvl-1"></span>
            <span class="heat-cell lvl-2"></span>
            <span class="heat-cell lvl-3"></span>
            <span class="heat-cell lvl-4"></span>
            <span>More</span>
          </div>
        </div>
      </section>
    `;

    /* --- Stuck topics --- */
    const stuck = getStuckTopics(14);
    const stuckHTML = stuck.length ? `
      <section class="report-section">
        <h3 class="report-section-title">Needs attention</h3>
        <div class="stuck-list">
          ${stuck.map((t) => {
            const color = Storage.subjectColor(t.subject);
            const days = daysSinceEarliestStep(t);
            return `
              <button class="stuck-item" data-topic-id="${t.id}">
                <span class="subject-dot" style="background:${color}"></span>
                <span class="stuck-item-body">
                  <span class="stuck-item-topic">${escapeHTML(t.topic)}</span>
                  <span class="stuck-item-sub">${escapeHTML(t.subject)} · ${Storage.stepsDoneCount(t)}/4 done</span>
                </span>
                <span class="stuck-item-days">${days}d</span>
              </button>`;
          }).join('')}
        </div>
      </section>
    ` : '';

    body.innerHTML = statsHTML + weeklyHTML + subjectHTML + heatmapHTML + stuckHTML;

    /* --- Wire activity chart --- */
    let activityRange = 7;
    const activityChart = body.querySelector('#activityChart');

    function renderActivity() {
      const days = [];
      for (let i = activityRange - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        days.push(d);
      }

      const counts = days.map((d) => {
        const dayStart = d.getTime();
        const dayEnd = dayStart + 86400000;
        return completions.filter((c) => {
          const t = new Date(c.at).getTime();
          return t >= dayStart && t < dayEnd;
        }).length;
      });

      const max = Math.max(1, ...counts);

      activityChart.innerHTML = days.map((d, i) => {
        const pct = (counts[i] / max) * 100;
        const isToday = i === days.length - 1;
        const label = d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1);
        const dateNum = d.getDate();
        return `
          <div class="activity-col">
            <div class="activity-bar-wrap" title="${counts[i]} on ${d.toLocaleDateString()}">
              <div class="activity-bar ${counts[i] ? '' : 'empty'} ${isToday ? 'today' : ''}" style="height:${counts[i] ? Math.max(pct, 8) : 3}%"></div>
            </div>
            <div class="activity-label">${activityRange <= 7 ? label : (dateNum % 5 === 1 ? dateNum : '')}</div>
          </div>`;
      }).join('');
    }

    body.querySelectorAll('#activityRange .seg-btn').forEach((b) => {
      b.addEventListener('click', () => {
        activityRange = Number(b.dataset.range);
        body.querySelectorAll('#activityRange .seg-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        renderActivity();
      });
    });

    renderActivity();

    /* --- Heatmap render --- */
    renderHeatmap(body.querySelector('#heatmap'), completions);

    /* --- Stuck topic tap --- */
    body.querySelectorAll('.stuck-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.topicId;
        closeView();
        setTimeout(() => openDetail(id), 100);
      });
    });
  }

  /* ---------------------------------------------------------- */
  /* Report helpers                                              */
  /* ---------------------------------------------------------- */
  function computeLongestStreak(completions) {
    if (!completions.length) return 0;
    const days = Array.from(new Set(
      completions.map((c) => c.at.slice(0, 10))
    )).sort();

    let longest = 1;
    let run = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1] + 'T00:00:00Z').getTime();
      const cur = new Date(days[i] + 'T00:00:00Z').getTime();
      if (cur - prev === 86400000) {
        run++;
        if (run > longest) longest = run;
      } else {
        run = 1;
      }
    }
    return longest;
  }

  function getStuckTopics(daysThreshold) {
    const cutoff = Date.now() - daysThreshold * 86400000;
    return state.topics.filter((t) => {
      if (Storage.deriveStatus(t) !== 'inprogress') return false;
      const times = Storage.STEP_KEYS
        .map((k) => t.steps[k].at)
        .filter(Boolean)
        .map((s) => new Date(s).getTime());
      if (!times.length) return false;
      return Math.min(...times) < cutoff;
    });
  }

  function daysSinceEarliestStep(t) {
    const times = Storage.STEP_KEYS
      .map((k) => t.steps[k].at)
      .filter(Boolean)
      .map((s) => new Date(s).getTime());
    if (!times.length) return 0;
    return Math.floor((Date.now() - Math.min(...times)) / 86400000);
  }

  function renderHeatmap(container, completions) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from Sunday on or before 90 days ago
    const start = new Date(today);
    start.setDate(start.getDate() - 89);
    start.setDate(start.getDate() - start.getDay());

    const counts = {};
    completions.forEach((c) => {
      const d = new Date(c.at);
      d.setHours(0, 0, 0, 0);
      const k = d.toISOString().slice(0, 10);
      counts[k] = (counts[k] || 0) + 1;
    });

    const cells = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const k = cursor.toISOString().slice(0, 10);
      const n = counts[k] || 0;
      let lvl = 0;
      if (n >= 1 && n <= 2) lvl = 1;
      else if (n >= 3 && n <= 5) lvl = 2;
      else if (n >= 6 && n <= 9) lvl = 3;
      else if (n >= 10) lvl = 4;

      cells.push(`<span class="heat-cell lvl-${lvl}" title="${cursor.toDateString()} — ${n} completion${n === 1 ? '' : 's'}"></span>`);
      cursor.setDate(cursor.getDate() + 1);
    }
    container.innerHTML = cells.join('');
  }

  /* ============================================================ */
  /* Settings view (Stage 9)                                      */
  /* ============================================================ */
  function renderSettingsView(root) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const isCompact = document.body.classList.contains('compact');
    const canInstall = !!deferredPrompt;

    root.innerHTML = `
      ${viewHeaderHTML('Settings')}
      <div class="view-body">

        <section class="settings-section">
          <div class="settings-section-title">Appearance</div>
          <div class="settings-card">
            <div class="toggle-row">
              <div class="toggle-text">
                <div class="toggle-title">Dark mode</div>
                <div class="toggle-sub">Easier on the eyes at night</div>
              </div>
              <button class="switch" id="setTheme" role="switch" aria-checked="${isDark}">
                <span></span>
              </button>
            </div>
            <div class="toggle-row">
              <div class="toggle-text">
                <div class="toggle-title">Compact view</div>
                <div class="toggle-sub">Hide progress bars and steps</div>
              </div>
              <button class="switch" id="setCompact" role="switch" aria-checked="${isCompact}">
                <span></span>
              </button>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <div class="settings-section-title">Data</div>
          <div class="settings-card">
            <button class="settings-row" data-act="backup">
              <i class="fa-solid fa-cloud-arrow-up"></i>
              <div class="settings-row-text">
                <div class="settings-row-title">Backup to file</div>
                <div class="settings-row-sub">Download a JSON snapshot</div>
              </div>
              <i class="fa-solid fa-chevron-right settings-row-chevron"></i>
            </button>
            <button class="settings-row" data-act="restore">
              <i class="fa-solid fa-cloud-arrow-down"></i>
              <div class="settings-row-text">
                <div class="settings-row-title">Restore from file</div>
                <div class="settings-row-sub">Load a JSON backup</div>
              </div>
              <i class="fa-solid fa-chevron-right settings-row-chevron"></i>
            </button>
            <button class="settings-row" data-act="import-csv">
              <i class="fa-solid fa-file-import"></i>
              <div class="settings-row-text">
                <div class="settings-row-title">Import from CSV</div>
                <div class="settings-row-sub">Bring in data from your old Sheet</div>
              </div>
              <i class="fa-solid fa-chevron-right settings-row-chevron"></i>
            </button>
            <button class="settings-row" data-act="export-csv">
              <i class="fa-solid fa-file-export"></i>
              <div class="settings-row-text">
                <div class="settings-row-title">Export as CSV</div>
                <div class="settings-row-sub">Spreadsheet-friendly download</div>
              </div>
              <i class="fa-solid fa-chevron-right settings-row-chevron"></i>
            </button>
          </div>
        </section>

        ${canInstall ? `
        <section class="settings-section">
          <div class="settings-section-title">App</div>
          <div class="settings-card">
            <button class="settings-row" data-act="install">
              <i class="fa-solid fa-circle-down"></i>
              <div class="settings-row-text">
                <div class="settings-row-title">Install StudyLog</div>
                <div class="settings-row-sub">Add to your home screen</div>
              </div>
              <i class="fa-solid fa-chevron-right settings-row-chevron"></i>
            </button>
          </div>
        </section>
        ` : ''}

        <section class="settings-section">
          <div class="settings-section-title">Danger zone</div>
          <div class="settings-card">
            <button class="settings-row danger" data-act="clear-completed">
              <i class="fa-solid fa-broom"></i>
              <div class="settings-row-text">
                <div class="settings-row-title">Clear completed</div>
                <div class="settings-row-sub">Remove all fully-finished topics</div>
              </div>
              <i class="fa-solid fa-chevron-right settings-row-chevron"></i>
            </button>
            <button class="settings-row danger" data-act="reset-all">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <div class="settings-row-text">
                <div class="settings-row-title">Reset all data</div>
                <div class="settings-row-sub">Permanently delete everything</div>
              </div>
              <i class="fa-solid fa-chevron-right settings-row-chevron"></i>
            </button>
          </div>
        </section>

        <section class="settings-section">
          <div class="settings-section-title">About</div>
          <div class="settings-card">
            <div class="settings-row static">
              <i class="fa-solid fa-code-branch"></i>
              <div class="settings-row-text">
                <div class="settings-row-title">Version</div>
                <div class="settings-row-sub" id="appVersion">Loading…</div>
              </div>
            </div>
            <div class="settings-row static">
              <i class="fa-solid fa-database"></i>
              <div class="settings-row-text">
                <div class="settings-row-title">Stored locally</div>
                <div class="settings-row-sub">Your data never leaves this device</div>
              </div>
            </div>
          </div>
        </section>

        <div class="settings-footer">StudyLog · Made with care</div>
      </div>
    `;

    root.querySelector('[data-act="back"]').addEventListener('click', closeView);

    // Load version async
    getAppVersion().then((v) => {
      const el = root.querySelector('#appVersion');
      if (el) el.textContent = v;
    });

    // Theme toggle
    root.querySelector('#setTheme').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      localStorage.setItem(LS.theme, next);
      applyTheme(next);
      btn.setAttribute('aria-checked', String(next === 'dark'));
    });

    // Compact toggle
    root.querySelector('#setCompact').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const next = toggleCompact();
      btn.setAttribute('aria-checked', String(next));
    });

    // Settings rows
    root.querySelectorAll('.settings-row[data-act]').forEach((row) => {
      row.addEventListener('click', () => {
        const act = row.dataset.act;
        if (act === 'backup') backupToFile();
        else if (act === 'restore') restoreFromFile();
        else if (act === 'import-csv') importCSVFromFile();
        else if (act === 'export-csv') exportCSV();
        else if (act === 'clear-completed') clearCompleted();
        else if (act === 'reset-all') confirmResetAll();
        else if (act === 'install') {
          installBanner.hidden = false;
        }
      });
    });
  }

  /* ---------------------------------------------------------- */
  /* Version (reads CACHE_VERSION from sw.js)                    */
  /* ---------------------------------------------------------- */
  async function getAppVersion() {
    try {
      const res = await fetch(`sw.js?t=${Date.now()}`, { cache: 'no-store' });
      const text = await res.text();
      const m = text.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
      return m ? `v${m[1].replace(/^v/, '')}` : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /* ---------------------------------------------------------- */
  /* Backup / restore / import                                   */
  /* ---------------------------------------------------------- */
  function backupToFile() {
    const payload = {
      app: 'studylog',
      schema: 1,
      exportedAt: new Date().toISOString(),
      topics: Storage._raw.readAll()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studylog-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup saved', { type: 'success', icon: 'fa-cloud-arrow-up' });
  }

  function restoreFromFile() {
    pickFile('.json,application/json', async (file) => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const incoming = Array.isArray(data) ? data : data.topics;
        if (!Array.isArray(incoming)) throw new Error('Invalid backup file');

        showRestoreChoice(incoming);
      } catch (err) {
        toast('Could not read file', { type: 'error', icon: 'fa-triangle-exclamation' });
      }
    });
  }

  function showRestoreChoice(incoming) {
    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet confirm-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">Restore backup</h3>
      <p class="sheet-body">
        The file contains <strong>${incoming.length}</strong> topic${incoming.length === 1 ? '' : 's'}.
        How should they be applied?
      </p>
      <div class="sheet-actions" style="flex-direction:column;">
        <button class="btn-primary" data-act="replace">Replace everything</button>
        <button class="btn-ghost" data-act="merge">Merge with current</button>
        <button class="btn-ghost" data-act="cancel">Cancel</button>
      </div>
    `;
    openModal(sheet);

    sheet.querySelector('[data-act="cancel"]').addEventListener('click', closeModal);

    sheet.querySelector('[data-act="replace"]').addEventListener('click', () => {
      Storage._raw.writeAll(incoming);
      closeModal();
      refreshData();
      toast(`Restored ${incoming.length} topics`, { type: 'success', icon: 'fa-cloud-arrow-down' });
    });

    sheet.querySelector('[data-act="merge"]').addEventListener('click', () => {
      const existing = Storage._raw.readAll();
      const byId = new Map(existing.map((t) => [t.id, t]));
      let added = 0, updated = 0;
      incoming.forEach((t) => {
        if (byId.has(t.id)) { byId.set(t.id, { ...byId.get(t.id), ...t }); updated++; }
        else { byId.set(t.id, t); added++; }
      });
      Storage._raw.writeAll(Array.from(byId.values()));
      closeModal();
      refreshData();
      toast(`Merged: ${added} new, ${updated} updated`, { type: 'success', icon: 'fa-cloud-arrow-down' });
    });
  }

  function importCSVFromFile() {
    pickFile('.csv,text/csv', async (file) => {
      try {
        const text = await file.text();
        const rows = parseCSV(text);
        if (!rows.length) throw new Error('Empty file');

        const header = rows[0].map((h) => h.trim());
        const idx = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

        const iSub = idx('Subject');
        const iTop = idx('Topic');
        const iBlind = idx('Blind Recon');
        const iDeep = idx('Deep Read');
        const iBlurt = idx('Blurted');
        const iAnki = idx('Anki Digitized');
        const iNotes = idx('Notes');
        const iUpdated = idx('Last Updated');

        if (iSub === -1 || iTop === -1) throw new Error('Missing required columns');

        const truthy = (v) => String(v).trim().toLowerCase() === 'true';

        const imported = [];
        rows.slice(1).forEach((r) => {
          const subject = (r[iSub] || '').trim();
          const topic = (r[iTop] || '').trim();
          if (!subject || !topic) return;

          const at = iUpdated !== -1 && r[iUpdated] ? r[iUpdated] : new Date().toISOString();
          const steps = {
            blindRecon:    { done: iBlind !== -1 && truthy(r[iBlind]), at: iBlind !== -1 && truthy(r[iBlind]) ? at : null },
            deepRead:      { done: iDeep  !== -1 && truthy(r[iDeep]),  at: iDeep  !== -1 && truthy(r[iDeep])  ? at : null },
            blurted:       { done: iBlurt !== -1 && truthy(r[iBlurt]), at: iBlurt !== -1 && truthy(r[iBlurt]) ? at : null },
            ankiDigitized: { done: iAnki  !== -1 && truthy(r[iAnki]),  at: iAnki  !== -1 && truthy(r[iAnki])  ? at : null }
          };

          imported.push({
            id: crypto.randomUUID ? crypto.randomUUID() : `csv-${Date.now()}-${imported.length}`,
            subject, topic,
            steps,
            notes: iNotes !== -1 ? (r[iNotes] || '') : '',
            createdAt: at,
            updatedAt: at
          });
        });

        if (!imported.length) throw new Error('No valid rows found');

        const existing = Storage._raw.readAll();
        Storage._raw.writeAll(existing.concat(imported));
        refreshData();
        toast(`Imported ${imported.length} topics`, { type: 'success', icon: 'fa-file-import' });
      } catch (err) {
        toast(`Import failed: ${err.message}`, { type: 'error', icon: 'fa-triangle-exclamation', duration: 6000 });
      }
    });
  }

  function pickFile(accept, onPick) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) onPick(file);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = false;
        } else cur += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(cur); cur = ''; }
        else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
        else if (c === '\r') { /* skip */ }
        else cur += c;
      }
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.length));
  }

  /* ---------------------------------------------------------- */
  /* Reset all data                                              */
  /* ---------------------------------------------------------- */
  function confirmResetAll() {
    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet confirm-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">Reset all data?</h3>
      <p class="sheet-body">
        This will permanently delete <strong>every topic</strong> from this device.
        This cannot be undone. Back up first if you're unsure.
      </p>
      <label class="confirm-input-label">
        Type <code>DELETE</code> to confirm
        <input type="text" id="confirmResetInput" autocomplete="off" autocapitalize="characters" spellcheck="false">
      </label>
      <div class="sheet-actions">
        <button class="btn-ghost" data-act="cancel">Cancel</button>
        <button class="btn-danger" data-act="confirm" disabled>Reset</button>
      </div>
    `;
    openModal(sheet);

    const input = sheet.querySelector('#confirmResetInput');
    const confirmBtn = sheet.querySelector('[data-act="confirm"]');

    input.addEventListener('input', () => {
      confirmBtn.disabled = input.value.trim().toUpperCase() !== 'DELETE';
    });

    sheet.querySelector('[data-act="cancel"]').addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', () => {
      Storage._raw.writeAll([]);
      closeModal();
      closeView();
      refreshData();
      toast('All data cleared', { type: 'success', icon: 'fa-broom' });
    });
  }

  init();

  /* ---------------------------------------------------------- */
  /* Public API (for later stages)                               */
  /* ---------------------------------------------------------- */
  window.Studylog = {
    toast, dismissToast, openModal, closeModal,
    openView, closeView,
    refreshData, relativeTime, escapeHTML,
    getState: () => state
  };

})();
