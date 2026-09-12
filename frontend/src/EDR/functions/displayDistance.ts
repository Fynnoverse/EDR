// Display-only fallback: straight-line distance must not affect routed-distance filters.
export function getDisplayDistance(
    routedKm: number | null | undefined,
    longitude: number | undefined,
    latitude: number | undefined,
    stationPosition?: [number, number]
): {km: number; approximate: boolean} | undefined {
    if (routedKm != null && Number.isFinite(routedKm) && routedKm >= 0) {
        return {km: routedKm, approximate: false};
    }
    if (!stationPosition || longitude == null || latitude == null) return undefined;
    const [stationLongitude, stationLatitude] = stationPosition;
    if (![longitude, latitude, stationLongitude, stationLatitude].every(Number.isFinite)
        || Math.abs(longitude) > 180 || Math.abs(stationLongitude) > 180
        || Math.abs(latitude) > 90 || Math.abs(stationLatitude) > 90
        || (longitude === 0 && latitude === 0)) return undefined;
    const radians = Math.PI / 180;
    const dLat = (stationLatitude - latitude) * radians;
    const dLon = (stationLongitude - longitude) * radians;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(latitude * radians) * Math.cos(stationLatitude * radians) * Math.sin(dLon / 2) ** 2;
    return {km: 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a)))), approximate: true};
}

/** Spatial distance for station-area checks; routing is only a fallback when GPS is missing. */
export function getStationAreaDistance(
    routedKm: number | null | undefined,
    longitude: number | undefined,
    latitude: number | undefined,
    stationPosition?: [number, number]
): number | undefined {
    return getDisplayDistance(null, longitude, latitude, stationPosition)?.km
        ?? getDisplayDistance(routedKm, undefined, undefined)?.km;
}
