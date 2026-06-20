// frontend/src/components/ArchitectureDiagram.jsx
import { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "dark" });

export default function ArchitectureDiagram({ diagram }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!diagram || !ref.current) return;
    const id = `mermaid-${Date.now()}`;
    mermaid
      .render(id, diagram)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      })
      .catch((err) => {
        console.error("Mermaid render failed:", err);
        if (ref.current) {
          ref.current.innerHTML =
            '<p style="opacity:0.6">Diagram could not be rendered.</p>';
        }
      });
  }, [diagram]);

  return <div ref={ref} className="architecture-diagram" />;
}