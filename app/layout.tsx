import type { Metadata } from "next";
import { Archivo_Black, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import GoogleAuthProvider from "@/components/GoogleAuthProvider";
import TourOnboarding from "@/components/TourOnboarding";
import Footer from "@/components/Footer";

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

export const metadata: Metadata = {
  title: "FixIt",
  description: "Encontrá servicios de oficios cerca tuyo",
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
          <Navbar />
          <TourOnboarding />
          {children}
          <Footer />
        </GoogleAuthProvider>
      </body>
    </html>
  );
}