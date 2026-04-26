const STORAGE_KEY = "budgy-state-v1";

const state = loadState();

const els = {
  salaryInput: document.getElementById("salaryInput"),
  balanceInput: document.getElementById("balanceInput"),
  expenseForm: document.getElementById("expenseForm"),
  expenseName: document.getElementById("expenseName"),
  expenseCategory: document.getElementById("expenseCategory"),
  expenseAmount: document.getElementById("expenseAmount"),
  expenseDate: document.getElementById("expenseDate"),
  totalSpent: document.getElementById("totalSpent"),
  estimatedSaved: document.getElementById("estimatedSaved"),
  remainingBudget: document.getElementById("remainingBudget"),
  balanceStatus: document.getElementById("balanceStatus"),
  heroSavings: document.getElementById("heroSavings"),
  heroSpendRate: document.getElementById("heroSpendRate"),
  monthlyHealth: document.getElementById("monthlyHealth"),
  topSuggestion: document.getElementById("topSuggestion"),
  expenseList: document.getElementById("expenseList"),
  categoryBreakdown: document.getElementById("categoryBreakdown"),
  expenseItemTemplate: document.getElementById("expenseItemTemplate"),
};

init();

function init() {
  const today = new Date().toISOString().split("T")[0];
  els.expenseDate.value = state.expenses[0]?.date || today;
  els.salaryInput.value = state.salary || "";
  els.balanceInput.value = state.balance || "";

  els.salaryInput.addEventListener("input", handleProfileChange);
  els.balanceInput.addEventListener("input", handleProfileChange);
  els.expenseForm.addEventListener("submit", handleExpenseSubmit);

  render();
}

function handleProfileChange() {
  state.salary = toNumber(els.salaryInput.value);
  state.balance = toNumber(els.balanceInput.value);
  saveState();
  render();
}

function handleExpenseSubmit(event) {
  event.preventDefault();

  const name = els.expenseName.value.trim();
  const category = els.expenseCategory.value;
  const amount = toNumber(els.expenseAmount.value);
  const date = els.expenseDate.value;

  if (!name || !amount || !date) {
    return;
  }

  state.expenses.unshift({
    id: crypto.randomUUID(),
    name,
    category,
    amount,
    date,
  });

  saveState();
  render();
  els.expenseForm.reset();
  els.expenseDate.value = new Date().toISOString().split("T")[0];
}

function removeExpense(id) {
  state.expenses = state.expenses.filter((expense) => expense.id !== id);
  saveState();
  render();
}

function render() {
  const totals = calculateTotals();
  const suggestion = buildSuggestion(totals);

  els.totalSpent.textContent = formatCurrency(totals.totalSpent);
  els.estimatedSaved.textContent = formatCurrency(totals.estimatedSaved);
  els.remainingBudget.textContent = formatCurrency(totals.remainingBudget);
  els.balanceStatus.textContent = formatCurrency(state.balance);
  els.heroSavings.textContent = formatCurrency(totals.estimatedSaved);
  els.heroSpendRate.textContent = `${Math.round(totals.spendRate)}%`;
  els.monthlyHealth.textContent = totals.healthText;
  els.monthlyHealth.className = totals.estimatedSaved >= 0 ? "positive" : "warning";
  els.topSuggestion.textContent = suggestion;

  renderExpenses();
  renderCategories(totals.categoryTotals, totals.totalSpent);
}

function calculateTotals() {
  const totalSpent = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remainingBudget = state.salary - totalSpent;
  const estimatedSaved = remainingBudget;
  const spendRate = state.salary > 0 ? (totalSpent / state.salary) * 100 : 0;
  const categoryTotals = state.expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});

  let healthText = "Voeg je loon in om je maandscore correct te berekenen.";
  if (state.salary > 0) {
    if (spendRate <= 50) {
      healthText = "Sterke maand tot nu toe: je houdt ruim meer dan de helft van je loon onder controle.";
    } else if (spendRate <= 75) {
      healthText = "Je budget blijft voorlopig stabiel, maar je marge wordt kleiner.";
    } else if (spendRate <= 100) {
      healthText = "Je zit dicht tegen je maandgrens. Extra voorzichtigheid is slim.";
    } else {
      healthText = "Je uitgaven liggen boven je loon. Tijd om snel bij te sturen.";
    }
  }

  if (state.balance < 0) {
    healthText = "Je rekening staat in het rood. Focus eerst op uitgaven pauzeren tot je buffer weer positief is.";
  }

  return {
    totalSpent,
    remainingBudget,
    estimatedSaved,
    spendRate,
    healthText,
    categoryTotals,
  };
}

function buildSuggestion(totals) {
  if (!state.salary && state.expenses.length === 0) {
    return "Start met je nettoloon en voeg daarna je eerste uitgaven toe.";
  }

  const topCategory = Object.entries(totals.categoryTotals).sort((a, b) => b[1] - a[1])[0];

  if (!state.salary) {
    return "Voeg je maandelijks loon toe zodat ik concreter kan inschatten hoeveel je spaart.";
  }

  if (totals.spendRate > 100) {
    return "Je geeft momenteel meer uit dan je loon. Kijk eerst naar vaste kosten en schrap deze maand minstens 1 niet-essentiele uitgave.";
  }

  if (topCategory && topCategory[1] > state.salary * 0.3) {
    return `${topCategory[0]} neemt een groot stuk van je loon in. Bekijk of je daar een limiet of goedkoper alternatief kunt zetten.`;
  }

  if (totals.spendRate > 75) {
    return "Plan voor de rest van de maand alleen nog geplande aankopen in. Zo voorkom je dat je buffer wegsmelt.";
  }

  if (totals.estimatedSaved < state.salary * 0.2) {
    return "Je spaart minder dan 20% van je loon. Een vaste automatische spaaroverschrijving kan helpen.";
  }

  return "Je budget oogt gezond. Hou vooral je grootste categorie in de gaten en reserveer een vast spaarbedrag vlak na je loon.";
}

function renderExpenses() {
  if (state.expenses.length === 0) {
    els.expenseList.className = "expense-list empty-state";
    els.expenseList.textContent = "Nog geen uitgaven toegevoegd.";
    return;
  }

  els.expenseList.className = "expense-list";
  els.expenseList.textContent = "";

  state.expenses.forEach((expense) => {
    const node = els.expenseItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".expense-item__name").textContent = expense.name;
    node.querySelector(".expense-item__meta").textContent = `${expense.category} - ${formatDate(expense.date)}`;
    node.querySelector(".expense-item__amount").textContent = formatCurrency(expense.amount);
    node.querySelector(".expense-item__delete").addEventListener("click", () => removeExpense(expense.id));
    els.expenseList.appendChild(node);
  });
}

function renderCategories(categoryTotals, totalSpent) {
  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    els.categoryBreakdown.className = "category-breakdown empty-state";
    els.categoryBreakdown.textContent = "Nog geen categoriegegevens beschikbaar.";
    return;
  }

  els.categoryBreakdown.className = "category-breakdown";
  els.categoryBreakdown.textContent = "";

  entries.forEach(([category, amount]) => {
    const row = document.createElement("article");
    row.className = "category-row";

    const share = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
    row.innerHTML = `
      <strong><span>${category}</span><span>${formatCurrency(amount)}</span></strong>
      <p>${Math.round(share)}% van je uitgaven</p>
      <div class="bar"><span style="width: ${Math.min(share, 100)}%"></span></div>
    `;

    els.categoryBreakdown.appendChild(row);
  });
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      salary: saved?.salary || 0,
      balance: saved?.balance || 0,
      expenses: Array.isArray(saved?.expenses) ? saved.expenses : [],
    };
  } catch {
    return {
      salary: 0,
      balance: 0,
      expenses: [],
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("nl-BE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
