import {TimeTableRow} from "../../customTypes/TimeTableRow";
import {StationConfig} from "../../config/stations";
import {DetailedTrain} from "./trainDetails";
import {getStationGroupIndices, isTrainInStationArea, isTrainStandingAtStation} from "./stationPresence";
import {hasTrainPassedStation} from "./trainFilters";
import {LIVE_OBSERVATION_GRACE_MS, stationEventKey, validEventTime, validReportedEventTime} from "./trainEvents";
export {validEventTime} from "./trainEvents";

export function getStationDeviation(row: TimeTableRow, train: DetailedTrain | undefined, station: StationConfig, now: Date) {
    const point = train?.timetable?.find(point => point.indexOfPoint === row.stationIndex && String(point.pointId) === String(row.pointId));
    const arrival = point ? (validReportedEventTime(point.actualArrivalObject, point.scheduledArrivalObject, now, point.isConfirmed) ? point.actualArrivalObject : undefined)
        : (validReportedEventTime(row.actualArrivalObject, row.scheduledArrivalObject, now, row.isConfirmed) ? row.actualArrivalObject : undefined);
    const departure = point ? (validReportedEventTime(point.actualDepartureObject, point.scheduledDepartureObject, now, point.isConfirmed) ? point.actualDepartureObject : undefined)
        : (validReportedEventTime(row.actualDepartureObject, row.scheduledDepartureObject, now, row.isConfirmed) ? row.actualDepartureObject : undefined);
    const rememberedArrival = train?.observedArrivals?.[stationEventKey(row.pointId, row.stationIndex, row.scheduledArrivalObject)];
    const arrivalTime = validEventTime(arrival, now) ? arrival : rememberedArrival?.time;
    const arrivalMeasured = validEventTime(arrival, now) || (rememberedArrival?.estimated === false && validEventTime(rememberedArrival.time, now));
    const isStandingAtStop = isTrainStandingAtStation(row, train, station, now);
    const inArea = isTrainInStationArea(row, train, station);
    const secondaryStationIndices = getStationGroupIndices(row, train, station).filter(idx => idx !== row.stationIndex);
    const hasPassed = train?.TrainData?.VDDelayedTimetableIndex !== undefined
        && !isStandingAtStop
        && !inArea
        && hasTrainPassedStation(train.TrainData.VDDelayedTimetableIndex, row.stationIndex, secondaryStationIndices);

    const fresh = train?.receivedAt != null && Date.now() - train.receivedAt <= LIVE_OBSERVATION_GRACE_MS;
    // EDR departure fields can contain forecasts; fresh stationary telemetry takes precedence.
    const departureMeasured = validEventTime(departure, now)
        && !(fresh && isStandingAtStop);
    let arrivalMinutes = validEventTime(arrivalTime, now) ? Math.trunc((arrivalTime!.valueOf() - row.scheduledArrivalObject.valueOf()) / 60000) : train?.lastDelay;
    let departureMinutes = departureMeasured ? Math.trunc((departure!.valueOf() - row.scheduledDepartureObject.valueOf()) / 60000) : train?.lastDelay;
    let standingDepartureTime: Date | undefined;

    if (!validEventTime(arrivalTime, now) && !isStandingAtStop && !hasPassed && train?.receivedAt != null
        && row.scheduledArrivalObject.getUTCFullYear() > 1970
        && row.scheduledArrivalObject.getUTCFullYear() < 3000) {
        const cappedNow = now.valueOf() - Math.max(0, Date.now() - train.receivedAt - LIVE_OBSERVATION_GRACE_MS);
        if (cappedNow > row.scheduledArrivalObject.valueOf()) {
            const elapsedArrivalDelay = Math.floor((cappedNow - row.scheduledArrivalObject.valueOf()) / 60000);
            arrivalMinutes = arrivalMinutes !== undefined ? Math.max(arrivalMinutes, elapsedArrivalDelay) : elapsedArrivalDelay;
            if (row.plannedStop === 0 && !departureMeasured) {
                departureMinutes = arrivalMinutes;
            }
        }
    }

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
