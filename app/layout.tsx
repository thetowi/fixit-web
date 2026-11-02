import type { Metadata } from "next";
import { Archivo_Black, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import GoogleAuthProvider from "@/components/GoogleAuthProvider";
import TourOnboarding from "@/components/TourOnboarding";
import Footer from "@/components/Footer";
import TrabajoEnCursoOverlay from "@/components/TrabajoEnCursoOverlay";
import OcultarEnRutasLimpias from "@/components/OcultarEnRutasLimpias";

const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-archivo",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plexMono = IBM_Plex_Mono({
  weight: ["500"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
});

const DESCRIPCION = "Encontrá plomeros, electricistas y más oficios verificados cerca tuyo en Paraná. Acordás el precio antes y le pagás directo al profesional.";

// 02/11 (WE-05): etiquetas Open Graph / Twitter para que el link se vea bien al compartirlo
// (WhatsApp, Facebook, X). La imagen la genera app/opengraph-image.tsx.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://oficy.ar"),
  title: "Oficy",
  description: DESCRIPCION,
  openGraph: {
    title: "Oficy · El oficio que necesitás, a la vuelta de la esquina",
    description: DESCRIPCION,
    url: "/",
    siteName: "Oficy",
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oficy · El oficio que necesitás, a la vuelta de la esquina",
    description: DESCRIPCION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${archivoBlack.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Corre antes de que React monte nada: decide si el <html> arranca con
            la clase "dark" o no, para que no haya un flash del tema equivocado
            (por ejemplo, un flash de modo claro para alguien que eligió oscuro). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("fixit_theme");if(t==="oscuro"||(t===null&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <GoogleAuthProvider>
          {/* Va ANTES del Navbar a propósito (24/09, fix reportado por el usuario): el banner
              minimizado de "Trabajo en curso" es "sticky", no "fixed" — necesita estar primero en
              el flujo normal del documento para empujar el Navbar hacia abajo en vez de taparle
              los botones y links de arriba. La pantalla completa (fixed inset-0) no depende del
              orden, así que este mismo componente sirve para las dos vistas sin duplicar nada. */}
          {/* OcultarEnRutasLimpias (16/10): en /encuesta no se muestra nada de la app alrededor
              (ni logo, ni "Iniciar sesión"/"Crear cuenta", ni footer) — solo la encuesta. */}
          <OcultarEnRutasLimpias>
            <TrabajoEnCursoOverlay />
            <Navbar />
            <TourOnboarding />
          </OcultarEnRutasLimpias>
          {children}
          <OcultarEnRutasLimpias>
            <Footer />
          </OcultarEnRutasLimpias>
        </GoogleAuthProvider>
      </body>
    </html>
  );
}