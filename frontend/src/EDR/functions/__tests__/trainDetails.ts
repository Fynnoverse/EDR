import {ExtendedTrain} from "../../../customTypes/ExtendedTrain";
import {TrainTimeTableRow} from "../../../Sirius";
import {DetailedTrain, getTrainDetails} from "../trainDetails";

const train = (index: number) => ({
    TrainNoLocal: "100",
    TrainData: {VDDelayedTimetableIndex: index},
} as ExtendedTrain);

const checkpoint = (scheduled: string, actual: string) => ({
    indexOfPoint: 1,
    scheduledDepartureObject: new Date(scheduled),
    actualDepartureObject: new Date(actual),
} as TrainTimeTableRow);

describe("live train deviation", () => {
    it("uses the recorded departure time when it is available", () => {
        const timetables = {"100": [checkpoint("2026-09-07T10:00:00Z", "2026-09-07T09:55:00Z")]};
        const details = getTrainDetails({current: null}, timetables, new Date("2026-09-07T10:30:00Z"))(train(2));
        expect(details.lastDelay).toBe(-5);
    });

    it("uses server time when the train has just advanced and no recorded time exists", () => {
        const timetables = {"100": [checkpoint("2026-09-07T23:58:00Z", "3001-01-31T00:00:00Z")]};
        const previous = {current: {"100": {TrainData: {VDDelayedTimetableIndex: 1}} as DetailedTrain}};
        const details = getTrainDetails(previous, timetables, new Date("2026-09-08T00:03:00Z"))(train(2));
        expect(details.lastDelay).toBe(5);
    });
});
