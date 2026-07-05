/**
 * Daily Brief AI - Frontend Logic
 * Handles form submission, AI response rendering, history, theming, and UX extras.
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // DOM Elements
  // --------------------------------------------------------------------------
  const form = document.getElementById('briefForm');
  const generateBtn = document.getElementById('generateBtn');
  const clearBtn = document.getElementById('clearBtn');
  const themeToggle = document.getElementById('themeToggle');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const loadHistoryBtn = document.getElementById('loadHistoryBtn');
  const historyModal = document.getElementById('historyModal');
  const historyList = document.getElementById('historyList');
  const modalClose = historyModal.querySelector('.modal-close');
  const modalBackdrop = historyModal.querySelector('.modal-backdrop');

  const outputPlaceholder = document.getElementById('outputPlaceholder');
  const outputContent = document.getElementById('outputContent');
  const briefOutput = document.getElementById('briefOutput');
  const toastContainer = document.getElementById('toastContainer');

  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------
  let currentBriefMarkdown = '';
  const HISTORY_KEY = 'dailyBriefAI_history';
  const THEME_KEY = 'dailyBriefAI_theme';

  // --------------------------------------------------------------------------
  // Initialize
  // --------------------------------------------------------------------------
  function init() {
    loadTheme();
    setupCounters();
    setupAutoResize();
    setupKeyboardShortcuts();
    form.addEventListener('submit', handleSubmit);
    clearBtn.addEventListener('click', clearForm);
    themeToggle.addEventListener('click', toggleTheme);
    copyBtn.addEventListener('click', copyResponse);
    downloadBtn.addEventListener('click', downloadResponse);
    loadHistoryBtn.addEventListener('click', openHistory);
    modalClose.addEventListener('click', closeHistory);
    modalBackdrop.addEventListener('click', closeHistory);

    // Persist draft as user types (excluding on page unload to avoid flash)
    form.querySelectorAll('textarea').forEach((textarea) => {
      textarea.addEventListener('input', debounce(saveDraft, 300));
    });
    loadDraft();
  }

  // --------------------------------------------------------------------------
  // Form submission
  // --------------------------------------------------------------------------
  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    const payload = Object.fromEntries(new FormData(form).entries());

    setLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.errors
          ? data.errors.join('\n')
          : data.error || 'Something went wrong.';
        throw new Error(message);
      }

      currentBriefMarkdown = data.brief;
      renderMarkdown(currentBriefMarkdown);
      saveToHistory(payload, currentBriefMarkdown);
      clearDraft();
      showToast('Your daily brief is ready!', 'success');
    } catch (error) {
      console.error(error);
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    generateBtn.classList.toggle('loading', isLoading);
    form.querySelectorAll('textarea, button').forEach((el) => {
      if (el !== generateBtn) el.disabled = isLoading;
    });
  }

  // --------------------------------------------------------------------------
  // Markdown rendering (lightweight parser)
  // --------------------------------------------------------------------------
  function renderMarkdown(markdown) {
    // Escape HTML first
    let html = escapeHtml(markdown);

    // Convert headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Convert bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convert blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Convert unordered lists
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    // Fix nested ul wrapping issues from above simple regex by replacing consecutive ul blocks
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Convert ordered lists
    html = html.replace(/^\d+\.\s(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, (match) => {
      // Only wrap if not already in a ul
      if (match.startsWith('<li>') && !match.includes('<ul>')) {
        return `<ol>${match}</ol>`;
      }
      return match;
    });
    html = html.replace(/<\/ol>\s*<ol>/g, '');

    // Convert inline code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // Convert paragraphs (must be last)
    html = html.replace(/\n/g, '<br>');

    briefOutput.innerHTML = html;
    outputPlaceholder.classList.add('hidden');
    outputContent.classList.remove('hidden');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --------------------------------------------------------------------------
  // Character counters
  // --------------------------------------------------------------------------
  function setupCounters() {
    document.querySelectorAll('.counter').forEach((counter) => {
      const targetId = counter.getAttribute('data-for');
      const textarea = document.getElementById(targetId);
      if (!textarea) return;

      const max = parseInt(textarea.getAttribute('maxlength'), 10) || 0;

      function update() {
        const length = textarea.value.length;
        counter.textContent = `${length} / ${max}`;
        counter.style.color = length >= max ? 'var(--danger)' : 'var(--text-muted)';
      }

      textarea.addEventListener('input', update);
      update();
    });
  }

  // --------------------------------------------------------------------------
  // Auto-resize textareas
  // --------------------------------------------------------------------------
  function setupAutoResize() {
    form.querySelectorAll('textarea').forEach((textarea) => {
      function resize() {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 400)}px`;
      }
      textarea.addEventListener('input', resize);
      // Trigger once after fonts load
      window.addEventListener('load', resize);
    });
  }

  // --------------------------------------------------------------------------
  // Theme toggle
  // --------------------------------------------------------------------------
  function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    showToast(`Switched to ${next} mode`, 'info');
  }

  // --------------------------------------------------------------------------
  // Clear form
  // --------------------------------------------------------------------------
  function clearForm() {
    form.reset();
    document.querySelectorAll('.counter').forEach((counter) => {
      const targetId = counter.getAttribute('data-for');
      const max = document.getElementById(targetId)?.getAttribute('maxlength') || 0;
      counter.textContent = `0 / ${max}`;
      counter.style.color = 'var(--text-muted)';
    });
    form.querySelectorAll('textarea').forEach((textarea) => {
      textarea.style.height = 'auto';
    });
    clearDraft();
    showToast('Form cleared', 'info');
  }

  // --------------------------------------------------------------------------
  // Copy & download
  // --------------------------------------------------------------------------
  async function copyResponse() {
    if (!currentBriefMarkdown) return;
    try {
      await navigator.clipboard.writeText(currentBriefMarkdown);
      showToast('Copied to clipboard!', 'success');
    } catch {
      showToast('Unable to copy automatically.', 'error');
    }
  }

  function downloadResponse() {
    if (!currentBriefMarkdown) return;
    const blob = new Blob([currentBriefMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `daily-brief-${date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Download started', 'success');
  }

  // --------------------------------------------------------------------------
  // Local history
  // --------------------------------------------------------------------------
  function saveToHistory(input, brief) {
    const history = getHistory();
    const title = input.goals.split('\n')[0].slice(0, 60) || 'Daily Brief';
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      title,
      input,
      brief,
    };
    history.unshift(entry);
    if (history.length > 20) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
      return [];
    }
  }

  function openHistory() {
    const history = getHistory();
    historyList.innerHTML = '';

    if (history.length === 0) {
      historyList.innerHTML = '<p class="empty-state">No saved briefs yet.</p>';
    } else {
      history.forEach((entry) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        const date = new Date(entry.date).toLocaleString();
        item.innerHTML = `<time>${date}</time><p>${escapeHtml(entry.title)}</p>`;
        item.addEventListener('click', () => loadHistoryEntry(entry));
        historyList.appendChild(item);
      });
    }

    historyModal.classList.add('open');
  }

  function closeHistory() {
    historyModal.classList.remove('open');
  }

  function loadHistoryEntry(entry) {
    Object.entries(entry.input).forEach(([key, value]) => {
      const field = form.elements[key];
      if (field) field.value = value;
    });
    currentBriefMarkdown = entry.brief;
    renderMarkdown(entry.brief);
    // Refresh counters and sizes
    form.querySelectorAll('textarea').forEach((textarea) => {
      textarea.dispatchEvent(new Event('input'));
    });
    closeHistory();
    showToast('Loaded brief from history', 'success');
  }

  // --------------------------------------------------------------------------
  // Draft persistence
  // --------------------------------------------------------------------------
  const DRAFT_KEY = 'dailyBriefAI_draft';

  function saveDraft() {
    const draft = Object.fromEntries(new FormData(form).entries());
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  function loadDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
      if (!draft) return;
      Object.entries(draft).forEach(([key, value]) => {
        const field = form.elements[key];
        if (field) field.value = value;
      });
      form.querySelectorAll('textarea').forEach((textarea) => {
        textarea.dispatchEvent(new Event('input'));
      });
    } catch {
      // ignore corrupt draft
    }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  // --------------------------------------------------------------------------
  // Keyboard shortcuts
  // --------------------------------------------------------------------------
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ignore when typing in textareas
      if (event.target.tagName === 'TEXTAREA' || event.target.tagName === 'INPUT') {
        // Allow Escape to close modal even when typing
        if (event.key === 'Escape' && historyModal.classList.contains('open')) {
          closeHistory();
        }
        return;
      }

      if (event.key === 't' || event.key === 'T') {
        event.preventDefault();
        toggleTheme();
      } else if (event.key === 'c' || event.key === 'C') {
        event.preventDefault();
        clearForm();
      } else if (event.key === 'g' || event.key === 'G') {
        event.preventDefault();
        generateBtn.click();
      } else if (event.key === 'h' || event.key === 'H') {
        event.preventDefault();
        openHistory();
      } else if (event.key === 'Escape') {
        if (historyModal.classList.contains('open')) {
          closeHistory();
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // Toast notifications
  // --------------------------------------------------------------------------
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------
  function debounce(fn, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // --------------------------------------------------------------------------
  // Boot
  // --------------------------------------------------------------------------
  init();
})();
