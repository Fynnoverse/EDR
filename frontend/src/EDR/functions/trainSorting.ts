import {TimeTableRow} from "../../customTypes/TimeTableRow";
import {DetailedTrain} from "./trainDetails";
import {getPredictedTrainTimestamp} from "./trainTimes";

export type TrainSortKey = "trainNumber" | "trainType" | "arrival" | "from" | "stop" | "departure" | "to";
export type SortDirection = "ascending" | "descending";

const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: "base"});

const getSortValue = (row: TimeTableRow, key: TrainSortKey, train?: DetailedTrain): string | number => {
    switch (key) {
        case "trainNumber": return row.trainNoLocal;
        case "trainType": return row.trainType;
        case "arrival": return getPredictedTrainTimestamp(row.scheduledArrivalObject, train?.lastDelay);
        case "from": return row.fromPost ?? "";
        case "stop": return row.plannedStop;
        case "departure": return getPredictedTrainTimestamp(row.scheduledDepartureObject, train?.lastDelay);
        case "to": return row.toPost ?? "";
    }
};

/** Sorts a copy of the timetable, using live-adjusted values for both time columns. */
export const sortTimetable = (
    rows: TimeTableRow[],
    key: TrainSortKey,
    direction: SortDirection,
    trainsWithDetails: {[trainNumber: string]: DetailedTrain},
) => rows.map((row, originalIndex) => ({row, originalIndex})).sort((left, right) => {
    const leftValue = getSortValue(left.row, key, trainsWithDetails[left.row.trainNoLocal]);
    const rightValue = getSortValue(right.row, key, trainsWithDetails[right.row.trainNoLocal]);
    const comparison = typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : collator.compare(String(leftValue), String(rightValue));

    return (direction === "ascending" ? comparison : -comparison) || left.originalIndex - right.originalIndex;
}).map(({row}) => row);
