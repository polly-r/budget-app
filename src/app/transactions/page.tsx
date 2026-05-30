"use client";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Category { id: string; name: string; icon: string; color: string; type: string; }
interface Transaction { id: string; amount: number; description: string; date: string; type: string; category: Category; recurring: boolean; }

const EMPTY_FORM = { amount: "", description: "", date: new Date().toISOString().split("T")[0], type: "expense", categoryId: "", recurring: false };

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  async function load() {
    setLoading(true);
    const [txRes, catRes] = await Promise.all([
      fetch(`/api/transactions?month=${month}&year=${year}`),
      fetch("/api/categories"),
    ]);
    setTransactions(await txRes.json());
    setCategories(await catRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [month]);

  async function submit(e: any) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/transactions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setForm(EMPTY_FORM);
    setSaving(false);
    load();
  }

  async function deleteTransaction(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    load();
  }

  const filtered = transactions.filter(t =>
    (filter === "all" || t.type === filter) &&
    (search === "" || t.description.toLowerCase().includes(search.toLowerCase()) || t.category.name.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredCats = categories.filter(c => form.type ? c.type === form.type : true);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-sub">{filtered.length} transactions · {new Date(year, month - 1).toLocaleString("en-ZA", { month: "long", year: "numeric" })}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add transaction</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input type="text" placeholder="Search transactions…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ width: "auto" }}>
            {months.map((m, i) => <option key={i} value={i + 1}>{m} {year}</option>)}
          </select>
          <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
            {(["all","income","expense"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className="btn btn-ghost"
                style={{ background: filter === f ? "var(--bg3)" : undefined, color: filter === f ? "var(--text1)" : undefined, padding: "0.45rem 0.9rem", fontSize: "0.8rem", textTransform: "capitalize" }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 52 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text2)" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>💸</div>
            No transactions found
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Date","Description","Category","Type","Amount",""].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: h === "Amount" ? "right" : "left", fontSize: "0.75rem", color: "var(--text2)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg3)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "10px", fontSize: "0.8rem", color: "var(--text2)", whiteSpace: "nowrap" }}>{formatDate(t.date)}</td>
                  <td style={{ padding: "10px", fontSize: "0.875rem", fontWeight: 500 }}>
                    {t.description}
                    {t.recurring && <span style={{ fontSize: "0.65rem", background: "var(--bg4)", color: "var(--text2)", borderRadius: 4, padding: "1px 5px", marginLeft: 6 }}>recurring</span>}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.8rem" }}>
                      {t.category.icon} {t.category.name}
                    </span>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <span className={`badge badge-${t.type}`}>{t.type}</span>
                  </td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: 600, fontSize: "0.9rem", color: t.type === "income" ? "var(--green)" : "var(--text1)" }}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <button className="btn btn-danger" style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                      onClick={() => deleteTransaction(t.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Add transaction</h2>
              <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, categoryId: "" })}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (ZAR)</label>
                  <input type="number" min="0" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input type="text" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What was this for?" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">Select category</option>
                    {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <input type="checkbox" id="recurring" checked={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.checked })} style={{ width: "auto" }} />
                <label htmlFor="recurring" style={{ fontSize: "0.875rem", cursor: "pointer" }}>Recurring transaction</label>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Add transaction"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
