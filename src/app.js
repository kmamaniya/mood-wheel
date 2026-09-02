import {
  CORE_EMOTIONS,
  getCoreEmotion,
  getSpecificEmotions,
} from './moods.js';
import { formatMoodDate } from './date.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const WHEEL_CENTER = 250;
const OUTER_RADIUS = 214;
const INNER_RADIUS = 145;

const elements = {
  authGate: document.querySelector('#auth-gate'),
  authGateMessage: document.querySelector('#auth-gate-message'),
  checkInApp: document.querySelector('#check-in-app'),
  entryDate: document.querySelector('#entry-date'),
  entryForm: document.querySelector('#entry-form'),
  entryIntensity: document.querySelector('#entry-intensity'),
  entryList: document.querySelector('#entry-list'),
  entryNotes: document.querySelector('#entry-notes'),
  entryTotal: document.querySelector('#entry-total'),
  entryTrigger: document.querySelector('#entry-trigger'),
  entryNeed: document.querySelector('#entry-need'),
  entryHelped: document.querySelector('#entry-helped'),
  formMessage: document.querySelector('#form-message'),
  intensityValue: document.querySelector('#intensity-value'),
  notionDashboardLink: document.querySelector('#notion-dashboard-link'),
  noteCount: document.querySelector('#note-count'),
  saveButton: document.querySelector('#save-button'),
  selectionCount: document.querySelector('#selection-count'),
  selectedMood: document.querySelector('#selected-mood'),
  selectedMoodName: document.querySelector('#selected-mood-name'),
  signInLink: document.querySelector('#sign-in-link'),
  specificEmotions: document.querySelector('#specific-emotions'),
  specificSection: document.querySelector('#specific-section'),
  userAvatar: document.querySelector('#user-avatar'),
  userLogin: document.querySelector('#user-login'),
  userMenu: document.querySelector('#user-menu'),
  wheelCore: document.querySelector('#wheel-core'),
  wheelCopyHint: document.querySelector('#wheel-copy-hint'),
  wheelCopyKicker: document.querySelector('#wheel-copy-kicker'),
  wheelCopyTitle: document.querySelector('#wheel-copy-title'),
  wheelSegments: document.querySelector('#wheel-segments'),
};

const state = {
  coreEmotionIds: new Set(),
  entries: [],
  specificEmotionsByCore: new Map(),
  user: null,
};

function createSvgElement(name, attributes) {
  const element = document.createElementNS(SVG_NAMESPACE, name);
  Object.entries(attributes || {}).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
  return element;
}

function pointOnCircle(radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: WHEEL_CENTER + radius * Math.cos(radians),
    y: WHEEL_CENTER + radius * Math.sin(radians),
  };
}

function createDonutSlice(startAngle, endAngle) {
  const outerStart = pointOnCircle(OUTER_RADIUS, startAngle);
  const outerEnd = pointOnCircle(OUTER_RADIUS, endAngle);
  const innerStart = pointOnCircle(INNER_RADIUS, startAngle);
  const innerEnd = pointOnCircle(INNER_RADIUS, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    'M', outerStart.x, outerStart.y,
    'A', OUTER_RADIUS, OUTER_RADIUS, 0, largeArc, 1, outerEnd.x, outerEnd.y,
    'L', innerEnd.x, innerEnd.y,
    'A', INNER_RADIUS, INNER_RADIUS, 0, largeArc, 0, innerStart.x, innerStart.y,
    'Z',
  ].join(' ');
}

function colorWithAlpha(hex, alpha) {
  const number = Number.parseInt(hex.slice(1), 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alpha + ')';
}

function selectedCoreEmotions() {
  return CORE_EMOTIONS.filter((emotion) => state.coreEmotionIds.has(emotion.id));
}

function selectedSpecificEmotions() {
  return [...new Set(
    [...state.specificEmotionsByCore.values()].flatMap((emotions) => [...emotions]),
  )];
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function setMessage(message, stateName) {
  elements.formMessage.textContent = message || '';
  if (stateName) {
    elements.formMessage.dataset.state = stateName;
  } else {
    delete elements.formMessage.dataset.state;
  }
}

function clearMessage() {
  setMessage('', '');
}

function setWheelCopy() {
  const coreEmotions = selectedCoreEmotions();
  const primaryCoreEmotion = coreEmotions[0];
  const specificEmotionCount = selectedSpecificEmotions().length;

  if (!primaryCoreEmotion) {
    elements.wheelCore.style.fill = '#fffefa';
    elements.wheelCore.style.stroke = 'rgba(58, 49, 38, 0.12)';
    elements.wheelCopyKicker.textContent = 'CORE FEELING';
    elements.wheelCopyTitle.textContent = 'Choose any';
    elements.wheelCopyHint.textContent = 'from the wheel';
    return;
  }

  elements.wheelCore.style.fill = colorWithAlpha(primaryCoreEmotion.color, 0.22);
  elements.wheelCore.style.stroke = colorWithAlpha(primaryCoreEmotion.color, 0.65);
  elements.wheelCopyKicker.textContent = 'CORE FEELING';
  elements.wheelCopyTitle.textContent = coreEmotions.length === 1
    ? primaryCoreEmotion.name
    : coreEmotions.length + ' feelings';
  elements.wheelCopyHint.textContent = specificEmotionCount
    ? specificEmotionCount + ' shades chosen'
    : 'choose all that fit';
}

function renderWheel(focusId = '') {
  const selectedIds = state.coreEmotionIds;
  const segmentSize = 360 / CORE_EMOTIONS.length;
  const fragment = document.createDocumentFragment();

  CORE_EMOTIONS.forEach((emotion, index) => {
    const startAngle = index * segmentSize;
    const endAngle = startAngle + segmentSize;
    const labelPoint = pointOnCircle(177, startAngle + segmentSize / 2);
    const selected = selectedIds.has(emotion.id);
    const group = createSvgElement('g', {
      'aria-checked': selected ? 'true' : 'false',
      'aria-label': emotion.name + '. ' + emotion.description,
      class: 'wheel-segment',
      'data-core-emotion': emotion.id,
      'data-selected': selected ? 'true' : 'false',
      role: 'checkbox',
      tabindex: emotion.id === focusId || (!focusId && index === 0) ? '0' : '-1',
    });
    const title = createSvgElement('title');
    title.textContent = emotion.name + ': ' + emotion.description;
    const path = createSvgElement('path', {
      class: 'wheel-segment-path',
      d: createDonutSlice(startAngle, endAngle),
      fill: colorWithAlpha(emotion.color, selected ? 0.88 : 0.7),
    });
    const label = createSvgElement('text', {
      class: 'wheel-segment-label',
      x: labelPoint.x,
      y: labelPoint.y,
      'text-anchor': 'middle',
    });
    label.textContent = emotion.name;

    group.append(title, path, label);
    group.addEventListener('click', () => toggleCoreEmotion(emotion.id, true));
    group.addEventListener('keydown', (event) => handleWheelKeydown(event, index));
    fragment.append(group);
  });

  elements.wheelSegments.replaceChildren(fragment);
  setWheelCopy();
}

function handleWheelKeydown(event, index) {
  let targetIndex;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    targetIndex = (index + 1) % CORE_EMOTIONS.length;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    targetIndex = (index - 1 + CORE_EMOTIONS.length) % CORE_EMOTIONS.length;
  } else if (event.key === 'Home') {
    targetIndex = 0;
  } else if (event.key === 'End') {
    targetIndex = CORE_EMOTIONS.length - 1;
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    toggleCoreEmotion(CORE_EMOTIONS[index].id, true);
    return;
  } else {
    return;
  }

  event.preventDefault();
  document.querySelector('[data-core-emotion="' + CORE_EMOTIONS[targetIndex].id + '"]')?.focus();
}

function toggleCoreEmotion(id, moveFocus) {
  if (!getCoreEmotion(id)) {
    return;
  }

  if (state.coreEmotionIds.has(id)) {
    state.coreEmotionIds.delete(id);
    state.specificEmotionsByCore.delete(id);
  } else {
    state.coreEmotionIds.add(id);
    state.specificEmotionsByCore.set(id, new Set());
  }
  clearMessage();
  renderWheel(id);
  renderSpecificEmotions();
  renderSelectedMood();

  if (moveFocus) {
    document.querySelector('[data-core-emotion="' + id + '"]')?.focus();
  }
}

function renderSpecificEmotions() {
  const coreEmotions = selectedCoreEmotions();
  elements.specificSection.hidden = coreEmotions.length === 0;
  elements.specificEmotions.replaceChildren();
  if (coreEmotions.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();
  coreEmotions.forEach((coreEmotion) => {
    const group = document.createElement('div');
    group.className = 'specific-emotion-group';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', coreEmotion.name + ' specific feelings');

    const label = document.createElement('p');
    label.className = 'specific-emotion-group-label';
    label.style.setProperty('--mood-color', coreEmotion.color);
    label.textContent = coreEmotion.name;

    const chips = document.createElement('div');
    chips.className = 'specific-emotion-chips';
    const selectedEmotions = state.specificEmotionsByCore.get(coreEmotion.id) || new Set();
    getSpecificEmotions(coreEmotion.id).forEach((specificEmotion) => {
      const selected = selectedEmotions.has(specificEmotion);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'specific-chip';
      button.dataset.selected = selected ? 'true' : 'false';
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.style.setProperty('--mood-color', coreEmotion.color);
      button.textContent = specificEmotion;
      button.addEventListener('click', () => toggleSpecificEmotion(coreEmotion.id, specificEmotion));
      chips.append(button);
    });
    group.append(label, chips);
    fragment.append(group);
  });
  elements.specificEmotions.append(fragment);
}

function toggleSpecificEmotion(coreEmotionId, specificEmotion) {
  const selectedEmotions = state.specificEmotionsByCore.get(coreEmotionId);
  if (!selectedEmotions) {
    return;
  }

  if (selectedEmotions.has(specificEmotion)) {
    selectedEmotions.delete(specificEmotion);
  } else {
    selectedEmotions.add(specificEmotion);
  }
  clearMessage();
  renderSpecificEmotions();
  renderSelectedMood();
  setWheelCopy();
}

function renderSelectedMood() {
  const coreEmotions = selectedCoreEmotions();
  const primaryCoreEmotion = coreEmotions[0];
  const coreNames = coreEmotions.map((emotion) => emotion.name);
  const selectedNames = selectedSpecificEmotions();
  const summary = !primaryCoreEmotion
    ? 'Choose from the wheel'
    : selectedNames.length === 0
      ? coreNames.join(' + ')
      : coreNames.join(' + ') + ' · ' + selectedNames.join(', ');

  elements.selectedMood.dataset.selected = String(Boolean(primaryCoreEmotion));
  elements.selectedMood.style.setProperty('--selected-color', primaryCoreEmotion?.color || '#d9d4cb');
  elements.selectedMoodName.textContent = summary;
  elements.selectionCount.textContent = !primaryCoreEmotion
    ? '0 selected'
    : coreNames.length + ' core ' + (coreNames.length === 1 ? 'feeling' : 'feelings')
      + (selectedNames.length
        ? ' · ' + selectedNames.length + ' shade' + (selectedNames.length === 1 ? '' : 's')
        : '');
}

function renderEntries() {
  elements.entryList.replaceChildren();
  if (state.entries.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-entries';
    empty.textContent = 'Your check-ins will appear in Notion and gather here as a gentle record.';
    elements.entryList.append(empty);
  } else {
    const entries = state.entries.slice(0, 3).map((entry) => {
      const item = document.createElement('li');
      item.className = 'entry-item';
      const coreEmotions = Array.isArray(entry.coreEmotions) && entry.coreEmotions.length
        ? entry.coreEmotions
        : [entry.coreEmotion].filter(Boolean);
      const coreEmotion = getCoreEmotion(coreEmotions[0]);
      item.style.setProperty('--entry-color', coreEmotion?.color || '#9C9DA2');

      const top = document.createElement('div');
      top.className = 'entry-item-top';
      const name = document.createElement('span');
      name.className = 'entry-item-name';
      const dot = document.createElement('span');
      dot.className = 'entry-item-dot';
      dot.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = entry.specificEmotions?.[0] || coreEmotions.join(' + ') || 'Check-in';
      name.append(dot, label);

      const date = document.createElement('time');
      date.dateTime = entry.date || '';
      date.textContent = formatMoodDate(entry.date);
      top.append(name, date);

      const note = document.createElement('p');
      note.textContent = entry.notes || entry.trigger || '';
      item.append(top, note);
      return item;
    });
    elements.entryList.append(...entries);
  }

  const total = state.entries.length;
  elements.entryTotal.textContent = total === 0
    ? 'No check-ins yet'
    : total === 1
      ? '1 saved check-in'
      : total + ' saved check-ins';
}

function updateNoteCount() {
  elements.noteCount.textContent = elements.entryNotes.value.length + ' / 2000';
}

function setDashboardUrl(url) {
  if (!url) {
    elements.notionDashboardLink.hidden = true;
    return;
  }
  elements.notionDashboardLink.href = url;
  elements.notionDashboardLink.hidden = false;
}

async function loadEntries() {
  elements.entryList.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/entries', { headers: { Accept: 'application/json' } });
    if (response.status === 401) {
      showSignIn('Your session ended. Sign in with GitHub to continue.');
      return;
    }
    if (!response.ok) {
      throw new Error('Entries request failed.');
    }

    const result = await response.json();
    state.entries = Array.isArray(result.entries) ? result.entries : [];
    setDashboardUrl(result.dashboardUrl);
    renderEntries();
  } catch {
    elements.entryList.replaceChildren();
    const message = document.createElement('li');
    message.className = 'empty-entries';
    message.textContent = 'We could not reach your Notion mood log just now. Your entries are still safe there.';
    elements.entryList.append(message);
    elements.entryTotal.textContent = 'Notion is unavailable';
  } finally {
    elements.entryList.removeAttribute('aria-busy');
  }
}

function fieldForError(fields) {
  if (fields.coreEmotion || fields.coreEmotions || fields.specificEmotions) {
    return document.querySelector('[data-core-emotion]');
  }
  if (fields.date) {
    return elements.entryDate;
  }
  if (fields.intensity) {
    return elements.entryIntensity;
  }
  if (fields.notes) {
    return elements.entryNotes;
  }
  if (fields.trigger) {
    return elements.entryTrigger;
  }
  if (fields.need) {
    return elements.entryNeed;
  }
  if (fields.helped) {
    return elements.entryHelped;
  }
  return null;
}

function resetEntryForm() {
  elements.entryForm.reset();
  elements.entryDate.value = formatDateForInput(new Date());
  elements.entryIntensity.value = '5';
  elements.intensityValue.textContent = '5';
  updateNoteCount();
  state.coreEmotionIds = new Set();
  state.specificEmotionsByCore = new Map();
  renderWheel();
  renderSpecificEmotions();
  renderSelectedMood();
}

function showSavedEntry(result) {
  if (!result?.entry || typeof result.entry !== 'object') {
    resetEntryForm();
    setMessage('Your check-in was saved. Refresh the page to see it in your recent entries.', 'success');
    return;
  }

  try {
    state.entries.unshift(result.entry);
    renderEntries();
    setDashboardUrl(result.dashboardUrl);
  } catch (error) {
    console.error('Saved entry could not be rendered.', error);
  }

  resetEntryForm();
  setMessage('Saved to your Notion mood log. Thank you for noticing.', 'success');
}

async function saveEntry(event) {
  event.preventDefault();
  clearMessage();
  const payload = {
    coreEmotions: [...state.coreEmotionIds],
    specificEmotions: selectedSpecificEmotions(),
    intensity: Number(elements.entryIntensity.value),
    date: elements.entryDate.value,
    notes: elements.entryNotes.value,
    trigger: elements.entryTrigger.value,
    need: elements.entryNeed.value,
    helped: elements.entryHelped.value,
  };

  elements.saveButton.disabled = true;
  elements.saveButton.setAttribute('aria-busy', 'true');
  try {
    let response;
    try {
      response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      setMessage(
        'We could not confirm whether your check-in was saved. Check your Notion log before submitting it again.',
        'error',
      );
      return;
    }

    const result = await response.json().catch(() => null);
    if (response.status === 401) {
      showSignIn('Your session ended. Sign in with GitHub to save this check-in.');
    } else if (!response.ok) {
      const fields = result?.fields || {};
      setMessage(Object.values(fields)[0] || result?.error || 'Your check-in could not be saved.', 'error');
      fieldForError(fields)?.focus();
    } else {
      showSavedEntry(result);
    }
  } finally {
    elements.saveButton.disabled = false;
    elements.saveButton.removeAttribute('aria-busy');
  }
}

function authMessageFromUrl() {
  const authState = new URLSearchParams(window.location.search).get('auth');
  if (authState === 'not-approved') {
    return 'That GitHub account is not approved for this private journal.';
  }
  if (authState === 'invalid') {
    return 'That sign-in link expired. Please try GitHub sign-in again.';
  }
  return 'Your GitHub identity protects this journal before anything is read from or written to Notion.';
}

function showSignIn(message) {
  elements.authGate.hidden = false;
  elements.checkInApp.hidden = true;
  elements.userMenu.hidden = true;
  elements.signInLink.hidden = false;
  elements.authGateMessage.textContent = message;
}

function showCheckIn(user) {
  state.user = user;
  elements.authGate.hidden = true;
  elements.checkInApp.hidden = false;
  elements.userMenu.hidden = false;
  elements.signInLink.hidden = true;
  elements.userLogin.textContent = '@' + user.login;
  elements.userAvatar.src = user.avatarUrl || '';
  elements.userAvatar.alt = user.login + ' avatar';
}

async function establishSession() {
  try {
    const response = await fetch('/api/me', { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      showSignIn(authMessageFromUrl());
      return;
    }

    const result = await response.json();
    if (!result.user?.login) {
      showSignIn(authMessageFromUrl());
      return;
    }
    showCheckIn(result.user);
    await loadEntries();
  } catch {
    showSignIn('This local preview needs its secure deployment settings before GitHub sign-in can run.');
  }
}

function initialize() {
  elements.entryDate.value = formatDateForInput(new Date());
  elements.entryForm.addEventListener('submit', saveEntry);
  elements.entryNotes.addEventListener('input', updateNoteCount);
  elements.entryIntensity.addEventListener('input', () => {
    elements.intensityValue.textContent = elements.entryIntensity.value;
  });
  renderWheel();
  renderSpecificEmotions();
  renderSelectedMood();
  renderEntries();
  updateNoteCount();
  establishSession();
}

initialize();
