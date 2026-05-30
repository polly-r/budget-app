export default function Loading() {
  return (
    <div>
      <div style={{ height: 40, background: "var(--bg3)", borderRadius: 8, marginBottom: 20, width: 300 }} className="skeleton" />
      <div style={{ height: 200, borderRadius: 12 }} className="skeleton" />
    </div>
  );
}
