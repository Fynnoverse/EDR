import {TimeTableRow} from "../../customTypes/TimeTableRow";
import {StationConfig} from "../../config/stations";
import {DetailedTrain} from "./trainDetails";
import {getDisplayDistance} from "./displayDistance";

export const validEventTime = (date: Date | undefined, now: Date) =>
    date instanceof Date && Number.isFinite(date.valueOf())
    && date.getUTCFullYear() > 1970 && date.getUTCFullYear() < 3000 && date <= now;

export function getStationDeviation(row: TimeTableRow, train: DetailedTrain | undefined, station: StationConfig, now: Date) {
    const point = train?.timetable?.find(point => point.indexOfPoint === row.stationIndex && point.pointId === row.pointId);
    const arrival = validEventTime(point?.actualArrivalObject, now) ? point?.actualArrivalObject : row.actualArrivalObject;
    const departure = validEventTime(point?.actualDepartureObject, now) ? point?.actualDepartureObject : row.actualDepartureObject;
    const arrivalMeasured = validEventTime(arrival, now);
    const departureMeasured = validEventTime(departure, now);
    const arrivalMinutes = arrivalMeasured ? Math.trunc((arrival!.valueOf() - row.scheduledArrivalObject.valueOf()) / 60000) : train?.lastDelay;
    let departureMinutes = departureMeasured ? Math.trunc((departure!.valueOf() - row.scheduledDepartureObject.valueOf()) / 60000) : train?.lastDelay;
    const distance = getDisplayDistance(train?.distanceFromStation, train?.TrainData.Longitute,
        train?.TrainData.Latititute, station.platformPosOverride);
    const isStandingAtStop = train?.TrainData.VDDelayedTimetableIndex === row.stationIndex
        && Number.isFinite(train?.TrainData.Velocity) && train!.TrainData.Velocity < 1
        && row.plannedStop > 0 && distance !== undefined && distance.km <= 0.15;
    if (!departureMeasured && isStandingAtStop && train?.receivedAt != null) {
        // Stop extrapolating after 15 seconds without a successful observation.
        const cappedNow = now.valueOf() - Math.max(0, Date.now() - train.receivedAt - 15000);
        if (row.scheduledDepartureObject.getUTCFullYear() < 3000) {
            departureMinutes = Math.max(0, Math.floor((cappedNow - row.scheduledDepartureObject.valueOf()) / 60000));
        }
    }
    return {arrivalMinutes, departureMinutes,
        arrivalEstimated: !arrivalMeasured && arrivalMinutes !== undefined,
        departureEstimated: !departureMeasured && departureMinutes !== undefined};
}
