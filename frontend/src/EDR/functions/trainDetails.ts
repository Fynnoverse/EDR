import { StationConfig } from "../../config/stations";
import { Dictionary } from "lodash";
import { TrainTimeTableRow } from "../../Sirius";
import { ExtendedTrain } from "../../customTypes/ExtendedTrain";
import { differenceInMinutes } from "date-fns";

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

export const getTrainDetails = (previousTrains: React.MutableRefObject<{[k: string]: DetailedTrain;} | null>, trainTimetables: Dictionary<TrainTimeTableRow[]>, dateNow: Date) =>(t: ExtendedTrain) => {
    const previousTrainData = previousTrains.current?.[t.TrainNoLocal as string];
    let lastDelay = previousTrainData?.lastDelay;
    const stationPassed = trainTimetables[t.TrainNoLocal]?.find(ttRow => ttRow.indexOfPoint === (t.TrainData.VDDelayedTimetableIndex - 1));
    const actualDeparture = stationPassed && isUsableActualTime(stationPassed.actualDepartureObject) && stationPassed.actualDepartureObject <= dateNow
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
    if (currentPoint && isUsableActualTime(currentPoint.actualArrivalObject)
        && currentPoint.actualArrivalObject <= dateNow && isUsableActualTime(currentPoint.scheduledArrivalObject)) {
        lastDelay = differenceInMinutes(currentPoint.actualArrivalObject, currentPoint.scheduledArrivalObject);
    }

    return {...t,
        timetable: trainTimetables[t.TrainNoLocal],
        lastDelay,
    } as DetailedTrain
}

type TrainDetails = {
    timetable: TrainTimeTableRow[],
    lastDelay?: number,
}

export type DetailedTrain = ExtendedTrain & TrainDetails;
