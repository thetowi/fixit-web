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

// Busca el ícono por clave de forma case-insensitive (hay categorías viejas guardadas con la
// clave capitalizada) y cae al de la llave inglesa si no hay ninguno cargado o no se reconoce.
export function iconoCategoria(clave: string | null | undefined): LucideIcon {
  if (!clave) return Wrench;
  const normalizada = clave.toLowerCase();
  return MAPA_ICONOS[ALIAS[normalizada] ?? normalizada] ?? Wrench;
}
