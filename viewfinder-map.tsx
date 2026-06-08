import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [38.7223, -9.1393];
const WORLD_ZOOM = 2;
const PIN_PAD_PX = 72;

/** Persist pan/zoom across tab switches; cleared when user opens Map from dock. */
let savedMapView: { center: [number, number]; zoom: number } | null = null;

export function resetViewfinderMapView() {
  savedMapView = null;
}

function rememberMapView(map: L.Map) {
  const c = map.getCenter();
  savedMapView = { center: [c.lat, c.lng], zoom: map.getZoom() };
}

const glowClass = (score) => {
  const s = Math.max(1, Math.min(5, score || 3));
  if (s >= 4.5) return "vf-pin-glow-high";
  if (s >= 3.5) return "vf-pin-glow-mid";
  if (s >= 2.5) return "vf-pin-glow-low";
  return "vf-pin-glow-soft";
};

const escapeAttr = (s) => String(s || "").replace(/"/g, "&quot;").replace(/</g, "");

const pinIcon = (friend, selected, mediaUrlFn) => {
  const score = friend.score ?? 3;
  const name = friend.name || "?";
  const initial = name.trim()[0]?.toUpperCase() || "?";
  const raw = friend.avatarUrl || friend.avatar;
  const src = raw ? (mediaUrlFn ? mediaUrlFn(raw) : raw) : null;
  const emoji = friend.emoji || "";
  const bgStyle = src ? ` style="background-image:url('${escapeAttr(src)}')"` : "";
  const inner = src
    ? ""
    : emoji
      ? `<span class="vf-pin-emoji">${emoji}</span>`
      : `<span class="vf-pin-letter">${initial}</span>`;
  return L.divIcon({
    className: "vf-marker-icon",
    html: `<div class="vf-pin ${glowClass(score)}${selected ? " vf-pin-on" : ""}" title="${escapeAttr(name)} · ${score.toFixed(1)}★"><span class="vf-pin-face${src ? " vf-pin-has-img" : " vf-pin-fallback"}"${bgStyle}>${inner}</span></div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

const youIcon = () =>
  L.divIcon({
    className: "",
    html: `<div class="vf-you"><span></span></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const partyIcon = (party, selected) => {
  const emoji = party.emoji || "🎉";
  const name = party.name || "Party";
  return L.divIcon({
    className: "vf-marker-icon",
    html: `<div class="vf-party-pin${selected ? " vf-party-pin-on" : ""}" title="${escapeAttr(name)}"><span>${emoji}</span></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
};

function fitMapToContent(map, userLat, userLng, friends, parties = [], animate = false) {
  const hasUser = userLat != null && userLng != null;
  const located = friends.filter((f) => f.lat != null && f.lng != null);
  const partyPins = (parties || []).filter((p) => p.lat != null && p.lng != null);

  if (!hasUser && located.length === 0 && partyPins.length === 0) {
    map.setView(DEFAULT_CENTER, WORLD_ZOOM, { animate });
    return;
  }

  if (hasUser && located.length === 0 && partyPins.length === 0) {
    map.setView([userLat, userLng], WORLD_ZOOM, { animate });
    return;
  }

  const points = [];
  if (hasUser) points.push([userLat, userLng]);
  located.forEach((f) => points.push([f.lat, f.lng]));
  partyPins.forEach((p) => points.push([p.lat, p.lng]));

  if (points.length === 1) {
    map.setView(points[0], 12, { animate });
    return;
  }

  const bounds = L.latLngBounds(points);
  map.fitBounds(bounds, {
    padding: [PIN_PAD_PX, PIN_PAD_PX],
    maxZoom: 14,
    animate,
  });
}

export default function ViewFinderMap({
  friends = [],
  parties = [],
  userLat,
  userLng,
  selectedId,
  selectedPartyId,
  searchQuery = "",
  onSelect,
  onPartySelect,
  className = "",
  resolveMediaUrl,
  mediaUrl: mediaUrlLegacy,
  showYou = true,
  fitKey = 0,
  restoreView = true,
}) {
  const mediaUrlFn = resolveMediaUrl || mediaUrlLegacy;
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const partyMarkersRef = useRef({});
  const youMarkerRef = useRef(null);
  const searchTimer = useRef(null);
  const didInitialFit = useRef(false);
  const userMovedRef = useRef(false);

  const located = friends.filter((f) => f.lat != null && f.lng != null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return located;
    return located.filter(
      (f) =>
        (f.name || "").toLowerCase().includes(q) ||
        (f.handle || "").toLowerCase().includes(q),
    );
  }, [located, searchQuery]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || mapRef.current) return;

    if ((host as HTMLElement & { _leaflet_id?: number })._leaflet_id) {
      delete (host as HTMLElement & { _leaflet_id?: number })._leaflet_id;
    }

    const center =
      userLat != null && userLng != null ? [userLat, userLng] : DEFAULT_CENTER;
    const map = L.map(host, {
      center,
      zoom: WORLD_ZOOM,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "",
    }).addTo(map);
    mapRef.current = map;
    const onMoveEnd = () => {
      userMovedRef.current = true;
      rememberMapView(map);
    };
    map.on("moveend", onMoveEnd);
    map.on("zoomend", onMoveEnd);

    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => map.invalidateSize())
      : null;
    ro?.observe(host);

    const fitOnce = () => {
      map.invalidateSize();
      if (restoreView && savedMapView) {
        map.setView(savedMapView.center, savedMapView.zoom, { animate: false });
        didInitialFit.current = true;
        userMovedRef.current = true;
      } else {
        fitMapToContent(map, userLat, userLng, located, parties, false);
        didInitialFit.current = true;
        rememberMapView(map);
      }
    };
    requestAnimationFrame(fitOnce);
    const t1 = setTimeout(fitOnce, 120);
    const t2 = setTimeout(fitOnce, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro?.disconnect();
      if (mapRef.current) rememberMapView(mapRef.current);
      map.off("moveend", onMoveEnd);
      map.off("zoomend", onMoveEnd);
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      partyMarkersRef.current = {};
      youMarkerRef.current = null;
      didInitialFit.current = false;
      userMovedRef.current = false;
      if ((host as HTMLElement & { _leaflet_id?: number })._leaflet_id) {
        delete (host as HTMLElement & { _leaflet_id?: number })._leaflet_id;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !didInitialFit.current) return;
    if (searchQuery.trim().length >= 3) return;
    if (fitKey > 0 && !userMovedRef.current && !savedMapView) {
      requestAnimationFrame(() => {
        map.invalidateSize();
        fitMapToContent(map, userLat, userLng, filtered, parties, true);
        rememberMapView(map);
      });
    } else {
      requestAnimationFrame(() => map.invalidateSize());
    }
  }, [fitKey]);

  const locatedParties = useMemo(
    () => (parties || []).filter((p) => p.lat != null && p.lng != null),
    [parties],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!showYou || userLat == null || userLng == null) {
      if (youMarkerRef.current) {
        map.removeLayer(youMarkerRef.current);
        youMarkerRef.current = null;
      }
      return;
    }
    if (!youMarkerRef.current) {
      youMarkerRef.current = L.marker([userLat, userLng], { icon: youIcon(), zIndexOffset: 1000 }).addTo(map);
      youMarkerRef.current.bindTooltip("You", { permanent: false, direction: "top", offset: [0, -8] });
    } else {
      youMarkerRef.current.setLatLng([userLat, userLng]);
    }
  }, [userLat, userLng, showYou]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ids = new Set(filtered.map((f) => f.id));
    Object.keys(markersRef.current).forEach((id) => {
      if (!ids.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });
    filtered.forEach((f) => {
      const latlng = [f.lat, f.lng];
      const selected = f.id === selectedId;
      if (markersRef.current[f.id]) {
        markersRef.current[f.id].setLatLng(latlng);
        markersRef.current[f.id].setIcon(pinIcon(f, selected, mediaUrlFn));
      } else {
        const m = L.marker(latlng, { icon: pinIcon(f, selected, mediaUrlFn) }).addTo(map);
        m.on("click", () => onSelect?.(f));
        m.bindTooltip(`${f.name?.split(" ")[0] || "Friend"} · ${(f.score ?? 3).toFixed(1)}★`, { direction: "top", offset: [0, -18], className: "vf-tooltip" });
        markersRef.current[f.id] = m;
      }
    });
  }, [filtered, selectedId, onSelect, mediaUrlFn]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ids = new Set(locatedParties.map((p) => p.id));
    Object.keys(partyMarkersRef.current).forEach((id) => {
      if (!ids.has(id)) {
        map.removeLayer(partyMarkersRef.current[id]);
        delete partyMarkersRef.current[id];
      }
    });
    locatedParties.forEach((p) => {
      const latlng = [p.lat, p.lng];
      const selected = p.id === selectedPartyId;
      if (partyMarkersRef.current[p.id]) {
        partyMarkersRef.current[p.id].setLatLng(latlng);
        partyMarkersRef.current[p.id].setIcon(partyIcon(p, selected));
      } else {
        const m = L.marker(latlng, { icon: partyIcon(p, selected), zIndexOffset: 500 }).addTo(map);
        m.on("click", () => onPartySelect?.(p));
        m.bindTooltip(p.name || "Party", { direction: "top", offset: [0, -16], className: "vf-tooltip vf-tooltip--party" });
        partyMarkersRef.current[p.id] = m;
      }
    });
  }, [locatedParties, selectedPartyId, onPartySelect]);

  useEffect(() => {
    const q = searchQuery.trim();
    const map = mapRef.current;
    if (!map || q.length < 3) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
          { headers: { Accept: "application/json" } },
        );
        const rows = await res.json();
        if (rows?.[0]) {
          map.flyTo([parseFloat(rows[0].lat), parseFloat(rows[0].lon)], 12, { duration: 0.8 });
        }
      } catch {
        /* ignore geocode errors */
      }
    }, 650);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setTimeout(() => map.invalidateSize(), 120);
  }, [filtered.length]);

  return <div ref={hostRef} className={"viewfinder-map" + (className ? ` ${className}` : "")} />;
}
