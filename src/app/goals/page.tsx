"use client";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { differenceInDays } from "date-fns";

const ICONS = ["🎯","✈️","🏠","💻","🚗","💍","🎓","🏖️","💊","📱","🛡️","🎸","💰","🏦","🌿","🎁"];
const COLORS = ["#7c6af7","#22c55e","#3b82f6","#f59e0b","#ef4444","#ec4899","#06b6d4","#8b5cf6","#10b981","#f97316"];
const EMPTY = { name: "", targetAmount: "", savedAmount: "", targetDate: "", icon: "🎯", color: "#7c6af7" };

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [topUpModal, setTopUpModal] = useState<any>(null);
  const [withdrawModal, setWithdrawModal] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/goals");
    setGoals(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(g: any) {
    setEditingId(g.id);
    setForm({
      name: g.name,
      targetAmount: String(g.targetAmount),
      savedAmount: String(g.savedAmount),
      targetDate: new Date(g.targetDate).toISOString().split("T")[0],
      icon: g.icon,
      color: g.color,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY);
  }

  async function submit(e: any) {
    e.preventDefault();
    setSaving(true);
    if (editingId) {
      await fetch(`/api/goals/${editingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/goals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    closeModal();
    setSaving(false);
    load();
  }

  async function topUp(e: any) {
    e.preventDefault();
    setSaving(true);
    const newAmount = topUpModal.savedAmount + parseFloat(topUpAmount);
    await fetch(`/api/goals/${topUpModal.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ savedAmount: newAmount }),
    });
    setTopUpModal(null);
    setTopUpAmount("");
    setSaving(false);
    load();
  }

  async function withdraw(e: any) {
    e.preventDefault();
    setSaving(true);
    const newAmount = Math.max(0, withdrawModal.savedAmount - parseFloat(withdrawAmount));
    await fetch(`/api/goals/${withdrawModal.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ savedAmount: newAmount }),
    });
    setWithdrawModal(null);
    setWithdrawAmount("");
    setSaving(false);
    load();
  }

  async function deleteGoal(id: string) {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    load();
  }

  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Savings Goals</h1>
          <p className="page-sub">{goals.length} goals · {formatCurrency(totalSaved)} saved of {formatCurrency(totalTarget)}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New goal</button>
      </div>

      {loading ? (
        <div className="data-grid grid-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 180 }} />)}</div>
      ) : goals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text2)" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎯</div>
          <p>No goals yet. Create your first savings goal!</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openCreate}>Create a goal</button>
        </div>
      ) : (
        <div className="data-grid grid-2">
          {goals.map((g: any) => {
            const pct = Math.min((g.savedAmount / g.targetAmount) * 100, 100);
            const daysLeft = differenceInDays(new Date(g.targetDate), new Date());
            const remaining = g.targetAmount - g.savedAmount;
            const monthlyNeeded = daysLeft > 0 ? (remaining / (daysLeft / 30)) : 0;
            const done = pct >= 100;

            return (
              <div key={g.id} className="card card-lg" style={{ borderTop: `3px solid ${g.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 28 }}>{g.icon}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "1rem" }}>{g.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text2)" }}>
                        {done ? "🎉 Goal reached!" : `${daysLeft > 0 ? daysLeft + " days left" : "Overdue"}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: "0.75rem" }} onClick={() => openEdit(g)}>Edit</button>
                    <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: "0.75rem" }} onClick={() => deleteGoal(g.id)}>✕</button>
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 6 }}>
                    <span style={{ color: "var(--text2)" }}>Progress</span>
                    <span style={{ fontWeight: 600, color: g.color }}>{pct.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 10 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: g.color }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: "var(--bg3)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text2)", marginBottom: 3 }}>Saved</div>
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: g.color }}>{formatCurrency(g.savedAmount)}</div>
                  </div>
                  <div style={{ background: "var(--bg3)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text2)", marginBottom: 3 }}>Target</div>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{formatCurrency(g.targetAmount)}</div>
                  </div>
                </div>

                {!done && (
                  <div style={{ fontSize: "0.78rem", color: "var(--text2)", marginBottom: 12, padding: "8px 10px", background: "var(--bg3)", borderRadius: 8 }}>
                    Save <strong style={{ color: "var(--text1)" }}>{formatCurrency(monthlyNeeded)}/mo</strong> to reach goal by {formatDate(g.targetDate)}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => { setTopUpModal(g); setTopUpAmount(""); }}>
                    + Add funds
                  </button>
                  {g.savedAmount > 0 && (
                    <button className="btn btn-ghost" style={{ padding: "0.55rem 0.9rem" }}
                      onClick={() => { setWithdrawModal(g); setWithdrawAmount(""); }}>
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>{editingId ? "Edit goal" : "New savings goal"}</h2>
              <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Goal name</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Holiday fund" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Target amount (ZAR)</label>
                  <input type="number" min="0" required value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Already saved (ZAR)</label>
                  <input type="number" min="0" value={form.savedAmount} onChange={e => setForm({ ...form, savedAmount: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Target date</label>
                <input type="date" required value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Icon</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setForm({ ...form, icon })}
                      style={{ width: 36, height: 36, fontSize: 18, border: `2px solid ${form.icon === icon ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, background: "var(--bg3)", cursor: "pointer" }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setForm({ ...form, color })}
                      style={{ width: 24, height: 24, borderRadius: "50%", background: color, border: `3px solid ${form.color === color ? "var(--text1)" : "transparent"}`, cursor: "pointer" }} />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Create goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {topUpModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setTopUpModal(null)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem" }}>Add funds to "{topUpModal.name}"</h2>
            <form onSubmit={topUp}>
              <div className="form-group">
                <label className="form-label">Amount to add (ZAR)</label>
                <input type="number" min="1" required autoFocus value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} placeholder="500" />
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text2)", marginBottom: "1rem" }}>
                Current: {formatCurrency(topUpModal.savedAmount)} → New: {formatCurrency(topUpModal.savedAmount + (parseFloat(topUpAmount) || 0))}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setTopUpModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Add funds"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {withdrawModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setWithdrawModal(null)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem" }}>Withdraw from "{withdrawModal.name}"</h2>
            <form onSubmit={withdraw}>
              <div className="form-group">
                <label className="form-label">Amount to withdraw (ZAR)</label>
                <input type="number" min="1" max={withdrawModal.savedAmount} required autoFocus value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="500" />
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text2)", marginBottom: "1rem" }}>
                Current: {formatCurrency(withdrawModal.savedAmount)} → New: {formatCurrency(Math.max(0, withdrawModal.savedAmount - (parseFloat(withdrawAmount) || 0)))}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setWithdrawModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Withdraw"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
