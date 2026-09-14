"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { ConfirmarEmailRequest, ReenviarCodigoRequest } from "@/types/auth";

function ConfirmarEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailInicial = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setCargando(true);

    try {
      const body: ConfirmarEmailRequest = { email, codigo };
      await apiFetch<void>("/api/Auth/confirmar-email", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push("/login?confirmado=true");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  async function handleReenviar() {
    setError(null);
    setMensaje(null);
    setReenviando(true);

    try {
      const body: ReenviarCodigoRequest = { email };
      await apiFetch<void>("/api/Auth/reenviar-codigo", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMensaje("Te reenviamos el código. Revisá tu casilla (y la carpeta de spam, por las dudas).");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado");
    } finally {
      setReenviando(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 w-full">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Un último paso</p>
      <h1 className="font-display text-2xl text-ink mb-2">Confirmá tu email</h1>
      <p className="text-ink/60 mb-6">
        Te mandamos un código de 6 dígitos a <span className="font-medium text-ink">{email || "tu email"}</span>. Ingresalo acá abajo para activar tu cuenta.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white border border-ink/10 rounded-lg p-5">
        <input
          type="email"
          placeholder="Email"
          required
          className="border border-ink/20 rounded p-2 bg-paper"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Código de 6 dígitos"
          required
          maxLength={6}
          pattern="[0-9]{6}"
          className="border border-ink/20 rounded p-2 bg-paper text-center text-2xl tracking-[0.5em] font-mono"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />

        {error && <p className="text-red-700 text-sm">{error}</p>}
        {mensaje && <p className="text-green-700 text-sm">{mensaje}</p>}

        <button
          type="submit"
          disabled={cargando || codigo.length !== 6}
          className="bg-copper text-paper rounded p-2 font-medium hover:bg-copper-dark transition-colors disabled:opacity-40"
        >
          {cargando ? "Confirmando..." : "Confirmar cuenta"}
        </button>

        <button
          type="button"
          onClick={handleReenviar}
          disabled={reenviando || !email}
          className="text-copper text-sm hover:underline disabled:opacity-40"
        >
          {reenviando ? "Reenviando..." : "¿No te llegó? Reenviar código"}
        </button>
      </form>

      <p className="text-sm text-ink/50 mt-4 text-center">
        ¿Ya confirmaste? <a href="/login" className="text-copper hover:underline">Iniciá sesión</a>
      </p>
    </div>
  );
}

export default function ConfirmarEmailPage() {
  return (
    <Suspense>
      <ConfirmarEmailForm />
    </Suspense>
  );
}
