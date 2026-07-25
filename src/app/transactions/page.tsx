"use client";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

const ICONS = [
  "💼","🏠","🏥","🎓","🛡️","⚡","🏋️","🛒","⛽","🚗","🍽️","🍺",
  "📱","🔧","🛍️","🎬","💊","✈️","💰","🎯","🎸","💻","🏖️","💍",
  "🐾","🌿","☕","🍕","🎁","🏦","📚","🎮",
];
const COLORS = [
  "#7c6af7","#22c55e","#3b82f6","#f59e0b","#ef4444","#ec4899",
  "#06b6d4","#8b5cf6","#10b981","#f97316","#14b8a6","#eab308",
  "#0ea5e9","#a855f7","#78716c","#e879f9",
];

interface Category { id: string; name: string; icon: string; color: string; type: string; parentId: string | null; children: Category[]; }
interface Transaction { id: string; amount: number; description: string; date: string; type: string; category: Category; categoryId: string; recurring: boolean; autoTagged: boolean; confidence: number | null; }

const EMPTY_FORM = { amount: "", description: "", date: new Date().toISOString().split("T")[0], type: "expense", categoryId: "", recurring: false };
const EMPTY_CAT  = { name: "", icon: "💼", color: "#7c6af7" };

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Quick-add category state
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState<any>(EMPTY_CAT);
  const [savingCat, setSavingCat] = useState(false);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (isCurrentMonth) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  async function loadCategories() {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
  }

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

  useEffect(() => { load(); }, [month, year]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(t: Transaction) {
    setEditingId(t.id);
    setForm({
      amount: String(t.amount),
      description: t.description,
      date: t.date.slice(0, 10),
      type: t.type,
      categoryId: t.categoryId,
      recurring: t.recurring,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function submit(e: any) {
    e.preventDefault();
    setSaving(true);
    if (editingId) {
      await fetch(`/api/transactions/${editingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/transactions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    closeModal();
    setSaving(false);
    load();
  }

  async function submitCategory(e: any) {
    e.preventDefault();
    setSavingCat(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...catForm, type: form.type }),
    });
    const newCat = await res.json();
    await loadCategories();
    setForm((f: any) => ({ ...f, categoryId: newCat.id }));
    setShowCatModal(false);
    setCatForm(EMPTY_CAT);
    setSavingCat(false);
  }

  async function deleteTransaction(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    load();
  }

  function downloadCSV() {
    const headers = ["Date", "Description", "Category", "Type", "Amount (ZAR)", "Recurring"];
    const rows = filtered.map(t => [
      formatDate(t.date),
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.category.name}"`,
      t.type,
      t.amount.toFixed(2),
      t.recurring ? "Yes" : "No",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = transactions.filter(t =>
    (filter === "all" || t.type === filter) &&
    (search === "" || t.description.toLowerCase().includes(search.toLowerCase()) || t.category.name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalIncome = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpenses;

  const filteredCats = categories.filter(c => (form.type ? c.type === form.type : true) && !c.parentId);
  const monthLabel = new Date(year, month - 1).toLocaleString("en-ZA", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-sub">{filtered.length} transactions · {monthLabel}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!loading && filtered.length > 0 && (
            <button className="btn btn-ghost" onClick={downloadCSV}>↓ CSV</button>
          )}
          <button className="btn btn-primary" onClick={openCreate}>+ Add transaction</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input type="text" placeholder="Search transactions…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="btn btn-ghost" style={{ padding: "0.35rem 0.7rem", fontSize: "1rem", lineHeight: 1 }} onClick={prevMonth}>‹</button>
            <span style={{ fontSize: "0.85rem", color: "var(--text2)", minWidth: 110, textAlign: "center" }}>{monthLabel}</span>
            <button className="btn btn-ghost" style={{ padding: "0.35rem 0.7rem", fontSize: "1rem", lineHeight: 1 }} onClick={nextMonth} disabled={isCurrentMonth}>›</button>
          </div>
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

      {!loading && filtered.length > 0 && (
        <div className="card" style={{ marginBottom: 16, display: "flex", gap: 24, padding: "0.75rem 1.25rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text2)" }}>
            Income: <strong style={{ color: "var(--green)" }}>{formatCurrency(totalIncome)}</strong>
          </span>
          <span style={{ color: "var(--border2)", alignSelf: "center" }}>|</span>
          <span style={{ fontSize: "0.82rem", color: "var(--text2)" }}>
            Expenses: <strong style={{ color: "var(--red)" }}>{formatCurrency(totalExpenses)}</strong>
          </span>
          <span style={{ color: "var(--border2)", alignSelf: "center" }}>|</span>
          <span style={{ fontSize: "0.82rem", color: "var(--text2)" }}>
            Net: <strong style={{ color: net >= 0 ? "var(--green)" : "var(--red)" }}>{formatCurrency(net)}</strong>
          </span>
        </div>
      )}

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
                      {t.autoTagged && (
                        <span title={`Auto-tagged · ${t.confidence ? Math.round(t.confidence * 100) + "% confidence" : ""}`} style={{ fontSize: "0.6rem", background: "rgba(124,106,247,0.12)", color: "var(--accent)", borderRadius: 4, padding: "1px 5px", marginLeft: 2, letterSpacing: "0.03em" }}>auto</span>
                      )}
                    </span>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <span className={`badge badge-${t.type}`}>{t.type}</span>
                  </td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: 600, fontSize: "0.9rem", color: t.type === "income" ? "var(--green)" : "var(--text1)" }}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <button className="btn btn-ghost" style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                        onClick={() => openEdit(t)}>Edit</button>
                      <button className="btn btn-danger" style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                        onClick={() => deleteTransaction(t.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit transaction modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>{editingId ? "Edit transaction" : "Add transaction"}</h2>
              <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={closeModal}>✕</button>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Category</label>
                    <button
                      type="button"
                      onClick={() => { setCatForm(EMPTY_CAT); setShowCatModal(true); }}
                      style={{ fontSize: "0.72rem", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}
                    >
                      + new
                    </button>
                  </div>
                  <select required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">Select category</option>
                    {filteredCats.map(c =>
                      c.children.length > 0 ? (
                        <optgroup key={c.id} label={`${c.icon} ${c.name}`}>
                          <option value={c.id}>{c.icon} {c.name} (general)</option>
                          {c.children.map(ch => <option key={ch.id} value={ch.id}>↳ {ch.icon} {ch.name}</option>)}
                        </optgroup>
                      ) : (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      )
                    )}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <input type="checkbox" id="recurring" checked={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.checked })} style={{ width: "auto" }} />
                <label htmlFor="recurring" style={{ fontSize: "0.875rem", cursor: "pointer" }}>Recurring transaction</label>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Add transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick-add category modal (sits on top of the transaction modal) */}
      {showCatModal && (
        <div className="modal-overlay" style={{ zIndex: 200 }} onClick={e => e.target === e.currentTarget && setShowCatModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>
                New {form.type} category
              </h2>
              <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setShowCatModal(false)}>✕</button>
            </div>
            <form onSubmit={submitCategory}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={catForm.name}
                  onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="e.g. Pet Care"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Icon</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setCatForm({ ...catForm, icon })}
                      style={{
                        width: 34, height: 34, fontSize: 16,
                        border: `2px solid ${catForm.icon === icon ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: 8, background: "var(--bg3)", cursor: "pointer",
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCatForm({ ...catForm, color })}
                      style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: color,
                        border: `3px solid ${catForm.color === color ? "var(--text1)" : "transparent"}`,
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCatModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingCat}>
                  {savingCat ? "Creating…" : "Create & select"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
