"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 被 401 自動導回時帶 ?reason=expired，這裡讀 query 顯示「登入已過期」提示。
  // 用 window.location 而非 useSearchParams，避免靜態頁需要 Suspense 邊界。
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reason") === "expired") {
      setNotice("登入已過期，請重新登入以繼續。");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
      } else {
        router.push("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <div
        className="pane"
        style={{
          padding: "48px",
          width: "100%",
          maxWidth: "440px",
          animation: "card-appear 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          className="brand"
          style={{
            marginBottom: "40px",
            textAlign: "center",
            display: "grid",
            justifyItems: "center",
          }}
        >
          <div className="brand__logo" aria-hidden="true" style={{ marginBottom: "12px", width: "64px", height: "64px" }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L3 6.5v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12v-5L12 2z"
                fill="currentColor"
                opacity="0.18"
              />
              <path
                d="M12 2L3 6.5v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12v-5L12 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M9 12L11 14L15 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="brand__eyebrow">Secure Access</span>
          <h1 style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px", margin: 0 }}>
            Insurance Agent
          </h1>
        </div>

        {notice && (
          <div
            className="error-banner"
            style={{
              marginBottom: "24px",
              background: "var(--signal-soft)",
              color: "var(--signal)",
              borderColor: "var(--signal)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ width: "16px", height: "16px", flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "24px" }}>
          <div style={{ display: "grid", gap: "8px" }}>
            <label className="section-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{
                width: "100%",
                padding: "14px 18px",
                backgroundColor: "rgba(255, 255, 255, 0.5)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                outline: "none",
                fontSize: "16px",
                transition: "all 0.2s ease",
              }}
              required
            />
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            <label className="section-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "14px 18px",
                backgroundColor: "rgba(255, 255, 255, 0.5)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                outline: "none",
                fontSize: "16px",
                transition: "all 0.2s ease",
              }}
              required
            />
          </div>

          {error && (
            <div className="error-banner">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ width: "16px", height: "16px" }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="button"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "14px",
              marginTop: "8px",
              fontSize: "16px",
            }}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <p
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              margin: 0,
            }}
          >
            Enterprise Grade Security
          </p>
        </div>
      </div>
    </div>
  );
}
