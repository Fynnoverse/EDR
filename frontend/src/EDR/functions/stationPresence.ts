import {TimeTableRow} from "../../customTypes/TimeTableRow";
import {StationConfig} from "../../config/stations";
import {DetailedTrain} from "./trainDetails";
import {getDisplayDistance} from "./displayDistance";
import {validEventTime} from "./trainEvents";

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
    const scheduledDwell = stop.scheduledDepartureObject?.valueOf() - stop.scheduledArrivalObject?.valueOf();
    const distance = getDisplayDistance(train.distanceFromStation, train.TrainData.Longitute,
        train.TrainData.Latititute, station.platformPosOverride);
    return (stop.plannedStop > 0 || stop.stopType > 0 || (event?.plannedStop ?? 0) > 0
        || (scheduledDwell > 0 && scheduledDwell < 86400000) || reportedStop)
        && Number.isFinite(train.TrainData.Velocity) && Math.abs(train.TrainData.Velocity) < 1
        && (distance !== undefined ? distance.km <= STATION_STOP_RADIUS_KM
            : reportedStop && validEventTime(event?.actualArrivalObject, now));
}
