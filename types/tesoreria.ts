// Panel del Tesorero (01/10). Los KPIs, "pagos pendientes de transferir" y la lista de disputas
// se calculan en este mismo frontend a partir de GET /api/tesoreria/ordenes (que devuelve
// Orden[], el mismo tipo que ya usa app/admin/page.tsx) — lo único nuevo del lado del backend es
// la Salud operativa, que sí necesita datos del servidor (ver TesoreriaController.cs).
export interface EstadoOperativoItem {
  nombre: string;
  estado: "Ok" | "Atencion" | "Critico";
  detalle: string;
}

export interface SaludOperativa {
  items: EstadoOperativoItem[];
}
