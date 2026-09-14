"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// "Acerca de mí" ahora vive dentro de Mi cuenta, como configuración de perfil del prestador.
export default function AcercaDeMiPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cuenta");
  }, [router]);

  return <p className="p-6 text-ink/60">Redirigiendo a Mi cuenta...</p>;
}
