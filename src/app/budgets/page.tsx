"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({ categoryId: "", amount: "", period: "monthly", month: now.getMonth() + 1, year: now.getFullYear() });

  async function load() {
    setLoading(true);
    const [bRes, cRes] = await Promise.all([
      fetch(`/api/budgets?month=${now.getMonth() + 1}&year=${now.getFullYear()}`),
      fetch("/api/categories?type=expense"),
    ]);
    setBudgets(await bRes.json());
    setCategories(await cRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function submit(e: any) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/budgets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setSaving(false);
    load();
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-sub">{now.toLocaleString("en-ZA", { month: "long", year: "numeric" })} · {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)} spent</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Set budget</button>
      </div>

      {/* Summary bar */}
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
          <p>No budgets set for this month.</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>Create your first budget</button>
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
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", color }}>{pct.toFixed(0)}%</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text2)" }}>used</div>
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

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Set budget</h2>
              <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
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
