// /emails/ContactEmail.tsx
import * as React from "react";

export default function ContactEmail(props: {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
}) {
  const { name, email, category, subject, message } = props;

  const row = (label: string, value: string) => (
    <tr>
      <td style={{ padding: "6px 0", color: "#9CA3AF", width: 120 }}>
        {label}
      </td>
      <td style={{ padding: "6px 0", color: "#E5E7EB" }}>{value}</td>
    </tr>
  );

  return (
    <div
      style={{
        background: "#0B1220",
        padding: 24,
        fontFamily: "Inter, ui-sans-serif, system-ui",
      }}
    >
      <h2 style={{ margin: 0, marginBottom: 12, color: "#BFDBFE" }}>
        New Contact Form Submission
      </h2>
      <table
        cellPadding={0}
        cellSpacing={0}
        style={{ width: "100%", maxWidth: 640 }}
      >
        <tbody>
          {row("From", `${name} <${email}>`)}
          {row("Category", category)}
          {row("Subject", subject)}
        </tbody>
      </table>
      <div style={{ height: 16 }} />
      <div
        style={{
          padding: 16,
          background: "#0F172A",
          border: "1px solid #1F2937",
          borderRadius: 12,
          color: "#E5E7EB",
          whiteSpace: "pre-wrap",
          lineHeight: 1.5,
        }}
      >
        {message}
      </div>
      <div style={{ marginTop: 16, color: "#6B7280", fontSize: 12 }}>
        Sent from DegreeIntelligence contact page.
      </div>
    </div>
  );
}
