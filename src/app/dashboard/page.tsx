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

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) return <LoadingSkeleton />;

  const incomeChange = data.prevIncome ? ((data.income - data.prevIncome) / data.prevIncome * 100) : 0;
  const expenseChange = data.prevExpenses ? ((data.expenses - data.prevExpenses) / data.prevExpenses * 100) : 0;

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Good morning 👋</h1>
          <p className="page-sub">Here's your financial snapshot for {new Date().toLocaleString("en-ZA", { month: "long", year: "numeric" })}</p>
        </div>
      </div>

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
