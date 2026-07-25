export default function Loading() {
  return (
    <div>
      <div className="page-header">
        <div className="skeleton" style={{ height: 28, width: 180, marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 16, width: 260 }} />
      </div>
      <div className="data-grid grid-3" style={{ marginBottom: 24 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="skeleton" style={{ height: 88, borderRadius: 12 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 16, width: 130, marginBottom: 10 }} />
      <div className="card" style={{ padding: 0 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}>
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 9 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 15, width: "55%", marginBottom: 5 }} />
              <div className="skeleton" style={{ height: 12, width: "30%" }} />
            </div>
            <div className="skeleton" style={{ height: 22, width: 72, borderRadius: 12 }} />
            <div className="skeleton" style={{ height: 18, width: 88 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
