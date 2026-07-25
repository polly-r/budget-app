"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

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

type Category = {
  id: string; name: string; icon: string; color: string;
  type: string; archived: boolean; parentId: string | null;
  children: Category[];
};

type FormState = { name: string; type: string; icon: string; color: string; parentId: string };
const EMPTY_FORM: FormState = { name: "", type: "expense", icon: "💼", color: "#7c6af7", parentId: "" };

type RecurringRule = {
  id: string; description: string; amount: number; type: string;
  categoryId: string; category: Category; dayOfMonth: number; active: boolean;
};
type RuleForm = { description: string; amount: string; type: string; categoryId: string; dayOfMonth: string };
const EMPTY_RULE: RuleForm = { description: "", amount: "", type: "expense", categoryId: "", dayOfMonth: "1" };

const DEFAULT_PROFILE = { name: "Demo User", city: "Durban, ZA" };

export default function SettingsPage() {
  // ── Category state ──────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Profile state ────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(DEFAULT_PROFILE);

  // ── Smart tagging state ──────────────────────────────────────────────────────
  const [tagStats, setTagStats] = useState<{ autoTaggedCount: number; memoryCount: number } | null>(null);
  const [tagging, setTagging] = useState(false);
  const [tagResult, setTagResult] = useState<string | null>(null);

  // ── ML classifier state ──────────────────────────────────────────────────────
  const [clfStats, setClfStats] = useState<{ exists: boolean; trainedAt?: string; trainedOn?: number; categoryCount?: number } | null>(null);
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState<string | null>(null);

  // ── Recurring rules state ────────────────────────────────────────────────────
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleForm>(EMPTY_RULE);
  const [savingRule, setSavingRule] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("budget_profile");
    if (stored) { const p = JSON.parse(stored); setProfile(p); setProfileForm(p); }
  }, []);

  useEffect(() => { load(); loadTagStats(); loadClfStats(); loadRules(); }, []);

  // ── Profile ──────────────────────────────────────────────────────────────────
  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem("budget_profile", JSON.stringify(profileForm));
    setProfile(profileForm);
    setEditingProfile(false);
    window.dispatchEvent(new Event("budget_profile_updated"));
  }

  // ── Categories ───────────────────────────────────────────────────────────────
  async function load() {
    setLoading(true);
    const res = await fetch("/api/categories?includeArchived=true");
    setCategories(await res.json());
    setLoading(false);
  }

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }
  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({ name: cat.name, type: cat.type, icon: cat.icon, color: cat.color, parentId: cat.parentId ?? "" });
    setShowModal(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, parentId: form.parentId || null };
    if (editing) {
      await fetch(`/api/categories/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setShowModal(false);
    setSaving(false);
    load();
  }

  async function toggleArchive(cat: Category) {
    await fetch(`/api/categories/${cat.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived: !cat.archived }) });
    load();
  }

  async function deleteCategory(cat: Category) {
    if (!confirm(`Delete "${cat.name}"?`)) return;
    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.archived) {
      setNotice(`"${cat.name}" has existing transactions and was archived instead of deleted.`);
      setTimeout(() => setNotice(null), 5000);
    }
    load();
  }

  // ── Smart tagging ─────────────────────────────────────────────────────────────
  async function loadTagStats() {
    const res = await fetch("/api/categorise/batch");
    if (res.ok) setTagStats(await res.json());
  }

  async function runBatchTag() {
    setTagging(true); setTagResult(null);
    const res = await fetch("/api/categorise/batch", { method: "POST" });
    const data = await res.json();
    setTagResult(`Tagged ${data.updated} transaction${data.updated !== 1 ? "s" : ""} (${data.scanned} scanned)`);
    setTagging(false);
    loadTagStats();
  }

  // ── ML classifier ─────────────────────────────────────────────────────────────
  async function loadClfStats() {
    const res = await fetch("/api/classifier/retrain");
    if (res.ok) setClfStats(await res.json());
  }

  async function retrain() {
    setRetraining(true); setRetrainResult(null);
    const res = await fetch("/api/classifier/retrain", { method: "POST" });
    const data = await res.json();
    setRetrainResult(res.ok
      ? `Trained on ${data.trainedOn} transactions · ${data.categoryCount} categories`
      : (data.error ?? "Training failed"));
    setRetraining(false);
    loadClfStats();
  }

  // ── Recurring rules ───────────────────────────────────────────────────────────
  async function loadRules() {
    const res = await fetch("/api/recurring/rules");
    if (res.ok) setRules(await res.json());
  }

  async function loadSuggestions() {
    const res = await fetch("/api/recurring/suggestions");
    if (res.ok) setSuggestions(await res.json());
  }

  function openRuleCreate() {
    setEditingRule(null);
    setRuleForm(EMPTY_RULE);
    setShowRuleModal(true);
    loadSuggestions();
  }

  function openRuleEdit(rule: RecurringRule) {
    setEditingRule(rule);
    setRuleForm({
      description: rule.description,
      amount: String(rule.amount),
      type: rule.type,
      categoryId: rule.categoryId,
      dayOfMonth: String(rule.dayOfMonth),
    });
    setShowRuleModal(true);
  }

  async function submitRule(e: React.FormEvent) {
    e.preventDefault();
    setSavingRule(true);
    if (editingRule) {
      await fetch(`/api/recurring/rules/${editingRule.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ruleForm),
      });
    } else {
      await fetch("/api/recurring/rules", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ruleForm),
      });
    }
    setShowRuleModal(false);
    setSavingRule(false);
    setEditingRule(null);
    setRuleForm(EMPTY_RULE);
    loadRules();
  }

  async function toggleRuleActive(rule: RecurringRule) {
    await fetch(`/api/recurring/rules/${rule.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !rule.active }),
    });
    loadRules();
  }

  async function deleteRule(rule: RecurringRule) {
    if (!confirm(`Delete recurring rule "${rule.description}"? This won't delete any transactions already created.`)) return;
    await fetch(`/api/recurring/rules/${rule.id}`, { method: "DELETE" });
    loadRules();
  }

  function applySuggestion(sugg: any) {
    setRuleForm(f => ({ ...f, description: sugg.description, amount: String(sugg.amount), type: sugg.type, categoryId: sugg.categoryId, dayOfMonth: String(sugg.dayOfMonth) }));
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const income = categories.filter(c => c.type === "income" && !c.archived && !c.parentId);
  const expense = categories.filter(c => c.type === "expense" && !c.archived && !c.parentId);
  const archived = categories.filter(c => c.archived);
  const parentOptions = categories.filter(c => c.type === form.type && !c.archived && !c.parentId && c.id !== editing?.id);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Manage your income and expense categories</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New category</button>
      </div>

      {/* ── Profile ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text2)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Profile</div>
        <div className="card">
          {editingProfile ? (
            <form onSubmit={saveProfile}>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Name</label>
                  <input type="text" required value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} placeholder="Your name" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">City / Location</label>
                  <input type="text" value={profileForm.city} onChange={e => setProfileForm({ ...profileForm, city: e.target.value })} placeholder="e.g. Durban, ZA" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setEditingProfile(false); setProfileForm(profile); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save profile</button>
              </div>
            </form>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{profile.name}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text2)", marginTop: 2 }}>{profile.city} · ZAR</div>
              </div>
              <button className="btn btn-ghost" style={{ fontSize: "0.8rem" }} onClick={() => setEditingProfile(true)}>Edit</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Smart tagging ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text2)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Smart tagging</div>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: "0.9rem", marginBottom: 4 }}>Auto-categorise transactions</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text2)" }}>
                {tagStats ? `${tagStats.autoTaggedCount} auto-tagged · ${tagStats.memoryCount} merchants learned` : "Scans uncategorised and previously auto-tagged transactions"}
              </div>
            </div>
            <button className="btn btn-primary" style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }} onClick={runBatchTag} disabled={tagging}>
              {tagging ? "Tagging…" : "Re-tag all untagged"}
            </button>
          </div>
          {tagResult && <div style={{ marginTop: 10, fontSize: "0.8rem", color: "var(--accent)" }}>✓ {tagResult}</div>}
        </div>
      </div>

      {/* ── ML Classifier ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text2)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>ML Classifier</div>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: "0.9rem", marginBottom: 4 }}>Naïve Bayes classifier</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text2)" }}>
                {clfStats === null ? "Checking…"
                  : clfStats.exists
                  ? `Trained on ${clfStats.trainedOn} transactions · ${clfStats.categoryCount} categories · ${new Date(clfStats.trainedAt!).toLocaleDateString("en-ZA")}`
                  : "Not trained yet — click Retrain to build the model from your data"}
              </div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }} onClick={retrain} disabled={retraining}>
              {retraining ? "Training…" : "Retrain model"}
            </button>
          </div>
          {retrainResult && (
            <div style={{ marginTop: 10, fontSize: "0.8rem", color: retrainResult.startsWith("Trained") ? "var(--accent)" : "var(--red)" }}>
              {retrainResult.startsWith("Trained") ? "✓ " : "✗ "}{retrainResult}
            </div>
          )}
        </div>
      </div>

      {/* ── Recurring transactions ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Recurring transactions</div>
          <button
            onClick={openRuleCreate}
            style={{
              background: "none", border: "none", color: "var(--accent)", cursor: "pointer",
              fontSize: "0.8rem", fontWeight: 500, fontFamily: "var(--font)", padding: 0,
            }}
          >+ New rule</button>
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {rules.length === 0 ? (
            <div style={{ padding: "1.25rem", fontSize: "0.875rem", color: "var(--text2)" }}>
              No recurring rules yet. Create one to get monthly confirmation prompts.
            </div>
          ) : (
            rules.map((rule, i) => (
              <div key={rule.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "0.75rem 1.25rem",
                borderBottom: i === rules.length - 1 ? "none" : "1px solid var(--border)",
                opacity: rule.active ? 1 : 0.5,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: `${rule.category.color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}>{rule.category.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rule.description}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text2)" }}>
                    {rule.category.name} · {rule.type} · {formatCurrency(rule.amount)} · day {rule.dayOfMonth}
                  </div>
                </div>
                <div style={{
                  fontSize: "0.7rem", fontWeight: 500, padding: "2px 8px", borderRadius: 12, flexShrink: 0,
                  background: rule.active ? "rgba(34,197,94,0.12)" : "rgba(153,153,176,0.12)",
                  color: rule.active ? "var(--green)" : "var(--text2)",
                }}>
                  {rule.active ? "Active" : "Paused"}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: "0.78rem" }} onClick={() => openRuleEdit(rule)}>Edit</button>
                  <button className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: "0.78rem" }} onClick={() => toggleRuleActive(rule)}>
                    {rule.active ? "Pause" : "Resume"}
                  </button>
                  <button className="btn btn-danger" style={{ padding: "3px 10px", fontSize: "0.78rem" }} onClick={() => deleteRule(rule)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Notice ── */}
      {notice && (
        <div style={{
          marginBottom: 16, padding: "0.75rem 1rem",
          background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: "var(--radius-sm)", fontSize: "0.875rem", color: "var(--amber)",
        }}>{notice}</div>
      )}

      {/* ── Categories ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 56 }} />)}
        </div>
      ) : (
        <>
          <CategorySection title="Income" categories={income} onEdit={openEdit} onToggleArchive={toggleArchive} onDelete={deleteCategory} />
          <CategorySection title="Expenses" categories={expense} onEdit={openEdit} onToggleArchive={toggleArchive} onDelete={deleteCategory} />
          {archived.length > 0 && (
            <CategorySection title="Archived" categories={archived} onEdit={openEdit} onToggleArchive={toggleArchive} onDelete={deleteCategory} isArchived />
          )}
        </>
      )}

      {/* ── Category modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>{editing ? "Edit category" : "New category"}</h2>
              <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Side Income" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, parentId: "" })}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Parent category <span style={{ color: "var(--text2)", fontWeight: 400 }}>(optional)</span></label>
                  <select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })}>
                    <option value="">— None (top-level) —</option>
                    {parentOptions.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
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
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create category"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Rule modal ── */}
      {showRuleModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRuleModal(false)}>
          <div className="modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>{editingRule ? "Edit recurring rule" : "New recurring rule"}</h2>
              <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setShowRuleModal(false)}>✕</button>
            </div>

            {!editingRule && suggestions.length > 0 && (
              <div className="form-group">
                <label className="form-label">Pre-fill from an existing recurring transaction <span style={{ color: "var(--text2)", fontWeight: 400 }}>(optional)</span></label>
                <select defaultValue="" onChange={e => {
                  const s = suggestions.find((s: any) => s.description + "::" + s.categoryId === e.target.value);
                  if (s) applySuggestion(s);
                }}>
                  <option value="">— Start blank —</option>
                  {suggestions.map((s: any) => (
                    <option key={s.description + "::" + s.categoryId} value={s.description + "::" + s.categoryId}>
                      {s.category.icon} {s.description} · {formatCurrency(s.amount)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={submitRule}>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input type="text" required value={ruleForm.description} onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })} placeholder="e.g. Netflix subscription" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select value={ruleForm.type} onChange={e => setRuleForm({ ...ruleForm, type: e.target.value, categoryId: "" })}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Day of month</label>
                  <input type="number" required min={1} max={31} value={ruleForm.dayOfMonth} onChange={e => setRuleForm({ ...ruleForm, dayOfMonth: e.target.value })} placeholder="1–31" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (ZAR)</label>
                  <input type="number" required min={0} step={0.01} value={ruleForm.amount} onChange={e => setRuleForm({ ...ruleForm, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select required value={ruleForm.categoryId} onChange={e => setRuleForm({ ...ruleForm, categoryId: e.target.value })}>
                    <option value="">Select category…</option>
                    {categories.filter(c => c.type === ruleForm.type && !c.archived).map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {parseInt(ruleForm.dayOfMonth) > 28 && (
                <div style={{ fontSize: "0.78rem", color: "var(--amber)", marginBottom: "0.75rem", marginTop: "-0.25rem" }}>
                  Day {ruleForm.dayOfMonth} will be capped to the last day of shorter months (e.g. February)
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowRuleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingRule}>
                  {savingRule ? "Saving…" : editingRule ? "Save changes" : "Create rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

interface CategorySectionProps {
  title: string; categories: Category[];
  onEdit: (cat: Category) => void;
  onToggleArchive: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  isArchived?: boolean;
}

function CategorySection({ title, categories, onEdit, onToggleArchive, onDelete, isArchived = false }: CategorySectionProps) {
  if (categories.length === 0 && !isArchived) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text2)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
        {title}
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {categories.length === 0 ? (
          <div style={{ padding: "1.25rem", fontSize: "0.875rem", color: "var(--text2)" }}>None</div>
        ) : (
          categories.map((cat, i) => {
            const isLastParent = i === categories.length - 1;
            return (
              <div key={cat.id}>
                <CategoryRow cat={cat} isLast={isLastParent && cat.children.length === 0} isArchived={isArchived} onEdit={onEdit} onToggleArchive={onToggleArchive} onDelete={onDelete} />
                {cat.children.map((child, j) => (
                  <CategoryRow key={child.id} cat={child} isLast={isLastParent && j === cat.children.length - 1} isArchived={isArchived} isChild onEdit={onEdit} onToggleArchive={onToggleArchive} onDelete={onDelete} />
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface CategoryRowProps {
  cat: Category; isLast: boolean; isArchived: boolean; isChild?: boolean;
  onEdit: (cat: Category) => void;
  onToggleArchive: (cat: Category) => void;
  onDelete: (cat: Category) => void;
}

function CategoryRow({ cat, isLast, isArchived, isChild = false, onEdit, onToggleArchive, onDelete }: CategoryRowProps) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "0.75rem 1.25rem",
      paddingLeft: isChild ? "2.75rem" : "1.25rem",
      borderBottom: isLast ? "none" : "1px solid var(--border)",
      opacity: isArchived ? 0.55 : 1,
      background: isChild ? "var(--bg2)" : undefined,
    }}>
      {isChild && <span style={{ fontSize: "0.7rem", color: "var(--text2)", marginRight: -4, flexShrink: 0 }}>↳</span>}
      <div style={{
        width: isChild ? 28 : 34, height: isChild ? 28 : 34, borderRadius: 8,
        background: `${cat.color}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: isChild ? 14 : 18, flexShrink: 0,
      }}>{cat.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: isChild ? "0.85rem" : "0.9rem" }}>{cat.name}</div>
        <div style={{ fontSize: "0.72rem", color: "var(--text2)", textTransform: "capitalize" }}>
          {cat.type}
          {!isChild && cat.children.length > 0 && ` · ${cat.children.length} sub-categor${cat.children.length === 1 ? "y" : "ies"}`}
          {isChild && " · sub-category"}
        </div>
      </div>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: "0.78rem" }} onClick={() => onEdit(cat)}>Edit</button>
        <button className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: "0.78rem" }} onClick={() => onToggleArchive(cat)}>{cat.archived ? "Restore" : "Archive"}</button>
        <button className="btn btn-danger" style={{ padding: "3px 10px", fontSize: "0.78rem" }} onClick={() => onDelete(cat)}>Delete</button>
      </div>
    </div>
  );
}
