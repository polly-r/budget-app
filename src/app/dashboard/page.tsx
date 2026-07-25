"use client";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

interface DashboardData {
  income: number; expenses: number; savings: number; savingsRate: number;
  prevIncome: number; prevExpenses: number;
  recentTransactions: any[];
  budgets: any[];
  goals: any[];
  expenseByCategory: { name: string; value: number; color: string; icon: string }[];
}

interface DueRule {
  id: string;
  description: string;
  amount: number;
  type: string;
  dayOfMonth: number;
  category: { id: string; name: string; icon: string; color: string };
  editedAmount: string;
  skip: boolean;
}

interface SafeToSpendData {
  incomeReceived: number;
  incomeExpected: number;
  expenseSpent: number;
  expenseCommitted: number;
  goalReserve: number;
  goalBreakdown: { name: string; icon: string; monthlyContribution: number }[];
  leftToSpend: number;
  afterGoals: number;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dueRules, setDueRules] = useState<DueRule[]>([]);
  const [dueMonth, setDueMonth] = useState<{ month: number; year: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [panelDismissed, setPanelDismissed] = useState(false);
  const [safeToSpend, setSafeToSpend] = useState<SafeToSpendData | null>(null);

  async function loadDashboard() {
    const [dashRes, s2sRes] = await Promise.all([
      fetch("/api/dashboard"),
      fetch("/api/safe-to-spend"),
    ]);
    setData(await dashRes.json());
    setSafeToSpend(await s2sRes.json());
  }

  useEffect(() => {
    async function init() {
      const [dashRes, dueRes, s2sRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/recurring/due"),
        fetch("/api/safe-to-spend"),
      ]);
      setData(await dashRes.json());
      setSafeToSpend(await s2sRes.json());
      setLoading(false);

      const dueData = await dueRes.json();
      if (dueData.rules.length > 0) {
        setDueRules(dueData.rules.map((r: any) => ({
          ...r,
          editedAmount: String(r.amount),
          skip: false,
        })));
        setDueMonth({ month: dueData.month, year: dueData.year });
      }
    }
    init();
  }, []);

  async function confirmGenerate() {
    if (!dueMonth) return;
    setConfirming(true);

    const toAdd = dueRules.filter(r => !r.skip);
    const toSkip = dueRules.filter(r => r.skip).map(r => r.id);

    const res = await fetch("/api/recurring/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: dueMonth.month,
        year: dueMonth.year,
        items: toAdd.map(r => ({ ruleId: r.id, amount: parseFloat(r.editedAmount) || r.amount })),
        skipped: toSkip,
      }),
    });
    const result = await res.json();

    if (toAdd.length > 0) {
      const monthName = new Date(dueMonth.year, dueMonth.month - 1).toLocaleString("en-ZA", { month: "long" });
      setConfirmed(`${result.created} recurring transaction${result.created !== 1 ? "s" : ""} added for ${monthName}`);
    }

    setDueRules([]);
    setConfirming(false);
    loadDashboard();
  }

  if (loading || !data) return <LoadingSkeleton />;

  const incomeChange = data.prevIncome ? ((data.income - data.prevIncome) / data.prevIncome * 100) : 0;
  const expenseChange = data.prevExpenses ? ((data.expenses - data.prevExpenses) / data.prevExpenses * 100) : 0;

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">{getGreeting()} 👋</h1>
          <p className="page-sub">Here's your financial snapshot for {new Date().toLocaleString("en-ZA", { month: "long", year: "numeric" })}</p>
        </div>
      </div>

      {dueRules.length > 0 && !panelDismissed && (
        <RecurringPanel
          rules={dueRules}
          onChange={setDueRules}
          onConfirm={confirmGenerate}
          onDismiss={() => setPanelDismissed(true)}
          confirming={confirming}
        />
      )}

      {confirmed && (
        <div style={{
          marginBottom: 16, padding: "0.65rem 1rem",
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: "var(--radius-sm)", fontSize: "0.82rem", color: "var(--green)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          ✓ {confirmed}
          <button onClick={() => setConfirmed(null)} style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {safeToSpend && <SafeToSpendCard data={safeToSpend} />}

      {/* Stat cards */}
      <div className="data-grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="Income" value={data.income} delta={incomeChange} color="var(--green)" />
        <StatCard label="Expenses" value={data.expenses} delta={expenseChange} color="var(--red)" invertDelta />
        <StatCard label="Savings" value={data.savings} color="var(--accent)" />
        <div className="stat-card">
          <div className="stat-label">Savings rate</div>
          <div className="stat-value" style={{ color: data.savingsRate > 20 ? "var(--green)" : "var(--amber)" }}>
            {data.savingsRate.toFixed(1)}%
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(data.savingsRate, 100)}%`, background: "var(--accent)" }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Expense breakdown donut */}
        <div className="card card-lg">
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: 16 }}>Spending breakdown</h3>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={data.expenseByCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  dataKey="value" paddingAngle={2}>
                  {data.expenseByCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {data.expenseByCategory.slice(0, 6).map((cat) => (
                <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{cat.icon}</span>
                  <span style={{ fontSize: 0.8 + "rem", flex: 1, color: "var(--text2)" }}>{cat.name}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>{formatCurrency(cat.value)}</span>
                  <div style={{ width: 40 }}>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(cat.value / data.expenses * 100).toFixed(0)}%`, background: cat.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Budget alerts */}
        <div className="card card-lg">
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: 14 }}>Budget status</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.budgets.slice(0, 5).map((b: any) => (
              <div key={b.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: "0.8rem" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span>{b.category.icon}</span> {b.category.name}
                  </span>
                  <span style={{ color: b.percentage > 90 ? "var(--red)" : b.percentage > 70 ? "var(--amber)" : "var(--text2)" }}>
                    {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${b.percentage}%`,
                    background: b.percentage > 90 ? "var(--red)" : b.percentage > 70 ? "var(--amber)" : "var(--green)"
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
        {/* Goals */}
        <div className="card card-lg">
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: 14 }}>Savings goals</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {data.goals.slice(0, 4).map((g: any) => {
              const pct = Math.min((g.savedAmount / g.targetAmount) * 100, 100);
              return (
                <div key={g.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: "0.82rem" }}>
                    <span>{g.icon} {g.name}</span>
                    <span style={{ color: "var(--text2)" }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: g.color }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: "0.73rem", color: "var(--text2)" }}>
                    <span>{formatCurrency(g.savedAmount)}</span>
                    <span>{formatCurrency(g.targetAmount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card card-lg">
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: 14 }}>Recent transactions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {data.recentTransactions.map((t: any) => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "var(--bg3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, flexShrink: 0
                }}>{t.category.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.description}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text2)" }}>{formatDate(t.date)}</div>
                </div>
                <div style={{
                  fontSize: "0.85rem", fontWeight: 600,
                  color: t.type === "income" ? "var(--green)" : "var(--text1)",
                  flexShrink: 0
                }}>
                  {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecurringPanel({ rules, onChange, onConfirm, onDismiss, confirming }: {
  rules: DueRule[];
  onChange: React.Dispatch<React.SetStateAction<DueRule[]>>;
  onConfirm: () => void;
  onDismiss: () => void;
  confirming: boolean;
}) {
  const activeCount = rules.filter(r => !r.skip).length;

  return (
    <div className="card" style={{
      marginBottom: 20,
      borderColor: "rgba(124,106,247,0.35)",
      background: "rgba(124,106,247,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Recurring transactions due this month</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text2)", marginTop: 3 }}>
            Edit amounts or skip items — nothing is saved until you click Add
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 4px", fontFamily: "var(--font)" }}
        >✕</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {rules.map(rule => (
          <div key={rule.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "0.55rem 0.75rem",
            background: rule.skip ? "transparent" : "var(--bg3)",
            borderRadius: "var(--radius-sm)",
            opacity: rule.skip ? 0.45 : 1,
            transition: "opacity 0.15s",
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7,
              background: `${rule.category.color}22`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, flexShrink: 0,
            }}>{rule.category.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rule.description}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text2)" }}>{rule.category.name} · day {rule.dayOfMonth}</div>
            </div>
            <input
              type="number"
              value={rule.editedAmount}
              onChange={e => onChange(prev => prev.map(r => r.id === rule.id ? { ...r, editedAmount: e.target.value } : r))}
              disabled={rule.skip}
              style={{
                width: 90, textAlign: "right",
                background: "var(--bg4)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", color: "var(--text1)",
                padding: "0.3rem 0.5rem", fontSize: "0.85rem",
                fontFamily: "var(--font)",
              }}
            />
            <button
              onClick={() => onChange(prev => prev.map(r => r.id === rule.id ? { ...r, skip: !r.skip } : r))}
              style={{
                fontSize: "0.75rem", padding: "3px 10px",
                borderRadius: "var(--radius-sm)",
                background: rule.skip ? "rgba(239,68,68,0.1)" : "transparent",
                border: `1px solid ${rule.skip ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                color: rule.skip ? "var(--red)" : "var(--text2)",
                cursor: "pointer", fontFamily: "var(--font)", transition: "all 0.15s",
              }}
            >
              {rule.skip ? "Skipped" : "Skip"}
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onConfirm}
          disabled={confirming || activeCount === 0}
          className="btn btn-primary"
          style={{ fontSize: "0.85rem" }}
        >
          {confirming ? "Adding…" : activeCount === 0 ? "All skipped" : `Add ${activeCount} transaction${activeCount !== 1 ? "s" : ""}`}
        </button>
        <button
          onClick={onDismiss}
          style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: "0.82rem", fontFamily: "var(--font)" }}
        >
          Remind me later
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, delta, color, invertDelta }: any) {
  const isUp = delta > 0;
  const goodChange = invertDelta ? !isUp : isUp;
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{formatCurrency(value)}</div>
      {delta !== undefined && (
        <div className={`stat-delta ${goodChange ? "up" : "down"}`}>
          {isUp ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}% vs last month
        </div>
      )}
    </div>
  );
}

function BreakdownItem({ label, amount, positive, amber, muted }: {
  label: string; amount: number; positive?: boolean; amber?: boolean; muted?: boolean;
}) {
  const color = positive ? "var(--green)" : amber ? "#f59e0b" : "var(--red)";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3, opacity: muted ? 0.75 : 1 }}>
      <span style={{ fontSize: "0.78rem", color: "var(--text2)" }}>{label}</span>
      <span style={{ fontSize: "0.78rem", fontWeight: 500, color }}>
        {positive ? "+" : "−"}{formatCurrency(amount)}
      </span>
    </div>
  );
}

function SafeToSpendCard({ data }: { data: SafeToSpendData }) {
  const [showCalc, setShowCalc] = useState(false);
  const positive = data.leftToSpend >= 0;
  const afterGoalsPositive = data.afterGoals >= 0;

  return (
    <div className="card" style={{ marginBottom: 20, padding: "1.1rem 1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
        <div>
          <div style={{ fontSize: "0.68rem", fontWeight: 500, color: "var(--text2)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>
            Left to spend this month
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", color: positive ? "var(--green)" : "var(--red)" }}>
            {positive ? "" : "−"}{formatCurrency(Math.abs(data.leftToSpend))}
          </div>
          {data.goalReserve > 0 && (
            <div style={{ fontSize: "0.78rem", color: "var(--text2)", marginTop: 4 }}>
              After goal contributions ({formatCurrency(data.goalReserve)}):{" "}
              <span style={{ fontWeight: 600, color: afterGoalsPositive ? "var(--text1)" : "var(--red)" }}>
                {afterGoalsPositive ? "" : "−"}{formatCurrency(Math.abs(data.afterGoals))}
              </span>
            </div>
          )}
          {!positive && (
            <div style={{ fontSize: "0.75rem", color: "var(--red)", marginTop: 4 }}>
              Spending plus outstanding commitments exceed this month's income
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 28, alignItems: "stretch" }}>
          <div style={{ minWidth: 160 }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 500, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Income</div>
            <BreakdownItem label="Received" amount={data.incomeReceived} positive />
            {data.incomeExpected > 0 && <BreakdownItem label="Expected" amount={data.incomeExpected} positive muted />}
          </div>

          <div style={{ width: 1, background: "var(--border)" }} />

          <div style={{ minWidth: 180 }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 500, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Outgoings</div>
            <BreakdownItem label="Spent so far" amount={data.expenseSpent} />
            {data.expenseCommitted > 0 && <BreakdownItem label="Committed" amount={data.expenseCommitted} muted />}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowCalc(s => !s)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "0.72rem", color: "var(--text2)", fontFamily: "var(--font)",
          padding: 0, marginTop: 10,
        }}
      >
        {showCalc ? "▾" : "▸"} How this is calculated
      </button>
      {showCalc && (
        <div style={{
          marginTop: 8, padding: "0.65rem 0.9rem",
          background: "var(--bg3)", borderRadius: "var(--radius-sm)",
          fontSize: "0.74rem", color: "var(--text2)", lineHeight: 1.6,
        }}>
          <div>· Income received + income rules not yet run, minus everything spent, minus committed recurring expenses not yet confirmed or skipped this month.</div>
          <div>· Every transaction you add counts as already spent or received.</div>
          <div>· Goal contributions are suggested amounts — (target − saved) ÷ months left — and are not subtracted from the main figure.</div>
          <div>· If you pay a commitment as a manual transaction instead of confirming it in the panel above, it is counted twice until month-end. Confirm or skip commitments in the panel to keep this accurate.</div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="skeleton" style={{ height: 28, width: 240, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 16, width: 320 }} />
      </div>
      <div className="data-grid grid-4" style={{ marginBottom: 20 }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div className="skeleton" style={{ height: 260 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    </div>
  );
}
