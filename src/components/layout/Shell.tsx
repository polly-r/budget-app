"use client";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/login") return <>{children}</>;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "1.5rem 2rem", overflowY: "auto", maxWidth: "100%" }}>
        {children}
      </main>
    </div>
  );
}
