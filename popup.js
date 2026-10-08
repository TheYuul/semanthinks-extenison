const DEFAULTS = { enabled: true, subject: "Computer Science", filterDisplayMode: "hide", hideYouTubeRecommendations: true, hidePromotionalParagraphs: true };
const fields = { enabled: document.querySelector("#enabled"), subject: document.querySelector("#subject"), filterDisplayMode: document.querySelector("#filterDisplayMode"), hideYouTubeRecommendations: document.querySelector("#youtube"), hidePromotionalParagraphs: document.querySelector("#paragraphs") };
const pageHidden = document.querySelector("#pageHidden");
const detectedList = document.querySelector("#detectedList");
const dashboardSummary = document.querySelector("#dashboardSummary");
async function activeTab() { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); return tab; }
async function sendToPage(message) { const tab = await activeTab(); return tab?.id ? chrome.tabs.sendMessage(tab.id, message, { frameId: 0 }).catch(() => null) : null; }
function actionButton(label, treatment, item) {
  const button = document.createElement("button");
  button.type = "button"; button.textContent = label;
  button.className = item.state === treatment || (treatment === "show" && item.state === "visible") ? "active" : "";
  button.addEventListener("click", async () => { await sendToPage({ type: "setElementTreatment", id: item.id, treatment }); await renderDashboard(); });
  return button;
}
function renderItems(items) {
  detectedList.replaceChildren();
  if (!items.length) { const empty = document.createElement("div"); empty.className = "empty"; empty.textContent = "No matching distractions have been detected on this page yet."; detectedList.append(empty); return; }
  items.forEach((item) => {
    const card = document.createElement("article"); card.className = "detected-item";
    const category = document.createElement("div"); category.className = "item-category"; category.textContent = item.category;
    const description = document.createElement("div"); description.className = "item-description"; description.textContent = item.description;
    const actions = document.createElement("div"); actions.className = "item-actions";
    actions.append(actionButton("Hide", "hide", item), actionButton("Blur", "blur", item), actionButton("Show", "show", item));
    card.append(category, description, actions); detectedList.append(card);
  });
}
async function renderDashboard() {
  const response = await sendToPage({ type: "getDetectedElements" }); const items = response?.items || [];
  dashboardSummary.textContent = items.length ? `${items.length} detected item${items.length === 1 ? "" : "s"} on this page.` : "No detected items on this page.";
  renderItems(items);
}
async function render() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  Object.entries(fields).forEach(([key, field]) => { field.type === "checkbox" ? field.checked = settings[key] : field.value = settings[key]; });
  const stats = await chrome.storage.local.get({ hiddenCount: 0 }); document.querySelector("#hiddenCount").textContent = stats.hiddenCount;
  const pageState = await sendToPage({ type: "getPageState" }); if (pageState) pageHidden.checked = pageState.hidden;
  await renderDashboard();
}
Object.entries(fields).forEach(([key, field]) => field.addEventListener("change", () => chrome.storage.sync.set({ [key]: field.type === "checkbox" ? field.checked : field.value })));
pageHidden.addEventListener("change", async () => { await sendToPage({ type: pageHidden.checked ? "applyFilter" : "restorePage" }); await renderDashboard(); });
document.querySelector("#reset").addEventListener("click", async () => { await chrome.runtime.sendMessage({ type: "resetStats" }); render(); });
document.querySelector("#refreshDashboard").addEventListener("click", renderDashboard);
chrome.storage.onChanged.addListener((_changes, area) => { if (area === "local") render(); });
render();
