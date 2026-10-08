const DEFAULT_SETTINGS = {
  enabled: true,
  subject: "Computer Science",
  filterDisplayMode: "hide",
  hideYouTubeRecommendations: true,
  hidePromotionalParagraphs: true,
  whitelistedDomains: ["arxiv.org", "ieee.org", "acm.org", "pubmed.ncbi.nlm.nih.gov", "researchgate.net"]
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  await chrome.storage.sync.set(existing);
  const stats = await chrome.storage.local.get({ hiddenCount: 0, paragraphCount: 0 });
  await chrome.storage.local.set(stats);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "incrementStats") {
    chrome.storage.local.get({ hiddenCount: 0, paragraphCount: 0 }).then((stats) => {
      chrome.storage.local.set({
        hiddenCount: stats.hiddenCount + (message.hidden || 0),
        paragraphCount: stats.paragraphCount + (message.paragraphs || 0)
      });
    });
    sendResponse({ ok: true });
    return true;
  }
  if (message.type === "resetStats") {
    chrome.storage.local.set({ hiddenCount: 0, paragraphCount: 0 }).then(() => sendResponse({ ok: true }));
    return true;
  }
});
