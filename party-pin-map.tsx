import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [38.7223, -9.1393];

const pinIcon = () =>
  L.divIcon({
    className: "",
    html: `<div class="party-map-pin"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });

type PartyPinMapProps = {
  lat?: number | null;
  lng?: number | null;
  centerLat?: number | null;
  centerLng?: number | null;
  onChange?: (lat: number, lng: number) => void;
  readOnly?: boolean;
  className?: string;
};

export default function PartyPinMap({
  lat,
  lng,
  centerLat,
  centerLng,
  onChange,
  readOnly = false,
  className = "",
}: PartyPinMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || mapRef.current) return;

    if ((host as HTMLElement & { _leaflet_id?: number })._leaflet_id) {
      delete (host as HTMLElement & { _leaflet_id?: number })._leaflet_id;
    }

    const center: [number, number] =
      lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
        ? [lat, lng]
        : DEFAULT_CENTER;

    const map = L.map(host, {
      center,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    if (!readOnly) {
      L.control.zoom({ position: "bottomright" }).addTo(map);
    }

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "",
    }).addTo(map);

    mapRef.current = map;

    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          map.invalidateSize();
        })
      : null;
    ro?.observe(host);

    const t1 = setTimeout(() => map.invalidateSize(), 80);
    const t2 = setTimeout(() => map.invalidateSize(), 320);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      if ((host as HTMLElement & { _leaflet_id?: number })._leaflet_id) {
        delete (host as HTMLElement & { _leaflet_id?: number })._leaflet_id;
      }
    };
  }, [readOnly]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }
    const latlng: [number, number] = [lat, lng];
    if (markerRef.current) {
      markerRef.current.setLatLng(latlng);
    } else {
      const marker = L.marker(latlng, {
        icon: pinIcon(),
        draggable: !readOnly,
        zIndexOffset: 500,
      }).addTo(map);
      if (!readOnly) {
        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          onChangeRef.current?.(ll.lat, ll.lng);
        });
      }
      markerRef.current = marker;
    }
    map.setView(latlng, Math.max(map.getZoom(), 14), { animate: true });
    setTimeout(() => map.invalidateSize(), 100);
  }, [lat, lng, readOnly]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || centerLat == null || centerLng == null) return;
    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) return;
    map.flyTo([centerLat, centerLng], 14, { duration: 0.6 });
    setTimeout(() => map.invalidateSize(), 150);
  }, [centerLat, centerLng]);

  return (
    <div
      ref={hostRef}
      className={"party-pin-map" + (className ? ` ${className}` : "")}
    />
  );
}
