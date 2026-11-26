// NestEgg app: hash routing, the month picker, and every form.
// No framework, no network — the whole app is these few modules.

import {
  store, category, money, monthLabel, allMonths, CURRENT_MONTH,
  addTransaction, updateTransaction, deleteTransaction, setBudget,
  toggleBillPaid, addToGoal, addGoal, toCSV, resetDemo, savedThisYear,
  expenseCategories, incomeCategories,
} from "./store.js";
import {
  renderDashboard, drawDashboard, renderTransactions, renderBudgets,
  drawBudgets, renderBills, renderReports, drawReports,
} from "./views.js";

const view = document.getElementById("view");
const monthSelect = document.getElementById("monthSelect");
const modalRoot = document.getElementById("modalRoot");
const toastEl = document.getElementById("toast");

let month = CURRENT_MONTH;
let route = "dashboard";
let txFilter = { kind: "", cat: "", q: "" };
let toastTimer = null;

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
}

function fillMonths() {
  monthSelect.innerHTML = allMonths()
    .map((ym) => `<option value="${ym}" ${ym === month ? "selected" : ""}>${monthLabel(ym)}</option>`)
    .join("");
}

function setActiveNav() {
  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === route);
  });
}

function render() {
  fillMonths();
  setActiveNav();
  const side = document.getElementById("sideSaved");
  if (side) side.textContent = "Saved this year: " + money(savedThisYear());
  if (route === "dashboard") {
    view.innerHTML = renderDashboard(month);
    drawDashboard(month);
  } else if (route === "transactions") {
    view.innerHTML = renderTransactions(month, txFilter);
    wireFilters();
  } else if (route === "budgets") {
    view.innerHTML = renderBudgets(month);
    drawBudgets(month);
  } else if (route === "bills") {
    view.innerHTML = renderBills(month);
  } else if (route === "reports") {
    view.innerHTML = renderReports(month);
    drawReports();
  }
  view.focus({ preventScroll: true });
}

function readRoute() {
  const hash = location.hash.replace(/^#\/?/, "") || "dashboard";
  const known = ["dashboard", "transactions", "budgets", "bills", "reports"];
  route = known.includes(hash) ? hash : "dashboard";
  render();
}

// ---------------- modal helpers ----------------

function openModal(html) {
  modalRoot.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  modalRoot.hidden = false;
  const first = modalRoot.querySelector("input, select");
  if (first) first.focus();
}

function closeModal() {
  modalRoot.hidden = true;
  modalRoot.innerHTML = "";
}

modalRoot.addEventListener("click", (e) => {
  if (e.target === modalRoot) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalRoot.hidden) closeModal();
});

function catOptions(selected) {
  const groups = [
    ["Money out", expenseCategories()],
    ["Money in", incomeCategories()],
  ];
  return groups.map(([label, cats]) =>
    `<optgroup label="${label}">${cats.map((c) => `<option value="${c.id}" ${c.id === selected ? "selected" : ""}>${c.name}</option>`).join("")}</optgroup>`).join("");
}

function txForm(existing) {
  const t = existing || { date: "2026-11-26", name: "", category: "groceries", amount: "" };
  const isOut = !existing || t.amount <= 0;
  const amount = existing ? Math.abs(t.amount).toFixed(2) : "";
  openModal(`
    <h2>${existing ? "Edit transaction" : "Add a transaction"}</h2>
    <form id="txForm">
      <div class="field"><label for="txName">What was it?</label>
        <input id="txName" required maxlength="80" placeholder="e.g. Weekly shop — GreenMart" value="${t.name.replace(/"/g, "&quot;")}"></div>
      <div class="field-row">
        <div class="field"><label for="txAmount">Amount ($)</label>
          <input id="txAmount" type="number" min="0.01" step="0.01" required inputmode="decimal" placeholder="0.00" value="${amount}"></div>
        <div class="field"><label for="txDir">Direction</label>
          <select id="txDir"><option value="out" ${isOut ? "selected" : ""}>Money out</option><option value="in" ${!isOut ? "selected" : ""}>Money in</option></select></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="txDate">Date</label>
          <input id="txDate" type="date" required value="${t.date}"></div>
        <div class="field"><label for="txCat">Category</label>
          <select id="txCat">${catOptions(t.category)}</select></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-close>Cancel</button>
        <button class="btn btn-primary" type="submit">${existing ? "Save changes" : "Add it"}</button>
      </div>
    </form>`);
  document.getElementById("txForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("txName").value.trim();
    const amountVal = Math.abs(parseFloat(document.getElementById("txAmount").value));
    const dir = document.getElementById("txDir").value;
    const patch = {
      name,
      amount: dir === "in" ? amountVal : -amountVal,
      date: document.getElementById("txDate").value,
      category: document.getElementById("txCat").value,
    };
    if (!name || !amountVal || !patch.date) return;
    if (existing) {
      updateTransaction(existing.id, patch);
      toast("Transaction updated.");
    } else {
      addTransaction(patch);
      toast("Added “" + name + "”.");
    }
    closeModal();
    render();
  });
  modalRoot.querySelector("[data-close]").addEventListener("click", closeModal);
}

function budgetForm(catId) {
  const b = store.budgets.find((x) => x.category === catId);
  const c = category(catId);
  openModal(`
    <h2>Budget: ${c.name}</h2>
    <form id="budgetForm">
      <div class="field"><label for="budgetLimit">Monthly limit ($)</label>
        <input id="budgetLimit" type="number" min="0" step="5" required inputmode="decimal" value="${b ? b.limit : 0}"></div>
      <p class="small muted">This month's spending in ${c.name} stays as it is — only the limit changes.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-close>Cancel</button>
        <button class="btn btn-primary" type="submit">Save limit</button>
      </div>
    </form>`);
  document.getElementById("budgetForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const limit = Math.max(0, parseFloat(document.getElementById("budgetLimit").value) || 0);
    setBudget(catId, limit);
    toast(c.name + " budget set to " + money(limit) + ".");
    closeModal();
    render();
  });
  modalRoot.querySelector("[data-close]").addEventListener("click", closeModal);
}

function goalForm(goalId) {
  const g = store.goals.find((x) => x.id === goalId);
  if (!g) return;
  openModal(`
    <h2>Add to “${g.name}”</h2>
    <form id="goalForm">
      <div class="field"><label for="goalAmount">Amount ($)</label>
        <input id="goalAmount" type="number" min="1" step="1" required inputmode="decimal" placeholder="e.g. 100"></div>
      <p class="small muted">Saved so far: ${money(g.saved)} of ${money(g.target)}.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-close>Cancel</button>
        <button class="btn btn-primary" type="submit">Add it</button>
      </div>
    </form>`);
  document.getElementById("goalForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("goalAmount").value) || 0;
    if (amount <= 0) return;
    addToGoal(goalId, amount);
    toast(money(amount) + " added to “" + g.name + "”.");
    closeModal();
    render();
  });
  modalRoot.querySelector("[data-close]").addEventListener("click", closeModal);
}

function newGoalForm() {
  openModal(`
    <h2>New savings goal</h2>
    <form id="newGoalForm">
      <div class="field"><label for="goalName">What are you saving for?</label>
        <input id="goalName" required maxlength="60" placeholder="e.g. New bikes for the kids"></div>
      <div class="field"><label for="goalTarget">Target ($)</label>
        <input id="goalTarget" type="number" min="1" step="10" required inputmode="decimal" placeholder="e.g. 800"></div>
      <div class="field"><label for="goalNote">A note to future you (optional)</label>
        <input id="goalNote" maxlength="120" placeholder="Why this one matters"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-close>Cancel</button>
        <button class="btn btn-primary" type="submit">Create goal</button>
      </div>
    </form>`);
  document.getElementById("newGoalForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("goalName").value.trim();
    const target = parseFloat(document.getElementById("goalTarget").value) || 0;
    if (!name || target <= 0) return;
    addGoal({ name, target, note: document.getElementById("goalNote").value.trim() || "A new thing to save for." });
    toast("Goal “" + name + "” created.");
    closeModal();
    render();
  });
  modalRoot.querySelector("[data-close]").addEventListener("click", closeModal);
}

// ---------------- filters ----------------

function wireFilters() {
  const kind = document.getElementById("fKind");
  const cat = document.getElementById("fCat");
  const q = document.getElementById("fQ");
  if (!kind || !cat || !q) return;
  kind.addEventListener("change", () => { txFilter.kind = kind.value; render(); });
  cat.addEventListener("change", () => { txFilter.cat = cat.value; render(); });
  let t = null;
  q.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => { txFilter.q = q.value; render(); const nq = document.getElementById("fQ"); if (nq) { nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); } }, 250);
  });
}

// ---------------- global clicks ----------------

view.addEventListener("click", (e) => {
  const editTx = e.target.closest("[data-edit-tx]");
  if (editTx) {
    const t = store.transactions.find((x) => x.id === editTx.dataset.editTx);
    if (t) txForm(t);
    return;
  }
  const delTx = e.target.closest("[data-del-tx]");
  if (delTx) {
    const t = store.transactions.find((x) => x.id === delTx.dataset.delTx);
    if (t && confirm("Delete “" + t.name + "” (" + money(Math.abs(t.amount)) + ")?")) {
      deleteTransaction(t.id);
      toast("Transaction deleted.");
      render();
    }
    return;
  }
  if (e.target.closest("[data-open-add]")) { txForm(null); return; }
  if (e.target.closest("[data-clear-filters]")) { txFilter = { kind: "", cat: "", q: "" }; render(); return; }
  const editB = e.target.closest("[data-edit-budget]");
  if (editB) { budgetForm(editB.dataset.editBudget); return; }
  const bill = e.target.closest("[data-toggle-bill]");
  if (bill) {
    toggleBillPaid(bill.dataset.toggleBill, month);
    toast("Bill updated.");
    render();
    return;
  }
  const goal = e.target.closest("[data-add-goal]");
  if (goal) { goalForm(goal.dataset.addGoal); return; }
  if (e.target.closest("[data-new-goal]")) { newGoalForm(); }
});

document.getElementById("addTxBtn").addEventListener("click", () => txForm(null));

monthSelect.addEventListener("change", () => {
  month = monthSelect.value;
  render();
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([toCSV(month)], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "nestegg-" + month + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Exported " + monthLabel(month) + " as CSV.");
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("Reset NestEgg to the demo data? Your edits will be lost.")) {
    resetDemo();
    month = CURRENT_MONTH;
    txFilter = { kind: "", cat: "", q: "" };
    render();
    toast("Demo data restored.");
  }
});

window.addEventListener("hashchange", readRoute);
readRoute();
