/* Calorie & Deficit Tracker
   - Stores entries with date for weekly graph
   - Saves persistent settings & entries in localStorage
   - BMR & TDEE calculator
   - Dark mode, export CSV, clear/reset
*/

// ---------- Helpers ----------
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => document.querySelectorAll(sel);
const formatDate = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const todayKey = () => formatDate(new Date());

// ---------- Local storage keys ----------
const LS = {
  ENTRIES: "cal_entries_v1",     // array of {id,name,calories,meal,date}
  SETTINGS: "cal_settings_v1"    // {goal,theme,bmrInputs...}
};

// ---------- App state ----------
let entries = JSON.parse(localStorage.getItem(LS.ENTRIES) || "[]");
let settings = JSON.parse(localStorage.getItem(LS.SETTINGS) || "{}");

// ---------- DOM refs ----------
const calorieGoalInput = qs("#calorieGoal");
const goalDisplay = qs("#goalDisplay");
const totalCaloriesEl = qs("#totalCalories");
const deficitDisplay = qs("#deficitDisplay");
const entriesList = qs("#entriesList");
const progressFill = qs("#progressFill");
const progressPercent = qs("#progressPercent");
const progressBarText = qs("#progressBarText");
const bmrDisplay = qs("#bmrDisplay");
const tdeeDisplay = qs("#tdeeDisplay");
const weeklyCtx = qs("#weeklyChart").getContext("2d");

// BMR fields
const ageInput = qs("#age");
const sexInput = qs("#sex");
const weightInput = qs("#weight");
const heightInput = qs("#height");
const activityInput = qs("#activity");

// other controls
const addEntryBtn = qs("#addEntry");
const addQuick100Btn = qs("#addQuick100");
const saveGoalBtn = qs("#saveGoal");
const clearDayBtn = qs("#clearDay");
const resetAllBtn = qs("#resetAll");
const clearBmrBtn = qs("#clearBmr");
const calcBmrBtn = qs("#calcBmr");
const themeToggle = qs("#themeToggle");
const exportCsvBtn = qs("#exportCsv");

// Chart instance
let weeklyChart = null;

// ---------- Initialization ----------
function init() {
  // apply settings defaults
  settings.goal = settings.goal || 2000;
  settings.theme = settings.theme || "light";

  // fill inputs
  calorieGoalInput.value = settings.goal;
  goalDisplay.textContent = settings.goal;

  if (settings.bmr) {
    bmrDisplay.textContent = Math.round(settings.bmr);
    tdeeDisplay.textContent = Math.round(settings.tdee);
  } else {
    bmrDisplay.textContent = "—";
    tdeeDisplay.textContent = "—";
  }

  // apply theme
  applyTheme(settings.theme);

  // populate BMR inputs if saved
  if (settings.bmrInputs) {
    ageInput.value = settings.bmrInputs.age || "";
    sexInput.value = settings.bmrInputs.sex || "male";
    weightInput.value = settings.bmrInputs.weight || "";
    heightInput.value = settings.bmrInputs.height || "";
    activityInput.value = settings.bmrInputs.activity || "1.2";
  }

  // render UI
  renderEntries();
  updateSummary();
  renderWeeklyChart();

  // wire events
  addEntryBtn.addEventListener("click", handleAddEntry);
  addQuick100Btn.addEventListener("click", () => addQuickCalories(100));
  saveGoalBtn.addEventListener("click", saveGoal);
  clearDayBtn.addEventListener("click", clearDayData);
  resetAllBtn.addEventListener("click", resetAllData);
  calcBmrBtn.addEventListener("click", calcAndSetBmr);
  clearBmrBtn.addEventListener("click", clearBmrInputs);
  themeToggle.addEventListener("click", toggleTheme);
  exportCsvBtn.addEventListener("click", exportCsv);

  // live update goal as user types (but only update preview)
  calorieGoalInput.addEventListener("input", (e) => {
    goalDisplay.textContent = e.target.value || 0;
    updateSummary();
  });
}

function saveToStorage() {
  localStorage.setItem(LS.ENTRIES, JSON.stringify(entries));
  localStorage.setItem(LS.SETTINGS, JSON.stringify(settings));
}

// ---------- Entries management ----------
function handleAddEntry() {
  const name = qs("#foodName").value.trim();
  const calories = Number(qs("#foodCalories").value);
  const mealType = qs("#mealType").value;

  if (!name || !Number.isFinite(calories) || calories <= 0) {
    alert("Please enter a valid food name and calories (>0).");
    return;
  }

  const entry = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    name,
    calories: Math.round(calories),
    meal: mealType,
    date: todayKey()
  };

  entries.push(entry);
  saveToStorage();
  qs("#foodName").value = "";
  qs("#foodCalories").value = "";
  renderEntries();
  updateSummary();
  renderWeeklyChart();
}

function addQuickCalories(amount) {
  const entry = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    name: `${amount} kcal quick`,
    calories: amount,
    meal: "Snack",
    date: todayKey()
  };
  entries.push(entry);
  saveToStorage();
  renderEntries();
  updateSummary();
  renderWeeklyChart();
}

function deleteEntry(id) {
  if (!confirm("Delete this entry?")) return;
  entries = entries.filter(e => e.id !== id);
  saveToStorage();
  renderEntries();
  updateSummary();
  renderWeeklyChart();
}

function renderEntries() {
  // show only today's entries in the list
  const today = todayKey();
  const todays = entries.filter(e => e.date === today);

  entriesList.innerHTML = "";
  if (todays.length === 0) {
    const li = document.createElement("li");
    li.className = "meta";
    li.textContent = "No entries for today yet.";
    entriesList.appendChild(li);
    return;
  }

  todays.forEach(e => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <div style="font-weight:600">${escapeHtml(e.name)}</div>
        <div class="meta">${escapeHtml(e.meal)} • ${e.date}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="font-weight:700">${e.calories} kcal</div>
        <button onclick="deleteEntry(${e.id})">Delete</button>
      </div>
    `;
    entriesList.appendChild(li);
  });
}

// simple escape for innerHTML content
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---------- Summary & Progress ----------
function dailyTotalForDate(dateStr) {
  return entries.filter(e => e.date === dateStr).reduce((s, e) => s + e.calories, 0);
}

function updateSummary() {
  const goal = Number(calorieGoalInput.value) || Number(settings.goal) || 0;
  const total = dailyTotalForDate(todayKey());
  const deficit = goal - total;

  totalCaloriesEl.textContent = total;
  goalDisplay.textContent = goal;
  deficitDisplay.textContent = deficit;

  // progress bar
  const percent = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;
  progressFill.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;
  progressBarText.textContent = percent >= 100 ? "Goal reached!" : "of daily goal";

  // save nothing here (goal saved separately)
}

// ---------- Goal ----------
function saveGoal() {
  const val = Number(calorieGoalInput.value);
  if (!Number.isFinite(val) || val <= 0) {
    alert("Please enter a valid goal.");
    return;
  }
  settings.goal = Math.round(val);
  localStorage.setItem(LS.SETTINGS, JSON.stringify(settings));
  goalDisplay.textContent = settings.goal;
  updateSummary();
  alert("Daily goal saved.");
}

// ---------- BMR & TDEE ----------
function calcBMR({age, sex, weight, height}) {
  // Mifflin-St Jeor equation
  if (sex === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

function calcAndSetBmr() {
  const age = Number(ageInput.value);
  const sex = sexInput.value;
  const weight = Number(weightInput.value);
  const height = Number(heightInput.value);
  const activity = Number(activityInput.value);

  if ([age, weight, height, activity].some(v => !Number.isFinite(v) || v <= 0)) {
    alert("Please fill in all BMR fields with valid numbers.");
    return;
  }

  const bmr = calcBMR({age, sex, weight, height});
  const tdee = bmr * activity;

  settings.bmr = bmr;
  settings.tdee = tdee;
  settings.bmrInputs = {age, sex, weight, height, activity};
  // If user hasn't set a goal explicitly, set to TDEE rounded
  if (!settings.goal) settings.goal = Math.round(tdee);

  localStorage.setItem(LS.SETTINGS, JSON.stringify(settings));

  bmrDisplay.textContent = Math.round(bmr);
  tdeeDisplay.textContent = Math.round(tdee);
  calorieGoalInput.value = settings.goal;
  goalDisplay.textContent = settings.goal;
  updateSummary();
  alert("BMR & TDEE calculated. Daily goal updated to TDEE (if not set).");
}

function clearBmrInputs() {
  ageInput.value = "";
  sexInput.value = "male";
  weightInput.value = "";
  heightInput.value = "";
  activityInput.value = "1.2";
  delete settings.bmr;
  delete settings.tdee;
  delete settings.bmrInputs;
  localStorage.setItem(LS.SETTINGS, JSON.stringify(settings));
  bmrDisplay.textContent = "—";
  tdeeDisplay.textContent = "—";
}

// ---------- Clear / Reset ----------
function clearDayData() {
  if (!confirm("Clear today's entries? This will only remove today's entries.")) return;
  const today = todayKey();
  entries = entries.filter(e => e.date !== today);
  saveToStorage();
  renderEntries();
  updateSummary();
  renderWeeklyChart();
}

function resetAllData() {
  if (!confirm("Reset ALL data and settings? This cannot be undone.")) return;
  entries = [];
  settings = {};
  localStorage.removeItem(LS.ENTRIES);
  localStorage.removeItem(LS.SETTINGS);
  // refresh page to reload defaults
  location.reload();
}

// ---------- Theme ----------
function applyTheme(mode) {
  if (mode === "dark") {
    document.documentElement.classList.add("dark");
    themeToggle.textContent = "☀️";
  } else {
    document.documentElement.classList.remove("dark");
    themeToggle.textContent = "🌙";
  }
  settings.theme = mode;
  localStorage.setItem(LS.SETTINGS, JSON.stringify(settings));
}

function toggleTheme() {
  const newTheme = (settings.theme === "dark") ? "light" : "dark";
  applyTheme(newTheme);
}

// ---------- Weekly Chart ----------
function getLastNDates(n) {
  const arr = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(formatDate(d));
  }
  return arr;
}

function renderWeeklyChart() {
  const labels = getLastNDates(7);
  const data = labels.map(d => dailyTotalForDate(d));

  if (weeklyChart) {
    weeklyChart.data.labels = labels;
    weeklyChart.data.datasets[0].data = data;
    weeklyChart.update();
    return;
  }

  weeklyChart = new Chart(weeklyCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Calories",
        data,
        borderRadius: 6,
        barPercentage: 0.6,
        categoryPercentage: 0.6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// ---------- Export CSV ----------
function exportCsv() {
  // include all entries, sorted by date desc
  if (!entries.length) return alert("No data to export.");

  const header = ["id","date","name","meal","calories"];
  const rows = [header.join(",")].concat(entries.map(e =>
    [e.id, e.date, `"${String(e.name).replace(/"/g,'""')}"`, e.meal, e.calories].join(",")
  ));

  const csv = rows.join("\n");
  const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `calorie-data-${formatDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Utility: export functions to window for onclick usage ----------
window.deleteEntry = deleteEntry;
window.init = init;

// ---------- Escape: small safety improvement (already above) ----------
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---------- Start app ----------
init();
