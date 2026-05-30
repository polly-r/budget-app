"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie
} from "recharts";

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"cashflow" | "networth" | "breakdown">("cashflow");

  useEffect(() => {
    fetch("/api/reports?months=6").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const tooltipStyle = { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };

  if (loading || !data) return (
    <div>
      <div className="page-header"><h1 className="page-title">Reports</h1></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    </div>
  );

  const latest = data.monthly[data.monthly.length - 1];
  const prev = data.monthly[data.monthly.length - 2];
  const avgSavings = data.monthly.reduce((s: number, m: any) => s + m.savings, 0) / data.monthly.length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-sub">6-month financial overview</p>
      </div>

      <div className="data-grid grid-4" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Income this month</div>
          <div className="stat-value" style={{ color: "var(--green)", fontSize: "1.4rem" }}>{formatCurrency(latest?.income || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Expenses this month</div>
          <div className="stat-value" style={{ color: "var(--red)", fontSize: "1.4rem" }}>{formatCurrency(latest?.expenses || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg monthly savings</div>
          <div className="stat-value" style={{ color: "var(--accent)", fontSize: "1.4rem" }}>{formatCurrency(avgSavings)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net worth (cumulative)</div>
          <div className="stat-value" style={{ fontSize: "1.4rem" }}>{formatCurrency(data.netWorth[data.netWorth.length - 1]?.value || 0)}</div>
        </div>
      </div>

      <div className="card card-lg" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontWeight: 600 }}>Financial charts</h3>
          <div style={{ display: "flex", gap: 4 }}>
            {(["cashflow", "networth", "breakdown"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className="btn btn-ghost"
                style={{ background: view === v ? "var(--bg3)" : undefined, color: view === v ? "var(--text1)" : undefined, padding: "0.4rem 0.85rem", fontSize: "0.8rem", textTransform: "capitalize" }}>
                {v === "networth" ? "Net worth" : v === "breakdown" ? "Breakdown" : "Cash flow"}
              </button>
            ))}
          </div>
        </div>

        {view === "cashflow" && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthly} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text2)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text2)" }} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="savings" name="Savings" fill="#7c6af7" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {view === "networth" && (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.netWorth} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c6af7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c6af7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text2)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text2)" }} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v)} />
              <Area type="monotone" dataKey="value" name="Net worth" stroke="#7c6af7" strokeWidth={2} fill="url(#nwGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {view === "breakdown" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {data.monthly.slice(-2).reverse().map((m: any) => (
              <div key={m.month}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 12, color: "var(--text2)" }}>{m.month}</div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={m.categories} dataKey="amount" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                      {m.categories.map((c: any, i: number) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {m.categories.slice(0, 5).map((c: any) => (
                    <div key={c.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, display: "inline-block" }} />
                        {c.icon} {c.name}
                      </span>
                      <span>{formatCurrency(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly table */}
      <div className="card card-lg">
        <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Month-by-month summary</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Month","Income","Expenses","Savings","Rate"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: h === "Month" ? "left" : "right", fontSize: "0.75rem", color: "var(--text2)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...data.monthly].reverse().map((m: any) => {
              const rate = m.income > 0 ? (m.savings / m.income * 100) : 0;
              return (
                <tr key={m.month} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{m.month}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--green)" }}>{formatCurrency(m.income)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--red)" }}>{formatCurrency(m.expenses)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: m.savings >= 0 ? "var(--accent)" : "var(--red)", fontWeight: 600 }}>{formatCurrency(m.savings)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: rate > 20 ? "var(--green)" : rate > 0 ? "var(--amber)" : "var(--red)" }}>{rate.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
