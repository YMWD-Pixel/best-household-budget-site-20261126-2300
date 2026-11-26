// NestEgg views: each one returns the HTML for a section and draws its
// charts after it lands in the page. All figures come from store.js.

import {
  store, category, money, signedMoney, monthLabel, shortDate, monthTx,
  monthTotals, spentByCategory, budgetStatus, totalBudget, savedThisYear,
  monthlySeries, biggestExpenses, billStatus, upcomingBills,
} from "./store.js";
import { drawDonut, drawBars, drawTrend } from "./charts.js";

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function txRow(t, withActions) {
  const c = category(t.category);
  return `<li>
    <span class="tx-dot" style="background:${c.color}" aria-hidden="true">${c.icon}</span>
    <span><span class="tx-name">${esc(t.name)}</span><br>
    <span class="tx-meta">${shortDate(t.date)} · ${esc(c.name)}</span></span>
    <span class="tx-amt ${t.amount > 0 ? "in" : "out"}">${signedMoney(t.amount)}</span>
    ${withActions ? `<span class="tx-actions">
      <button class="icon-btn" type="button" data-edit-tx="${t.id}">Edit</button>
      <button class="icon-btn" type="button" data-del-tx="${t.id}" aria-label="Delete ${esc(t.name)}">✕</button>
    </span>` : ""}
  </li>`;
}

// ---------------- Dashboard ----------------

export function renderDashboard(ym) {
  const totals = monthTotals(ym);
  const byCat = spentByCategory(ym);
  const budgets = budgetStatus(ym).sort((a, b) => b.pct - a.pct);
  const recent = monthTx(ym).slice(0, 6);
  const upcoming = upcomingBills(ym).slice(0, 4);
  const over = budgets.filter((b) => b.pct >= 1);
  const daily = totals.spent / 26; // demo "today" is 26 Nov
  const budgetTotal = totalBudget();

  return `
  <div class="view-head">
    <div><h1>November, at a glance</h1>
    <p class="view-sub">The Alvarez household — what came in, what went out, and what is left before the month turns.</p></div>
    ${over.length ? `<span class="pill warn">${over.length} budget${over.length > 1 ? "s" : ""} over</span>` : `<span class="pill">All budgets on track</span>`}
  </div>

  <div class="grid grid-3">
    <section class="card"><div class="kpi-label">Money in · ${monthLabel(ym)}</div>
      <div class="kpi-value">${money(totals.income)}</div>
      <div class="kpi-note">Salaries plus <b>$420</b> freelance work</div></section>
    <section class="card"><div class="kpi-label">Money out · ${monthLabel(ym)}</div>
      <div class="kpi-value neg">${money(totals.spent)}</div>
      <div class="kpi-note">About <b>${money(daily)} a day</b> so far · budget ${money(budgetTotal)}</div></section>
    <section class="card"><div class="kpi-label">Left to save</div>
      <div class="kpi-value">${money(totals.saved)}</div>
      <div class="kpi-note">${totals.saved >= 0 ? "On pace for the emergency fund" : "Spending ahead of income — check Budgets"}</div></section>
  </div>

  <div class="grid grid-2wide" style="margin-top:1rem">
    <section class="card">
      <h2>Where November's money went</h2>
      <div class="chart-wrap">
        <canvas id="donut" width="220" height="220" role="img" aria-label="Donut chart of spending by category"></canvas>
        <ul class="legend">
          ${byCat.slice(0, 6).map((c) => `<li><span class="sw" style="background:${c.color}"></span>${esc(c.name)}<span class="amt">${money(c.amount)}</span></li>`).join("")}
        </ul>
      </div>
      <p class="small muted">Housing is the biggest slice, as it should be — the mortgage is fixed, so the money you can move is in the slices after it.</p>
    </section>

    <section class="card">
      <h2>Budgets closest to the edge</h2>
      ${budgets.slice(0, 4).map((b) => `
        <div class="budget-row">
          <span class="budget-name">${esc(b.name)}</span>
          <span class="budget-fig"><b>${money(b.spent)}</b> of ${money(b.limit)}</span>
          <span class="bar ${b.pct >= 1 ? "over" : b.pct >= 0.8 ? "warn" : ""}" role="progressbar" aria-valuenow="${Math.round(b.pct * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(b.name)} budget used"><i style="width:${Math.min(100, b.pct * 100)}%"></i></span>
        </div>`).join("")}
      <p style="margin-top:0.8rem"><a href="#/budgets">See all budgets →</a></p>
    </section>
  </div>

  <div class="grid grid-2" style="margin-top:1rem">
    <section class="card">
      <h2>Recent transactions</h2>
      <ul class="tx-list">${recent.map((t) => txRow(t, false)).join("") || `<li class="empty">No transactions this month yet.</li>`}</ul>
      <p style="margin-top:0.8rem"><a href="#/transactions">All transactions →</a></p>
    </section>
    <section class="card">
      <h2>Bills still to pay</h2>
      ${upcoming.length ? upcoming.map((b) => `
        <div class="bill-row">
          <span><b>${esc(b.name)}</b><br><span class="due ${b.daysLeft <= 5 ? "soon" : ""}">${b.daysLeft < 0 ? "Overdue" : b.daysLeft === 0 ? "Due today" : "Due in " + b.daysLeft + " days"} · ${b.due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${b.autopay ? " · autopay on" : ""}</span></span>
          <span class="goal-fig"><b>${money(b.amount)}</b></span>
        </div>`).join("") : `<p class="empty">Every bill this month is paid. 🎉</p>`}
      <p style="margin-top:0.8rem"><a href="#/bills">Bills &amp; goals →</a></p>
    </section>
  </div>`;
}

export function drawDashboard(ym) {
  const byCat = spentByCategory(ym);
  const totals = monthTotals(ym);
  const canvas = document.getElementById("donut");
  if (canvas) {
    drawDonut(canvas, byCat.slice(0, 6), {
      centerTop: money(totals.spent),
      centerBottom: "spent in " + monthLabel(ym).split(" ")[0],
    });
  }
}

// ---------------- Transactions ----------------

export function renderTransactions(ym, filter) {
  let list = monthTx(ym);
  const q = (filter.q || "").toLowerCase();
  if (filter.kind === "in") list = list.filter((t) => t.amount > 0);
  if (filter.kind === "out") list = list.filter((t) => t.amount < 0);
  if (filter.cat) list = list.filter((t) => t.category === filter.cat);
  if (q) list = list.filter((t) => t.name.toLowerCase().includes(q) || category(t.category).name.toLowerCase().includes(q));
  const income = list.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const spent = list.filter((t) => t.amount < 0).reduce((s, t) => s + -t.amount, 0);

  return `
  <div class="view-head">
    <div><h1>Transactions</h1>
    <p class="view-sub">Every dollar in and out for ${monthLabel(ym)} — add one, fix a typo, or take one out. The totals below follow your filters.</p></div>
    <button class="btn btn-primary" type="button" data-open-add>+ Add transaction</button>
  </div>

  <div class="filters" role="search">
    <select id="fKind" aria-label="Money in or out">
      <option value="" ${!filter.kind ? "selected" : ""}>In &amp; out</option>
      <option value="in" ${filter.kind === "in" ? "selected" : ""}>Money in</option>
      <option value="out" ${filter.kind === "out" ? "selected" : ""}>Money out</option>
    </select>
    <select id="fCat" aria-label="Category">
      <option value="">All categories</option>
      ${store.transactions.length ? [...new Set(store.transactions.map((t) => t.category))].map((id) => `<option value="${id}" ${filter.cat === id ? "selected" : ""}>${esc(category(id).name)}</option>`).join("") : ""}
    </select>
    <input type="search" id="fQ" placeholder="Search — try “GreenMart”" value="${esc(filter.q || "")}" aria-label="Search transactions">
  </div>

  <section class="card">
    <div class="kpi-note" style="margin-bottom:0.6rem"><b>${list.length}</b> transactions · in <b>${money(income)}</b> · out <b>${money(spent)}</b></div>
    <ul class="tx-list">
      ${list.map((t) => txRow(t, true)).join("") || `<li class="empty">Nothing matches those filters. <button class="linklike" type="button" data-clear-filters>Clear filters</button></li>`}
    </ul>
  </section>`;
}

// ---------------- Budgets ----------------

export function renderBudgets(ym) {
  const budgets = budgetStatus(ym).sort((a, b) => b.pct - a.pct);
  const total = monthTotals(ym);
  const budgetTotal = totalBudget();
  const spentTotal = budgets.reduce((s, b) => s + b.spent, 0);

  return `
  <div class="view-head">
    <div><h1>Budgets for ${monthLabel(ym)}</h1>
    <p class="view-sub">A budget is a plan you can still change. Tap a number to raise or lower it — the dashboard and reports follow at once.</p></div>
    <span class="pill">${money(spentTotal)} of ${money(budgetTotal)} planned spending</span>
  </div>

  <div class="grid grid-2">
    <section class="card">
      <h2>By category</h2>
      ${budgets.map((b) => `
        <div class="budget-row">
          <span class="budget-name">${esc(b.name)}</span>
          <span class="budget-fig"><b>${money(b.spent)}</b> of ${money(b.limit)} · ${b.left >= 0 ? money(b.left) + " left" : money(-b.left) + " over"}</span>
          <span class="bar ${b.pct >= 1 ? "over" : b.pct >= 0.8 ? "warn" : ""}" role="progressbar" aria-valuenow="${Math.round(b.pct * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(b.name)} budget used"><i style="width:${Math.min(100, b.pct * 100)}%"></i></span>
          <span><button class="linklike small" type="button" data-edit-budget="${b.category}">Change limit</button></span>
        </div>`).join("")}
    </section>

    <section class="card">
      <h2>How the month is shaping up</h2>
      <canvas id="budgetBars" width="560" height="240" class="chart" role="img" aria-label="Bar chart of spending by category"></canvas>
      <h3 style="margin-top:1.2rem">Three rules this household keeps</h3>
      <ul>
        <li><b>Groceries first.</b> The weekly shop is the one number we never borrow from — a hungry week costs more than a planned one.</li>
        <li><b>Dining out is the flex.</b> When a category runs hot, takeout is the first thing to pause, not the kids' bus passes.</li>
        <li><b>Leftovers roll forward.</b> Money unspent in a category this month is next month's head start, not a reason to spend it.</li>
      </ul>
      <p class="small muted">Budgeted ${money(budgetTotal)} against ${money(total.income)} coming in — the gap, ${money(total.income - budgetTotal)}, is what the goals below are for.</p>
    </section>
  </div>`;
}

export function drawBudgets(ym) {
  const canvas = document.getElementById("budgetBars");
  if (!canvas) return;
  const rows = spentByCategory(ym).slice(0, 7);
  drawBars(canvas, rows.map((r) => ({ label: r.name.split(" ")[0], value: r.amount, color: r.color })));
}

// ---------------- Bills & Goals ----------------

export function renderBills(ym) {
  const bills = store.bills.map((b) => billStatus(b, ym)).sort((a, b) => a.due - b.due);
  const dueTotal = bills.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);
  const goals = store.goals;
  const saved = savedThisYear();

  return `
  <div class="view-head">
    <div><h1>Bills &amp; goals</h1>
    <p class="view-sub">The fixed costs, ticked off as they are paid — and the things the family is saving for, one deposit at a time.</p></div>
    <span class="pill">${money(dueTotal)} still due in ${monthLabel(ym)}</span>
  </div>

  <div class="grid grid-2">
    <section class="card">
      <h2>Recurring bills — ${monthLabel(ym)}</h2>
      ${bills.map((b) => `
        <div class="bill-row">
          <span><b>${esc(b.name)}</b><br>
          <span class="due ${!b.paid && b.daysLeft <= 5 ? "soon" : ""}">${b.paid ? "Paid ✓" : b.daysLeft < 0 ? "Overdue" : b.daysLeft === 0 ? "Due today" : "Due in " + b.daysLeft + " days"} · ${b.due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${b.autopay ? " · autopay" : ""}</span></span>
          <span class="goal-fig"><b>${money(b.amount)}</b><br>
          <button class="linklike small" type="button" data-toggle-bill="${b.id}">${b.paid ? "Mark unpaid" : "Mark paid"}</button></span>
        </div>`).join("")}
      <p class="small muted">Autopay bills are marked paid on their due day. Untick one if a payment bounced — the dashboard will show it as still due.</p>
    </section>

    <section class="card">
      <h2>Savings goals</h2>
      <p class="small muted">Saved across the whole household this year: <b>${money(saved)}</b></p>
      ${goals.map((g) => {
        const pct = g.target ? g.saved / g.target : 0;
        const done = g.saved >= g.target;
        return `<div class="goal-row">
          <span><b>${esc(g.name)}</b>${done ? ` <span class="pill">Done ✓</span>` : ""}<br><span class="due">${esc(g.note)}</span></span>
          <span class="goal-fig"><b>${money(g.saved)}</b> of ${money(g.target)}</span>
          <span class="bar ${done ? "" : pct >= 0.8 ? "warn" : ""}" role="progressbar" aria-valuenow="${Math.round(pct * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(g.name)} progress"><i style="width:${Math.min(100, pct * 100)}%"></i></span>
          <span>${done ? `<span class="small muted">Fully funded.</span>` : `<button class="linklike small" type="button" data-add-goal="${g.id}">Add money</button>`}</span>
        </div>`;
      }).join("")}
      <p style="margin-top:0.9rem"><button class="btn btn-ghost btn-small" type="button" data-new-goal>＋ New goal</button></p>
    </section>
  </div>`;
}

// ---------------- Reports ----------------

export function renderReports(ym) {
  const series = monthlySeries();
  const totals = monthTotals(ym);
  const biggest = biggestExpenses(ym);
  const byCat = spentByCategory(ym);
  const daysIn = 26;
  const avgDay = totals.spent / daysIn;
  const topCat = byCat[0];

  return `
  <div class="view-head">
    <div><h1>Reports</h1>
    <p class="view-sub">Three months of the household's money, side by side — so a single expensive week can't pretend to be a trend.</p></div>
  </div>

  <div class="grid grid-3">
    <section class="card"><div class="kpi-label">Average day · ${monthLabel(ym)}</div>
      <div class="kpi-value">${money(avgDay)}</div>
      <div class="kpi-note">Across the first ${daysIn} days of the month</div></section>
    <section class="card"><div class="kpi-label">Biggest category</div>
      <div class="kpi-value" style="font-size:1.4rem">${topCat ? esc(topCat.name) : "—"}</div>
      <div class="kpi-note">${topCat ? money(topCat.amount) + " — " + Math.round((topCat.amount / totals.spent) * 100) + "% of all spending" : ""}</div></section>
    <section class="card"><div class="kpi-label">Saved this year</div>
      <div class="kpi-value">${money(savedThisYear())}</div>
      <div class="kpi-note">Income minus spending, Jan–Nov 2026</div></section>
  </div>

  <section class="card" style="margin-top:1rem">
    <h2>Income vs spending — last three months</h2>
    <p class="small muted">Bars are what went out; the amber line is what came in. October's bar runs past the line — the water heater.</p>
    <canvas id="trend" width="560" height="260" class="chart" role="img" aria-label="Income versus spending for the last three months"></canvas>
  </section>

  <div class="grid grid-2" style="margin-top:1rem">
    <section class="card">
      <h2>Biggest single expenses · ${monthLabel(ym)}</h2>
      <table class="data">
        <thead><tr><th>Date</th><th>What</th><th class="num">Amount</th></tr></thead>
        <tbody>
          ${biggest.map((t) => `<tr><td>${shortDate(t.date)}</td><td>${esc(t.name)}</td><td class="num">${money(-t.amount)}</td></tr>`).join("")}
        </tbody>
      </table>
      <p class="small muted">The mortgage tops the list every month — it is a bill, not a surprise. The one to watch is usually second.</p>
    </section>
    <section class="card">
      <h2>Where November went, in words</h2>
      <ul>
        <li><b>Housing (${money(byCat.find((c) => c.id === "housing")?.amount || 0)})</b> — fixed, and the reason the rest of the budget has to be honest.</li>
        <li><b>Groceries (${money(byCat.find((c) => c.id === "groceries")?.amount || 0)})</b> — five shops including the Thanksgiving run; the weekly average is holding at the plan.</li>
        <li><b>Transport (${money(byCat.find((c) => c.id === "transport")?.amount || 0)})</b> — insurance plus gas; the bus passes are the cheapest miles the family buys.</li>
        <li><b>Everything else combined (${money(byCat.filter((c) => !["housing", "groceries", "transport"].includes(c.id)).reduce((s, c) => s + c.amount, 0))})</b> — dining, kids, health, fun and the small stuff, each under its own budget.</li>
      </ul>
      <p class="small muted">Nothing here is a guess: every figure above is added up from the Transactions page, and you can change any of them there.</p>
    </section>
  </div>`;
}

export function drawReports() {
  const canvas = document.getElementById("trend");
  if (!canvas) return;
  const series = monthlySeries().map((s) => ({
    label: monthLabel(s.month).split(" ")[0].slice(0, 3),
    spent: s.spent,
    income: s.income,
  }));
  drawTrend(canvas, series);
}
