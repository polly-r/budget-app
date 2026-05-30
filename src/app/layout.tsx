import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Budget — Personal Finance",
  description: "Track income, expenses, goals and budgets",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />
          <main style={{ flex: 1, padding: "1.5rem 2rem", overflowY: "auto", maxWidth: "100%" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
