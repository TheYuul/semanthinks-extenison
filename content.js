/* Semanthinks rule-based prototype. All detection remains on the current page. */
const ACADEMIC_TERMS = [
  "algorithm", "computer", "computer science", "computing", "programming", "software", "hardware", "database", "network", "security", "artificial intelligence", "machine learning", "data structure", "thesis", "research", "journal", "citation", "lecture", "university", "mathematics", "science", "physics", "chemistry", "biology", "engineering", "code", "javascript", "python", "web development",
  "pag-aaral", "pananaliksik", "kompyuter", "programa", "datos", "seguridad", "sistema", "kaalaman", "leksyon", "paaralan", "unibersidad", "pagsusuri", "teknolohiya"
];
const PROMOTIONAL_TERMS = ["sponsored", "advertisement", "advertorial", "buy now", "shop now", "limited offer", "discount", "subscribe now", "sign up now", "affiliate", "promo code", "paid partnership", "patalastas", "i-click", "bumili na", "mga alok", "diskwento", "mag-subscribe", "sponsor"];
const DISTRACTING_TERMS = ["celebrity", "gossip", "viral", "prank", "reaction", "gameplay", "mukbang", "giveaway", "shorts", "trending", "chismis", "sikat", "nakakatawa", "challenge", "vlog", "music video", "movie trailer", "drama", "stream highlights"];
const SELECTORS = {
  youtubeChrome: ["#secondary", "ytd-watch-next-secondary-results-renderer", "ytd-merch-shelf-renderer", "ytd-promoted-sparkles-web-renderer", "ytd-ad-slot-renderer", "ytd-reel-shelf-renderer", "ytd-reel-item-renderer", "ytd-reel-video-renderer", "ytd-rich-shelf-renderer[is-shorts]", "ytd-rich-section-renderer:has(ytd-reel-shelf-renderer)", "grid-shelf-view-model:has(a[href^='/shorts/'])"],
  youtubeCards: ["ytd-rich-item-renderer", "ytd-video-renderer", "ytd-compact-video-renderer", "ytd-grid-video-renderer"],
  generalAds: ["[id*='advert']", "[class*='advert']", "[id*='ad-container']", "[class*='ad-container']", "[class*='sponsor']", "[class*='promotion']", "[data-ad]", "[data-ad-slot]", "[id='google_vignette']", "[class*='google-vignette']", "[id^='google_ads_iframe']", "iframe[aria-label='Advertisement']", "iframe[title*='ad content' i]", "[data-google-av-adk]", ".GoogleActiveViewElement", "[data-asoch-targets^='ad']", "a[href*='googleads.g.doubleclick.net']", ".avp-floating-container.avp-fixed", "[id^='aniplayer_'][id$='Wrapper']", "video[src*='play.aniview.com']", "ins.adsbygoogle", "iframe[src*='doubleclick']", "iframe[src*='googlesyndication']", "iframe[src*='googleadservices']"],
  articleChrome: ["article .related-posts", "article .recommended", "article .newsletter", "article .social-share", "main .related-posts", "main .newsletter", "aside.floatrecirc", "aside[class*='recirc']", "[data-testid*='recirc']", "[data-testid*='newsletter']"],
  repositoryChrome: [".related-content", ".related-articles", ".recommended-content", ".recommendations", ".publication-recommendations", ".ad-container", ".advertisement", ".subscription-prompt"]
};

let settings = {};
let queued = false;
let sessionBypass = false;
let nextId = 1;
const processed = new WeakSet();
const detected = new Map();
const manualTreatment = new WeakMap();

function normalized(value) { return (value || "").toLowerCase().replace(/\s+/g, " ").trim(); }
function includesAny(text, terms) { return terms.some((term) => text.includes(term)); }
// Content scripts can remain in an already-open tab for a moment after the
// extension is reloaded. In that situation Chrome removes the old runtime
// context, so extension messages must be treated as optional.
function sendRuntimeMessage(message) {
  try {
    if (!chrome.runtime?.id) return;
    const result = chrome.runtime.sendMessage(message);
    if (result?.catch) result.catch(() => {});
  } catch (_) {
    // The page will receive the current content script on its next refresh.
  }
}
function isRepository() {
  const host = location.hostname.toLowerCase();
  return (settings.whitelistedDomains || []).some((domain) => host === domain || host.endsWith(`.${domain}`));
}
function semanticRelevance(text) {
  const value = normalized(text);
  const academicHits = ACADEMIC_TERMS.filter((term) => value.includes(term)).length;
  const distractingHits = DISTRACTING_TERMS.filter((term) => value.includes(term)).length;
  return Math.max(0, Math.min(1, 0.5 + academicHits * 0.14 - distractingHits * 0.18));
}
function descriptionFor(element, category) {
  const text = normalized(element.querySelector?.("#video-title, h1, h2, h3, [aria-label]")?.textContent || element.getAttribute?.("aria-label") || element.textContent);
  const snippet = text.replace(/\s+/g, " ").slice(0, 88);
  return snippet ? `${category}: ${snippet}` : category;
}
function register(element, category) {
  if (!element) return null;
  if (!element.dataset.semanthinksId) element.dataset.semanthinksId = `sem-${nextId++}`;
  const id = element.dataset.semanthinksId;
  detected.set(id, { element, category, description: descriptionFor(element, category) });
  return id;
}
function saveOriginalStyle(element) {
  if (element.dataset.semanthinksHadInlineStyle !== undefined) return;
  element.dataset.semanthinksHadInlineStyle = element.hasAttribute("style") ? "true" : "false";
  element.dataset.semanthinksOriginalStyle = element.getAttribute("style") || "";
}
function currentState(element) {
  if (element.classList.contains("semanthinks-hidden") || element.classList.contains("semanthinks-paragraph-hidden")) return "hidden";
  if (element.classList.contains("semanthinks-blurred")) return "blurred";
  return "visible";
}
function restore(element) {
  element.classList.remove("semanthinks-hidden", "semanthinks-paragraph-hidden", "semanthinks-blurred");
  if (element.dataset.semanthinksHadInlineStyle === "true") element.setAttribute("style", element.dataset.semanthinksOriginalStyle || "");
  else element.removeAttribute("style");
  delete element.dataset.semanthinksHadInlineStyle;
  delete element.dataset.semanthinksOriginalStyle;
}
function applyTreatment(element, treatment, category, count = false) {
  if (!element) return false;
  if (location.hostname.includes("youtube.com") && element.closest("#masthead-container, ytd-masthead, ytd-guide-signin-promo-renderer")) return false;
  register(element, category);
  if (treatment === "show") { restore(element); return true; }
  // Settings use "hide" while the element state is reported as "hidden".
  // Compare the normalized state so MutationObserver updates cannot recount
  // an element that has already been filtered.
  const desiredState = treatment === "hide" ? "hidden" : "blurred";
  if (currentState(element) === desiredState) return false;
  if (currentState(element) !== "visible") restore(element);
  saveOriginalStyle(element);
  element.classList.remove("semanthinks-hidden", "semanthinks-paragraph-hidden", "semanthinks-blurred");
  if (treatment === "blur") {
    element.classList.add("semanthinks-blurred");
    element.style.setProperty("filter", "blur(9px)", "important");
    element.style.setProperty("opacity", "0.35", "important");
    element.style.setProperty("pointer-events", "none", "important");
    element.style.setProperty("user-select", "none", "important");
  } else {
    element.classList.add(category === "Promotional paragraph" ? "semanthinks-paragraph-hidden" : "semanthinks-hidden");
    element.style.setProperty("display", "none", "important");
    element.style.setProperty("visibility", "hidden", "important");
    element.style.setProperty("pointer-events", "none", "important");
  }
  // Nested advertising frames may re-render repeatedly. Count only actions
  // taken by the top-page script so the session statistic remains meaningful.
  if (count && window.top === window) sendRuntimeMessage({ type: "incrementStats", hidden: 1, paragraphs: category === "Promotional paragraph" ? 1 : 0 });
  return true;
}
function treatCandidate(element, category) {
  register(element, category);
  if (sessionBypass || manualTreatment.get(element) === "show") return false;
  return applyTreatment(element, manualTreatment.get(element) || settings.filterDisplayMode || "hide", category, true);
}
function adContainer(element) {
  const container = element.closest("[id*='ad-container'], [class*='ad-container'], [id^='google_ads'], [id*='advert'], [class*='advert'], [class*='sponsor'], [class*='promotion']");
  if (container && container !== element) return container;
  const googleAd = element.closest("[data-google-av-adk], .GoogleActiveViewElement, [id='google_vignette'], [class*='google-vignette']");
  if (googleAd) return googleAd.closest("[id*='full-slot'], [class*='full-slot'], [class*='autoplay-in-motion']") || googleAd;
  const floatingVideoAd = element.closest(".avp-floating-container.avp-fixed, [id^='aniplayer_'][id$='Wrapper']");
  if (floatingVideoAd) return floatingVideoAd;
  const parent = element.parentElement;
  if (element.matches("iframe") && parent && parent.children.length <= 2 && !normalized(parent.textContent)) return parent;
  return element;
}
function filterYoutubeCards() {
  document.querySelectorAll(SELECTORS.youtubeCards.join(",")).forEach((card) => {
    if (card.closest("ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer")) return;
    const title = normalized(card.querySelector("#video-title, a#video-title, h3 a")?.textContent || card.textContent);
    if (title && !includesAny(title, ACADEMIC_TERMS) && includesAny(title, DISTRACTING_TERMS) && semanticRelevance(title) < 0.47) treatCandidate(card, "Distracting video");
  });
}
function hideShorts() {
  document.querySelectorAll("a[href^='/shorts/'], a[href*='youtube.com/shorts/']").forEach((link) => {
    const shelf = link.closest("grid-shelf-view-model, ytd-reel-shelf-renderer, ytd-rich-shelf-renderer, ytd-rich-section-renderer");
    const card = link.closest("ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-reel-item-renderer");
    treatCandidate(shelf || card || link, "YouTube Short");
  });
  document.querySelectorAll("ytd-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts]").forEach((shelf) => treatCandidate(shelf, "YouTube Short"));
  document.querySelectorAll("ytd-rich-section-renderer").forEach((section) => {
    const heading = [...section.querySelectorAll("span, yt-formatted-string")].some((node) => normalized(node.textContent) === "shorts");
    if (heading) treatCandidate(section, "YouTube Short");
  });
}
function filterPromotionalPopups() {
  document.querySelectorAll("[role='dialog'], [aria-modal='true'], [class*='modal'], [class*='popup'], [id*='modal'], [id*='popup']").forEach((popup) => {
    if (normalized(popup.textContent).length > 5 && includesAny(normalized(popup.textContent), PROMOTIONAL_TERMS)) treatCandidate(popup, "Promotional popup");
  });
}
function filterParagraphs() {
  if (!settings.hidePromotionalParagraphs || isRepository()) return;
  document.querySelectorAll("article p, main p, [role='main'] p").forEach((paragraph) => {
    if (processed.has(paragraph)) return;
    processed.add(paragraph);
    const text = normalized(paragraph.textContent);
    if (text.length >= 60 && includesAny(text, PROMOTIONAL_TERMS) && semanticRelevance(text) < 0.47) treatCandidate(paragraph, "Promotional paragraph");
  });
}
function runFilter() {
  if (!settings.enabled || sessionBypass) return;
  if (location.hostname.includes("youtube.com") && settings.hideYouTubeRecommendations) {
    SELECTORS.youtubeChrome.forEach((selector) => document.querySelectorAll(selector).forEach((element) => treatCandidate(element, "YouTube distraction")));
    hideShorts();
    filterYoutubeCards();
  }
  SELECTORS.generalAds.forEach((selector) => document.querySelectorAll(selector).forEach((element) => treatCandidate(adContainer(element), "Advertisement")));
  filterPromotionalPopups();
  const chromeSelectors = isRepository() ? SELECTORS.repositoryChrome : SELECTORS.articleChrome;
  chromeSelectors.forEach((selector) => document.querySelectorAll(selector).forEach((element) => treatCandidate(element, isRepository() ? "Repository distraction" : "Page recommendation")));
  filterParagraphs();
}
function scheduleFilter() {
  if (queued) return;
  queued = true;
  setTimeout(() => { queued = false; runFilter(); }, 250);
}
function visibleItems() {
  return [...detected.entries()].filter(([, item]) => item.element.isConnected).map(([id, item]) => ({ id, category: item.category, description: item.description, state: currentState(item.element) }));
}
async function start() {
  settings = await chrome.storage.sync.get({ enabled: true, subject: "Computer Science", filterDisplayMode: "hide", hideYouTubeRecommendations: true, hidePromotionalParagraphs: true, whitelistedDomains: [] });
  runFilter();
  new MutationObserver(scheduleFilter).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    Object.entries(changes).forEach(([key, change]) => { settings[key] = change.newValue; });
    sessionBypass = false;
    scheduleFilter();
  });
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "restorePage") { sessionBypass = true; detected.forEach(({ element }) => restore(element)); sendResponse({ ok: true }); }
    if (message.type === "applyFilter") { sessionBypass = false; runFilter(); sendResponse({ ok: true }); }
    if (message.type === "getPageState") sendResponse({ hidden: !sessionBypass });
    if (message.type === "getDetectedElements") sendResponse({ items: visibleItems() });
    if (message.type === "setElementTreatment") {
      const item = detected.get(message.id);
      if (!item || !item.element.isConnected) sendResponse({ ok: false });
      else { manualTreatment.set(item.element, message.treatment); applyTreatment(item.element, message.treatment, item.category); sendResponse({ ok: true }); }
    }
  });
}
start();
