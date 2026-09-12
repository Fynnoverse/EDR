export const MIN_DEPARTED_TRAIN_HIDE_DISTANCE_KM = 0.1;
export const MAX_DEPARTED_TRAIN_HIDE_DISTANCE_KM = 5;
export const DEFAULT_DEPARTED_TRAIN_HIDE_DISTANCE_KM = 5;

/** Straight-line distance is a lower bound on routed distance. It can prove
 * a departed train is beyond the threshold even when routing is unavailable.
 * When multiple post positions are passed (e.g. main station and outer sub-stations),
 * distance is measured to the closest post in the station group. */
export const departureDistance = (
    routedDistance: number | null | undefined,
    longitude: number,
    latitude: number,
    stationPositions?: [number, number] | Array<[number, number] | undefined>,
): number | undefined => {
    const routed = routedDistance != null && Number.isFinite(routedDistance) && routedDistance >= 0
        ? routedDistance : undefined;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)
        || Math.abs(longitude) > 180 || Math.abs(latitude) > 90
        || (longitude === 0 && latitude === 0)) return routed;

    const positions: Array<[number, number]> = Array.isArray(stationPositions)
        ? (stationPositions.length > 0 && Array.isArray(stationPositions[0])
            ? (stationPositions as Array<[number, number] | undefined>).filter((p): p is [number, number] => Array.isArray(p) && p.length === 2)
            : (stationPositions.length === 2 && typeof stationPositions[0] === "number" ? [stationPositions as [number, number]] : []))
        : (stationPositions ? [stationPositions] : []);

    if (positions.length === 0) return routed;

    const radians = Math.PI / 180;
    const directDistances = positions.map(([stationLongitude, stationLatitude]) => {
        if (!Number.isFinite(stationLongitude) || !Number.isFinite(stationLatitude)
            || Math.abs(stationLongitude) > 180 || Math.abs(stationLatitude) > 90
            || (stationLongitude === 0 && stationLatitude === 0)) return undefined;
        const a = Math.sin((latitude - stationLatitude) * radians / 2) ** 2
            + Math.cos(latitude * radians) * Math.cos(stationLatitude * radians)
            * Math.sin((longitude - stationLongitude) * radians / 2) ** 2;
        return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
    }).filter((d): d is number => d !== undefined);

    if (directDistances.length === 0) return routed;
    const minDirect = Math.min(...directDistances);
    return positions.length > 1
        ? (routed !== undefined ? Math.min(routed, minDirect) : minDirect)
        : Math.max(routed ?? 0, minDirect);
};

/**
 * Determines whether the live train has moved beyond the selected post and
 * all secondary timetable entries belonging to it.
 *
 * @param currentTimetableIndex - Current delayed timetable index of the train.
 * @param stationIndex - Main timetable index of the selected post.
 * @param secondaryStationIndices - Timetable indices of merged secondary posts.
 * @returns Whether the train has passed the complete selected post.
 */
export const hasTrainPassedStation = (
    currentTimetableIndex: number,
    stationIndex: number,
    secondaryStationIndices: number[] = [],
) => currentTimetableIndex > Math.max(stationIndex, ...secondaryStationIndices);

/**
 * Classifies rows that are displayed with reduced opacity and should therefore
 * be placed after active trains.
 *
 * @param currentTimetableIndex - Current train index, or no value for an offline train.
 * @param stationIndex - Main timetable index of the selected post.
 * @param secondaryStationIndices - Timetable indices of merged secondary posts.
 * @returns Whether the row is inactive at the selected post.
 */
export const isInactiveTrainAtStation = (
    currentTimetableIndex: number | undefined,
    stationIndex: number,
    secondaryStationIndices: number[] = [],
) => currentTimetableIndex === undefined
    || hasTrainPassedStation(currentTimetableIndex, stationIndex, secondaryStationIndices);

/**
 * Moves inactive entries behind active entries while retaining the existing
 * order inside both groups.
 *
 * @param rows - Rows in their current timetable order.
 * @param isInactive - Callback classifying a row as inactive.
 * @returns A new array with inactive rows at the bottom.
 */
export const moveInactiveRowsLast = <T>(rows: T[], isInactive: (row: T) => boolean): T[] => [
    ...rows.filter(row => !isInactive(row)),
    ...rows.filter(isInactive),
];

/**
 * The distance supplied by the live API is unsigned. It must therefore only
 * be used after the timetable index confirms that the train passed the post.
 *
 * @param trainHasPassedStation - Whether the train is already beyond the post.
 * @param distanceFromStation - Live routed distance, or no value when unavailable.
 * @param hideDistance - Configured post-departure threshold in kilometres.
 * @returns Whether the departed train should be removed from the timetable.
 */
export const shouldHideDepartedTrain = (
    trainHasPassedStation: boolean,
    distanceFromStation: number | null | undefined,
    hideDistance: number,
) => trainHasPassedStation
    && distanceFromStation != null
    && distanceFromStation > hideDistance;

/**
 * Applies the configured time window to the predicted arrival. The prediction
 * is the scheduled difference plus the latest live deviation.
 *
 * @param maxTime - Configured schedule window in minutes, or no limit.
 * @param scheduledTimeDifference - Minutes between now and scheduled arrival.
 * @param liveDelay - Latest live deviation in minutes; negative values are early.
 * @returns Whether the row should be hidden by the scheduled-time filter.
 */
export const shouldHideByScheduledTime = (
    maxTime: number | undefined,
    scheduledTimeDifference: number,
    liveDelay: number | undefined,
) => maxTime !== undefined
    && Math.abs(scheduledTimeDifference + (liveDelay ?? 0)) > maxTime;
