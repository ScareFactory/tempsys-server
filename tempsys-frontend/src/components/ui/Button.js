// src/components/ui/Button.js
import React from "react";

export default function Button({ children, onClick, type = "button", style = {} }) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        padding: "0.5rem 1rem",
        backgroundColor: "#1e1e1e",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}