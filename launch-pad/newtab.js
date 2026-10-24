// v1.1 - updated with custom links list

// ============================================================================
// CONFIGURATION: CUSTOM QUICK LINKS LIST
// Edit the names and URLs in this list to update your six quick links without hunting.
// ============================================================================
const QUICK_LINKS = [
  { name: "Vibe Coding", url: "https://emautz.github.io/vibe-coding/" },
  { name: "TxtEdtr", url: "https://txtedtr.app/" },
  { name: "ChatGPT", url: "https://chatgpt.com/" },
  { name: "Gemini", url: "https://gemini.google.com/" },
  { name: "SUNY Learning", url: "https://mylearning.suny.edu/d2l/home" },
  { name: "Gmail", url: "https://mail.google.com/mail/u/0/?tab=rm&ogbl#inbox" }
];

// ============================================================================
// FUNCTION: RENDER QUICK LINKS
// Takes the links array from above and dynamically adds them to the page HTML.
// ============================================================================
function renderQuickLinks() {
  // Find the list element where links will be inserted
  const linksContainer = document.getElementById("links-container");

  // Loop over each item in the QUICK_LINKS array
  QUICK_LINKS.forEach((link) => {
    // Create a list item element
    const listItem = document.createElement("li");
    listItem.className = "link-item";

    // Create an anchor element for the clickable link
    const anchor = document.createElement("a");
    anchor.href = link.url;
    anchor.textContent = link.name;
    
    // Set explicit ARIA label for screen readers
    anchor.setAttribute("aria-label", `Open ${link.name}`);

    // Append the anchor to the list item, then list item to the container
    listItem.appendChild(anchor);
    linksContainer.appendChild(listItem);
  });
}

// ============================================================================
// FUNCTION: UPDATE CLOCK AND DATE
// Retrieves current time and date, formats them, and writes them to the DOM.
// ============================================================================
function updateDateTime() {
  // Create a Date object representing the current moment
  const now = new Date();

  // Format time (e.g., "10:42 AM" or "02:15 PM")
  const timeOptions = { hour: "2-digit", minute: "2-digit" };
  const timeString = now.toLocaleTimeString([], timeOptions);

  // Format date (e.g., "Thursday, October 24")
  const dateOptions = { weekday: "long", month: "long", day: "numeric" };
  const dateString = now.toLocaleDateString([], dateOptions);

  // Update the HTML text content safely
  document.getElementById("clock").textContent = timeString;
  document.getElementById("date").textContent = dateString;
}

// ============================================================================
// INITIALIZATION
// Runs when the DOM content has fully loaded.
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Build and insert the quick links
  renderQuickLinks();

  // Run initial clock update immediately so there is no delay
  updateDateTime();

  // Refresh the clock every second to keep time accurate
  setInterval(updateDateTime, 1000);
});