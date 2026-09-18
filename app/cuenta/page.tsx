"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario, cerrarSesion, guardarSesion } from "@/lib/auth";
import { PerfilPropio, ActualizarPerfilRequest } from "@/types/perfilPropio";
import { BloqueDisponibilidad, AgregarBloqueRequest } from "@/types/agenda";
import { PerfilPrestador, FotoTrabajo } from "@/types/perfil";
import { Categoria, PrestadorCategoria, AgregarCategoriaRequest } from "@/types/categorias";
import { VerificacionEstado } from "@/types/verificacion";
import { ConexionMercadoPago, IniciarConexionMercadoPago } from "@/types/mercadoPago";
import { activarPush, desactivarPush, pushSoportado, yaSuscriptoPush } from "@/lib/push";
import { buscarDirecciones, SugerenciaDireccion } from "@/lib/geocodificacion";

// Leaflet toca "window" en el momento de importarse, así que no puede renderizarse en el
// servidor: lo cargamos solo del lado del cliente.
const MapaCobertura = dynamic(() => import("@/components/MapaCobertura"), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-ink/10 bg-paper flex items-center justify-center text-sm text-ink/40" style={{ height: 320 }}>
      Cargando mapa...
    </div>
  ),
});

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type Seccion = "perfil" | "servicios" | "acerca" | "cobertura" | "horarios" | "verificacion" | "cobros";

const SECCIONES: { id: Seccion; label: string }[] = [
  { id: "perfil", label: "Perfil" },
  { id: "servicios", label: "Mis servicios" },
  { id: "acerca", label: "Acerca de mí" },
  { id: "cobertura", label: "Cobertura" },
  { id: "horarios", label: "Horarios" },
  { id: "verificacion", label: "Verificación" },
  { id: "cobros", label: "Cobros" },
];

function CampoDocumento({
  label,
  archivo,
  inputRef,
  onChange,
}: {
  label: string;
  archivo: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (archivo: File | null) => void;
}) {
  return (
    <div>
      <p className="text-sm text-ink/60 mb-1">{label}</p>
      <div className="border border-dashed border-ink/25 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 bg-paper">
        <span className={`text-sm truncate ${archivo ? "text-ink" : "text-ink/40"}`}>
          {archivo ? archivo.name : "Ningún archivo seleccionado"}
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm text-copper hover:underline whitespace-nowrap shrink-0"
        >
          {archivo ? "Cambiar" : "Elegir archivo"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

export default function CuentaPage() {
  return (
    <Suspense fallback={<p className="p-6 text-ink/60">Cargando...</p>}>
      <CuentaContenido />
    </Suspense>
  );
}

function CuentaContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [seccion, setSeccion] = useState<Seccion>("perfil");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRefTrabajo = useRef<HTMLInputElement>(null);
  const fileInputRefDni = useRef<HTMLInputElement>(null);
  const fileInputRefAntecedentes = useRef<HTMLInputElement>(null);
  const fileInputRefMatricula = useRef<HTMLInputElement>(null);

  const [perfil, setPerfil] = useState<PerfilPropio | null>(null);
  const [form, setForm] = useState<ActualizarPerfilRequest>({ nombre: "", apellido: "", telefono: "", direccion: "" });

  // --- Autocompletado/verificación de dirección (Nominatim/OpenStreetMap) ---
  // El campo de texto busca/verifica la CALLE (+ localidad, que queda guardada aparte); el
  // número de la casa se carga en un campo propio, con un checkbox por si no tiene.
  const [sugerenciasDireccion, setSugerenciasDireccion] = useState<SugerenciaDireccion[]>([]);
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [calleDireccion, setCalleDireccion] = useState("");
  const [localidadDireccion, setLocalidadDireccion] = useState("");
  const [numeroDireccion, setNumeroDireccion] = useState("");
  const [sinNumeroDireccion, setSinNumeroDireccion] = useState(false);
  const direccionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCambiarCalleDireccion(texto: string) {
    // Escribir a mano invalida cualquier selección previa: solo queda "verificada" si elige
    // una sugerencia de la lista, así que sacamos lat/lon hasta que vuelva a elegir una.
    setCalleDireccion(texto);
    setLocalidadDireccion("");
    setForm((f) => ({ ...f, direccionLat: undefined, direccionLon: undefined }));
    setMostrarSugerencias(true);

    if (direccionDebounceRef.current) clearTimeout(direccionDebounceRef.current);
    if (texto.trim().length < 4) {
      setSugerenciasDireccion([]);
      return;
    }

    direccionDebounceRef.current = setTimeout(async () => {
      setBuscandoDireccion(true);
      const resultados = await buscarDirecciones(texto);
      setSugerenciasDireccion(resultados);
      setBuscandoDireccion(false);
    }, 500);
  }

  function handleElegirSugerenciaDireccion(sugerencia: SugerenciaDireccion) {
    setCalleDireccion(sugerencia.calle);
    setLocalidadDireccion(sugerencia.localidad);
    setForm((f) => ({ ...f, direccionLat: sugerencia.lat, direccionLon: sugerencia.lon }));
    setSugerenciasDireccion([]);
    setMostrarSugerencias(false);
  }

  function handleToggleSinNumero(marcado: boolean) {
    setSinNumeroDireccion(marcado);
    if (marcado) setNumeroDireccion("");
  }

  // Arma el texto final que se guarda: "Calle Número, Localidad" (localidad solo si la tenemos,
  // que es únicamente cuando la calle salió de una sugerencia verificada)
  function armarDireccionCompleta(): string {
    if (!calleDireccion.trim()) return "";
    const calleYNumero = sinNumeroDireccion
      ? `${calleDireccion} s/n`
      : numeroDireccion.trim()
      ? `${calleDireccion} ${numeroDireccion.trim()}`
      : calleDireccion;
    return localidadDireccion ? `${calleYNumero}, ${localidadDireccion}` : calleYNumero;
  }
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // --- Notificaciones push (Cliente y Prestador) ---
  const [pushActivo, setPushActivo] = useState<boolean | null>(null); // null = todavía no se chequeó
  const [cambiandoPush, setCambiandoPush] = useState(false);
  const [errorPush, setErrorPush] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSoportado()) {
      setPushActivo(false);
      return;
    }
    yaSuscriptoPush().then(setPushActivo);
  }, []);

  async function handleTogglePush() {
    setErrorPush(null);
    setCambiandoPush(true);
    try {
      if (pushActivo) {
        await desactivarPush();
        setPushActivo(false);
      } else {
        await activarPush();
        setPushActivo(true);
      }
    } catch (err) {
      setErrorPush(err instanceof Error ? err.message : "No se pudo cambiar el estado de las notificaciones.");
    } finally {
      setCambiandoPush(false);
    }
  }

  const [bloques, setBloques] = useState<BloqueDisponibilidad[]>([]);
  const [diaNuevo, setDiaNuevo] = useState(1);
  const [horaInicioNueva, setHoraInicioNueva] = useState("09:00");
  const [horaFinNueva, setHoraFinNueva] = useState("18:00");

  // --- Acerca de mí (Prestador) ---
  const [biografia, setBiografia] = useState("");
  const [fotosTrabajo, setFotosTrabajo] = useState<FotoTrabajo[]>([]);
  const [errorAcerca, setErrorAcerca] = useState<string | null>(null);
  const [mensajeExitoAcerca, setMensajeExitoAcerca] = useState<string | null>(null);
  const [guardandoAcerca, setGuardandoAcerca] = useState(false);
  const [subiendoFotoTrabajo, setSubiendoFotoTrabajo] = useState(false);

  // --- Cobertura (Prestador): ubicación base + radio de trabajo ---
  const [coberturaLat, setCoberturaLat] = useState<number | null>(null);
  const [coberturaLng, setCoberturaLng] = useState<number | null>(null);
  const [coberturaRadioKm, setCoberturaRadioKm] = useState(10);
  const [errorCobertura, setErrorCobertura] = useState<string | null>(null);
  const [mensajeExitoCobertura, setMensajeExitoCobertura] = useState<string | null>(null);
  const [guardandoCobertura, setGuardandoCobertura] = useState(false);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);

  // --- Mis servicios (Prestador) ---
  const [categoriasDisponibles, setCategoriasDisponibles] = useState<Categoria[]>([]);
  const [misCategorias, setMisCategorias] = useState<PrestadorCategoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | "">("");
  const [descripcionServicio, setDescripcionServicio] = useState("");
  const [precioServicio, setPrecioServicio] = useState("");
  const [errorServicios, setErrorServicios] = useState<string | null>(null);

  // --- Verificación (Prestador) ---
  const [verifEstado, setVerifEstado] = useState<VerificacionEstado | null>(null);
  const [verifDniNumero, setVerifDniNumero] = useState("");
  const [verifDniFoto, setVerifDniFoto] = useState<File | null>(null);
  const [verifAntecedentes, setVerifAntecedentes] = useState<File | null>(null);
  const [verifMatricula, setVerifMatricula] = useState<File | null>(null);
  const [errorVerif, setErrorVerif] = useState<string | null>(null);
  const [enviandoVerif, setEnviandoVerif] = useState(false);

  // --- Cobros / Mercado Pago (Prestador) ---
  const [mpEstado, setMpEstado] = useState<ConexionMercadoPago | null>(null);
  const [errorMp, setErrorMp] = useState<string | null>(null);
  const [conectandoMp, setConectandoMp] = useState(false);
  const [mensajeMp, setMensajeMp] = useState<string | null>(null);

  useEffect(() => {
    if (!obtenerUsuario()) {
      router.push("/login");
      return;
    }
    cargarPerfil();
  }, [router]);

  // Mercado Pago nos redirige de vuelta acá con ?mp=conectado o ?mp=error tras el flujo de OAuth
  useEffect(() => {
    const resultadoMp = searchParams.get("mp");
    if (!resultadoMp) return;

    if (resultadoMp === "conectado") {
      setMensajeMp("¡Listo! Tu cuenta de Mercado Pago quedó conectada.");
      setSeccion("cobros");
      cargarEstadoMp();
    } else if (resultadoMp === "error") {
      setMensajeMp("No pudimos conectar tu cuenta de Mercado Pago. Probá de nuevo.");
      setSeccion("cobros");
    }

    router.replace("/cuenta");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function cargarPerfil() {
    try {
      const data = await apiFetch<PerfilPropio>("/api/usuarios/perfil");
      setPerfil(data);
      setForm({ nombre: data.nombre, apellido: data.apellido, telefono: data.telefono, direccion: data.direccion ?? "" });
      // La dirección ya guardada se precarga tal cual en el campo de "calle" (no la separamos en
      // calle/número/localidad porque no guardamos esas partes por separado) — si el usuario no
      // la toca, se vuelve a mandar igual; si la re-busca y elige una sugerencia nueva, ahí sí
      // queda estructurada y verificada.
      setCalleDireccion(data.direccion ?? "");
      setLocalidadDireccion("");
      setNumeroDireccion("");
      setSinNumeroDireccion(false);

      if (data.rol === "Prestador") {
        setCoberturaLat(data.latitud);
        setCoberturaLng(data.longitud);
        if (data.radioAlcanceKm) setCoberturaRadioKm(data.radioAlcanceKm);

        // Si todavía no configuró su ubicación, le pedimos el GPS del dispositivo para
        // centrar el mapa ahí directamente (puede corregirla arrastrando el pin después)
        if (data.latitud === null && data.longitud === null) {
          obtenerUbicacionActual({ silencioso: true });
        }

        await Promise.all([cargarBloques(), cargarPerfilPrestador(), cargarServicios(), cargarVerificacion(), cargarEstadoMp()]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar tu perfil");
    } finally {
      setCargando(false);
    }
  }

  function obtenerUbicacionActual({ silencioso = false }: { silencioso?: boolean } = {}) {
    if (!navigator.geolocation) {
      if (!silencioso) setErrorCobertura("Tu navegador no permite obtener la ubicación automáticamente.");
      return;
    }

    setBuscandoUbicacion(true);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setCoberturaLat(posicion.coords.latitude);
        setCoberturaLng(posicion.coords.longitude);
        setBuscandoUbicacion(false);
      },
      () => {
        setBuscandoUbicacion(false);
        if (!silencioso) {
          setErrorCobertura("No pudimos acceder a tu ubicación. Marcá el punto directamente en el mapa.");
        }
      }
    );
  }

  async function handleGuardarCobertura() {
    setErrorCobertura(null);
    setMensajeExitoCobertura(null);

    if (coberturaLat === null || coberturaLng === null) {
      setErrorCobertura("Marcá tu ubicación en el mapa antes de guardar.");
      return;
    }

    setGuardandoCobertura(true);
    try {
      await apiFetch("/api/usuarios/ubicacion", {
        method: "PUT",
        body: JSON.stringify({
          latitud: coberturaLat,
          longitud: coberturaLng,
          radioAlcanceKm: coberturaRadioKm,
        }),
      });
      setMensajeExitoCobertura("Tu cobertura quedó actualizada.");
    } catch (err) {
      setErrorCobertura(err instanceof ApiError ? err.message : "Error al guardar tu cobertura");
    } finally {
      setGuardandoCobertura(false);
    }
  }

  async function cargarBloques() {
    try {
      const data = await apiFetch<BloqueDisponibilidad[]>("/api/prestador/disponibilidad");
      setBloques(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar tus horarios");
    }
  }

  async function cargarPerfilPrestador() {
    const usuario = obtenerUsuario();
    if (!usuario) return;
    try {
      const data = await apiFetch<PerfilPrestador>(`/api/prestadores/${usuario.id}`);
      setBiografia(data.biografia ?? "");
      setFotosTrabajo(data.fotosTrabajo);
    } catch (err) {
      setErrorAcerca(err instanceof ApiError ? err.message : "Error al cargar tu perfil de prestador");
    }
  }

  async function cargarServicios() {
    try {
      const [disponibles, mias] = await Promise.all([
        apiFetch<Categoria[]>("/api/Categorias"),
        apiFetch<PrestadorCategoria[]>("/api/prestador/categorias"),
      ]);
      setCategoriasDisponibles(disponibles);
      setMisCategorias(mias);
    } catch (err) {
      setErrorServicios(err instanceof ApiError ? err.message : "Error al cargar tus servicios");
    }
  }

  async function cargarVerificacion() {
    try {
      const data = await apiFetch<VerificacionEstado>("/api/verificacion/mi-estado");
      setVerifEstado(data);
    } catch (err) {
      setErrorVerif(err instanceof ApiError ? err.message : "Error al cargar tu verificación");
    }
  }

  async function cargarEstadoMp() {
    try {
      const data = await apiFetch<ConexionMercadoPago>("/api/mercadopago/estado");
      setMpEstado(data);
    } catch (err) {
      setErrorMp(err instanceof ApiError ? err.message : "Error al consultar el estado de Mercado Pago");
    }
  }

  async function handleConectarMp() {
    setErrorMp(null);
    setConectandoMp(true);
    try {
      const data = await apiFetch<IniciarConexionMercadoPago>("/api/mercadopago/oauth/iniciar");
      window.location.href = data.initPoint;
    } catch (err) {
      setErrorMp(err instanceof ApiError ? err.message : "Error al iniciar la conexión con Mercado Pago");
      setConectandoMp(false);
    }
  }

  async function handleEnviarVerificacion(e: React.FormEvent) {
    e.preventDefault();
    setErrorVerif(null);

    if (!verifDniNumero.trim() || !verifDniFoto || !verifAntecedentes || !verifMatricula) {
      setErrorVerif("Completá el número de DNI y subí los tres documentos.");
      return;
    }

    setEnviandoVerif(true);
    const token = localStorage.getItem("fixit_token");
    const formData = new FormData();
    formData.append("dniNumero", verifDniNumero);
    formData.append("dniFoto", verifDniFoto);
    formData.append("antecedentes", verifAntecedentes);
    formData.append("matricula", verifMatricula);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/verificacion`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "Error al enviar la verificación");
      }

      setVerifDniFoto(null);
      setVerifAntecedentes(null);
      setVerifMatricula(null);
      await cargarVerificacion();
    } catch (err) {
      setErrorVerif(err instanceof Error ? err.message : "Error al enviar la verificación");
    } finally {
      setEnviandoVerif(false);
    }
  }

  async function handleAgregarBloque(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const body: AgregarBloqueRequest = {
      diaSemana: diaNuevo,
      horaInicio: `${horaInicioNueva}:00`,
      horaFin: `${horaFinNueva}:00`,
    };

    try {
      await apiFetch("/api/prestador/disponibilidad", { method: "POST", body: JSON.stringify(body) });
      await cargarBloques();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al agregar el bloque");
    }
  }

  async function handleQuitarBloque(id: number) {
    try {
      await apiFetch(`/api/prestador/disponibilidad/${id}`, { method: "DELETE" });
      await cargarBloques();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al quitar el bloque");
    }
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);
    setGuardando(true);

    try {
      const cuerpo = { ...form, direccion: armarDireccionCompleta() };
      const actualizado = await apiFetch<PerfilPropio>("/api/usuarios/perfil", {
        method: "PUT",
        body: JSON.stringify(cuerpo),
      });
      setPerfil(actualizado);

      const usuarioActual = obtenerUsuario();
      const token = localStorage.getItem("fixit_token");
      if (usuarioActual && token) {
        guardarSesion(token, { ...usuarioActual, nombre: actualizado.nombre, apellido: actualizado.apellido });
      }

      setMensajeExito("Datos actualizados correctamente.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al guardar los cambios");
    } finally {
      setGuardando(false);
    }
  }

  async function handleCambiarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setError(null);
    setSubiendoFoto(true);

    const token = localStorage.getItem("fixit_token");
    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/usuarios/foto-perfil`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "Error al subir la imagen");
      }

      const data = await response.json();
      setPerfil((prev) => (prev ? { ...prev, fotoPerfilUrl: data.fotoPerfilUrl } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setSubiendoFoto(false);
    }
  }

  async function handleGuardarAcercaDeMi(e: React.FormEvent) {
    e.preventDefault();
    setErrorAcerca(null);
    setMensajeExitoAcerca(null);
    setGuardandoAcerca(true);

    try {
      await apiFetch("/api/prestador/acerca-de-mi", {
        method: "PUT",
        body: JSON.stringify({
          biografia: biografia || null,
        }),
      });
      setMensajeExitoAcerca("Datos actualizados correctamente.");
    } catch (err) {
      setErrorAcerca(err instanceof ApiError ? err.message : "Error al guardar los cambios");
    } finally {
      setGuardandoAcerca(false);
    }
  }

  async function handleSubirFotoTrabajo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setErrorAcerca(null);
    setSubiendoFotoTrabajo(true);

    const token = localStorage.getItem("fixit_token");
    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/prestador/fotos-trabajo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "Error al subir la imagen");
      }

      const nuevaFoto: FotoTrabajo = await response.json();
      setFotosTrabajo((prev) => [nuevaFoto, ...prev]);
    } catch (err) {
      setErrorAcerca(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setSubiendoFotoTrabajo(false);
      if (fileInputRefTrabajo.current) fileInputRefTrabajo.current.value = "";
    }
  }

  async function handleEliminarFotoTrabajo(fotoId: string) {
    try {
      await apiFetch(`/api/prestador/fotos-trabajo/${fotoId}`, { method: "DELETE" });
      setFotosTrabajo((prev) => prev.filter((f) => f.id !== fotoId));
    } catch (err) {
      setErrorAcerca(err instanceof ApiError ? err.message : "Error al eliminar la foto");
    }
  }

  async function handleAgregarServicio(e: React.FormEvent) {
    e.preventDefault();
    setErrorServicios(null);

    if (!categoriaSeleccionada) {
      setErrorServicios("Elegí una categoría.");
      return;
    }

    const body: AgregarCategoriaRequest = {
      categoriaId: Number(categoriaSeleccionada),
      descripcion: descripcionServicio || undefined,
      precioReferencia: precioServicio ? Number(precioServicio) : undefined,
    };

    try {
      await apiFetch<PrestadorCategoria>("/api/prestador/categorias", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setCategoriaSeleccionada("");
      setDescripcionServicio("");
      setPrecioServicio("");
      await cargarServicios();
    } catch (err) {
      setErrorServicios(err instanceof ApiError ? err.message : "Error al agregar la categoría");
    }
  }

  async function handleQuitarServicio(id: number) {
    try {
      await apiFetch(`/api/prestador/categorias/${id}`, { method: "DELETE" });
      await cargarServicios();
    } catch (err) {
      setErrorServicios(err instanceof ApiError ? err.message : "Error al quitar la categoría");
    }
  }

  function handleLogout() {
    cerrarSesion();
    router.push("/login");
  }

  if (cargando) return <p className="p-6 text-ink/60">Cargando...</p>;
  if (!perfil) return null;

  const categoriasParaAgregar = categoriasDisponibles.filter(
    (c) => !misCategorias.some((mc) => mc.categoriaId === c.id)
  );

  return (
    <div className="max-w-2xl mx-auto mt-16 p-6 w-full">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Mi cuenta</p>
      <h1 className="font-display text-2xl text-ink mb-6">
        {perfil.nombre} {perfil.apellido}
      </h1>

      {perfil.rol === "Prestador" && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {SECCIONES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSeccion(s.id)}
              className={`text-sm rounded-lg px-3 py-1.5 border border-dashed transition-colors ${
                seccion === s.id
                  ? "bg-copper text-paper border-copper"
                  : "border-ink/20 text-ink/60 hover:border-ink/40"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {(perfil.rol !== "Prestador" || seccion === "perfil") && (
      <div className="bg-surface border border-ink/10 rounded-lg p-5 mb-6">
        <div className="flex items-center gap-4 mb-5">
          {perfil.fotoPerfilUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={perfil.fotoPerfilUrl}
              alt="Foto de perfil"
              className="w-16 h-16 rounded-full object-cover border-2 border-copper"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-ink/10 flex items-center justify-center font-display text-lg text-ink">
              {perfil.nombre[0]}{perfil.apellido[0]}
            </div>
          )}
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={subiendoFoto}
              className="text-sm text-copper hover:underline disabled:opacity-40"
            >
              {subiendoFoto ? "Subiendo..." : "Cambiar foto"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleCambiarFoto}
            />
            <p className="text-xs text-ink/50 mt-1">
              {perfil.email} · <span className="uppercase">{perfil.rol}</span>
              {perfil.verificado && <span className="text-stamp ml-1">✓</span>}
            </p>
          </div>
        </div>

        <form onSubmit={handleGuardar} className="flex flex-col gap-3">
          <label className="text-sm text-ink/60">
            Nombre
            <input
              type="text"
              required
              className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </label>
          <label className="text-sm text-ink/60">
            Apellido
            <input
              type="text"
              required
              className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
            />
          </label>
          <label className="text-sm text-ink/60">
            Teléfono
            <input
              type="tel"
              className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </label>
          <label className="text-sm text-ink/60 relative">
            Dirección
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                placeholder="Empezá a tipear la calle y elegí una sugerencia para verificarla"
                className="border border-ink/20 rounded p-2 flex-1 bg-paper"
                value={calleDireccion}
                onChange={(e) => handleCambiarCalleDireccion(e.target.value)}
                onFocus={() => setMostrarSugerencias(true)}
                onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
                autoComplete="off"
              />
              <input
                type="text"
                inputMode="numeric"
                placeholder="Número"
                disabled={sinNumeroDireccion}
                className="border border-ink/20 rounded p-2 w-24 bg-paper disabled:opacity-40"
                value={numeroDireccion}
                onChange={(e) => setNumeroDireccion(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-1.5 mt-1.5 text-xs text-ink/50 font-normal">
              <input
                type="checkbox"
                checked={sinNumeroDireccion}
                onChange={(e) => handleToggleSinNumero(e.target.checked)}
              />
              Sin número
            </label>

            {mostrarSugerencias && (buscandoDireccion || sugerenciasDireccion.length > 0) && (
              <ul className="absolute z-20 left-0 right-0 mt-1 bg-surface border border-ink/15 rounded-lg shadow-lg overflow-hidden">
                {buscandoDireccion && (
                  <li className="px-3 py-2 text-xs text-ink/40">Buscando...</li>
                )}
                {!buscandoDireccion &&
                  sugerenciasDireccion.map((s, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()} // evita que el blur se dispare antes del click
                        onClick={() => handleElegirSugerenciaDireccion(s)}
                        className="w-full text-left px-3 py-2 text-xs text-ink hover:bg-copper/10 transition-colors"
                      >
                        {s.calle}{s.localidad ? `, ${s.localidad}` : ""}
                      </button>
                    </li>
                  ))}
              </ul>
            )}

            {perfil.direccion && (
              perfil.direccionVerificada ? (
                <span className="text-xs text-stamp flex items-center gap-1 mt-1">✓ Dirección verificada</span>
              ) : (
                <span className="text-xs text-ink/40 block mt-1">
                  Sin verificar — elegí una sugerencia de la lista para verificarla.
                </span>
              )
            )}
            {perfil.rol === "Cliente" && (
              <span className="text-xs text-ink/40 block mt-1">
                El prestador la va a ver al programar el turno de un trabajo tuyo.
              </span>
            )}
          </label>

          {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}
          {mensajeExito && <p className="text-stamp text-sm">{mensajeExito}</p>}

          <button
            type="submit"
            disabled={guardando}
            className="bg-copper text-paper rounded p-2 font-medium hover:bg-copper-dark transition-colors disabled:opacity-40 mt-1"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
      )}

      {(perfil.rol !== "Prestador" || seccion === "perfil") && (
      <div className="bg-surface border border-ink/10 rounded-lg p-5 mb-6">
        <p className="font-medium text-ink mb-1">Notificaciones</p>
        <p className="text-xs text-ink/50 mb-3">
          Activá los avisos de este navegador para enterarte de mensajes y ofertas nuevas aunque
          no tengas FixIt abierto en una pestaña.
        </p>

        {!pushSoportado() ? (
          <p className="text-xs text-ink/40">Este navegador no soporta notificaciones push.</p>
        ) : (
          <>
            {errorPush && <p className="text-red-700 dark:text-red-400 text-sm mb-2">{errorPush}</p>}
            <button
              onClick={handleTogglePush}
              disabled={cambiandoPush || pushActivo === null}
              className={`text-sm rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-40 ${
                pushActivo ? "border border-ink/20 text-ink/60 hover:border-ink/40" : "bg-copper text-paper hover:bg-copper-dark"
              }`}
            >
              {cambiandoPush
                ? "Actualizando..."
                : pushActivo
                ? "Desactivar notificaciones"
                : "Activar notificaciones en este dispositivo"}
            </button>
          </>
        )}
      </div>
      )}

      {perfil.rol === "Prestador" && seccion === "servicios" && (
        <div className="bg-surface border border-ink/10 rounded-lg p-5 mb-6" data-tour="cuenta-servicios">
          <p className="font-medium text-ink mb-3">Mis servicios</p>

          <form onSubmit={handleAgregarServicio} className="flex flex-col gap-3 mb-5">
            <select
              className="border border-ink/20 rounded p-2 bg-paper"
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Elegí una categoría</option>
              {categoriasParaAgregar.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <textarea
              placeholder="Descripción (ej: 10 años de experiencia, atiendo urgencias)"
              className="border border-ink/20 rounded p-2 bg-paper"
              value={descripcionServicio}
              onChange={(e) => setDescripcionServicio(e.target.value)}
            />

            <div className="relative">
              <input
                type="number"
                placeholder="Precio por hora (opcional)"
                className="border border-ink/20 rounded p-2 pr-14 w-full bg-paper"
                value={precioServicio}
                onChange={(e) => setPrecioServicio(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/40 pointer-events-none">
                /hora
              </span>
            </div>

            {errorServicios && <p className="text-red-700 dark:text-red-400 text-sm">{errorServicios}</p>}

            <button type="submit" className="bg-copper text-paper rounded p-2 font-medium hover:bg-copper-dark transition-colors">
              Agregar
            </button>
          </form>

          {misCategorias.length === 0 ? (
            <p className="text-ink/50 text-sm">Todavía no agregaste ningún servicio.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {misCategorias.map((mc) => (
                <li key={mc.id} className="flex justify-between items-start bg-paper rounded p-2 text-sm">
                  <div>
                    <p className="font-medium text-ink">{mc.categoriaNombre}</p>
                    {mc.descripcion && <p className="text-ink/60">{mc.descripcion}</p>}
                    {mc.precioReferencia && (
                      <p className="font-mono text-ink/70 mt-1">
                        Desde ${mc.precioReferencia.toLocaleString("es-AR")} /hora
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleQuitarServicio(mc.id)}
                    className="text-red-700/70 dark:text-red-400/70 hover:text-red-700 dark:hover:text-red-400 text-xs"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {perfil.rol === "Prestador" && seccion === "acerca" && (
        <div className="bg-surface border border-ink/10 rounded-lg p-5 mb-6" data-tour="cuenta-acerca">
          <p className="font-medium text-ink mb-3">Acerca de mí</p>

          <form onSubmit={handleGuardarAcercaDeMi} className="flex flex-col gap-3 mb-5">
            <label className="text-sm text-ink/60">
              Contanos sobre vos
              <textarea
                placeholder="Edad, años de experiencia, a qué te dedicás dentro del oficio..."
                rows={4}
                className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
                value={biografia}
                onChange={(e) => setBiografia(e.target.value)}
              />
            </label>

            {errorAcerca && <p className="text-red-700 dark:text-red-400 text-sm">{errorAcerca}</p>}
            {mensajeExitoAcerca && <p className="text-stamp text-sm">{mensajeExitoAcerca}</p>}

            <button
              type="submit"
              disabled={guardandoAcerca}
              className="bg-copper text-paper rounded p-2 font-medium hover:bg-copper-dark transition-colors disabled:opacity-40"
            >
              {guardandoAcerca ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>

          <div className="pt-4 border-t border-ink/10">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-medium text-ink">Fotos de trabajos</p>
              <button
                onClick={() => fileInputRefTrabajo.current?.click()}
                disabled={subiendoFotoTrabajo}
                className="text-sm text-copper hover:underline disabled:opacity-40"
              >
                {subiendoFotoTrabajo ? "Subiendo..." : "+ Agregar foto"}
              </button>
              <input
                ref={fileInputRefTrabajo}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleSubirFotoTrabajo}
              />
            </div>

            {fotosTrabajo.length === 0 ? (
              <p className="text-ink/50 text-sm">Todavía no subiste fotos de trabajos.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {fotosTrabajo.map((f) => (
                  <div key={f.id} className="relative aspect-square rounded-lg overflow-hidden bg-ink/5 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleEliminarFotoTrabajo(f.id)}
                      className="absolute top-1 right-1 bg-ink/70 text-paper text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {perfil.rol === "Prestador" && seccion === "cobertura" && (
        <div className="bg-surface border border-ink/10 rounded-lg p-5 mb-6" data-tour="cuenta-cobertura">
          <p className="font-medium text-ink mb-1">Cobertura</p>
          <p className="text-xs text-ink/50 mb-4">
            Marcá desde dónde vas a prestar tus servicios y hasta qué distancia estás dispuesto a moverte.
            Solo vas a aparecer en las búsquedas de clientes que estén dentro de ese radio.
          </p>

          <MapaCobertura
            latitud={coberturaLat}
            longitud={coberturaLng}
            radioKm={coberturaRadioKm}
            onCambiarUbicacion={(lat, lng) => {
              setCoberturaLat(lat);
              setCoberturaLng(lng);
            }}
          />

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-ink/50">
              {coberturaLat !== null && coberturaLng !== null
                ? "Tocá el mapa o arrastrá el pin para ajustar tu ubicación."
                : "Todavía no marcaste tu ubicación."}
            </p>
            <button
              type="button"
              onClick={() => obtenerUbicacionActual()}
              disabled={buscandoUbicacion}
              className="text-xs text-copper hover:underline disabled:opacity-40 whitespace-nowrap ml-3"
            >
              {buscandoUbicacion ? "Buscando..." : "Usar mi ubicación actual"}
            </button>
          </div>

          <div className="mt-5">
            <label className="text-sm text-ink/60 flex items-center justify-between">
              <span>Radio de cobertura</span>
              <span className="font-mono text-ink text-sm">{coberturaRadioKm} km</span>
            </label>
            <input
              type="range"
              min={1}
              max={100}
              value={coberturaRadioKm}
              onChange={(e) => setCoberturaRadioKm(Number(e.target.value))}
              className="w-full mt-2 accent-copper"
            />
          </div>

          {errorCobertura && <p className="text-red-700 dark:text-red-400 text-sm mt-3">{errorCobertura}</p>}
          {mensajeExitoCobertura && <p className="text-stamp text-sm mt-3">{mensajeExitoCobertura}</p>}

          <button
            type="button"
            onClick={handleGuardarCobertura}
            disabled={guardandoCobertura}
            className="w-full mt-4 bg-copper text-paper rounded p-2 font-medium hover:bg-copper-dark transition-colors disabled:opacity-40"
          >
            {guardandoCobertura ? "Guardando..." : "Guardar cobertura"}
          </button>
        </div>
      )}

      {perfil.rol === "Prestador" && seccion === "horarios" && (
        <div className="bg-surface border border-ink/10 rounded-lg p-5 mb-6" data-tour="cuenta-horarios">
          <p className="font-medium text-ink mb-1">Horarios en los que trabajo</p>
          <p className="text-xs text-ink/50 mb-3">
            Definí los días y horarios en los que estás disponible. Esto es lo que ven tus clientes y lo que se usa en tu agenda para saber cuándo podés recibir turnos.
          </p>

          <ul className="flex flex-col gap-2 mb-4">
            {bloques.length === 0 && (
              <p className="text-ink/50 text-sm">Todavía no cargaste tus horarios.</p>
            )}
            {bloques.map((b) => (
              <li key={b.id} className="flex justify-between items-center text-sm bg-paper rounded p-2">
                <span className="text-ink">
                  {DIAS[b.diaSemana]} · {b.horaInicio.slice(0, 5)} a {b.horaFin.slice(0, 5)}
                </span>
                <button onClick={() => handleQuitarBloque(b.id)} className="text-red-700/70 dark:text-red-400/70 hover:text-red-700 dark:hover:text-red-400 text-xs">
                  Quitar
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAgregarBloque} className="flex gap-2 items-end flex-wrap">
            <label className="text-xs text-ink/60">
              Día
              <select
                className="border border-ink/20 rounded p-2 bg-paper block mt-1"
                value={diaNuevo}
                onChange={(e) => setDiaNuevo(Number(e.target.value))}
              >
                {DIAS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink/60">
              Desde
              <input
                type="time"
                className="border border-ink/20 rounded p-2 bg-paper block mt-1"
                value={horaInicioNueva}
                onChange={(e) => setHoraInicioNueva(e.target.value)}
              />
            </label>
            <label className="text-xs text-ink/60">
              Hasta
              <input
                type="time"
                className="border border-ink/20 rounded p-2 bg-paper block mt-1"
                value={horaFinNueva}
                onChange={(e) => setHoraFinNueva(e.target.value)}
              />
            </label>
            <button type="submit" className="bg-copper text-paper rounded px-4 py-2 text-sm hover:bg-copper-dark transition-colors">
              Agregar
            </button>
          </form>
        </div>
      )}

      {perfil.rol === "Prestador" && seccion === "verificacion" && (
        <div className="bg-surface border border-ink/10 rounded-lg p-5 mb-6" data-tour="cuenta-verificacion">
          <p className="font-medium text-ink mb-1">Verificación de identidad</p>
          <p className="text-xs text-ink/50 mb-4">
            Verificar tu cuenta le muestra a los clientes que presentaste tu DNI, un certificado de antecedentes
            penales y tu matrícula (o comprobante equivalente del rubro). Un admin revisa los documentos antes
            de aprobarlos.
          </p>

          {verifEstado?.estado === "Aprobado" && (
            <div className="border border-stamp/30 bg-stamp/5 rounded-lg p-4 flex items-center gap-2">
              <span className="text-stamp text-lg">✓</span>
              <p className="text-sm text-ink">Tu cuenta está verificada.</p>
            </div>
          )}

          {verifEstado?.estado === "Pendiente" && (
            <div className="border border-copper/30 bg-copper/5 rounded-lg p-4">
              <p className="text-sm text-ink font-medium mb-1">Verificación en revisión</p>
              <p className="text-xs text-ink/60">
                Enviaste tus documentos
                {verifEstado.enviadaEn ? ` el ${new Date(verifEstado.enviadaEn).toLocaleDateString("es-AR")}` : ""}.
                Te avisamos apenas los revisemos.
              </p>
            </div>
          )}

          {(verifEstado?.estado === "SinEnviar" || verifEstado?.estado === "Rechazado") && (
            <>
              {verifEstado.estado === "Rechazado" && (
                <div className="border border-red-700/20 dark:border-red-400/20 bg-red-700/5 dark:bg-red-400/5 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">Verificación rechazada</p>
                  {verifEstado.motivoRechazo && (
                    <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-1">{verifEstado.motivoRechazo}</p>
                  )}
                  <p className="text-xs text-ink/50 mt-1">Podés corregir y volver a enviar tus documentos.</p>
                </div>
              )}

              <form onSubmit={handleEnviarVerificacion} className="flex flex-col gap-3">
                <label className="text-sm text-ink/60">
                  Número de DNI
                  <input
                    type="text"
                    className="border border-ink/20 rounded p-2 w-full mt-1 bg-paper"
                    value={verifDniNumero}
                    onChange={(e) => setVerifDniNumero(e.target.value)}
                  />
                </label>

                <CampoDocumento
                  label="Foto del DNI (frente)"
                  archivo={verifDniFoto}
                  inputRef={fileInputRefDni}
                  onChange={setVerifDniFoto}
                />

                <CampoDocumento
                  label="Certificado de antecedentes penales"
                  archivo={verifAntecedentes}
                  inputRef={fileInputRefAntecedentes}
                  onChange={setVerifAntecedentes}
                />

                <CampoDocumento
                  label="Matrícula del rubro (o comprobante equivalente)"
                  archivo={verifMatricula}
                  inputRef={fileInputRefMatricula}
                  onChange={setVerifMatricula}
                />

                <p className="text-[11px] text-ink/40">Imagen o PDF, hasta 8 MB cada uno.</p>

                {errorVerif && <p className="text-red-700 dark:text-red-400 text-sm">{errorVerif}</p>}

                <button
                  type="submit"
                  disabled={enviandoVerif}
                  className="bg-copper text-paper rounded p-2 font-medium hover:bg-copper-dark transition-colors disabled:opacity-40 mt-1"
                >
                  {enviandoVerif ? "Enviando..." : "Enviar para revisión"}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {perfil.rol === "Prestador" && seccion === "cobros" && (
        <div className="bg-surface border border-ink/10 rounded-lg p-5 mb-6" data-tour="cuenta-cobros">
          <p className="font-medium text-ink mb-1">Cobros</p>
          <p className="text-xs text-ink/50 mb-4">
            Conectá tu propia cuenta de Mercado Pago para que los pagos de tus trabajos se depositen
            directo ahí. FixIt se queda con su comisión automáticamente al momento del cobro.
          </p>

          {mensajeMp && (
            <div className="border border-copper/30 bg-copper/5 rounded-lg p-3 mb-4">
              <p className="text-sm text-ink">{mensajeMp}</p>
            </div>
          )}

          {mpEstado?.conectado ? (
            <div className="border border-stamp/30 bg-stamp/5 rounded-lg p-4">
              <p className="text-sm text-ink flex items-center gap-2 mb-1">
                <span className="text-stamp text-lg">✓</span> Tu cuenta de Mercado Pago está conectada.
              </p>
              {mpEstado.trabajosGratisRestantes > 0 ? (
                <p className="text-xs text-ink/60">
                  Te quedan <span className="font-medium text-ink">{mpEstado.trabajosGratisRestantes}</span> trabajos
                  sin comisión de FixIt (ya cobraste {mpEstado.trabajosPagados}).
                </p>
              ) : (
                <p className="text-xs text-ink/60">
                  Ya usaste tus trabajos sin comisión ({mpEstado.trabajosPagados} cobrados en total) — de acá en
                  más se aplica la comisión de FixIt en cada cobro.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink/70">Todavía no conectaste ninguna cuenta de Mercado Pago.</p>
              <button
                onClick={handleConectarMp}
                disabled={conectandoMp}
                className="bg-copper text-paper rounded p-2 font-medium hover:bg-copper-dark transition-colors disabled:opacity-40 self-start px-4"
              >
                {conectandoMp ? "Redirigiendo..." : "Conectar con Mercado Pago"}
              </button>
            </div>
          )}

          {errorMp && <p className="text-red-700 dark:text-red-400 text-sm mt-3">{errorMp}</p>}
        </div>
      )}

      <button onClick={handleLogout} className="text-sm text-ink/40 hover:text-ink/70 transition-colors">
        Cerrar sesión
      </button>
    </div>
  );
}
