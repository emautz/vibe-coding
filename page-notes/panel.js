// panel.js
// v1.0 - initial build
//
// WHAT THIS FILE DOES
// Runs inside the side panel. It (1) shows the counts that background.js
// sends after you click the toolbar icon, and (2) loads and saves a note for
// whichever page was counted, using localStorage with the page address as key.

// Average adult silent-reading speed for non-fiction, in words per minute
// (from a 2019 review of reading studies by Brysbaert). Used only to turn a
// word count into an estimated time.
const WORDS_PER_MINUTE = 238;

// Grab every part of the panel we need to change, once, so we do not have to
// look them up again each time.
const statusEl = document.getElementById('status');
const titleEl = document.getElementById('page-title');
const urlEl = document.getElementById('page-url');
const wordsEl = document.getElementById('stat-words');
const timeEl = document.getElementById('stat-time');
const linksEl = document.getElementById('stat-links');
const imagesEl = document.getElementById('stat-images');
const noAltEl = document.getElementById('stat-no-alt');
const noteEl = document.getElementById('note');
const noteErrorEl = document.getElementById('note-error');

// The address of the page being shown. This is the localStorage key for its
// note. It is null when there is no readable page, and the note box is
// switched off in that case.
let currentKey = null;

// True once we have shown a result. It stops a late, older answer from
// overwriting a newer one if the two arrive in an unlucky order.
let hasResult = false;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// Turns a word count into text like "4 min" or "Less than 1 min".
function formatReadingTime(words) {
  if (words === 0) {
    return '0 min';
  }
  const minutes = words / WORDS_PER_MINUTE;
  if (minutes < 1) {
    return 'Less than 1 min';
  }
  return Math.round(minutes) + ' min';
}

// Updates the status line that screen readers announce. We empty it first and
// fill it a moment later: if the new message is identical to the old one
// (for example, counting the same page twice), nothing would be announced.
function announce(message) {
  statusEl.textContent = '';
  window.setTimeout(function () {
    statusEl.textContent = message;
  }, 100);
}

// ---------------------------------------------------------------------------
// Showing a result
// ---------------------------------------------------------------------------

// Shows the counts for a page that was read successfully.
function showCounts(counts) {
  hasResult = true;

  titleEl.textContent = counts.title || '(This page has no title)';
  urlEl.textContent = counts.url;
  wordsEl.textContent = counts.words.toLocaleString();
  timeEl.textContent = formatReadingTime(counts.words);
  linksEl.textContent = counts.links.toLocaleString();
  imagesEl.textContent = counts.images.toLocaleString();
  noAltEl.textContent = counts.imagesWithoutAlt.toLocaleString();

  loadNote(counts.url);
  announce('Counted this page.');
}

// Shows a message when Chrome would not let the extension read the page.
function showUnreadable() {
  hasResult = true;

  titleEl.textContent = '–';
  urlEl.textContent = '–';
  wordsEl.textContent = '–';
  timeEl.textContent = '–';
  linksEl.textContent = '–';
  imagesEl.textContent = '–';
  noAltEl.textContent = '–';

  // With no readable page there is nothing to attach a note to.
  currentKey = null;
  noteEl.value = '';
  noteEl.disabled = true;

  announce("This page can't be counted. Chrome doesn't let extensions read some pages, such as its own settings pages and the Chrome Web Store.");
}

// Picks the right display for a result sent by background.js.
function showResult(result) {
  if (result && result.ok) {
    showCounts(result.counts);
  } else if (result) {
    showUnreadable();
  }
}

// ---------------------------------------------------------------------------
// The note
// ---------------------------------------------------------------------------

// Fills the note box with whatever was saved for this page address, or leaves
// it empty if nothing was saved. Runs automatically each time a page is counted.
function loadNote(key) {
  currentKey = key;
  noteErrorEl.textContent = '';

  try {
    noteEl.value = localStorage.getItem(key) || '';
  } catch (error) {
    // Storage can be unavailable; start with an empty note rather than failing.
    noteEl.value = '';
  }

  noteEl.disabled = false;
}

// Saves the note every time you type, so nothing is lost if you switch pages
// or close the panel. An empty note removes the entry instead of keeping an
// empty one around.
noteEl.addEventListener('input', function () {
  if (currentKey === null) {
    return;
  }

  try {
    if (noteEl.value === '') {
      localStorage.removeItem(currentKey);
    } else {
      localStorage.setItem(currentKey, noteEl.value);
    }
    noteErrorEl.textContent = '';
  } catch (error) {
    // Most likely the storage is full. Say so, because the note is not saved.
    noteErrorEl.textContent = 'This note could not be saved.';
  }
});

// ---------------------------------------------------------------------------
// Talking to background.js
// ---------------------------------------------------------------------------

// New counts arrive here when you click the toolbar icon while the panel is
// already open, including when you click it on a different page.
chrome.runtime.onMessage.addListener(function (message) {
  if (message && message.type === 'page-counted') {
    showResult(message.result);
  }
});

// When the panel first opens, the counting may already be finished, so ask
// background.js for the latest result. If a newer one has already arrived
// by message, ignore this older answer.
chrome.runtime.sendMessage({ type: 'panel-ready' }).then(function (response) {
  if (!hasResult && response && response.result) {
    showResult(response.result);
  }
}).catch(function () {
  // No answer is fine: the panel just keeps its "click the icon" message.
});
