/* Semanthinks local filtering MVP. No page text is sent to a server. */
const ACADEMIC_TERMS = [
  "algorithm", "computer", "computer science", "computing", "programming", "software", "hardware", "database", "network", "security", "artificial intelligence", "machine learning", "data structure", "thesis", "research", "journal", "citation", "lecture", "university", "mathematics", "science", "physics", "chemistry", "biology", "engineering", "code", "javascript", "python", "web development",
  "pag-aaral", "pananaliksik", "kompyuter", "programa", "datos", "algorithm", "network", "seguridad", "sistema", "kaalaman", "leksyon", "paaralan", "unibersidad", "pagsusuri", "teknolohiya"
];
const PROMOTIONAL_TERMS = [
  "sponsored", "advertisement", "advertorial", "buy now", "shop now", "limited offer", "discount", "subscribe now", "sign up now", "affiliate", "promo code", "paid partnership",
  "patalastas", "i-click", "bumili na", "mga alok", "diskwento", "mag-subscribe", "sponsor"
];
const DISTRACTING_TERMS = [
  "celebrity", "gossip", "viral", "prank", "reaction", "gameplay", "mukbang", "giveaway", "shorts", "trending", "chismis", "sikat", "nakakatawa", "challenge", "vlog", "music video", "movie trailer", "drama", "stream highlights"
];
const SELECTORS = {
  youtubeChrome: ["#secondary", "ytd-watch-next-secondary-results-renderer", "ytd-merch-shelf-renderer", "ytd-promoted-sparkles-web-renderer", "ytd-ad-slot-renderer", "ytd-reel-shelf-renderer", "ytd-rich-shelf-renderer[is-shorts]", "ytd-rich-section-renderer:has(ytd-reel-shelf-renderer)"],
  youtubeCards: ["ytd-rich-item-renderer", "ytd-video-renderer", "ytd-compact-video-renderer", "ytd-grid-video-renderer"],
  generalAds: ["[id*='advert']", "[class*='advert']", "[id*='ad-container']", "[class*='ad-container']", "[class*='sponsor']", "[class*='promotion']", "[data-ad]", "[data-ad-slot]", "[id='google_vignette']", "[class*='google-vignette']", "[id^='google_ads_iframe']", "iframe[aria-label='Advertisement']", "iframe[title*='ad content' i]", "[data-google-av-adk]", ".GoogleActiveViewElement", "[data-asoch-targets^='ad']", "a[href*='googleads.g.doubleclick.net']", ".avp-floating-container.avp-fixed", "[id^='aniplayer_'][id$='Wrapper']", "video[src*='play.aniview.com']", "ins.adsbygoogle", "iframe[src*='doubleclick']", "iframe[src*='googlesyndication']", "iframe[src*='googleadservices']"],
  articleChrome: ["article .related-posts", "article .recommended", "article .newsletter", "article .social-share", "main .related-posts", "main .newsletter", "aside.floatrecirc", "aside[class*='recirc']", "[data-testid*='recirc']", "[data-testid*='newsletter']"],
  repositoryChrome: [".related-content", ".related-articles", ".recommended-content", ".recommendations", ".publication-recommendations", ".ad-container", ".advertisement", ".subscription-prompt"]
};

let settings;
let queued = false;
const processed = new WeakSet();
let sessionBypass = false;

function normalized(value) { return (value || "").toLowerCase().replace(/\s+/g, " ").trim(); }
function includesAny(text, terms) { return terms.some((term) => text.includes(term)); }
function isWhitelisted() {
  const host = location.hostname.toLowerCase();
  return settings.whitelistedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
function isRepository() {
  const host = location.hostname.toLowerCase();
  return settings.whitelistedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
function semanticRelevance(text) {
  // Temporary bilingual proxy for EmbeddingGemma cosine similarity.
  const value = normalized(text);
  const academicHits = ACADEMIC_TERMS.filter((term) => value.includes(term)).length;
  const distractingHits = DISTRACTING_TERMS.filter((term) => value.includes(term)).length;
  return Math.max(0, Math.min(1, 0.5 + academicHits * 0.14 - distractingHits * 0.18));
}
function threshold() { return settings.strictness === "strict" ? 0.62 : settings.strictness === "relaxed" ? 0.32 : 0.47; }
function hide(element, kind = "element") {
  if (!element) return false;
  // Never let generic ad rules remove YouTube's navigation or account controls.
  if (location.hostname.includes("youtube.com") && element.closest("#masthead-container, ytd-masthead, ytd-guide-signin-promo-renderer")) return false;
  const alreadyHidden = element.classList.contains("semanthinks-hidden") || element.classList.contains("semanthinks-paragraph-hidden");
  if (alreadyHidden && element.style.getPropertyValue("display") === "none" && element.style.getPropertyPriority("display") === "important") return false;
  if (!alreadyHidden) {
    // Some ad providers inject inline `display: inline !important`, which has
    // precedence over an extension stylesheet class. Preserve that inline state
    // so the page toggle can restore it, then override it at the same priority.
    element.dataset.semanthinksHadInlineStyle = element.hasAttribute("style") ? "true" : "false";
    element.dataset.semanthinksOriginalStyle = element.getAttribute("style") || "";
    element.classList.add(kind === "paragraph" ? "semanthinks-paragraph-hidden" : "semanthinks-hidden");
  }
  element.style.setProperty("display", "none", "important");
  element.style.setProperty("visibility", "hidden", "important");
  element.style.setProperty("pointer-events", "none", "important");
  if (alreadyHidden) return false;
  chrome.runtime.sendMessage({ type: "incrementStats", hidden: 1, paragraphs: kind === "paragraph" ? 1 : 0 }).catch(() => {});
  return true;
}
function hideAdElement(element) {
  // Remove the surrounding ad container where possible so it does not leave a blank gap.
  const container = element.closest("[id*='ad-container'], [class*='ad-container'], [id^='google_ads'], [id*='advert'], [class*='advert'], [class*='sponsor'], [class*='promotion']");
  if (container && container !== element) return hide(container);
  // Google native/vignette ads can be regular divs instead of iframes. Their
  // outer full-slot element is the part that visually covers the document.
  const googleAd = element.closest("[data-google-av-adk], .GoogleActiveViewElement, [id='google_vignette'], [class*='google-vignette']");
  if (googleAd) {
    const fullSlot = googleAd.closest("[id*='full-slot'], [class*='full-slot'], [class*='autoplay-in-motion']");
    return hide(fullSlot || googleAd);
  }
  const floatingVideoAd = element.closest(".avp-floating-container.avp-fixed, [id^='aniplayer_'][id$='Wrapper']");
  if (floatingVideoAd) return hide(floatingVideoAd);
  // A common Google ad pattern is a frame placed alone inside a wrapper. Hiding
  // that wrapper prevents the blank rectangle from remaining after the frame hides.
  const parent = element.parentElement;
  if (element.matches("iframe") && parent && parent.children.length <= 2 && !normalized(parent.textContent)) return hide(parent);
  return hide(element);
}
function cardTitle(card) {
  return normalized(card.querySelector("#video-title, a#video-title, h3 a")?.textContent || card.textContent);
}
function filterYoutubeCards() {
  document.querySelectorAll(SELECTORS.youtubeCards.join(",")).forEach((card) => {
    if (card.closest("ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer")) return;
    const title = cardTitle(card);
    // Conservative rule: a video is removed only when it has a clear distraction cue
    // and does not contain an academic/technical cue.
    if (title && !includesAny(title, ACADEMIC_TERMS) && includesAny(title, DISTRACTING_TERMS) && semanticRelevance(title) < threshold()) hide(card);
  });
}
function hideShorts() {
  document.querySelectorAll("a[href^='/shorts/'], a[href*='youtube.com/shorts/']").forEach((link) => {
    // Prefer the full shelf/section. That removes its Shorts heading, metadata,
    // and menu button together rather than leaving visual fragments behind.
    // Do not use ytd-item-section-renderer here: on search pages it can contain
    // both a Shorts strip and ordinary results, causing false positives.
    const shelf = link.closest("ytd-reel-shelf-renderer, ytd-rich-shelf-renderer, ytd-rich-section-renderer");
    const card = link.closest("ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-reel-item-renderer");
    hide(shelf || card || link);
  });
}
function filterPromotionalPopups() {
  document.querySelectorAll("[role='dialog'], [aria-modal='true'], [class*='modal'], [class*='popup'], [id*='modal'], [id*='popup']").forEach((popup) => {
    const text = normalized(popup.textContent);
    if (text.length > 5 && includesAny(text, PROMOTIONAL_TERMS)) hide(popup);
  });
}
function cleanKnownInterface() {
  const youtube = location.hostname.includes("youtube.com");
  if (youtube && settings.hideYouTubeRecommendations) {
    SELECTORS.youtubeChrome.forEach((selector) => document.querySelectorAll(selector).forEach((element) => hide(element)));
    hideShorts();
    filterYoutubeCards();
  }
  SELECTORS.generalAds.forEach((selector) => document.querySelectorAll(selector).forEach((element) => hideAdElement(element)));
  filterPromotionalPopups();
  if (isRepository()) SELECTORS.repositoryChrome.forEach((selector) => document.querySelectorAll(selector).forEach((element) => hide(element)));
  else SELECTORS.articleChrome.forEach((selector) => document.querySelectorAll(selector).forEach((element) => hide(element)));
}
function filterParagraphs() {
  if (!settings.hidePromotionalParagraphs || isWhitelisted()) return;
  document.querySelectorAll("article p, main p, [role='main'] p").forEach((paragraph) => {
    if (processed.has(paragraph)) return;
    processed.add(paragraph);
    const text = normalized(paragraph.textContent);
    if (text.length < 60) return;
    // Dual signal: promotional marker AND a low semantic-relevance score.
    if (includesAny(text, PROMOTIONAL_TERMS) && semanticRelevance(text) < threshold()) hide(paragraph, "paragraph");
  });
}
function runFilter() {
  if (!settings.enabled || sessionBypass) return;
  cleanKnownInterface();
  filterParagraphs();
}
function scheduleFilter() {
  if (queued) return;
  queued = true;
  setTimeout(() => { queued = false; runFilter(); }, 250);
}

async function start() {
  settings = await chrome.storage.sync.get();
  runFilter();
  new MutationObserver(scheduleFilter).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style"]
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    Object.entries(changes).forEach(([key, change]) => { settings[key] = change.newValue; });
    sessionBypass = false;
    scheduleFilter();
  });
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "restorePage") {
      sessionBypass = true;
      document.querySelectorAll(".semanthinks-hidden, .semanthinks-paragraph-hidden").forEach((element) => {
        element.classList.remove("semanthinks-hidden", "semanthinks-paragraph-hidden");
        if (element.dataset.semanthinksHadInlineStyle === "true") element.setAttribute("style", element.dataset.semanthinksOriginalStyle || "");
        else element.removeAttribute("style");
        delete element.dataset.semanthinksHadInlineStyle;
        delete element.dataset.semanthinksOriginalStyle;
      });
      sendResponse({ ok: true });
    }
    if (message.type === "applyFilter") {
      sessionBypass = false;
      runFilter();
      sendResponse({ ok: true });
    }
    if (message.type === "getPageState") sendResponse({ hidden: !sessionBypass });
  });
}
start();
