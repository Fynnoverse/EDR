import {TimeTableRow} from "../../../customTypes/TimeTableRow";
import {DetailedTrain} from "../trainDetails";
import {sortTimetable} from "../trainSorting";

const row = (trainNoLocal: string, arrival: string, departure = arrival) => ({
    trainNoLocal,
    trainType: "EC",
    scheduledArrivalObject: new Date(arrival),
    scheduledDepartureObject: new Date(departure),
    plannedStop: 0,
} as TimeTableRow);

describe("train sorting", () => {
    it("sorts train numbers naturally", () => {
        const rows = [row("100", "2026-09-07T10:00:00Z"), row("20", "2026-09-07T10:00:00Z")];
        expect(sortTimetable(rows, "trainNumber", "ascending", {}).map(item => item.trainNoLocal)).toEqual(["20", "100"]);
    });

    it("sorts time columns by their live-adjusted time", () => {
        const rows = [row("1", "2026-09-07T10:00:00Z"), row("2", "2026-09-07T10:05:00Z")];
        const trains = {
            "1": {lastDelay: 10} as DetailedTrain,
            "2": {lastDelay: 0} as DetailedTrain,
        };
        expect(sortTimetable(rows, "arrival", "ascending", trains).map(item => item.trainNoLocal)).toEqual(["2", "1"]);
    });

    it("reverses the selected order", () => {
        const rows = [row("1", "2026-09-07T10:00:00Z"), row("2", "2026-09-07T10:05:00Z")];
        expect(sortTimetable(rows, "departure", "descending", {}).map(item => item.trainNoLocal)).toEqual(["2", "1"]);
    });

    it("uses station arrival deviations and allows scheduled arrival order", () => {
        const rows = [row("1", "2026-09-07T10:00:00Z"), row("2", "2026-09-07T10:05:00Z")];
        expect(sortTimetable(rows, "arrival", "ascending", {}, item => item.trainNoLocal === "1" ? 10 : 0)
            .map(item => item.trainNoLocal)).toEqual(["2", "1"]);
        expect(sortTimetable(rows, "arrival", "ascending", {"1": {lastDelay: 10} as DetailedTrain}, () => 0)
            .map(item => item.trainNoLocal)).toEqual(["1", "2"]);
    });
});
