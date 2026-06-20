import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null, info: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("DartPoint crash:", error, info);
  }

  reset = () => {
    this.setState({ error: null, info: null });
  };

  reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const msg = this.state.error?.message || String(this.state.error);
    const stack = this.state.info?.componentStack || this.state.error?.stack || "";

    return (
      <div style={{
        position: "fixed", inset: 0, background: "#0f0f0f", color: "#f1f5f9",
        fontFamily: "Inter,sans-serif", padding: "24px 18px", overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ fontSize: 38, textAlign: "center" }}>💥</div>
        <h1 style={{ fontSize: 20, fontWeight: 900, textAlign: "center", color: "#f97316", margin: 0 }}>
          Aïe, ça a planté
        </h1>
        <p style={{ fontSize: 14, color: "#94a3b8", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
          Envoie une capture de cet écran à Dart Point — ça nous aidera à corriger le bug.
        </p>
        <div style={{
          background: "#1a0000", border: "1px solid #7f1d1d", borderRadius: 12,
          padding: "12px 14px", fontSize: 13, color: "#fca5a5", wordBreak: "break-word",
        }}>
          <div style={{ fontWeight: 800, marginBottom: 6, color: "#ef4444" }}>Erreur :</div>
          <div>{msg}</div>
        </div>
        {stack && (
          <details style={{
            background: "#0a0a14", border: "1px solid #1e1e2e", borderRadius: 12,
            padding: "10px 12px", fontSize: 11, color: "#94a3b8",
          }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Détails techniques</summary>
            <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, fontSize: 10, lineHeight: 1.4 }}>{stack}</pre>
          </details>
        )}
        <button onClick={this.reload} style={{
          marginTop: 6, padding: "14px", borderRadius: 12, border: "none",
          background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff",
          fontWeight: 900, fontSize: 15, cursor: "pointer",
        }}>
          🔄 Recharger l'app
        </button>
        <button onClick={this.reset} style={{
          padding: "10px", borderRadius: 12, border: "1px solid #2a2a2a",
          background: "transparent", color: "#94a3b8", fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>
          Réessayer sans recharger
        </button>
      </div>
    );
  }
}
