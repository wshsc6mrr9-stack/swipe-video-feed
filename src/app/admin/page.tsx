// src/app/admin/page.tsx
export default function AdminPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Admin</h1>
      <p style={{ marginTop: 12, opacity: 0.8 }}>
        ログインできてたらこのページが見えるはず。
      </p>

      <div style={{ marginTop: 20 }}>
        <a
          href="/admin"
          style={{
            display: "inline-block",
            padding: "12px 16px",
            background: "#fff",
            color: "#000",
            borderRadius: 10,
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          /admin を開き直す
        </a>
      </div>
    </main>
  );
}
