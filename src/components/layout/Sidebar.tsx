"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "⬡" },
  { href: "/transactions", label: "Transactions", icon: "↕" },
  { href: "/budgets", label: "Budgets", icon: "▦" },
  { href: "/goals", label: "Goals", icon: "◎" },
  { href: "/reports", label: "Reports", icon: "▤" },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside style={{
      width: 220,
      minWidth: 220,
      background: "var(--bg2)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      padding: "1.5rem 0",
      position: "sticky",
      top: 0,
      height: "100vh",
    }}>
      <div style={{ padding: "0 1.25rem 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: "var(--accent)",
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16
          }}>₿</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>Budget</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text2)" }}>Personal Finance</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "0 0.75rem" }}>
        {nav.map((item) => {
          const active = path === item.href || path.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "0.6rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              marginBottom: 2,
              color: active ? "var(--text1)" : "var(--text2)",
              background: active ? "var(--bg3)" : "transparent",
              fontWeight: active ? 500 : 400,
              fontSize: "0.9rem",
              transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 15, opacity: active ? 1 : 0.6 }}>{item.icon}</span>
              {item.label}
              {active && <span style={{ marginLeft: "auto", width: 4, height: 4, background: "var(--accent)", borderRadius: "50%" }} />}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "1rem 1.25rem 0", borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: "0.75rem", color: "var(--text2)" }}>
          <div style={{ fontWeight: 500, color: "var(--text1)", marginBottom: 2 }}>Demo User</div>
          Durban, ZA · ZAR
        </div>
      </div>
    </aside>
  );
}
