const STORAGE_KEY = "kirim-chiqim-data";
const SETTINGS_KEY = "kirim-chiqim-settings";

const CATEGORIES = {
  income: [
    { id: "telefon-sotuv", label: "Telefon sotuv" },
    { id: "ehtiyot-sotuv", label: "Ehtiyot qism sotuv" },
    { id: "tamirlash", label: "Ta'mirlash xizmati" },
    { id: "aksessuar-sotuv", label: "Aksessuar sotuv" },
    { id: "ishlatilgan", label: "Ishlatilgan telefon" },
    { id: "boshqa", label: "Boshqa" },
  ],
  expense: [
    { id: "telefon-xarid", label: "Telefon xarid" },
    { id: "ekran", label: "Ekran" },
    { id: "batareya", label: "Batareya" },
    { id: "korpus", label: "Korpus / ramka" },
    { id: "kamera", label: "Kamera moduli" },
    { id: "port-flex", label: "Port / flex" },
    { id: "aksessuar-xarid", label: "Aksessuar xarid" },
    { id: "yetkazish", label: "Yetkazib berish" },
    { id: "dokon", label: "Do'kon xarajati" },
    { id: "boshqa", label: "Boshqa" },
  ],
};

const LEGACY_CATEGORIES = {
  maosh: "boshqa", biznes: "telefon-sotuv", "sovg'a": "boshqa",
  "oziq-ovqat": "boshqa", transport: "yetkazish", kommunal: "dokon",
  kiyim: "boshqa", salomatlik: "boshqa", "ta'lim": "boshqa",
  "ko'ngilochar": "aksessuar-xarid",
};

const CATEGORY_COLORS = [
  "#5c6b73", "#7d8a93", "#4a6670", "#6b7f6a",
  "#8a7b6b", "#6b6b8a", "#7a6b6b", "#5a6b7a",
];
let transactions = loadTransactions();
let settings = loadSettings();
let currentType = "income";
let editingId = null;

const form = document.getElementById("transaction-form");
const formTitle = document.getElementById("form-title");
const cancelEditBtn = document.getElementById("cancel-edit");
const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const dateInput = document.getElementById("date");
const noteInput = document.getElementById("note");
const submitBtn = document.getElementById("submit-btn");
const balanceEl = document.getElementById("balance");
const totalIncomeEl = document.getElementById("total-income");
const totalExpenseEl = document.getElementById("total-expense");
const listEl = document.getElementById("transaction-list");
const clearAllBtn = document.getElementById("clear-all");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");
const typeBtns = document.querySelectorAll(".type-btn");
const navBtns = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");
const statsPeriod = document.getElementById("stats-period");
const monthlyChartEl = document.getElementById("monthly-chart");
const expenseChartEl = document.getElementById("expense-chart");
const incomeChartEl = document.getElementById("income-chart");
const insightGrid = document.getElementById("insight-grid");
const filterType = document.getElementById("filter-type");
const filterCategory = document.getElementById("filter-category");
const searchInput = document.getElementById("search-input");
const themeSelect = document.getElementById("theme-select");
const budgetInput = document.getElementById("budget-input");
const saveBudgetBtn = document.getElementById("save-budget");
const budgetCard = document.getElementById("budget-card");
const budgetText = document.getElementById("budget-text");
const budgetFill = document.getElementById("budget-fill");
const budgetRemaining = document.getElementById("budget-remaining");
const quickStatsEl = document.getElementById("quick-stats");
const toastEl = document.getElementById("toast");
const installBanner = document.getElementById("install-banner");
const bannerInstallBtn = document.getElementById("banner-install");
const bannerDismissBtn = document.getElementById("banner-dismiss");
const installBtn = document.getElementById("install-btn");
const installDesc = document.getElementById("install-desc");
const iosInstallSteps = document.getElementById("ios-install-steps");
const installedMsg = document.getElementById("installed-msg");

let deferredInstallPrompt = null;

function loadTransactions() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const list = data ? JSON.parse(data) : [];
    return list.map((t) => ({
      ...t,
      category: migrateCategory(t.category),
    }));
  } catch {
    return [];
  }
}

function migrateCategory(id) {
  if (!id) return "boshqa";
  const all = [...CATEGORIES.income, ...CATEGORIES.expense];
  if (all.some((c) => c.id === id)) return id;
  return LEGACY_CATEGORIES[id] || "boshqa";
}
function loadSettings() {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : { theme: "light", monthlyBudget: 0, installDismissed: false };
  } catch {
    return { theme: "light", monthlyBudget: 0, installDismissed: false };
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function getCategory(type, id) {
  return CATEGORIES[type].find((c) => c.id === id) || CATEGORIES[type].find((c) => c.id === "boshqa");
}

function formatMoney(amount) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
}

function formatMoneyShort(amount) {
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + " mln";
  if (amount >= 1_000) return Math.round(amount / 1_000) + " ming";
  return String(amount);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("uz-UZ", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function toDateInputValue(iso) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function dateInputToIso(value) {
  const [year, month, day] = value.split("-").map(Number);
  const now = new Date();
  return new Date(year, month - 1, day, now.getHours(), now.getMinutes()).toISOString();
}

function formatMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(key) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString("uz-UZ", { month: "short", year: "2-digit" });
}

function getThisMonthTransactions() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return transactions.filter((t) => new Date(t.date) >= start);
}

function getFilteredTransactions(period) {
  if (period === "all") return transactions;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "3months") start.setMonth(start.getMonth() - 2);
  return transactions.filter((t) => new Date(t.date) >= start);
}

function getHistoryFiltered() {
  let list = [...transactions];
  const q = searchInput.value.trim().toLowerCase();

  if (filterType.value !== "all") list = list.filter((t) => t.type === filterType.value);
  if (filterCategory.value !== "all") list = list.filter((t) => t.category === filterCategory.value);

  if (q) {
    list = list.filter((t) => {
      const cat = getCategory(t.type, t.category);
      const hay = `${t.note || ""} ${cat.label}`.toLowerCase();
      return hay.includes(q);
    });
  }

  return list.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getTotals(list = transactions) {
  let income = 0, expense = 0;
  for (const t of list) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

function getMonthlyStats(list) {
  const months = {};
  for (const t of list) {
    const key = formatMonthKey(new Date(t.date));
    if (!months[key]) months[key] = { income: 0, expense: 0 };
    months[key][t.type] += t.amount;
  }
  return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
}

function getByCategory(list, type) {
  const totals = {};
  for (const t of list) {
    if (t.type !== type) continue;
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  }
  return Object.entries(totals)
    .map(([id, amount]) => ({ ...getCategory(type, id), amount }))
    .sort((a, b) => b.amount - a.amount);
}

function getMonthExpense() {
  return getTotals(getThisMonthTransactions()).expense;
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toastEl.hidden = true; }, 2800);
}

function applyTheme(theme) {
  const dark = theme === "dark" ||
    (theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#111110" : "#f8f7f4");
}

function renderCategoryOptions(type = currentType, selected = null) {
  categorySelect.innerHTML = CATEGORIES[type]
    .map((c) => `<option value="${c.id}"${selected === c.id ? " selected" : ""}>${c.label}</option>`)
    .join("");
}

function renderFilterCategories() {
  const type = filterType.value;
  let cats = type === "all"
    ? [...CATEGORIES.income.map((c) => ({ ...c, group: "Sotuv" })), ...CATEGORIES.expense.map((c) => ({ ...c, group: "Xarid" }))]
    : CATEGORIES[type];
  const current = filterCategory.value;
  filterCategory.innerHTML = '<option value="all">Barcha turlar</option>' +
    cats.map((c) => {
      const label = c.group ? `${c.group}: ${c.label}` : c.label;
      return `<option value="${c.id}"${current === c.id ? " selected" : ""}>${label}</option>`;
    }).join("");
  if (![...filterCategory.options].some((o) => o.value === current)) filterCategory.value = "all";
}
function renderBudget() {
  const budget = settings.monthlyBudget || 0;
  if (!budget) { budgetCard.hidden = true; return; }

  const spent = getMonthExpense();
  const percent = Math.min(Math.round((spent / budget) * 100), 100);
  const left = budget - spent;

  budgetCard.hidden = false;
  budgetText.textContent = `${formatMoneyShort(spent)} / ${formatMoneyShort(budget)}`;
  budgetFill.style.width = `${percent}%`;
  budgetFill.className = "budget-fill" + (percent >= 100 ? " over" : percent >= 80 ? " warn" : "");
  budgetRemaining.textContent = left >= 0
    ? `Qoldi: ${formatMoney(left)}`
    : `Limitdan oshib ketdi: ${formatMoney(Math.abs(left))}`;
  budgetRemaining.className = "budget-remaining" + (left < 0 ? " over" : "");
}

function renderQuickStats() {
  const month = getThisMonthTransactions();
  const { income, expense } = getTotals(month);
  const profit = income - expense;
  const salesCount = month.filter((t) => t.type === "income").length;

  quickStatsEl.innerHTML = `
    <div class="insight-card"><span class="insight-label">Bu oy foyda</span><span class="insight-value ${profit >= 0 ? "income" : "expense"}">${formatMoneyShort(Math.abs(profit))}</span></div>
    <div class="insight-card"><span class="insight-label">Sotuvlar</span><span class="insight-value">${salesCount} ta</span></div>
  `;
}

function renderInsights(list) {
  const { income, expense, balance } = getTotals(list);
  const margin = income > 0 ? Math.round((balance / income) * 100) : 0;
  const sales = list.filter((t) => t.type === "income").length;
  const topSale = getByCategory(list, "income")[0];

  insightGrid.innerHTML = `
    <div class="insight-card"><span class="insight-label">Foyda foizi</span><span class="insight-value ${margin >= 0 ? "income" : "expense"}">${margin}%</span></div>
    <div class="insight-card"><span class="insight-label">Sotuvlar</span><span class="insight-value">${sales}</span></div>
    <div class="insight-card"><span class="insight-label">Sof foyda</span><span class="insight-value ${balance >= 0 ? "income" : "expense"}">${formatMoneyShort(Math.abs(balance))}</span></div>
    <div class="insight-card"><span class="insight-label">Top sotuv</span><span class="insight-value">${topSale ? topSale.label : "—"}</span></div>
  `;
}

function getTopCategoryLabel(list, type) {
  const top = getByCategory(list, type)[0];
  return top ? top.label : "—";
}
function renderMonthlyChart(list) {
  const data = getMonthlyStats(list);
  if (!data.length) { monthlyChartEl.innerHTML = '<p class="chart-empty">Ma\'lumot yo\'q</p>'; return; }
  const max = Math.max(...data.flatMap(([, v]) => [v.income, v.expense]), 1);
  monthlyChartEl.innerHTML = data.map(([key, v]) => `
    <div class="month-group">
      <div class="month-bars">
        <div class="bar income" style="height:${Math.round(v.income / max * 100)}%"></div>
        <div class="bar expense" style="height:${Math.round(v.expense / max * 100)}%"></div>
      </div>
      <span class="month-label">${formatMonthLabel(key)}</span>
    </div>`).join("");
}

function renderCategoryBreakdown(el, list, type) {
  const data = getByCategory(list, type);
  const total = data.reduce((s, i) => s + i.amount, 0);
  if (!total) { el.innerHTML = `<p class="chart-empty">${type === "expense" ? "Xarid yo'q" : "Sotuv yo'q"}</p>`; return; }
  el.innerHTML = data.map((item, i) => {
    const pct = Math.round(item.amount / total * 100);
    return `<div class="category-row">
      <div class="category-row-header">
        <span class="category-name">${item.label}</span>
        <span class="category-amount">${formatMoneyShort(item.amount)} · ${pct}%</span>
      </div>
      <div class="category-bar-track"><div class="category-bar-fill" style="width:${pct}%;background:${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}"></div></div>
    </div>`;
  }).join("");
}
function renderStats() {
  const filtered = getFilteredTransactions(statsPeriod.value);
  renderInsights(filtered);
  renderMonthlyChart(filtered);
  renderCategoryBreakdown(expenseChartEl, filtered, "expense");
  renderCategoryBreakdown(incomeChartEl, filtered, "income");
}

function renderHistory() {
  if (!transactions.length) {
    listEl.innerHTML = '<li class="empty-state">Hozircha yozuv yo\'q</li>';
    clearAllBtn.hidden = true;
    return;
  }
  clearAllBtn.hidden = false;
  const filtered = getHistoryFiltered();
  if (!filtered.length) {
    listEl.innerHTML = '<li class="empty-state">Yozuv topilmadi</li>';
    return;
  }
  listEl.innerHTML = filtered.map((t) => {
    const cat = getCategory(t.type, t.category);
    const title = t.note || cat.label;
    return `<li class="transaction-item">
      <div class="transaction-dot ${t.type}"></div>
      <div class="transaction-info">
        <div class="transaction-note">${escapeHtml(title)}</div>
        <div class="transaction-meta">
          <span class="category-tag">${cat.label}</span>
          <span class="transaction-date">${formatDate(t.date)}</span>
        </div>
      </div>
      <div class="transaction-right">
        <span class="transaction-amount ${t.type}">${t.type === "income" ? "+" : "−"}${formatMoney(t.amount)}</span>
        <button type="button" class="edit-btn" data-id="${t.id}" aria-label="Tahrirlash">✎</button>
        <button type="button" class="delete-btn" data-id="${t.id}" aria-label="O'chirish">×</button>
      </div>
    </li>`;
  }).join("");
}
function renderBalance() {
  const { income, expense, balance } = getTotals();
  balanceEl.textContent = formatMoney(balance);
  totalIncomeEl.textContent = formatMoney(income);
  totalExpenseEl.textContent = formatMoney(expense);
}

function renderSettingsUI() {
  themeSelect.value = settings.theme || "light";
  budgetInput.value = settings.monthlyBudget || "";
  renderInstallUI();
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

async function promptInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (outcome === "accepted") showToast("Ilova o'rnatildi!");
    renderInstallUI();
    return;
  }

  if (isIOS()) {
    switchView("settings");
    iosInstallSteps.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Quyidagi ko'rsatmalarni bajaring");
  } else {
    switchView("settings");
    showToast("Brauzer menyusidan 'O'rnatish' ni tanlang");
  }
}

function renderInstallUI() {
  const installed = isStandalone();

  if (installed) {
    installBanner.hidden = true;
    installBtn.hidden = true;
    iosInstallSteps.hidden = true;
    installedMsg.hidden = false;
    installDesc.textContent = "Ilova bosh ekraningizda. Offline ham ishlaydi.";
    return;
  }

  installedMsg.hidden = true;

  if (deferredInstallPrompt) {
    installBtn.hidden = false;
    iosInstallSteps.hidden = true;
    installDesc.textContent = "Bir tugma bilan telefoningizga o'rnating.";
  } else if (isIOS()) {
    installBtn.hidden = true;
    iosInstallSteps.hidden = false;
    installDesc.textContent = "iPhone/iPad da quyidagi qadamlarni bajaring:";
  } else {
    installBtn.hidden = true;
    iosInstallSteps.hidden = true;
    installDesc.textContent = isAndroid()
      ? "Chrome brauzerida oching. Yuqoridagi menyudan 'Ilovani o'rnatish' yoki 'Bosh ekranga qo'shish' ni tanlang."
      : "Brauzer menyusidan 'Ilovani o'rnatish' yoki 'Bosh ekranga qo'shish' ni tanlang.";
  }

  const showBanner = !settings.installDismissed && (deferredInstallPrompt || isIOS() || isAndroid());
  installBanner.hidden = !showBanner;
}

function render() {
  renderBalance();
  renderBudget();
  renderQuickStats();
  renderStats();
  renderHistory();
  renderSettingsUI();
}

function escapeHtml(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

function resetForm() {
  editingId = null;
  formTitle.textContent = "Yangi yozuv";
  cancelEditBtn.hidden = true;
  form.reset();
  dateInput.value = toDateInputValue(new Date().toISOString());
  setType("income");
}

function startEdit(id) {
  const t = transactions.find((i) => i.id === id);
  if (!t) return;
  editingId = id;
  formTitle.textContent = "Yozuvni tahrirlash";
  cancelEditBtn.hidden = false;
  setType(t.type);
  amountInput.value = t.amount;
  categorySelect.value = t.category;
  dateInput.value = toDateInputValue(t.date);
  noteInput.value = t.note || "";
  submitBtn.textContent = "Saqlash";
  submitBtn.className = `submit-btn ${t.type}`;
  switchView("home");
  amountInput.focus();
}

function setType(type) {
  currentType = type;
  typeBtns.forEach((b) => b.classList.toggle("active", b.dataset.type === type));
  if (!editingId) submitBtn.textContent = type === "income" ? "Sotuv qo'shish" : "Xarid qo'shish";
  submitBtn.className = `submit-btn ${type}`;
  renderCategoryOptions(type, editingId ? categorySelect.value : null);
}
function switchView(name) {
  views.forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  navBtns.forEach((b) => b.classList.toggle("active", b.dataset.view === name));
}

function exportData() {
  const blob = new Blob([JSON.stringify({
    app: "MOBITIME", exported: new Date().toISOString(), transactions, settings,
  }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mobitime-${toDateInputValue(new Date().toISOString())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Eksport qilindi");
}
function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const list = data.transactions || data;
      if (!Array.isArray(list)) throw new Error("invalid");
      if (!confirm(`${list.length} ta yozuv import qilinsinmi? Eski ma'lumotlar almashtiriladi.`)) return;
      transactions = list.map((t) => ({ ...t, category: migrateCategory(t.category) }));
      if (data.settings) settings = { ...settings, ...data.settings };
      saveTransactions();
      saveSettings();
      applyTheme(settings.theme);
      render();
      showToast("Import muvaffaqiyatli");
    } catch {
      showToast("Fayl noto'g'ri formatda");
    }
  };
  reader.readAsText(file);
}

function checkBudgetWarning(amount, type, excludeId) {
  if (type !== "expense" || !settings.monthlyBudget) return true;
  let spent = getMonthExpense();
  if (excludeId) {
    const old = transactions.find((t) => t.id === excludeId);
    if (old?.type === "expense") spent -= old.amount;
  }
  if (spent + amount <= settings.monthlyBudget) return true;
  return confirm("Oylik xarid limitidan oshib ketmoqda. Davom etasizmi?");
}
typeBtns.forEach((b) => b.addEventListener("click", () => setType(b.dataset.type)));
navBtns.forEach((b) => b.addEventListener("click", () => switchView(b.dataset.view)));
statsPeriod.addEventListener("change", renderStats);
filterType.addEventListener("change", () => { renderFilterCategories(); renderHistory(); });
filterCategory.addEventListener("change", renderHistory);
searchInput.addEventListener("input", renderHistory);
cancelEditBtn.addEventListener("click", resetForm);
exportBtn.addEventListener("click", exportData);
importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", () => {
  if (importFile.files[0]) importData(importFile.files[0]);
  importFile.value = "";
});

themeSelect.addEventListener("change", () => {
  settings.theme = themeSelect.value;
  saveSettings();
  applyTheme(settings.theme);
});

saveBudgetBtn.addEventListener("click", () => {
  settings.monthlyBudget = Math.max(0, Math.round(Number(budgetInput.value) || 0));
  saveSettings();
  renderBudget();
  showToast(settings.monthlyBudget ? "Limit saqlandi" : "Limit o'chirildi");
});
installBtn.addEventListener("click", promptInstall);
bannerInstallBtn.addEventListener("click", promptInstall);
bannerDismissBtn.addEventListener("click", () => {
  settings.installDismissed = true;
  saveSettings();
  installBanner.hidden = true;
});

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  renderInstallUI();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  showToast("Ilova o'rnatildi!");
  renderInstallUI();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = Math.round(Number(amountInput.value));
  if (!amount || amount <= 0) return;
  if (!checkBudgetWarning(amount, currentType, editingId)) return;

  const payload = {
    type: currentType, amount,
    category: categorySelect.value,
    note: noteInput.value.trim(),
    date: dateInputToIso(dateInput.value),
  };

  if (editingId) {
    const i = transactions.findIndex((t) => t.id === editingId);
    if (i !== -1) transactions[i] = { ...transactions[i], ...payload };
    resetForm();
    showToast("Yozuv yangilandi");
  } else {
    transactions.push({ id: crypto.randomUUID(), ...payload });
    amountInput.value = "";
    noteInput.value = "";
    dateInput.value = toDateInputValue(new Date().toISOString());
    amountInput.focus();
    showToast(currentType === "income" ? "Sotuv qo'shildi" : "Xarid qo'shildi");  }

  saveTransactions();
  render();
});

listEl.addEventListener("click", (e) => {
  const edit = e.target.closest(".edit-btn");
  if (edit) { startEdit(edit.dataset.id); return; }
  const del = e.target.closest(".delete-btn");
  if (!del) return;
  if (editingId === del.dataset.id) resetForm();
  transactions = transactions.filter((t) => t.id !== del.dataset.id);
  saveTransactions();
  render();
  showToast("Yozuv o'chirildi");
});

clearAllBtn.addEventListener("click", () => {
  if (!confirm("Barcha yozuvlarni o'chirmoqchimisiz?")) return;
  resetForm();
  transactions = [];
  saveTransactions();
  render();
  showToast("Barcha yozuvlar o'chirildi");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (settings.theme === "auto") applyTheme("auto");
});

dateInput.value = toDateInputValue(new Date().toISOString());
applyTheme(settings.theme || "light");
renderFilterCategories();
setType("income");
render();
