const STORAGE_KEY = "budgy-state-v3";

const state = loadState();

const els = {
  monthForm: document.getElementById("monthForm"),
  selectedMonth: document.getElementById("selectedMonth"),
  salaryInput: document.getElementById("salaryInput"),
  balanceInput: document.getElementById("balanceInput"),
  transactionForm: document.getElementById("transactionForm"),
  transactionMonth: document.getElementById("transactionMonth"),
  transactionType: document.getElementById("transactionType"),
  transactionCategory: document.getElementById("transactionCategory"),
  transactionName: document.getElementById("transactionName"),
  transactionAmount: document.getElementById("transactionAmount"),
  transactionDate: document.getElementById("transactionDate"),
  heroMonth: document.getElementById("heroMonth"),
  heroBalance: document.getElementById("heroBalance"),
  heroSavings: document.getElementById("heroSavings"),
  savedSalary: document.getElementById("savedSalary"),
  startingBalance: document.getElementById("startingBalance"),
  totalIncome: document.getElementById("totalIncome"),
  totalExpenses: document.getElementById("totalExpenses"),
  netResult: document.getElementById("netResult"),
  endingBalance: document.getElementById("endingBalance"),
  monthlyHealth: document.getElementById("monthlyHealth"),
  topSuggestion: document.getElementById("topSuggestion"),
  balanceTrendChart: document.getElementById("balanceTrendChart"),
  cashflowChart: document.getElementById("cashflowChart"),
  transactionList: document.getElementById("transactionList"),
  categoryBreakdown: document.getElementById("categoryBreakdown"),
  monthList: document.getElementById("monthList"),
  transactionItemTemplate: document.getElementById("transactionItemTemplate"),
  monthItemTemplate: document.getElementById("monthItemTemplate"),
};

init();

function init() {
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = state.activeMonth || today.slice(0, 7);

  els.selectedMonth.value = currentMonth;
  els.transactionMonth.value = currentMonth;
  els.transactionDate.value = today;
  els.transactionType.value = "expense";

  syncMonthInputs(currentMonth);

  els.monthForm.addEventListener("submit", handleMonthSubmit);
  els.transactionForm.addEventListener("submit", handleTransactionSubmit);
  els.selectedMonth.addEventListener("change", handleMonthSelectionChange);

  render();
}

function handleMonthSelectionChange() {
  const month = els.selectedMonth.value;
  state.activeMonth = month;
  els.transactionMonth.value = month;
  syncMonthInputs(month);
  saveState();
  render();
}

function handleMonthSubmit(event) {
  event.preventDefault();

  const month = els.selectedMonth.value;
  const salary = toNumber(els.salaryInput.value);
  const balance = toNumber(els.balanceInput.value);

  if (!month) {
    return;
  }

  state.activeMonth = month;
  state.months[month] = {
    salary,
    startingBalance: balance,
  };

  els.transactionMonth.value = month;
  saveState();
  render();
}

function handleTransactionSubmit(event) {
  event.preventDefault();

  const month = els.transactionMonth.value;
  const type = els.transactionType.value;
  const category = els.transactionCategory.value;
  const name = els.transactionName.value.trim();
  const amount = toNumber(els.transactionAmount.value);
  const date = els.transactionDate.value;

  if (!month || !name || !amount || !date) {
    return;
  }

  if (!state.months[month]) {
    state.months[month] = {
      salary: 0,
      startingBalance: 0,
    };
  }

  state.transactions.unshift({
    id: crypto.randomUUID(),
    month,
    type,
    category,
    name,
    amount,
    date,
  });

  state.activeMonth = month;
  els.selectedMonth.value = month;
  saveState();
  render();

  els.transactionForm.reset();
  els.transactionMonth.value = month;
  els.transactionType.value = "expense";
  els.transactionDate.value = new Date().toISOString().split("T")[0];
}

function removeTransaction(id) {
  state.transactions = state.transactions.filter((transaction) => transaction.id !== id);
  saveState();
  render();
}

function setActiveMonth(month) {
  state.activeMonth = month;
  els.selectedMonth.value = month;
  els.transactionMonth.value = month;
  syncMonthInputs(month);
  saveState();
  render();
}

function render() {
  const activeMonth = state.activeMonth || els.selectedMonth.value;
  const activeSummary = getMonthSummary(activeMonth);
  const allSummaries = getAllMonthSummaries();

  els.heroMonth.textContent = activeMonth ? formatMonth(activeMonth) : "Geen maand";
  els.heroBalance.textContent = formatCurrency(activeSummary.endingBalance);
  els.heroSavings.textContent = formatCurrency(activeSummary.netResult);

  els.savedSalary.textContent = formatCurrency(activeSummary.salary);
  els.startingBalance.textContent = formatCurrency(activeSummary.startingBalance);
  els.totalIncome.textContent = formatCurrency(activeSummary.totalIncome);
  els.totalExpenses.textContent = formatCurrency(activeSummary.totalExpenses);
  els.netResult.textContent = formatCurrency(activeSummary.netResult);
  els.endingBalance.textContent = formatCurrency(activeSummary.endingBalance);

  els.monthlyHealth.textContent = buildHealthText(activeSummary);
  els.monthlyHealth.className = activeSummary.endingBalance >= 0 ? "positive" : "warning";
  els.topSuggestion.textContent = buildSuggestion(activeSummary);

  renderTransactions(activeSummary.transactions);
  renderCategories(activeSummary.expenseCategories, activeSummary.totalExpenses);
  renderMonths(allSummaries, activeMonth);
  renderBalanceTrendChart(allSummaries);
  renderCashflowChart(allSummaries);
}

function renderTransactions(transactions) {
  if (transactions.length === 0) {
    els.transactionList.className = "expense-list empty-state";
    els.transactionList.textContent = "Nog geen verrichtingen in deze maand.";
    return;
  }

  els.transactionList.className = "expense-list";
  els.transactionList.textContent = "";

  transactions.forEach((transaction) => {
    const node = els.transactionItemTemplate.content.firstElementChild.cloneNode(true);
    const sign = transaction.type === "income" ? "+" : "-";

    node.querySelector(".transaction-item__name").textContent = transaction.name;
    node.querySelector(".transaction-item__meta").textContent =
      `${capitalizeType(transaction.type)} - ${transaction.category} - ${formatDate(transaction.date)}`;
    node.querySelector(".transaction-item__amount").textContent = `${sign} ${formatCurrency(transaction.amount)}`;
    node.querySelector(".transaction-item__amount").className =
      `transaction-item__amount ${transaction.type === "income" ? "positive" : "warning"}`;
    node.querySelector(".transaction-item__delete").addEventListener("click", () => removeTransaction(transaction.id));

    els.transactionList.appendChild(node);
  });
}

function renderCategories(categoryTotals, totalExpenses) {
  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    els.categoryBreakdown.className = "category-breakdown empty-state";
    els.categoryBreakdown.textContent = "Nog geen uitgaven om te verdelen.";
    return;
  }

  els.categoryBreakdown.className = "category-breakdown";
  els.categoryBreakdown.textContent = "";

  entries.forEach(([category, amount]) => {
    const row = document.createElement("article");
    row.className = "category-row";

    const share = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
    row.innerHTML = `
      <strong><span>${category}</span><span>${formatCurrency(amount)}</span></strong>
      <p>${Math.round(share)}% van je uitgaven</p>
      <div class="bar"><span style="width: ${Math.min(share, 100)}%"></span></div>
    `;

    els.categoryBreakdown.appendChild(row);
  });
}

function renderMonths(summaries, activeMonth) {
  if (summaries.length === 0) {
    els.monthList.className = "month-list empty-state";
    els.monthList.textContent = "Nog geen maanden opgeslagen.";
    return;
  }

  els.monthList.className = "month-list";
  els.monthList.textContent = "";

  [...summaries].sort((a, b) => b.month.localeCompare(a.month)).forEach((summary) => {
    const node = els.monthItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".month-item__name").textContent = formatMonth(summary.month);
    node.querySelector(".month-item__meta").textContent =
      `Loon ${formatCurrency(summary.salary)} - uitgaven ${formatCurrency(summary.totalExpenses)} - sparen ${formatCurrency(summary.netResult)}`;
    node.querySelector(".month-item__amount").textContent = formatCurrency(summary.endingBalance);

    if (summary.month === activeMonth) {
      node.classList.add("is-active");
    }

    node.addEventListener("click", () => setActiveMonth(summary.month));
    els.monthList.appendChild(node);
  });
}

function renderBalanceTrendChart(summaries) {
  if (summaries.length === 0) {
    els.balanceTrendChart.className = "chart-surface empty-state";
    els.balanceTrendChart.textContent = "Nog geen maanden beschikbaar voor de grafiek.";
    return;
  }

  const width = 560;
  const height = 240;
  const padX = 28;
  const padY = 24;
  const balances = summaries.map((summary) => summary.endingBalance);
  const minBalance = Math.min(...balances, 0);
  const maxBalance = Math.max(...balances, 0);
  const range = maxBalance - minBalance || 1;
  const stepX = summaries.length > 1 ? (width - padX * 2) / (summaries.length - 1) : 0;

  const points = summaries.map((summary, index) => {
    const x = padX + stepX * index;
    const y = padY + (height - padY * 2) * (1 - (summary.endingBalance - minBalance) / range);
    return { x, y, label: formatShortMonth(summary.month), value: summary.endingBalance };
  });

  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${padX},${height - padY} ${line} ${points.at(-1).x},${height - padY}`;

  els.balanceTrendChart.className = "chart-surface";
  els.balanceTrendChart.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafiek met rekeningstand per maand">
      <defs>
        <linearGradient id="balanceArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgba(255,123,66,0.38)"></stop>
          <stop offset="100%" stop-color="rgba(255,123,66,0.04)"></stop>
        </linearGradient>
      </defs>
      ${renderGrid(width, height, padX, padY)}
      <polygon points="${area}" fill="url(#balanceArea)"></polygon>
      <polyline points="${line}" fill="none" stroke="#ff7b42" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
      ${points.map((point) => `
        <g>
          <circle cx="${point.x}" cy="${point.y}" r="5.5" fill="#ff7b42"></circle>
          <text x="${point.x}" y="${height - 6}" text-anchor="middle" font-size="12" fill="#617166">${point.label}</text>
        </g>
      `).join("")}
    </svg>
    <div class="chart-caption">
      <span class="chart-key chart-key--balance">Eindstand rekening</span>
    </div>
  `;
}

function renderCashflowChart(summaries) {
  if (summaries.length === 0) {
    els.cashflowChart.className = "chart-surface empty-state";
    els.cashflowChart.textContent = "Nog geen maanddata beschikbaar voor de grafiek.";
    return;
  }

  const width = 560;
  const height = 240;
  const padX = 26;
  const padY = 22;
  const chartHeight = height - padY * 2;
  const groups = summaries.length;
  const groupWidth = (width - padX * 2) / groups;
  const barWidth = Math.min(22, Math.max(12, groupWidth / 3.6));
  const maxValue = Math.max(
    1,
    ...summaries.map((summary) => Math.max(summary.totalExpenses, Math.max(summary.netResult, 0)))
  );

  const bars = summaries.map((summary, index) => {
    const groupX = padX + index * groupWidth;
    const expenseHeight = (summary.totalExpenses / maxValue) * chartHeight;
    const savingsHeight = (Math.max(summary.netResult, 0) / maxValue) * chartHeight;

    return {
      label: formatShortMonth(summary.month),
      expenseX: groupX + groupWidth * 0.18,
      savingsX: groupX + groupWidth * 0.54,
      expenseY: height - padY - expenseHeight,
      savingsY: height - padY - savingsHeight,
      expenseHeight,
      savingsHeight,
    };
  });

  els.cashflowChart.className = "chart-surface";
  els.cashflowChart.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafiek met uitgaven en sparen per maand">
      ${renderGrid(width, height, padX, padY)}
      ${bars.map((bar) => `
        <g>
          <rect x="${bar.expenseX}" y="${bar.expenseY}" width="${barWidth}" height="${bar.expenseHeight}" rx="10" fill="#b55a21"></rect>
          <rect x="${bar.savingsX}" y="${bar.savingsY}" width="${barWidth}" height="${bar.savingsHeight}" rx="10" fill="#1e8052"></rect>
          <text x="${bar.expenseX + groupWidth * 0.27}" y="${height - 6}" text-anchor="middle" font-size="12" fill="#617166">${bar.label}</text>
        </g>
      `).join("")}
    </svg>
    <div class="chart-caption">
      <span class="chart-key chart-key--expenses">Uitgaven</span>
      <span class="chart-key chart-key--savings">Overgehouden of gespaard</span>
    </div>
  `;
}

function getMonthSummary(month) {
  const monthSettings = state.months[month] || { salary: 0, startingBalance: 0 };
  const transactions = state.transactions
    .filter((transaction) => transaction.month === month)
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const totalExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expenseCategories = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
      return acc;
    }, {});

  const netResult = monthSettings.salary + totalIncome - totalExpenses;
  const endingBalance = monthSettings.startingBalance + totalIncome - totalExpenses;

  return {
    month,
    salary: monthSettings.salary,
    startingBalance: monthSettings.startingBalance,
    totalIncome,
    totalExpenses,
    netResult,
    endingBalance,
    transactions,
    expenseCategories,
  };
}

function getAllMonthSummaries() {
  const monthSet = new Set([
    ...Object.keys(state.months),
    ...state.transactions.map((transaction) => transaction.month),
  ]);

  return [...monthSet]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map((month) => getMonthSummary(month));
}

function buildHealthText(summary) {
  if (!summary.month) {
    return "Kies of bewaar eerst een maand om je overzicht te zien.";
  }

  if (summary.totalIncome === 0 && summary.totalExpenses === 0 && summary.salary === 0) {
    return "Deze maand is nog leeg. Sla eerst je loon, rekeningsaldo en eerste verrichtingen op.";
  }

  if (summary.endingBalance < 0) {
    return "Je eindstand voor deze maand komt onder nul uit. Deze maand vraagt snelle bijsturing.";
  }

  if (summary.netResult < 0) {
    return "Je geeft meer uit dan er binnenkomt in deze maand. Let vooral op je grootste kostenposten.";
  }

  if (summary.netResult <= summary.salary * 0.2) {
    return "Je maand blijft positief, maar je marge is vrij klein. Een paar gerichte besparingen kunnen helpen.";
  }

  return "Deze maand oogt gezond. Je houdt een mooie buffer over na je inkomsten en uitgaven.";
}

function buildSuggestion(summary) {
  if (summary.transactions.length === 0) {
    return "Voeg bijvoorbeeld loon, huur, reis, boodschappen en abonnementen toe om een duidelijk beeld te krijgen.";
  }

  const topExpense = Object.entries(summary.expenseCategories).sort((a, b) => b[1] - a[1])[0];

  if (summary.netResult < 0) {
    return "Kijk eerst naar kosten die je kunt uitstellen of verlagen. Begin bij niet-noodzakelijke uitgaven.";
  }

  if (topExpense && topExpense[1] > Math.max(summary.salary, 1) * 0.3) {
    return `${topExpense[0]} neemt een groot deel van je maand in. Zet daar best een duidelijke limiet op.`;
  }

  if (summary.totalExpenses > summary.totalIncome + summary.salary * 0.8) {
    return "Je uitgaven lopen snel op. Het helpt om voor deze maand een maximum per categorie te zetten.";
  }

  return "Je overzicht is goed opgebouwd. Blijf elke kost meteen ingeven zodat je maandstand correct blijft.";
}

function syncMonthInputs(month) {
  const monthSettings = state.months[month] || { salary: 0, startingBalance: 0 };
  els.salaryInput.value = monthSettings.salary || "";
  els.balanceInput.value = monthSettings.startingBalance || "";
}

function renderGrid(width, height, padX, padY) {
  const lines = 4;
  let markup = "";
  for (let index = 0; index <= lines; index += 1) {
    const y = padY + ((height - padY * 2) / lines) * index;
    markup += `<line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" stroke="rgba(19,35,31,0.08)" stroke-width="1"></line>`;
  }
  return markup;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      activeMonth: saved?.activeMonth || "",
      months: saved?.months && typeof saved.months === "object" ? saved.months : {},
      transactions: Array.isArray(saved?.transactions) ? saved.transactions : [],
    };
  } catch {
    return {
      activeMonth: "",
      months: {},
      transactions: [],
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

function formatMonth(value) {
  if (!value) {
    return "Geen maand";
  }

  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("nl-BE", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortMonth(value) {
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("nl-BE", {
    month: "short",
  }).format(date);
}

function capitalizeType(value) {
  return value === "income" ? "Inkomst" : "Uitgave";
}
