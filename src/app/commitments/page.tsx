"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Rule {
  id: string;
  description: string;
  amount: number;
  type: string;
  dayOfMonth: number;
  category: Category;
  status: "paid" | "skipped" | "upcoming";
}

interface CommitmentsData {
  month: number;
  year: number;
  expenses: Rule[];
  income: Rule[];
  monthlyCommitted: number;
  monthlyIncome: number;
  annualised: number;
}

function StatusBadge({ status, dayOfMonth }: { status: Rule["status"]; dayOfMonth: number }) {
  const today = new Date().getDate();
  const overdue = status === "upcoming" && dayOfMonth <= today;

  if (status === "paid") {
    return (
      <span style={{
        fontSize: "0.7rem", fontWeight: 500, padding: "2px 9px", borderRadius: 12,
        background: "rgba(34,197,94,0.12)", color: "var(--green)", whiteSpace: "nowrap",
      }}>✓ Paid</span>
    );
  }
  if (status === "skipped") {
    return (
      <span style={{
        fontSize: "0.7rem", fontWeight: 500, padding: "2px 9px", borderRadius: 12,
        background: "rgba(153,153,176,0.1)", color: "var(--text2)", whiteSpace: "nowrap",
      }}>Skipped</span>
    );
  }
  return (
    <span style={{
      fontSize: "0.7rem", fontWeight: 500, padding: "2px 9px", borderRadius: 12,
      background: overdue ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.12)",
      color: overdue ? "#f59e0b" : "#818cf8",
      whiteSpace: "nowrap",
    }}>
      {overdue ? "Awaiting" : "Upcoming"}
    </span>
  );
}

function RuleRow({ rule, isLast }: { rule: Rule; isLast: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "0.85rem 1.25rem",
      borderBottom: isLast ? "none" : "1px solid var(--border)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: `${rule.category.color}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18,
      }}>
        {rule.category.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 500, fontSize: "0.9rem",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {rule.description}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text2)", marginTop: 1 }}>
          {rule.category.name}
        </div>
      </div>

      <div style={{ fontSize: "0.78rem", color: "var(--text2)", whiteSpace: "nowrap", flexShrink: 0 }}>
        {ordinal(rule.dayOfMonth)} of month
      </div>

      <StatusBadge status={rule.status} dayOfMonth={rule.dayOfMonth} />

      <div style={{
        fontSize: "0.95rem", fontWeight: 600, flexShrink: 0,
        minWidth: 100, textAlign: "right",
        color: rule.type === "income" ? "var(--green)" : "var(--text1)",
      }}>
        {rule.type === "income" ? "+" : "−"}{formatCurrency(rule.amount)}
      </div>
    </div>
  );
}

function StatusSummary({ rules }: { rules: Rule[] }) {
  const paid     = rules.filter(r => r.status === "paid").length;
  const skipped  = rules.filter(r => r.status === "skipped").length;
  const upcoming = rules.filter(r => r.status === "upcoming").length;

  if (rules.length === 0) {
    return <div style={{ fontSize: "0.8rem", color: "var(--text2)" }}>No rules yet</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
      {paid > 0 && (
        <div style={{ fontSize: "0.75rem", color: "var(--green)" }}>✓ {paid} paid</div>
      )}
      {upcoming > 0 && (
        <div style={{ fontSize: "0.75rem", color: "#818cf8" }}>● {upcoming} upcoming</div>
      )}
      {skipped > 0 && (
        <div style={{ fontSize: "0.75rem", color: "var(--text2)" }}>— {skipped} skipped</div>
      )}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: "0.72rem", fontWeight: 500, color: "var(--text2)",
      letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8,
    }}>
      {label}
    </div>
  );
}

export default function CommitmentsPage() {
  const [data, setData] = useState<CommitmentsData | null>(null);

  useEffect(() => {
    fetch("/api/commitments")
      .then(r => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Commitments</h1>
        </div>
        <div className="data-grid grid-3" style={{ marginBottom: 24 }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  const monthLabel = new Date(data.year, data.month - 1).toLocaleString("en-ZA", {
    month: "long", year: "numeric",
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Commitments</h1>
        <p className="page-sub">Fixed recurring obligations for {monthLabel}</p>
      </div>

      <div className="data-grid grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Monthly committed</div>
          <div className="stat-value" style={{ color: "var(--red)" }}>
            {formatCurrency(data.monthlyCommitted)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text2)", marginTop: 4 }}>
            {data.expenses.length} active rule{data.expenses.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Annualised cost</div>
          <div className="stat-value">{formatCurrency(data.annualised)}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text2)", marginTop: 4 }}>per year</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">This month's status</div>
          <StatusSummary rules={data.expenses} />
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <SectionLabel label="Fixed commitments" />
        {data.expenses.length === 0 ? (
          <div className="card" style={{
            padding: "2rem 1.5rem", textAlign: "center",
            fontSize: "0.875rem", color: "var(--text2)",
          }}>
            No active expense rules.{" "}
            <a href="/settings" style={{ color: "var(--accent)" }}>
              Create them in Settings → Recurring transactions.
            </a>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {data.expenses.map((rule, i) => (
              <RuleRow key={rule.id} rule={rule} isLast={i === data.expenses.length - 1} />
            ))}
            <div style={{
              display: "flex", justifyContent: "flex-end",
              padding: "0.65rem 1.25rem",
              borderTop: "1px solid var(--border)",
              fontSize: "0.8rem", color: "var(--text2)",
            }}>
              Total &nbsp;
              <span style={{ fontWeight: 600, color: "var(--text1)", marginLeft: 4 }}>
                {formatCurrency(data.monthlyCommitted)} / month
              </span>
            </div>
          </div>
        )}
      </div>

      {data.income.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel label="Recurring income" />
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {data.income.map((rule, i) => (
              <RuleRow key={rule.id} rule={rule} isLast={i === data.income.length - 1} />
            ))}
            <div style={{
              display: "flex", justifyContent: "flex-end",
              padding: "0.65rem 1.25rem",
              borderTop: "1px solid var(--border)",
              fontSize: "0.8rem", color: "var(--text2)",
            }}>
              Total &nbsp;
              <span style={{ fontWeight: 600, color: "var(--green)", marginLeft: 4 }}>
                +{formatCurrency(data.monthlyIncome)} / month
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
