// src/components/ui/Select.js
import React from "react";

export default function Select({ value, onChange, options = [], style = {} }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        padding: "0.5rem",
        borderRadius: "4px",
        border: "1px solid #ccc",
        ...style,
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}