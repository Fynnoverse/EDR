/** Only validated OSRM distances belong in the track-distance display. */
export function getDisplayDistance(routedKm: number | null | undefined): {km: number} | undefined {
    return routedKm != null && Number.isFinite(routedKm) && routedKm >= 0 ? {km: routedKm} : undefined;
}

/** Geographic distance for spatial station areas, never a substitute track distance. */
export function getSpatialDistance(
    longitude: number | undefined,
    latitude: number | undefined,
    stationPosition?: [number, number]
): number | undefined {
    if (!stationPosition || longitude == null || latitude == null) return undefined;
    const [stationLongitude, stationLatitude] = stationPosition;
    if (![longitude, latitude, stationLongitude, stationLatitude].every(Number.isFinite)
        || Math.abs(longitude) > 180 || Math.abs(stationLongitude) > 180
        || Math.abs(latitude) > 90 || Math.abs(stationLatitude) > 90
        || (longitude === 0 && latitude === 0)
        || (stationLongitude === 0 && stationLatitude === 0)) return undefined;
    const radians = Math.PI / 180;
    const dLat = (stationLatitude - latitude) * radians;
    const dLon = (stationLongitude - longitude) * radians;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(latitude * radians) * Math.cos(stationLatitude * radians) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

/** Routing can establish proximity when GPS is missing, without inventing a distance. */
export function getStationAreaDistance(
    routedKm: number | null | undefined,
    longitude: number | undefined,
    latitude: number | undefined,
    stationPosition?: [number, number]
): number | undefined {
    return getSpatialDistance(longitude, latitude, stationPosition) ?? getDisplayDistance(routedKm)?.km;
}
