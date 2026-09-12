import {TimeTableRow} from "../../customTypes/TimeTableRow";
import {StationConfig} from "../../config/stations";
import {DetailedTrain} from "./trainDetails";
import {getDisplayDistance} from "./displayDistance";
import {stationEventKey, validEventTime, validReportedEventTime} from "./trainEvents";

// A station coordinate is a reference point, not the train's stopping position.
// Combine a platform-length tolerance with the current timetable point and speed.
export const STATION_STOP_RADIUS_KM = 0.5;

export function isTrainStandingAtStation(row: TimeTableRow, train: DetailedTrain | undefined, station: StationConfig, now = new Date()) {
    if (!train) return false;
    const stop = [row, ...(row.secondaryPostsRows ?? [])]
        .find(point => {
            const event = train.timetable?.find(event => event.indexOfPoint === point.stationIndex && String(event.pointId) === String(point.pointId));
            return point.stationIndex === train.TrainData.VDDelayedTimetableIndex
                || (point.stationIndex + 1 === train.TrainData.VDDelayedTimetableIndex
                    && event?.isStoped === true && event.leftTrack === false
                    && validEventTime(event.actualArrivalObject, now));
        });
    if (!stop) return false;
    const event = train.timetable?.find(event => event.indexOfPoint === stop.stationIndex && String(event.pointId) === String(stop.pointId));
    const reportedStop = event?.isStoped === true && event.leftTrack === false;
    const arrival = event ? (validReportedEventTime(event.actualArrivalObject, event.scheduledArrivalObject, now, event.isConfirmed) ? event.actualArrivalObject : undefined)
        : (validReportedEventTime(stop.actualArrivalObject, stop.scheduledArrivalObject, now, stop.isConfirmed) ? stop.actualArrivalObject : undefined);
    const atCurrentPoint = stop.stationIndex === train.TrainData.VDDelayedTimetableIndex;
    const recordedPresence = validEventTime(arrival, now) && (atCurrentPoint || reportedStop);
    // Live signal identifiers may carry the exact timetable point ID (e.g. 1803_KO_E101).
    const atStationSignal = !!stop.pointId && train.TrainData.SignalInFront?.startsWith(`${stop.pointId}_`) === true;
    const scheduledDwell = stop.scheduledDepartureObject?.valueOf() - stop.scheduledArrivalObject?.valueOf();
    const distance = getDisplayDistance(train.distanceFromStation, train.TrainData.Longitute,
        train.TrainData.Latititute, station.platformPosOverride);
    return (stop.plannedStop > 0 || stop.stopType > 0 || (event?.plannedStop ?? 0) > 0
        || (scheduledDwell > 0 && scheduledDwell < 86400000) || reportedStop || recordedPresence || atStationSignal)
        && Number.isFinite(train.TrainData.Velocity) && Math.abs(train.TrainData.Velocity) < 1
        && (recordedPresence || atStationSignal || (distance !== undefined && distance.km <= STATION_STOP_RADIUS_KM));
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
