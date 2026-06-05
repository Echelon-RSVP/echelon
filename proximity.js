/**
 * Browser geolocation for real-time Lens / proximity scan.
 */

export function geoSupported() {
  return typeof navigator !== "undefined" && !!navigator.geolocation;
}

export function startGeoWatch(onPosition, onError) {
  if (!geoSupported()) {
    onError?.(new Error("Geolocation is not supported on this device"));
    return () => {};
  }
  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      onPosition?.({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        ts: pos.timestamp,
      });
    },
    (err) => {
      const msg =
        err.code === 1
          ? "Location permission denied. Allow location to scan for nearby Lens users."
          : err.code === 2
            ? "Location unavailable. Try again outdoors or check device settings."
            : "Location timed out. Try again.";
      onError?.(new Error(msg));
    },
    { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 }
  );
  return () => navigator.geolocation.clearWatch(watchId);
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!geoSupported()) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          ts: pos.timestamp,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  });
}
