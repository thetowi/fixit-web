import { iconNames } from "lucide-react/dynamic";
import {
  Baby,
  BookOpen,
  Bug,
  Camera,
  Car,
  Drill,
  Droplet,
  Dumbbell,
  Fan,
  Flame,
  Hammer,
  HardHat,
  HeartPulse,
  Home,
  Key,
  Laptop,
  Leaf,
  Lightbulb,
  Music,
  Package,
  Paintbrush,
  Palette,
  PawPrint,
  Refrigerator,
  Ruler,
  Scissors,
  Shirt,
  Sparkles,
  SprayCan,
  Thermometer,
  Truck,
  Tv,
  WashingMachine,
  Wifi,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface OpcionIconoCategoria {
  clave: string;
  etiqueta: string;
  Icono: LucideIcon;
}

// Íconos disponibles para asignar a un rubro/categoría, elegibles desde el panel de Admin al
// crear una categoría nueva. La "clave" es lo que se guarda en Categoria.Icono en la base y lo
// que después usa /explorar (y cualquier otra pantalla) para saber qué ícono de Lucide dibujar.
// Fuente única: agregar un ícono nuevo acá alcanza para que esté disponible en el selector de
// Admin y en el renderizado, sin tener que tocar los dos lugares por separado.
export const ICONOS_CATEGORIA: OpcionIconoCategoria[] = [
  { clave: "wrench", etiqueta: "Llave inglesa", Icono: Wrench },
  { clave: "droplet", etiqueta: "Gota", Icono: Droplet },
  { clave: "zap", etiqueta: "Rayo", Icono: Zap },
  { clave: "lightbulb", etiqueta: "Foco", Icono: Lightbulb },
  { clave: "hammer", etiqueta: "Martillo", Icono: Hammer },
  { clave: "hard-hat", etiqueta: "Casco", Icono: HardHat },
  { clave: "drill", etiqueta: "Taladro", Icono: Drill },
  { clave: "ruler", etiqueta: "Regla", Icono: Ruler },
  { clave: "flame", etiqueta: "Llama", Icono: Flame },
  { clave: "fan", etiqueta: "Ventilador", Icono: Fan },
  { clave: "wind", etiqueta: "Viento", Icono: Wind },
  { clave: "thermometer", etiqueta: "Termómetro", Icono: Thermometer },
  { clave: "paintbrush", etiqueta: "Pincel", Icono: Paintbrush },
  { clave: "palette", etiqueta: "Paleta", Icono: Palette },
  { clave: "spray-can", etiqueta: "Aerosol", Icono: SprayCan },
  { clave: "sparkles", etiqueta: "Destellos", Icono: Sparkles },
  { clave: "bug", etiqueta: "Insecto", Icono: Bug },
  { clave: "leaf", etiqueta: "Hoja", Icono: Leaf },
  { clave: "paw-print", etiqueta: "Huella", Icono: PawPrint },
  { clave: "key", etiqueta: "Llave", Icono: Key },
  { clave: "home", etiqueta: "Casa", Icono: Home },
  { clave: "car", etiqueta: "Auto", Icono: Car },
  { clave: "truck", etiqueta: "Camión", Icono: Truck },
  { clave: "package", etiqueta: "Paquete", Icono: Package },
  { clave: "tv", etiqueta: "Televisor", Icono: Tv },
  { clave: "laptop", etiqueta: "Notebook", Icono: Laptop },
  { clave: "wifi", etiqueta: "Wifi", Icono: Wifi },
  { clave: "camera", etiqueta: "Cámara", Icono: Camera },
  { clave: "refrigerator", etiqueta: "Heladera", Icono: Refrigerator },
  { clave: "washing-machine", etiqueta: "Lavarropas", Icono: WashingMachine },
  { clave: "shirt", etiqueta: "Camisa", Icono: Shirt },
  { clave: "scissors", etiqueta: "Tijeras", Icono: Scissors },
  { clave: "baby", etiqueta: "Bebé", Icono: Baby },
  { clave: "heart-pulse", etiqueta: "Pulso", Icono: HeartPulse },
  { clave: "dumbbell", etiqueta: "Mancuerna", Icono: Dumbbell },
  { clave: "book-open", etiqueta: "Libro", Icono: BookOpen },
  { clave: "music", etiqueta: "Nota musical", Icono: Music },
];

// Alias de claves viejas que ya quedaron guardadas en la base con otro nombre, para que categorías
// creadas antes de este selector (ej. Pintura con icono "brush") sigan resolviendo bien.
const ALIAS: Record<string, string> = {
  brush: "paintbrush",
};

const MAPA_ICONOS: Record<string, LucideIcon> = Object.fromEntries(
  ICONOS_CATEGORIA.map((o) => [o.clave, o.Icono])
);

// Export del mapa de arriba para IconoLucide.tsx, que lo usa para renderizar los 36 sugeridos con
// import estático (instantáneo) y solo recurre a lucide-react/dynamic para el resto.
export const MAPA_ICONOS_ESTATICOS = MAPA_ICONOS;

// Busca el ícono por clave de forma case-insensitive (hay categorías viejas guardadas con la
// clave capitalizada) y cae al de la llave inglesa si no hay ninguno cargado o no se reconoce.
export function iconoCategoria(clave: string | null | undefined): LucideIcon {
  if (!clave) return Wrench;
  const normalizada = clave.toLowerCase();
  return MAPA_ICONOS[ALIAS[normalizada] ?? normalizada] ?? Wrench;
}

// A partir del 20/09, el selector de ícono del panel de Admin ya no está limitado a estos 36
// sugeridos: se puede buscar y elegir cualquiera de los ~1500 íconos de Lucide (ver
// components/SelectorIconoLucide.tsx e IconoLucide.tsx), o pegar directo el código exacto tal como
// aparece en lucide.dev/icons. Lo de abajo es lo que hace posible esa búsqueda y esa validación,
// sin tener que importar los ~1500 componentes de forma estática (eso infla mucho el bundle) —
// `lucide-react/dynamic` los carga de a uno, solo cuando hace falta mostrarlos.

// Catálogo completo de nombres válidos de Lucide (kebab-case, ej. "flask-conical"), para el buscador
// del selector de Admin y para validar cualquier clave que no esté entre los 36 sugeridos de arriba.
export const NOMBRES_ICONOS_LUCIDE: readonly string[] = iconNames;

const NOMBRES_VALIDOS_LUCIDE = new Set(NOMBRES_ICONOS_LUCIDE);

// Normaliza una clave de ícono (minúsculas + alias de claves viejas) sin todavía validarla contra
// ningún catálogo — separado de resolverIconoDinamico para que ambos (el estático de arriba y el
// dinámico de abajo) usen exactamente la misma normalización.
export function normalizarClaveIcono(clave: string | null | undefined): string {
  if (!clave) return "wrench";
  const normalizada = clave.toLowerCase().trim();
  return ALIAS[normalizada] ?? normalizada;
}

// Devuelve la clave normalizada solo si es un ícono real de Lucide (de cualquiera de los ~1500, no
// solo los 36 sugeridos) — si no matchea nada, "wrench" (mismo fallback de siempre).
export function resolverClaveIconoValida(clave: string | null | undefined): string {
  const normalizada = normalizarClaveIcono(clave);
  return NOMBRES_VALIDOS_LUCIDE.has(normalizada) ? normalizada : "wrench";
}
