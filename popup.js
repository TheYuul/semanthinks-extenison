const DEFAULTS = { enabled: true, subject: "Computer Science", selectedSubjects: [], hideYouTubeRecommendations: true, hidePromotionalParagraphs: true };
const fields = { enabled: document.querySelector("#enabled"), subject: document.querySelector("#subject"), hideYouTubeRecommendations: document.querySelector("#youtube"), hidePromotionalParagraphs: document.querySelector("#paragraphs") };
const pageHidden = document.querySelector("#pageHidden");
const subjectList = document.querySelector("#subjectList");
let settings = { ...DEFAULTS };

async function activeTab() { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); return tab; }
async function sendToPage(message) { const tab = await activeTab(); return tab?.id ? chrome.tabs.sendMessage(tab.id, message, { frameId: 0 }).catch(() => null) : null; }
function coursesForProgram() { return SUBJECT_CATALOG[settings.subject] || []; }
function renderSubjects() {
  subjectList.replaceChildren();
  coursesForProgram().forEach(([id, label]) => {
    const row = document.createElement("label"); row.className = "subject-option";
    const input = document.createElement("input"); input.type = "checkbox"; input.value = id; input.checked = settings.selectedSubjects.includes(id);
    input.addEventListener("change", async () => {
      settings.selectedSubjects = [...subjectList.querySelectorAll("input:checked")].map((checkbox) => checkbox.value);
      await chrome.storage.sync.set({ selectedSubjects: settings.selectedSubjects });
    });
    const text = document.createElement("span"); text.textContent = label;
    row.append(input, text); subjectList.append(row);
  });
}
async function render() {
  settings = { ...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS)) };
  const validIds = new Set(coursesForProgram().map(([id]) => id));
  settings.selectedSubjects = settings.selectedSubjects.filter((id) => validIds.has(id));
  Object.entries(fields).forEach(([key, field]) => { field.type === "checkbox" ? field.checked = settings[key] : field.value = settings[key]; });
  renderSubjects();
  const stats = await chrome.storage.local.get({ hiddenCount: 0 }); document.querySelector("#hiddenCount").textContent = stats.hiddenCount;
  const pageState = await sendToPage({ type: "getPageState" }); if (pageState) pageHidden.checked = pageState.hidden;
}
Object.entries(fields).forEach(([key, field]) => field.addEventListener("change", async () => {
  await chrome.storage.sync.set({ [key]: field.type === "checkbox" ? field.checked : field.value });
  if (key === "subject") { settings.subject = field.value; settings.selectedSubjects = []; await chrome.storage.sync.set({ selectedSubjects: [] }); renderSubjects(); }
}));
pageHidden.addEventListener("change", () => sendToPage({ type: pageHidden.checked ? "applyFilter" : "restorePage" }));
document.querySelector("#clearSubjects").addEventListener("click", async () => { settings.selectedSubjects = []; await chrome.storage.sync.set({ selectedSubjects: [] }); renderSubjects(); });
document.querySelector("#reset").addEventListener("click", async () => { await chrome.runtime.sendMessage({ type: "resetStats" }); render(); });
chrome.storage.onChanged.addListener((_changes, area) => { if (area === "local") render(); });
render();
