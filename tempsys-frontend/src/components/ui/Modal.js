// src/components/ui/Modal.js
import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 680,
  centerY = true,           // optional: vertikal mittig (default: true)
  portalTarget,             // optional: eigenes Ziel, sonst document.body
}) {
  // ESC schließt + Body-Scroll sperren
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow || "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const node = (portalTarget instanceof HTMLElement) ? portalTarget : document.body;

  const content = (
    <div
      style={{
        ...overlayStyle,
        alignItems: centerY ? "center" : "flex-start",
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...dialogStyle,
          maxWidth,
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Modal"}
      >
        <div style={headerStyle}>
          <h3 style={titleStyle}>{title}</h3>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Schließen">
            ✕
          </button>
        </div>

        <div style={contentStyle}>{children}</div>
      </div>
    </div>
  );

  // WICHTIG: via Portal -> außerhalb der Card, nicht mehr "gefangen"
  return createPortal(content, node);
}

// === Styles (TempSys Glas) ===
const overlayStyle = {
  position: "fixed",
  inset: 0,
  height: "100dvh", // mobiles Safari freundlich
  width: "100vw",
  background:
    "radial-gradient(60% 60% at 50% 10%, rgba(224,49,49,.10), rgba(0,0,0,.55))",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
  display: "flex",
  justifyContent: "center",
  padding: "24px",
  zIndex: 2000,
};

const dialogStyle = {
  width: "100%",
  background: "rgba(16,20,28,0.55)",
  backdropFilter: "blur(16px) saturate(140%)",
  WebkitBackdropFilter: "blur(16px) saturate(140%)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 16,
  boxShadow:
    "0 20px 50px rgba(0,0,0,.55), 0 0 0 1px rgba(224,49,49,.20) inset",
  color: "#e6e8ee",
  overflow: "hidden",

  // Wichtig für mittige Darstellung + Inhalte scrollbar machen
  maxHeight: "85dvh",
  display: "flex",
  flexDirection: "column",
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  background:
    "linear-gradient(180deg, rgba(224,49,49,.10), rgba(224,49,49,.04))",
};

const titleStyle = {
  margin: 0,
  fontSize: "1.05rem",
  letterSpacing: ".2px",
};

const closeBtnStyle = {
  appearance: "none",
  background: "transparent",
  border: "1px solid rgba(255,255,255,.18)",
  color: "#e6e8ee",
  borderRadius: 10,
  padding: "6px 10px",
  cursor: "pointer",
  lineHeight: 1,
  transition: "background .15s ease, border-color .15s ease",
};

const contentStyle = {
  padding: 16,
  overflow: "auto",   // Inhalt innerhalb des Modals scrollbar
};
