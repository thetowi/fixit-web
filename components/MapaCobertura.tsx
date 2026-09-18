"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// react-leaflet no incluye los íconos del marcador por defecto cuando se empaqueta con
// bundlers modernos (webpack/turbopack no resuelven las rutas relativas que usa Leaflet
// internamente). Apuntamos los íconos a un CDN para no tener que manejar los assets a mano.
const iconoMarcador = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const BUENOS_AIRES: [number, number] = [-34.6037, -58.3816];

function RecentrarMapa({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const yaCentrado = useRef(false);

  useEffect(() => {
    // Solo recentramos automáticamente la primera vez que tenemos coordenadas (ej. al
    // detectar el GPS). Después, si el usuario mueve el mapa o arrastra el pin, lo dejamos.
    if (!yaCentrado.current) {
      map.setView([lat, lng], map.getZoom());
      yaCentrado.current = true;
    }
  }, [lat, lng, map]);

  return null;
}

function ClicksEnElMapa({ onElegirUbicacion }: { onElegirUbicacion: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onElegirUbicacion(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapaCobertura({
  latitud,
  longitud,
  radioKm,
  onCambiarUbicacion,
}: {
  latitud: number | null;
  longitud: number | null;
  radioKm: number;
  onCambiarUbicacion: (lat: number, lng: number) => void;
}) {
  const centro: [number, number] = latitud !== null && longitud !== null ? [latitud, longitud] : BUENOS_AIRES;

  return (
    <div className="rounded-lg overflow-hidden border border-ink/10" style={{ height: 320 }}>
      <MapContainer center={centro} zoom={latitud !== null ? 12 : 5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClicksEnElMapa onElegirUbicacion={onCambiarUbicacion} />

        {latitud !== null && longitud !== null && (
          <>
            <RecentrarMapa lat={latitud} lng={longitud} />
            <Marker
              position={[latitud, longitud]}
              icon={iconoMarcador}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const marcador = e.target as L.Marker;
                  const { lat, lng } = marcador.getLatLng();
                  onCambiarUbicacion(lat, lng);
                },
              }}
            />
            <Circle
              center={[latitud, longitud]}
              radius={radioKm * 1000}
              pathOptions={{ color: "#b45309", fillColor: "#b45309", fillOpacity: 0.1 }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
