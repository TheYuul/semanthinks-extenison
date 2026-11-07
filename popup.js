const DEFAULTS = { enabled: true, subject: "Computer Science", selectedSubjects: [], hideYouTubeRecommendations: true, hidePromotionalParagraphs: true };
const fields = { enabled: document.querySelector("#enabled"), subject: document.querySelector("#subject"), hideYouTubeRecommendations: document.querySelector("#youtube"), hidePromotionalParagraphs: document.querySelector("#paragraphs") };
const pageHidden = document.querySelector("#pageHidden");
const subjectList = document.querySelector("#subjectList");
const subjectSearch = document.querySelector("#subjectSearch");
const searchResults = document.querySelector("#searchResults");
const recommendationList = document.querySelector("#recommendationList");
const recommendationHint = document.querySelector("#recommendationHint");
let settings = { ...DEFAULTS };

async function activeTab() { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); return tab; }
async function sendToPage(message) { const tab = await activeTab(); return tab?.id ? chrome.tabs.sendMessage(tab.id, message, { frameId: 0 }).catch(() => null) : null; }
function coursesForProgram() { return SUBJECT_CATALOG[settings.subject] || []; }
function normalized(value) { return (value || "").toLowerCase().replace(/\s+/g, " ").trim(); }
function recommendationTerms(id) { return SUBJECT_RECOMMENDATIONS[id] || []; }
function renderRecommendations() {
  recommendationList.replaceChildren();
  const selectedCourses = coursesForProgram().filter(([id]) => settings.selectedSubjects.includes(id));
  if (!selectedCourses.length) { recommendationHint.textContent = "Select a subject to see related concepts."; return; }
  recommendationHint.textContent = "Suggested concepts and search terms based on the selected subject syllabi.";
  selectedCourses.forEach(([id, label]) => {
    const card = document.createElement("article"); card.className = "recommendation-card";
    const title = document.createElement("strong"); title.textContent = label;
    const terms = document.createElement("span"); terms.textContent = recommendationTerms(id).join(", ") || "No additional concepts are available yet.";
    card.append(title, terms); recommendationList.append(card);
  });
}
function renderSearchResults() {
  searchResults.replaceChildren();
  const query = normalized(subjectSearch.value);
  if (!query) return;
  const matches = coursesForProgram().map(([id, label, keywords]) => {
    const terms = [label, ...keywords, ...recommendationTerms(id)];
    return { id, label, terms, matched: terms.filter((term) => normalized(term).includes(query)) };
  }).filter((course) => course.matched.length).slice(0, 8);
  if (!matches.length) { const empty = document.createElement("div"); empty.className = "search-empty"; empty.textContent = "No matching subject in this program."; searchResults.append(empty); return; }
  matches.forEach((course) => {
    const result = document.createElement("article"); result.className = "search-result";
    const title = document.createElement("strong"); title.textContent = course.label;
    const detail = document.createElement("span"); detail.textContent = `Matched: ${course.matched.slice(0, 4).join(", ")}`;
    result.append(title, detail); searchResults.append(result);
  });
}
function renderSubjects() {
  subjectList.replaceChildren();
  coursesForProgram().forEach(([id, label]) => {
    const row = document.createElement("label"); row.className = "subject-option";
    const input = document.createElement("input"); input.type = "checkbox"; input.value = id; input.checked = settings.selectedSubjects.includes(id);
    input.addEventListener("change", async () => {
      settings.selectedSubjects = [...subjectList.querySelectorAll("input:checked")].map((checkbox) => checkbox.value);
      await chrome.storage.sync.set({ selectedSubjects: settings.selectedSubjects });
      renderRecommendations();
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
  renderRecommendations();
  const stats = await chrome.storage.local.get({ hiddenCount: 0 }); document.querySelector("#hiddenCount").textContent = stats.hiddenCount;
  const pageState = await sendToPage({ type: "getPageState" }); if (pageState) pageHidden.checked = pageState.hidden;
}
Object.entries(fields).forEach(([key, field]) => field.addEventListener("change", async () => {
  await chrome.storage.sync.set({ [key]: field.type === "checkbox" ? field.checked : field.value });
  if (key === "subject") { settings.subject = field.value; settings.selectedSubjects = []; await chrome.storage.sync.set({ selectedSubjects: [] }); subjectSearch.value = ""; renderSubjects(); renderRecommendations(); renderSearchResults(); }
}));
pageHidden.addEventListener("change", () => sendToPage({ type: pageHidden.checked ? "applyFilter" : "restorePage" }));
document.querySelector("#clearSubjects").addEventListener("click", async () => { settings.selectedSubjects = []; await chrome.storage.sync.set({ selectedSubjects: [] }); renderSubjects(); renderRecommendations(); });
document.querySelector("#reset").addEventListener("click", async () => { await chrome.runtime.sendMessage({ type: "resetStats" }); render(); });
subjectSearch.addEventListener("input", renderSearchResults);
chrome.storage.onChanged.addListener((_changes, area) => { if (area === "local") render(); });
render();
