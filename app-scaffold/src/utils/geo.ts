// 📁 cercania/app-scaffold/src/utils/geo.ts

export function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Estima si dos puntos están en la misma "ciudad" (~30 km) */
export function isSameCity(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): boolean {
  return haversineMeters(lat1, lon1, lat2, lon2) < 30_000;
}

/** Genera un bounding box de `radiusKm` km alrededor de un punto */
export function boundingBox(lat: number, lon: number, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  return {
    minLat: lat - latDelta, maxLat: lat + latDelta,
    minLon: lon - lonDelta, maxLon: lon + lonDelta,
  };
}
