import React from "react";

export default function Card({ children, className = "", style = {}, ...rest }) {
  const baseStyle = {
    background: "rgba(27,33,48,0.55)", // halbtransparent
    backdropFilter: "blur(12px) saturate(140%)",
    WebkitBackdropFilter: "blur(12px) saturate(140%)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 20,
    color: "#e6e8ee",
    boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
    marginBottom: 16,
  };

  return (
    <div className={`ts-card ${className}`} style={{ ...baseStyle, ...style }} {...rest}>
      <style>{`
        .ts-card h1, .ts-card h2, .ts-card h3 {
          margin-top: 0;
          color: #e6e8ee;
        }
        .ts-card p {
          color: #b4b9c7;
        }
      `}</style>
      {children}
    </div>
  );
}
