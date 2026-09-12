import {TimeTableRow} from "../../customTypes/TimeTableRow";
import {StationConfig} from "../../config/stations";
import {DetailedTrain} from "./trainDetails";
import {isTrainStandingAtStation} from "./stationPresence";
import {LIVE_OBSERVATION_GRACE_MS, stationEventKey, validEventTime} from "./trainEvents";
export {validEventTime} from "./trainEvents";

export function getStationDeviation(row: TimeTableRow, train: DetailedTrain | undefined, station: StationConfig, now: Date) {
    const point = train?.timetable?.find(point => point.indexOfPoint === row.stationIndex && String(point.pointId) === String(row.pointId));
    const arrival = validEventTime(point?.actualArrivalObject, now) ? point?.actualArrivalObject : row.actualArrivalObject;
    const departure = validEventTime(point?.actualDepartureObject, now) ? point?.actualDepartureObject : row.actualDepartureObject;
    const rememberedArrival = train?.observedArrivals?.[stationEventKey(row.pointId, row.stationIndex, row.scheduledArrivalObject)];
    const arrivalTime = validEventTime(arrival, now) ? arrival : rememberedArrival?.time;
    const arrivalMeasured = validEventTime(arrival, now) || (rememberedArrival?.estimated === false && validEventTime(rememberedArrival.time, now));
    const isStandingAtStop = isTrainStandingAtStation(row, train, station, now);
    const fresh = train?.receivedAt != null && Date.now() - train.receivedAt <= LIVE_OBSERVATION_GRACE_MS;
    // A current explicit stop plus fresh stationary telemetry contradicts an old departure entry.
    const departureMeasured = validEventTime(departure, now)
        && !(fresh && isStandingAtStop && point?.isStoped === true && point.leftTrack === false);
    const arrivalMinutes = validEventTime(arrivalTime, now) ? Math.trunc((arrivalTime!.valueOf() - row.scheduledArrivalObject.valueOf()) / 60000) : train?.lastDelay;
    let departureMinutes = departureMeasured ? Math.trunc((departure!.valueOf() - row.scheduledDepartureObject.valueOf()) / 60000) : train?.lastDelay;
    let standingDepartureTime: Date | undefined;
    if (!departureMeasured && isStandingAtStop && train?.receivedAt != null) {
        // Stop extrapolating after 15 seconds without a successful observation.
        const cappedNow = now.valueOf() - Math.max(0, Date.now() - train.receivedAt - LIVE_OBSERVATION_GRACE_MS);
        if (row.scheduledDepartureObject.getUTCFullYear() < 3000) {
            departureMinutes = Math.max(0, Math.floor((cappedNow - row.scheduledDepartureObject.valueOf()) / 60000));
            standingDepartureTime = new Date(Math.max(row.scheduledDepartureObject.valueOf(),
                cappedNow > row.scheduledDepartureObject.valueOf() ? cappedNow + 60000 : row.scheduledDepartureObject.valueOf()));
        }
    }
    return {arrivalMinutes, departureMinutes, standingDepartureTime,
        arrivalEstimated: !arrivalMeasured && arrivalMinutes !== undefined,
        departureEstimated: !departureMeasured && departureMinutes !== undefined};
}
