const DEFAULTS = { enabled: true, subject: "Computer Science", strictness: "balanced", hideYouTubeRecommendations: true, hidePromotionalParagraphs: true };
const fields = { enabled: document.querySelector("#enabled"), subject: document.querySelector("#subject"), strictness: document.querySelector("#strictness"), hideYouTubeRecommendations: document.querySelector("#youtube"), hidePromotionalParagraphs: document.querySelector("#paragraphs") };
const pageHidden = document.querySelector("#pageHidden");
async function render() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  Object.entries(fields).forEach(([key, field]) => { field.type === "checkbox" ? field.checked = settings[key] : field.value = settings[key]; });
  const stats = await chrome.storage.local.get({ hiddenCount: 0 });
  document.querySelector("#hiddenCount").textContent = stats.hiddenCount;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    const pageState = await chrome.tabs.sendMessage(tab.id, { type: "getPageState" }).catch(() => null);
    if (pageState) pageHidden.checked = pageState.hidden;
  }
}
Object.entries(fields).forEach(([key, field]) => field.addEventListener("change", () => chrome.storage.sync.set({ [key]: field.type === "checkbox" ? field.checked : field.value })));
document.querySelector("#reset").addEventListener("click", async () => { await chrome.runtime.sendMessage({ type: "resetStats" }); render(); });
pageHidden.addEventListener("change", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: pageHidden.checked ? "applyFilter" : "restorePage" }).catch(() => {});
});
chrome.storage.onChanged.addListener((_changes, area) => { if (area === "local") render(); });
render();
