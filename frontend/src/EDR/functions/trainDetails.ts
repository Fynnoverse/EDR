import { StationConfig } from "../../config/stations";
import { Dictionary } from "lodash";
import { TrainTimeTableRow } from "../../Sirius";
import { ExtendedTrain } from "../../customTypes/ExtendedTrain";
import { differenceInMinutes } from "date-fns";
import {TimeTableRow} from "../../customTypes/TimeTableRow";
import {isTrainStandingAtStation} from "./stationPresence";
import {LIVE_OBSERVATION_GRACE_MS, stationEventKey, validEventTime, validReportedEventTime} from "./trainEvents";

type ExtraStationConfig = {
    distanceToStation?: number,
    stationInternalId?: string,
    left?: string,
    right?: string,
    branchA?: string
    branchB?: string
}

export type ExtendedStationConfig = StationConfig & ExtraStationConfig;

const isUsableActualTime = (value: Date | undefined) => value instanceof Date && value.getUTCFullYear() > 1970 && value.getUTCFullYear() < 3000;

export const getTrainDetails = (previousTrains: React.MutableRefObject<{[k: string]: DetailedTrain;} | null>, trainTimetables: Dictionary<TrainTimeTableRow[]>, dateNow: Date,
    stationRows: TimeTableRow[] = [], station?: StationConfig) =>(t: ExtendedTrain) => {
    const previousTrainData = previousTrains.current?.[t.TrainNoLocal as string];
    let lastDelay = previousTrainData?.lastDelay;
    if (lastDelay === undefined) {
        // On first load the immediately preceding point may have no time report.
        // Use the newest usable event from the train's already reached timetable points.
        const events = (trainTimetables[t.TrainNoLocal] ?? [])
            .filter(point => point.indexOfPoint <= t.TrainData.VDDelayedTimetableIndex)
            .flatMap(point => [
                {actual: point.actualArrivalObject, scheduled: point.scheduledArrivalObject, confirmed: point.isConfirmed},
                {actual: point.actualDepartureObject, scheduled: point.scheduledDepartureObject, confirmed: point.isConfirmed},
            ])
            .filter(event => validReportedEventTime(event.actual, event.scheduled, dateNow, event.confirmed) && isUsableActualTime(event.scheduled))
            .sort((a, b) => b.actual.valueOf() - a.actual.valueOf());
        if (events[0]) lastDelay = differenceInMinutes(events[0].actual, events[0].scheduled);
    }
    const stationPassed = trainTimetables[t.TrainNoLocal]?.find(ttRow => ttRow.indexOfPoint === (t.TrainData.VDDelayedTimetableIndex - 1));
    const actualDeparture = stationPassed && validReportedEventTime(stationPassed.actualDepartureObject, stationPassed.scheduledDepartureObject, dateNow, stationPassed.isConfirmed)
        ? stationPassed.actualDepartureObject
        : undefined;
    const hasJustAdvanced = previousTrainData?.TrainData
        && previousTrainData.TrainData.VDDelayedTimetableIndex + 1 === t.TrainData.VDDelayedTimetableIndex
        && (previousTrainData.receivedAt == null || Date.now() - previousTrainData.receivedAt <= 15000);

    if (stationPassed && (actualDeparture || hasJustAdvanced)) {
        const scheduled = isUsableActualTime(stationPassed.scheduledDepartureObject)
            ? stationPassed.scheduledDepartureObject : stationPassed.scheduledArrivalObject;
        if (isUsableActualTime(scheduled)) lastDelay = differenceInMinutes(actualDeparture ?? dateNow, scheduled);
    }

    // A reported arrival at the current point is newer than the previous departure.
    const currentPoint = trainTimetables[t.TrainNoLocal]?.find(row => row.indexOfPoint === t.TrainData.VDDelayedTimetableIndex);
    if (currentPoint && validReportedEventTime(currentPoint.actualArrivalObject, currentPoint.scheduledArrivalObject, dateNow, currentPoint.isConfirmed)
        && isUsableActualTime(currentPoint.scheduledArrivalObject)) {
        lastDelay = differenceInMinutes(currentPoint.actualArrivalObject, currentPoint.scheduledArrivalObject);
    }
    if (currentPoint && validReportedEventTime(currentPoint.actualDepartureObject, currentPoint.scheduledDepartureObject, dateNow, currentPoint.isConfirmed)
        && isUsableActualTime(currentPoint.scheduledDepartureObject)
        && !(currentPoint.isStoped === true && currentPoint.leftTrack === false && Math.abs(t.TrainData.Velocity) < 1)) {
        lastDelay = differenceInMinutes(currentPoint.actualDepartureObject, currentPoint.scheduledDepartureObject);
    }

    const details: DetailedTrain = {...t,
        timetable: trainTimetables[t.TrainNoLocal],
        lastDelay,
        observedArrivals: {...previousTrainData?.observedArrivals},
        observationServerTime: dateNow,
    };
    if (station) for (const row of stationRows.filter(row => row.trainNoLocal === t.TrainNoLocal)) {
        const key = stationEventKey(row.pointId, row.stationIndex, row.scheduledArrivalObject);
        const event = details.timetable?.find(point => point.indexOfPoint === row.stationIndex && String(point.pointId) === String(row.pointId));
        const actual = event ? (validReportedEventTime(event.actualArrivalObject, event.scheduledArrivalObject, dateNow, event.isConfirmed) ? event.actualArrivalObject : undefined)
            : (validReportedEventTime(row.actualArrivalObject, row.scheduledArrivalObject, dateNow, row.isConfirmed) ? row.actualArrivalObject : undefined);
        if (validEventTime(actual, dateNow)) {
            details.observedArrivals![key] = {time: actual!, estimated: false};
        } else if (!details.observedArrivals![key] && previousTrainData?.receivedAt != null && t.receivedAt != null
            && t.receivedAt > previousTrainData.receivedAt
            && t.receivedAt - previousTrainData.receivedAt <= LIVE_OBSERVATION_GRACE_MS
            && previousTrainData.observationServerTime
            && isTrainStandingAtStation(row, previousTrainData, station, dateNow)
            && isTrainStandingAtStation(row, details, station, dateNow)) {
            // Two consecutive live samples confirm a stop; never rewrite its arrival on each tick.
            details.observedArrivals![key] = {time: previousTrainData.observationServerTime, estimated: true};
        }
    }
    return details;
}

type TrainDetails = {
    timetable: TrainTimeTableRow[],
    lastDelay?: number,
    observationServerTime?: Date,
    observedArrivals?: {[key: string]: {time: Date; estimated: boolean}},
}

export type DetailedTrain = ExtendedTrain & TrainDetails;
