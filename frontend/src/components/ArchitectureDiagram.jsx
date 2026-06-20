// frontend/src/components/ArchitectureDiagram.jsx
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "dark" });

// Best-effort cleanup for the most common LLM-generated Mermaid footguns.
// This is NOT a full Mermaid parser — it walks each line character by
// character, finds label spans (inside [...] / (...) / {...}), and strips
// any bracket/quote/pipe characters found INSIDE those labels, including
// nested ones (e.g. "B(AES Module(aes.c, aes.h))" -> "B(AES Module aes.c, aes.h)").
// A simple regex can't handle the nested case correctly, which is why this
// is a small manual walk instead.
function sanitizeMermaidSource(raw) {
  if (!raw) return raw;

  // Gemini sometimes emits the literal two-character sequence "\n" (backslash
  // followed by n) as text content instead of an actual newline byte, despite
  // JSON.parse already having run. When that happens, the whole diagram comes
  // through as one giant line, which breaks both this sanitizer (line-based)
  // and Mermaid's own parser. Normalize any literal "\n" text to a real
  // newline character before doing anything else.
  const normalized = raw.replace(/\\n/g, "\n");

  return normalized.split("\n").map(sanitizeLine).join("\n");
}

function sanitizeLine(line) {
  let result = "";
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (ch === "[" || ch === "(" || ch === "{") {
      const open = ch;
      const close = open === "[" ? "]" : open === "(" ? ")" : "}";
      let depth = 1;
      let j = i + 1;
      let label = "";

      while (j < line.length && depth > 0) {
        if (line[j] === open) depth++;
        else if (line[j] === close) {
          depth--;
          if (depth === 0) break;
        }
        label += line[j];
        j++;
      }

      const cleanLabel = label
        .replace(/[()[\]{}"'|]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      result += open + cleanLabel + close;
      i = j + 1;
    } else {
      result += ch;
      i++;
    }
  }

  return result;
}

export default function ArchitectureDiagram({ diagram }) {
  const ref = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error

  useEffect(() => {
    if (!diagram || !ref.current) return;

    let cancelled = false;
    setStatus("loading");

    const id = `mermaid-${Date.now()}`;
    const cleaned = sanitizeMermaidSource(diagram);

    mermaid
      .render(id, cleaned)
      .then(({ svg }) => {
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
        setStatus("ok");
      })
      .catch((err) => {
        // First attempt failed even after sanitization — try once more
        // against the raw original in case sanitization itself introduced
        // an issue, then give up cleanly.
        console.error("Mermaid render failed (sanitized):", err);
        if (cancelled || !ref.current) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [diagram]);

  if (!diagram) return null;

  return (
    <div className="architecture-diagram-wrapper">
      {status === "loading" && (
        <p className="diagram-status" style={{ opacity: 0.6 }}>
          Rendering diagram…
        </p>
      )}
      {status === "error" && (
        <p className="diagram-status diagram-status-error" style={{ opacity: 0.7 }}>
          Architecture diagram couldn't be rendered for this repo. The rest
          of the analysis is unaffected.
        </p>
      )}
      <div
        ref={ref}
        className="architecture-diagram"
        style={{ display: status === "ok" ? "block" : "none" }}
      />
    </div>
  );
}
