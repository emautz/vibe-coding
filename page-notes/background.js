// background.js
// v1.0 - initial build
//
// WHAT THIS FILE DOES
// When you click the extension's toolbar icon, this file (1) opens the side
// panel, (2) reads the page you are looking at to count its words, links and
// images, and (3) hands the numbers to the panel to display.
//
// WHY EACH PERMISSION IS NEEDED
// (manifest.json is strict JSON and cannot hold comments, so the reasons are
// written here instead.)
//
//   "activeTab" - Gives the extension temporary access to the one tab you
//                 just clicked the icon on, and only until you leave or
//                 reload that page. It is what lets us read a page without
//                 asking for access to every website you visit.
//
//   "scripting" - Lets us run a small function inside that tab (via
//                 chrome.scripting.executeScript) so it can count things on
//                 the page. Without it we could not look at the page at all.
//
//   "sidePanel" - Lets us show the panel (chrome.sidePanel.open) and lets
//                 the manifest's "side_panel" entry point at panel.html.

// The most recent counting result. The panel asks for this when it first
// opens, because the panel may finish loading after the counting is done.
// (Held in memory only; if Chrome puts this worker to sleep it is forgotten,
// and the next click simply counts again.)
let latestResult = null;

// ---------------------------------------------------------------------------
// Toolbar icon click
// ---------------------------------------------------------------------------
// This event only fires because manifest.json has an "action" with no popup.
chrome.action.onClicked.addListener(function (tab) {
  // IMPORTANT: open the panel first, with no "await" before it. Chrome only
  // allows a panel to be opened while it still counts as a direct result of
  // your click, and waiting on anything else first would use that up.
  // We open it for the whole window so it stays put when you switch tabs.
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(function (error) {
    console.error('Could not open the side panel:', error);
  });

  // Count the page that was clicked on. If the panel was already open, it
  // simply receives the new numbers and switches to this page.
  countPage(tab);
});

// ---------------------------------------------------------------------------
// Counting
// ---------------------------------------------------------------------------
// Runs measurePage() inside the clicked tab and passes the answer on.
async function countPage(tab) {
  let result;

  try {
    // Run the function inside the page. The answer comes back as a list with
    // one entry per frame; we only asked about the top-level page, so we want
    // the first entry.
    const injections = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: measurePage
    });
    result = { ok: true, counts: injections[0].result };
  } catch (error) {
    // Chrome refuses to let extensions read some pages (its own settings
    // pages, the Chrome Web Store, and so on). Tell the panel so it can
    // explain this instead of showing stale numbers.
    result = { ok: false };
  }

  // Remember it for a panel that is still loading...
  latestResult = result;

  // ...and send it to a panel that is already open. If no panel is listening
  // yet, Chrome reports an error, which is fine: the panel will ask for the
  // remembered result when it loads.
  chrome.runtime.sendMessage({ type: 'page-counted', result: result }).catch(function () {});
}

// This function is copied into the web page and runs THERE, not here. That
// means it cannot use any variable from this file: everything it needs must
// be inside it.
function measurePage() {
  // --- Words ---------------------------------------------------------------
  // innerText is the text a person can actually see on the page. It skips
  // scripts, styles and hidden elements.
  const text = document.body ? document.body.innerText : '';

  // Intl.Segmenter is the browser's built-in word splitter. It works for
  // languages that do not put spaces between words (Chinese, Japanese, Thai)
  // and it ignores punctuation. "isWordLike" is true for words and numbers.
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
  let words = 0;
  for (const piece of segmenter.segment(text)) {
    if (piece.isWordLike) {
      words = words + 1;
    }
  }

  // --- Links ---------------------------------------------------------------
  // document.links is every <a> or <area> that has an href, i.e. a real link.
  const links = document.links.length;

  // --- Images --------------------------------------------------------------
  // document.images is every <img> element on the page.
  const images = document.images.length;

  // An image is a problem only when it has NO alt attribute at all.
  // hasAttribute('alt') is true even for alt="", which is the correct way to
  // mark a decorative picture so screen readers skip it, so alt="" is
  // deliberately not counted here.
  let imagesWithoutAlt = 0;
  for (const image of document.images) {
    if (!image.hasAttribute('alt')) {
      imagesWithoutAlt = imagesWithoutAlt + 1;
    }
  }

  // --- Page address --------------------------------------------------------
  // The panel uses the address as the key for the page's note. We cut off
  // anything after a "#" so that jumping to a heading on the same page does
  // not look like a different page.
  const address = new URL(location.href);
  address.hash = '';

  return {
    url: address.href,
    title: document.title,
    words: words,
    links: links,
    images: images,
    imagesWithoutAlt: imagesWithoutAlt
  };
}

// ---------------------------------------------------------------------------
// Messages from the panel
// ---------------------------------------------------------------------------
// When the panel finishes loading it says "panel-ready". We answer straight
// away with the latest counts, if we have any.
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message && message.type === 'panel-ready') {
    sendResponse({ result: latestResult });
  }
});
