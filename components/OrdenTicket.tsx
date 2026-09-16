import Link from "next/link";
import { Orden } from "@/types/ordenes";

export const ESTADO_LABELS: Record<string, string> = {
  PendientePago: "Pendiente de pago",
  Pagado: "Pagado",
  EnCurso: "En curso",
  Completado: "Completado",
  Cancelado: "Cancelado",
  EnDisputa: "En disputa",
};

export const ESTADO_COLOR: Record<string, string> = {
  PendientePago: "border-ink/30 text-ink/50",
  Pagado: "border-copper text-copper",
  EnCurso: "border-safety text-safety",
  Completado: "border-stamp text-stamp",
  Cancelado: "border-ink/30 text-ink/40",
  EnDisputa: "border-ink text-ink",
};

function formatearFecha(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function OrdenTicket({
  orden,
  nombreContraparte,
  children,
}: {
  orden: Orden;
  nombreContraparte: string;
  children?: React.ReactNode;
}) {
  const colorClase = ESTADO_COLOR[orden.estado] ?? "border-ink/30 text-ink/50";

  return (
    <div className="relative bg-paper border border-dashed border-ink/40 rounded-lg p-4">
      <div
        className={`absolute top-3 right-4 border-2 rounded px-2 py-0.5 text-[11px] font-display tracking-wide rotate-6 ${colorClase}`}
      >
        {(ESTADO_LABELS[orden.estado] ?? orden.estado).toUpperCase()}
      </div>

      <p className="font-mono text-[11px] text-ink/40 mb-1">
        ORDEN #{orden.id.slice(0, 8).toUpperCase()} · {formatearFecha(orden.creadoEn)}
      </p>
      <p className="font-medium text-ink pr-28">{orden.descripcion || orden.categoriaNombre}</p>
      <p className="text-sm text-ink/60 mb-3">
        {orden.categoriaNombre} · Con {nombreContraparte}
      </p>

      <div className="flex justify-between items-end">
        <span className="font-mono text-sm text-ink">${orden.montoTotal.toLocaleString("es-AR")}</span>
        <Link href={`/conversaciones/${orden.conversacionId}`} className="text-xs text-copper hover:underline">
          Abrir chat
        </Link>
      </div>

      {children && <div className="mt-3 pt-3 border-t border-dashed border-ink/20">{children}</div>}
    </div>
  );
}
