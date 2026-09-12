import {ExtendedTrain} from "../../../customTypes/ExtendedTrain";
import {TrainTimeTableRow} from "../../../Sirius";
import {DetailedTrain, getTrainDetails} from "../trainDetails";
import {TimeTableRow} from "../../../customTypes/TimeTableRow";
import {postConfig} from "../../../config/stations";
import {getStationDeviation} from "../stationDeviation";

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
    it("loads earliness from an older reported checkpoint when the preceding point has no event", () => {
        const timetables = {"100": [checkpoint("2026-09-07T10:00:00Z", "2026-09-07T09:58:00Z"),
            {...checkpoint("2026-09-07T10:10:00Z", "3001-01-31T00:00:00Z"), indexOfPoint: 2}]};
        expect(getTrainDetails({current: null}, timetables, new Date("2026-09-07T10:20:00Z"))(train(3)).lastDelay).toBe(-2);
    });
    it("does not manufacture an event time after a gap spanning multiple checkpoints", () => {
        const timetables = {"100": [{...checkpoint("2026-09-07T10:00:00Z", "3001-01-31T00:00:00Z"), indexOfPoint: 4}]};
        const previous = {current: {"100": {lastDelay: -2, TrainData: {VDDelayedTimetableIndex: 1}} as DetailedTrain}};
        expect(getTrainDetails(previous, timetables, new Date("2026-09-07T10:30:00Z"))(train(5)).lastDelay).toBe(-2);
    });

    it("prefers the current API arrival over the previous departure", () => {
        const timetables = {"100": [checkpoint("2026-09-07T10:00:00Z", "2026-09-07T10:05:00Z"),
            {indexOfPoint: 2, scheduledArrivalObject: new Date("2026-09-07T10:15:00Z"),
                actualArrivalObject: new Date("2026-09-07T10:16:00Z")} as TrainTimeTableRow]};
        expect(getTrainDetails({current: null}, timetables, new Date("2026-09-07T10:17:00Z"))(train(2)).lastDelay).toBe(1);
    });
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
    it("confirms an estimated arrival over two samples, freezes it, then replaces it with an API arrival", () => {
        const row = {trainNoLocal: "100", pointId: "123", stationIndex: 2, plannedStop: 2,
            scheduledArrivalObject: new Date("2026-09-07T11:40:00Z"), scheduledDepartureObject: new Date("2026-09-07T11:47:00Z"),
            actualArrivalObject: new Date(0), actualDepartureObject: new Date(0)} as TimeTableRow;
        const firstTime = new Date("2026-09-07T11:42:00Z");
        const sample = {...train(2), receivedAt: Date.now(), distanceFromStation: 0.17};
        sample.TrainData.Velocity = 0;
        const first = getTrainDetails({current: null}, {}, firstTime, [row], postConfig.KOL)(sample);
        expect(Object.keys(first.observedArrivals!)).toHaveLength(0);
        const second = getTrainDetails({current: {"100": first}}, {}, new Date("2026-09-07T11:42:05Z"), [row], postConfig.KOL)
            ({...sample, receivedAt: sample.receivedAt + 5000});
        expect(getStationDeviation(row, second, postConfig.KOL, new Date("2026-09-07T11:55:00Z")))
            .toMatchObject({arrivalMinutes: 2, arrivalEstimated: true, departureMinutes: 8});
        const timetable = {"100": [{...row, indexOfPoint: 2, actualArrivalObject: new Date("2026-09-07T11:41:00Z")} as any]};
        const third = getTrainDetails({current: {"100": second}}, timetable, new Date("2026-09-07T11:55:00Z"), [row], postConfig.KOL)(sample);
        expect(getStationDeviation(row, third, postConfig.KOL, new Date("2026-09-07T11:55:00Z")))
            .toMatchObject({arrivalMinutes: 1, arrivalEstimated: false, departureMinutes: 8});
        const missing = getTrainDetails({current: {"100": third}}, {}, new Date("2026-09-07T11:56:00Z"), [row], postConfig.KOL)(sample);
        expect(getStationDeviation(row, missing, postConfig.KOL, new Date("2026-09-07T11:56:00Z")))
            .toMatchObject({arrivalMinutes: 1, arrivalEstimated: false});
    });
    it("uses a current recorded departure instead of reverting to its earlier arrival delay", () => {
        const timetable = {"100": [{indexOfPoint: 2,
            scheduledArrivalObject: new Date("2026-09-07T11:40:00Z"), actualArrivalObject: new Date("2026-09-07T11:42:00Z"),
            scheduledDepartureObject: new Date("2026-09-07T11:47:00Z"), actualDepartureObject: new Date("2026-09-07T11:55:00Z")} as TrainTimeTableRow]};
        expect(getTrainDetails({current: null}, timetable, new Date("2026-09-07T11:56:00Z"))(train(2)).lastDelay).toBe(8);
    });
});
