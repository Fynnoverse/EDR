import {TimeTableRow} from "../../customTypes/TimeTableRow";
import {postConfig, StationConfig} from "../../config/stations";
import {DetailedTrain} from "./trainDetails";
import {getDisplayDistance} from "./displayDistance";
import {stationEventKey, validEventTime, validReportedEventTime} from "./trainEvents";
import {hasTrainPassedStation} from "./trainFilters";

export const stationPresenceKey = (row: TimeTableRow, station: StationConfig) =>
    `${station.id}:${stationEventKey(row.pointId, row.stationIndex, row.scheduledArrivalObject)}`;

/** Departure requires observed presence followed by leaving the entire post group. */
export function hasTrainLeftStationArea(row: TimeTableRow, train: DetailedTrain | undefined, station: StationConfig, now: Date): boolean {
    return !!train?.observedStationAreas?.[stationPresenceKey(row, station)]
        && hasTrainPassedStation(train.TrainData.VDDelayedTimetableIndex, row.stationIndex, getStationGroupIndices(row, train, station))
        && !isTrainInStationArea(row, train, station)
        && !isTrainStandingAtStation(row, train, station, now);
}

// A station coordinate is a reference point, not the train's stopping position.
// Combine a platform-length tolerance with the current timetable point and speed.
export const STATION_STOP_RADIUS_KM = 0.5;

export function getStationGroupPosts(station: StationConfig | undefined): StationConfig[] {
    if (!station) return [];
    const posts: StationConfig[] = [station];
    const visited = new Set<string>([station.id]);
    const queue = [...(station.secondaryPosts ?? [])];
    while (queue.length > 0) {
        const nextId = queue.shift()!;
        if (visited.has(nextId)) continue;
        visited.add(nextId);
        const post = postConfig[nextId];
        if (post) {
            posts.push(post);
            if (post.secondaryPosts) {
                queue.push(...post.secondaryPosts);
            }
        }
    }
    return posts;
}

export function getStationGroupIndices(
    row: TimeTableRow,
    train: DetailedTrain | undefined,
    station: StationConfig | undefined,
): number[] {
    const indices = new Set<number>();
    if (row.stationIndex !== undefined) {
        indices.add(row.stationIndex);
    }
    for (const sec of row.secondaryPostsRows || []) {
        if (sec.stationIndex !== undefined) {
            indices.add(sec.stationIndex);
        }
    }
    if (train?.timetable && station) {
        const allPosts = getStationGroupPosts(station);
        const postIds = new Set(allPosts.map(p => String(p.id)));
        const postNames = new Set(allPosts.map(p => p.srName));
        for (const pt of train.timetable) {
            if (pt.indexOfPoint !== undefined && (postIds.has(String(pt.pointId)) || postNames.has(pt.nameForPerson))) {
                indices.add(pt.indexOfPoint);
            }
        }
    }
    return Array.from(indices);
}

export function isTrainInStationArea(
    row: TimeTableRow,
    train: DetailedTrain | undefined,
    station: StationConfig | undefined,
): boolean {
    if (!train) return false;
    const allPosts = getStationGroupPosts(station);
    const stationIndices = getStationGroupIndices(row, train, station);
    const currentIndex = train.TrainData?.VDDelayedTimetableIndex;
    const stopPoints = [row, ...(row.secondaryPostsRows ?? [])];

    const atStationSignal = stopPoints.some(stop => !!stop.pointId && train.TrainData?.SignalInFront?.startsWith(`${stop.pointId}_`))
        || allPosts.some(p => !!p.id && train.TrainData?.SignalInFront?.startsWith(`${p.id}_`));

    if (atStationSignal) {
        return true;
    }

    const inRangeOfAnyPost = allPosts.some(p => {
        const postRange = p.trainPosRange ?? station?.trainPosRange ?? STATION_STOP_RADIUS_KM;
        const dist = getDisplayDistance(
            p.id === station?.id ? train.distanceFromStation : null,
            train.TrainData?.Longitute,
            train.TrainData?.Latititute,
            p.platformPosOverride
        );
        return dist !== undefined && dist.km <= postRange;
    }) || (train.distanceFromStation != null && train.distanceFromStation <= (station?.trainPosRange ?? STATION_STOP_RADIUS_KM));

    if (stationIndices.length > 0 && currentIndex !== undefined) {
        const minIndex = Math.min(...stationIndices);
        const maxIndex = Math.max(...stationIndices);

        if (minIndex < maxIndex && currentIndex > minIndex && currentIndex <= maxIndex) {
            return true;
        }

        if (currentIndex >= minIndex && inRangeOfAnyPost) {
            return true;
        }
    }

    return false;
}

export function isTrainStandingAtStation(row: TimeTableRow, train: DetailedTrain | undefined, station: StationConfig, now = new Date()) {
    if (!train) return false;
    const allPosts = getStationGroupPosts(station);
    const stopPoints = [row, ...(row.secondaryPostsRows ?? [])];

    const stop = stopPoints
        .find(point => {
            const event = train.timetable?.find(event => event.indexOfPoint === point.stationIndex && String(event.pointId) === String(point.pointId));
            return point.stationIndex === train.TrainData.VDDelayedTimetableIndex
                || (point.stationIndex + 1 === train.TrainData.VDDelayedTimetableIndex
                    && event?.isStoped === true && event.leftTrack === false
                    && validEventTime(event.actualArrivalObject, now));
        });

    const matchingTimetableEvent = train.timetable?.find(event =>
        (event.indexOfPoint === train.TrainData.VDDelayedTimetableIndex
            || (event.indexOfPoint + 1 === train.TrainData.VDDelayedTimetableIndex && event.isStoped === true && event.leftTrack === false && validEventTime(event.actualArrivalObject, now)))
        && (allPosts.some(p => String(p.id) === String(event.pointId) || p.srName === event.nameForPerson)
            || stopPoints.some(s => String(s.pointId) === String(event.pointId))));

    const event = stop
        ? train.timetable?.find(event => event.indexOfPoint === stop.stationIndex && String(event.pointId) === String(stop.pointId))
        : matchingTimetableEvent;

    if (!stop && !event) return false;

    const reportedStop = event?.isStoped === true && event.leftTrack === false;
    const arrival = event ? (validReportedEventTime(event.actualArrivalObject, event.scheduledArrivalObject, now, event.isConfirmed) ? event.actualArrivalObject : undefined)
        : (stop && validReportedEventTime(stop.actualArrivalObject, stop.scheduledArrivalObject, now, stop.isConfirmed) ? stop.actualArrivalObject : undefined);
    const atCurrentPoint = (stop && stop.stationIndex === train.TrainData.VDDelayedTimetableIndex)
        || (event && event.indexOfPoint === train.TrainData.VDDelayedTimetableIndex);
    const recordedPresence = validEventTime(arrival, now) && (atCurrentPoint || reportedStop);

    // Live signal identifiers may carry the exact timetable point ID (e.g. 1803_KO_E101) or station/sub-station ID.
    const atStationSignal = stopPoints.some(s => !!s.pointId && train.TrainData.SignalInFront?.startsWith(`${s.pointId}_`) === true)
        || allPosts.some(p => !!p.id && train.TrainData.SignalInFront?.startsWith(`${p.id}_`));

    const scheduledDwell = stop
        ? (stop.scheduledDepartureObject?.valueOf() - stop.scheduledArrivalObject?.valueOf())
        : (event ? (event.scheduledDepartureObject?.valueOf() - event.scheduledArrivalObject?.valueOf()) : 0);

    const inRangeOfAnyPost = allPosts.some(p => {
        const postRange = p.trainPosRange ?? station?.trainPosRange ?? STATION_STOP_RADIUS_KM;
        const dist = getDisplayDistance(
            p.id === station?.id ? train.distanceFromStation : null,
            train.TrainData?.Longitute,
            train.TrainData?.Latititute,
            p.platformPosOverride
        );
        return dist !== undefined && dist.km <= postRange;
    }) || (train.distanceFromStation != null && train.distanceFromStation <= (station?.trainPosRange ?? STATION_STOP_RADIUS_KM));

    return ((stop && (stop.plannedStop > 0 || stop.stopType > 0)) || (event?.plannedStop ?? 0) > 0
        || (scheduledDwell > 0 && scheduledDwell < 86400000) || reportedStop || recordedPresence || atStationSignal)
        && Number.isFinite(train.TrainData.Velocity) && Math.abs(train.TrainData.Velocity) < 1
        && (recordedPresence || atStationSignal || inRangeOfAnyPost);
}

/** An arrival event is independent of speed and distance to the station reference. */
export function getStationArrivalStatus(row: TimeTableRow, train: DetailedTrain | undefined, now: Date) {
    if (!train) return undefined;
    for (const stop of [row, ...(row.secondaryPostsRows ?? [])]) {
        const event = train.timetable?.find(point => point.indexOfPoint === stop.stationIndex && String(point.pointId) === String(stop.pointId));
        const currentIndex = train.TrainData.VDDelayedTimetableIndex;
        const reportedStop = event?.isStoped === true && event.leftTrack === false;
        if (currentIndex < stop.stationIndex || (currentIndex > stop.stationIndex && !(currentIndex === stop.stationIndex + 1 && reportedStop))) continue;
        const departure = event ? (validReportedEventTime(event.actualDepartureObject, event.scheduledDepartureObject, now, event.isConfirmed) ? event.actualDepartureObject : undefined)
            : (validReportedEventTime(stop.actualDepartureObject, stop.scheduledDepartureObject, now, stop.isConfirmed) ? stop.actualDepartureObject : undefined);
        const stillAtPoint = currentIndex === stop.stationIndex && Number.isFinite(train.TrainData.Velocity) && Math.abs(train.TrainData.Velocity) < 1;
        if (validEventTime(departure, now) && !reportedStop && !stillAtPoint) continue;
        const actual = event ? (validReportedEventTime(event.actualArrivalObject, event.scheduledArrivalObject, now, event.isConfirmed) ? event.actualArrivalObject : undefined)
            : (validReportedEventTime(stop.actualArrivalObject, stop.scheduledArrivalObject, now, stop.isConfirmed) ? stop.actualArrivalObject : undefined);
        if (validEventTime(actual, now)) return {estimated: false};
        const remembered = train.observedArrivals?.[stationEventKey(stop.pointId, stop.stationIndex, stop.scheduledArrivalObject)];
        if (remembered && validEventTime(remembered.time, now)) return {estimated: remembered.estimated};
    }
    return undefined;
}
