// NestEgg store: one household's books, kept in localStorage.
// Everything the views show comes from here, so add/edit/delete in one
// place updates the dashboard, budgets, bills and reports together.

import { CATEGORIES, BUDGETS, BILLS, GOALS, TRANSACTIONS } from "./data.js";

const KEY = "nestegg-v1";
export const CURRENT_MONTH = "2026-11";

function cloneSeed() {
  return {
    transactions: structuredClone(TRANSACTIONS),
    budgets: structuredClone(BUDGETS),
    bills: structuredClone(BILLS),
    goals: structuredClone(GOALS),
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return cloneSeed();
    const data = JSON.parse(raw);
    if (!Array.isArray(data.transactions) || !Array.isArray(data.budgets)) return cloneSeed();
    return data;
  } catch {
    return cloneSeed();
  }
}

let state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full quota: the page still works for this visit.
  }
}

export function resetDemo() {
  state = cloneSeed();
  save();
}

export const store = {
  get transactions() { return state.transactions; },
  get budgets() { return state.budgets; },
  get bills() { return state.bills; },
  get goals() { return state.goals; },
};

// ---- lookups ----

export function category(id) {
  return CATEGORIES.find((c) => c.id === id) || { id, name: id, kind: "expense", color: "#8a938c", icon: "•" };
}

export function expenseCategories() {
  return CATEGORIES.filter((c) => c.kind === "expense");
}

export function incomeCategories() {
  return CATEGORIES.filter((c) => c.kind === "income");
}

// ---- money ----

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function money(n) {
  return fmt.format(n);
}

export function signedMoney(n) {
  return (n > 0 ? "+" : n < 0 ? "−" : "") + fmt.format(Math.abs(n));
}

export function monthOf(date) {
  return String(date).slice(0, 7);
}

export function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function shortDate(date) {
  const [y, m, d] = String(date).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function allMonths() {
  const set = new Set(state.transactions.map((t) => monthOf(t.date)));
  set.add(CURRENT_MONTH);
  return [...set].sort().reverse();
}

// ---- month math ----

export function monthTx(ym) {
  return state.transactions
    .filter((t) => monthOf(t.date) === ym)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function monthTotals(ym) {
  let income = 0;
  let spent = 0;
  for (const t of state.transactions) {
    if (monthOf(t.date) !== ym) continue;
    if (t.amount > 0) income += t.amount;
    else spent += -t.amount;
  }
  return { income, spent, saved: income - spent };
}

export function spentByCategory(ym) {
  const out = new Map();
  for (const t of state.transactions) {
    if (monthOf(t.date) !== ym || t.amount >= 0) continue;
    out.set(t.category, (out.get(t.category) || 0) + -t.amount);
  }
  return [...out.entries()]
    .map(([id, amount]) => ({ id, ...category(id), amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function budgetStatus(ym) {
  return state.budgets.map((b) => {
    const spent = state.transactions
      .filter((t) => monthOf(t.date) === ym && t.category === b.category && t.amount < 0)
      .reduce((s, t) => s + -t.amount, 0);
    return { ...b, ...category(b.category), spent, left: b.limit - spent, pct: b.limit ? spent / b.limit : 0 };
  });
}

export function totalBudget() {
  return state.budgets.reduce((s, b) => s + b.limit, 0);
}

export function savedThisYear() {
  let saved = 0;
  for (const t of state.transactions) {
    if (String(t.date).startsWith("2026")) saved += t.amount;
  }
  return saved;
}

export function monthlySeries() {
  const months = [...new Set(state.transactions.map((t) => monthOf(t.date)))].sort();
  return months.map((ym) => ({ month: ym, ...monthTotals(ym) }));
}

export function biggestExpenses(ym, n = 5) {
  return monthTx(ym)
    .filter((t) => t.amount < 0)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, n);
}

// ---- bills ----

export function billStatus(bill, ym) {
  const [y, m] = ym.split("-").map(Number);
  const due = new Date(y, m - 1, Math.min(bill.day, 28));
  const paid = bill.paid.includes(ym);
  const today = new Date(2026, 10, 26); // demo "today": 26 Nov 2026
  const daysLeft = Math.round((due - today) / 86400000);
  return { ...bill, due, paid, daysLeft };
}

export function upcomingBills(ym) {
  return state.bills
    .map((b) => billStatus(b, ym))
    .filter((b) => !b.paid)
    .sort((a, b) => a.due - b.due);
}

// ---- mutations (every one saves, so the whole site stays in sync) ----

export function addTransaction(tx) {
  const id = "t-" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  state.transactions.push({ id, ...tx });
  save();
  return id;
}

export function updateTransaction(id, patch) {
  const t = state.transactions.find((x) => x.id === id);
  if (!t) return false;
  Object.assign(t, patch);
  save();
  return true;
}

export function deleteTransaction(id) {
  state.transactions = state.transactions.filter((t) => t.id !== id);
  save();
}

export function setBudget(categoryId, limit) {
  const b = state.budgets.find((x) => x.category === categoryId);
  if (b) b.limit = limit;
  else state.budgets.push({ category: categoryId, limit });
  save();
}

export function toggleBillPaid(billId, ym) {
  const b = state.bills.find((x) => x.id === billId);
  if (!b) return;
  b.paid = b.paid.includes(ym) ? b.paid.filter((m) => m !== ym) : [...b.paid, ym];
  save();
}

export function addToGoal(goalId, amount) {
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return false;
  g.saved = Math.min(g.target, Math.max(0, g.saved + amount));
  save();
  return true;
}

export function addGoal(goal) {
  const id = "g-" + Date.now().toString(36);
  state.goals.push({ id, saved: 0, ...goal });
  save();
  return id;
}

// ---- export ----

export function toCSV(ym) {
  const rows = [["date", "name", "category", "amount"]];
  for (const t of monthTx(ym).slice().reverse()) {
    rows.push([t.date, `"${t.name.replace(/"/g, '""')}"`, category(t.category).name, t.amount.toFixed(2)]);
  }
  return rows.map((r) => r.join(",")).join("\n");
}
