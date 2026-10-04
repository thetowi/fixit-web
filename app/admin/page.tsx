"use client";

// /admin ya no es una página con pestañas (ver layout.tsx) — redirige a la primera sección real.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/categorias");
  }, [router]);
  return <p className="p-6 text-ink/60">Cargando...</p>;
}
