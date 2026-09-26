/* ============================================================
   Studylog — storage layer
   Pure data. No DOM. Everything goes through this module.
   ============================================================ */

(function (global) {
  'use strict';

  const KEY = 'studylog.data.v1';
  const SCHEMA_VERSION = 1;

  const STEP_KEYS = ['blindRecon', 'deepRead', 'blurted', 'ankiDigitized'];
  const STEP_LABELS = {
    blindRecon: 'Blind Recon',
    deepRead: 'Deep Read',
    blurted: 'Blurted',
    ankiDigitized: 'Anki Digitized'
  };

  /* Subject color palette — assigned by hash, stable across sessions */
  const SUBJECT_COLORS = [
    '#2F6F4E', '#3B6FB5', '#C9A227', '#B5573B',
    '#7A5AA6', '#4E8F8A', '#B54E7A', '#5E7A3B',
    '#A6702A', '#4A5D8F'
  ];

  /* ---------------------------------------------------------- */
  /* Low-level read/write                                        */
  /* ---------------------------------------------------------- */
  function readAll() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      console.warn('Storage read failed:', e);
      return [];
    }
  }

  function writeAll(topics) {
    try {
      localStorage.setItem(KEY, JSON.stringify(topics));
      return true;
    } catch (e) {
      console.error('Storage write failed:', e);
      return false;
    }
  }

  /* ---------------------------------------------------------- */
  /* Helpers                                                     */
  /* ---------------------------------------------------------- */
  function uuid() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function normalizeTopic(t) {
    const steps = {};
    STEP_KEYS.forEach((k) => {
      const existing = t.steps?.[k];
      steps[k] = {
        done: !!existing?.done,
        at: existing?.at || null
      };
    });

    return {
      id: t.id || uuid(),
      subject: (t.subject || 'Unlabeled').trim(),
      topic: (t.topic || '').trim(),
      steps,
      notes: t.notes || '',
      createdAt: t.createdAt || nowISO(),
      updatedAt: t.updatedAt || nowISO()
    };
  }

  function deriveStatus(topic) {
    const done = STEP_KEYS.filter((k) => topic.steps[k].done).length;
    if (done === 4) return 'completed';
    if (done > 0) return 'inprogress';
    return 'notstarted';
  }

  function stepsDoneCount(topic) {
    return STEP_KEYS.filter((k) => topic.steps[k].done).length;
  }

  function subjectColor(subject) {
    let hash = 0;
    const s = (subject || '').toLowerCase();
    for (let i = 0; i < s.length; i++) {
      hash = (hash * 31 + s.charCodeAt(i)) | 0;
    }
    return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
  }

  /* ---------------------------------------------------------- */
  /* Public API                                                  */
  /* ---------------------------------------------------------- */
  const api = {
    STEP_KEYS,
    STEP_LABELS,

    getAll() {
      return readAll().map(normalizeTopic);
    },

    getById(id) {
      const t = readAll().find((x) => x.id === id);
      return t ? normalizeTopic(t) : null;
    },

    add({ subject, topic, notes = '' }) {
      const list = readAll();
      const entry = normalizeTopic({
        id: uuid(),
        subject,
        topic,
        notes,
        createdAt: nowISO(),
        updatedAt: nowISO()
      });
      list.push(entry);
      writeAll(list);
      return entry;
    },

    update(id, patch) {
      const list = readAll();
      const idx = list.findIndex((x) => x.id === id);
      if (idx === -1) return null;
      const merged = normalizeTopic({ ...list[idx], ...patch, id });
      merged.updatedAt = nowISO();
      list[idx] = merged;
      writeAll(list);
      return merged;
    },

    remove(id) {
      const list = readAll();
      const next = list.filter((x) => x.id !== id);
      if (next.length === list.length) return false;
      writeAll(next);
      return true;
    },

    removeMany(ids) {
      const set = new Set(ids);
      const list = readAll();
      const next = list.filter((x) => !set.has(x.id));
      writeAll(next);
      return list.length - next.length;
    },

    /* Toggle a single step — returns updated topic */
    toggleStep(id, stepKey) {
      const t = api.getById(id);
      if (!t || !STEP_KEYS.includes(stepKey)) return null;
      const step = t.steps[stepKey];
      step.done = !step.done;
      step.at = step.done ? nowISO() : null;
      return api.update(id, { steps: t.steps });
    },

    resetSteps(id) {
      const t = api.getById(id);
      if (!t) return null;
      STEP_KEYS.forEach((k) => {
        t.steps[k] = { done: false, at: null };
      });
      return api.update(id, { steps: t.steps });
    },

    /* Distinct subjects for autocomplete */
    getSubjects() {
      const set = new Set();
      readAll().forEach((t) => {
        const s = (t.subject || '').trim();
        if (s) set.add(s);
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },

    /* All step completions, newest first — for History view (Stage 7) */
    getCompletions() {
      const out = [];
      readAll().map(normalizeTopic).forEach((t) => {
        STEP_KEYS.forEach((k) => {
          const step = t.steps[k];
          if (step.done && step.at) {
            out.push({
              topicId: t.id,
              subject: t.subject,
              topic: t.topic,
              step: k,
              stepLabel: STEP_LABELS[k],
              at: step.at
            });
          }
        });
      });
      return out.sort((a, b) => new Date(b.at) - new Date(a.at));
    },

    /* Streak: consecutive days ending today/yesterday with >=1 completion */
    getStreak() {
      const completions = api.getCompletions();
      if (!completions.length) return 0;

      const days = new Set(
        completions.map((c) => c.at.slice(0, 10)) // YYYY-MM-DD (UTC)
      );

      const today = new Date();
      const fmt = (d) => d.toISOString().slice(0, 10);

      let cursor = new Date(today);
      let streak = 0;

      // If nothing today, allow streak to still count from yesterday
      if (!days.has(fmt(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
        if (!days.has(fmt(cursor))) return 0;
      }

      while (days.has(fmt(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak;
    },

    /* Derived helpers exposed for UI */
    deriveStatus,
    stepsDoneCount,
    subjectColor,

    /* Danger zone — used by Settings later */
    _raw: { readAll, writeAll, KEY, SCHEMA_VERSION }
  };

  global.Storage = api;
})(window);
