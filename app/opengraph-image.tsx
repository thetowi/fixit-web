import { ImageResponse } from "next/og";

// 02/11 (WE-05): imagen para la vista previa al compartir el link (Open Graph / Twitter). Next la
// sirve en /opengraph-image y la enlaza sola desde las etiquetas <meta> de app/layout.tsx.
export const alt = "Oficy · El oficio que necesitás, a la vuelta de la esquina";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1B1B18",
          color: "#EFEEE6",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#B5651D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 800,
              color: "#EFEEE6",
            }}
          >
            O
          </div>
          <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1 }}>Oficy</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 980 }}>
            El oficio que necesitás, a la vuelta de la esquina
          </div>
          <div style={{ fontSize: 32, color: "#D08A44" }}>
            Profesionales verificados en Paraná · Precio acordado antes de empezar
          </div>
        </div>
      </div>
    ),
    size
  );
}
