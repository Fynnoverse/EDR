import {TimeTableRow} from "../../customTypes/TimeTableRow";
import {DetailedTrain} from "./trainDetails";
import {getPredictedDepartureTime, getPredictedTrainTimestamp} from "./trainTimes";

export type TrainSortKey = "trainNumber" | "trainType" | "arrival" | "from" | "stop" | "departure" | "to";
export type SortDirection = "ascending" | "descending";
export type ArrivalSortMode = "predicted" | "scheduled";
type ArrivalDeviation = (row: TimeTableRow) => number | undefined;

const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: "base"});

const getSortValue = (row: TimeTableRow, key: TrainSortKey, train?: DetailedTrain, arrivalDeviation?: ArrivalDeviation, departureTime?: (row: TimeTableRow) => Date): string | number => {
    switch (key) {
        case "trainNumber": return row.trainNoLocal;
        case "trainType": return row.trainType;
        case "arrival": return getPredictedTrainTimestamp(row.scheduledArrivalObject, arrivalDeviation ? arrivalDeviation(row) : train?.lastDelay);
        case "from": return row.fromPost ?? "";
        case "stop": return row.plannedStop;
        case "departure": return (departureTime ? departureTime(row) : getPredictedDepartureTime(row.scheduledArrivalObject, row.scheduledDepartureObject, train?.lastDelay, row.plannedStop > 0)).valueOf();
        case "to": return row.toPost ?? "";
    }
};

/** Sorts a copy of the timetable, using live-adjusted values for both time columns. */
export const sortTimetable = (
    rows: TimeTableRow[],
    key: TrainSortKey,
    direction: SortDirection,
    trainsWithDetails: {[trainNumber: string]: DetailedTrain},
    arrivalDeviation?: ArrivalDeviation,
    departureTime?: (row: TimeTableRow) => Date,
) => rows.map((row, originalIndex) => ({row, originalIndex})).sort((left, right) => {
    const leftValue = getSortValue(left.row, key, trainsWithDetails[left.row.trainNoLocal], arrivalDeviation, departureTime);
    const rightValue = getSortValue(right.row, key, trainsWithDetails[right.row.trainNoLocal], arrivalDeviation, departureTime);
    const comparison = typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : collator.compare(String(leftValue), String(rightValue));

    return (direction === "ascending" ? comparison : -comparison) || left.originalIndex - right.originalIndex;
}).map(({row}) => row);
