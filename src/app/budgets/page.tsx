"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function BudgetsPage() {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rolloverNotice, setRolloverNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ categoryId: "", amount: "", period: "monthly" });
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [editAmount, setEditAmount] = useState("");

  const isCurrentMonth = viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();
  const isFutureMonth = new Date(viewYear, viewMonth - 1, 1) > new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleString("en-ZA", { month: "long", year: "numeric" });

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (isFutureMonth) return;
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  async function load() {
    setLoading(true);
    const currentMonth = viewMonth;
    const currentYear = viewYear;
    const currentIsNow = currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear();

    const [bRes, cRes] = await Promise.all([
      fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`),
      fetch("/api/categories?type=expense"),
    ]);
    const [budgetData, catData] = await Promise.all([bRes.json(), cRes.json()]);
    setCategories(catData);

    if (budgetData.length === 0 && currentIsNow) {
      const rollRes = await fetch("/api/rollover/budgets", { method: "POST" });
      const rollData = await rollRes.json();
      if (rollData.created > 0) {
        setRolloverNotice(`${rollData.created} budget${rollData.created !== 1 ? "s" : ""} carried over from last month`);
        const refreshed = await fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`);
        setBudgets(await refreshed.json());
        setLoading(false);
        return;
      }
    }

    setBudgets(budgetData);
    setLoading(false);
  }

  useEffect(() => { load(); }, [viewMonth, viewYear]);

  async function submit(e: any) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/budgets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, month: viewMonth, year: viewYear }),
    });
    setShowModal(false);
    setForm({ categoryId: "", amount: "", period: "monthly" });
    setSaving(false);
    load();
  }

  async function updateBudget(e: any) {
    e.preventDefault();
    await fetch(`/api/budgets/${editingBudget.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: editAmount }),
    });
    setEditingBudget(null);
    load();
  }

  async function deleteBudget(id: string) {
    if (!confirm("Remove this budget?")) return;
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    load();
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Budgets</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <button className="btn btn-ghost" style={{ padding: "1px 8px", fontSize: "1.1rem", lineHeight: 1 }} onClick={prevMonth}>‹</button>
            <p className="page-sub" style={{ margin: 0 }}>{monthLabel} · {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)} spent</p>
            <button className="btn btn-ghost" style={{ padding: "1px 8px", fontSize: "1.1rem", lineHeight: 1 }} onClick={nextMonth} disabled={isCurrentMonth}>›</button>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Set budget</button>
      </div>

      {rolloverNotice && (
        <div style={{
          marginBottom: 16, padding: "0.65rem 1rem",
          background: "rgba(124,106,247,0.1)", border: "1px solid rgba(124,106,247,0.2)",
          borderRadius: "var(--radius-sm)", fontSize: "0.82rem", color: "var(--accent)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          ✓ {rolloverNotice}
          <button onClick={() => setRolloverNotice(null)} style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.875rem" }}>
          <span>Total monthly budget used</span>
          <span style={{ fontWeight: 600 }}>{totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}%</span>
        </div>
        <div className="progress-bar" style={{ height: 10 }}>
          <div className="progress-fill" style={{
            width: `${Math.min(totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0, 100)}%`,
            background: "var(--accent)"
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: "0.78rem", color: "var(--text2)" }}>
          <span>Spent: {formatCurrency(totalSpent)}</span>
          <span>Remaining: {formatCurrency(totalBudget - totalSpent)}</span>
        </div>
      </div>

      {loading ? (
        <div className="data-grid grid-2">{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}</div>
      ) : budgets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text2)" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
          <p>No budgets set for {monthLabel}.</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>Set a budget</button>
        </div>
      ) : (
        <div className="data-grid grid-2">
          {budgets.map((b: any) => {
            const pct = b.percentage;
            const color = pct > 90 ? "var(--red)" : pct > 70 ? "var(--amber)" : "var(--green)";
            return (
              <div key={b.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 22 }}>{b.category.icon}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{b.category.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text2)", textTransform: "capitalize" }}>{b.period}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: "1.1rem", color }}>{pct.toFixed(0)}%</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text2)" }}>used</div>
                    </div>
                    <button className="btn btn-ghost" style={{ padding: "3px 7px", fontSize: "0.75rem" }} onClick={() => { setEditingBudget(b); setEditAmount(String(b.amount)); }}>Edit</button>
                    <button className="btn btn-ghost" style={{ padding: "3px 7px", fontSize: "0.75rem" }} onClick={() => deleteBudget(b.id)}>✕</button>
                  </div>
                </div>
                <div className="progress-bar" style={{ marginBottom: 8, height: 8 }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span style={{ color: "var(--text2)" }}>Spent: <strong style={{ color: "var(--text1)" }}>{formatCurrency(b.spent)}</strong></span>
                  <span style={{ color: "var(--text2)" }}>Budget: <strong style={{ color: "var(--text1)" }}>{formatCurrency(b.amount)}</strong></span>
                </div>
                {pct > 90 && (
                  <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(239,68,68,0.1)", borderRadius: 6, fontSize: "0.75rem", color: "var(--red)" }}>
                    ⚠️ Over budget by {formatCurrency(b.spent - b.amount)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingBudget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingBudget(null)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>
                {editingBudget.category.icon} Edit {editingBudget.category.name} budget
              </h2>
              <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setEditingBudget(null)}>✕</button>
            </div>
            <form onSubmit={updateBudget}>
              <div className="form-group">
                <label className="form-label">Budget amount (ZAR)</label>
                <input type="number" min="0" step="100" required autoFocus value={editAmount} onChange={e => setEditAmount(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingBudget(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Set budget · {monthLabel}</h2>
              <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Select category</option>
                  {categories.filter((c: any) => !c.parentId).map((c: any) =>
                    c.children?.length > 0 ? (
                      <optgroup key={c.id} label={`${c.icon} ${c.name}`}>
                        <option value={c.id}>{c.icon} {c.name} (general)</option>
                        {c.children.map((ch: any) => <option key={ch.id} value={ch.id}>↳ {ch.icon} {ch.name}</option>)}
                      </optgroup>
                    ) : (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    )
                  )}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Budget amount (ZAR)</label>
                  <input type="number" min="0" step="100" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Period</label>
                  <select value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save budget"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
