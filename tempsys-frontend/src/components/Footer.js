import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer style={footerStyle}>

      <div style={footerContent}>
        <div>
          <p>© 2025 TempSys – Alle Rechte vorbehalten</p>
        </div>
        <div style={linkGroupStyle}>
         <nav style={{ display: "flex", gap: "1.5rem", position: "relative" }}>
         <Link to="/impressum" style={linkStyle}>Impressum</Link>
         <Link to="/datenschutz" style={linkStyle}>Datenschutz</Link>
         <a href="/kontakt" style={linkStyle}>Kontakt</a>
        </nav> 
        </div>
      </div>
    </footer>
  );
};

// STYLES
const footerStyle = {
  backgroundColor: "#1e1e1e",
  color: "#fff",
  padding: "1rem 2rem",
  marginTop: "4rem",
};

const footerContent = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
};

const linkGroupStyle = {
  display: "flex",
  gap: "1.5rem",
};

// Link mit rotem Hover-Effekt
const linkStyle = {
  color: "#fff",
  textDecoration: "none",
  fontSize: "0.9rem",
  position: "relative",
};

const styleTag = document.createElement("style");
styleTag.textContent = `
  a:hover::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: -2px;
    width: 100%;
    height: 2px;
    background-color: #d62828;
  }
`;
document.head.appendChild(styleTag);

export default Footer;
