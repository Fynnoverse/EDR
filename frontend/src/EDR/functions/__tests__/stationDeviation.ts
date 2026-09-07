import {getStationDeviation} from "../stationDeviation";
import {postConfig} from "../../../config/stations";
import {TimeTableRow} from "../../../customTypes/TimeTableRow";
import {DetailedTrain} from "../trainDetails";

describe("API-based station deviation", () => {
    const now = new Date("2026-09-07T12:05:00Z");
    const row = {
        pointId: "2412", stationIndex: 2, plannedStop: 2,
        scheduledArrivalObject: new Date("2026-09-07T11:58:00Z"),
        scheduledDepartureObject: new Date("2026-09-07T12:00:00Z"),
        actualArrivalObject: new Date(0), actualDepartureObject: new Date(0)
    } as TimeTableRow;
    const train = () => ({lastDelay: -3, receivedAt: Date.now(), distanceFromStation: 0.05,
        TrainData: {Velocity: 0, VDDelayedTimetableIndex: 2}, timetable: []} as unknown as DetailedTrain);

    it("grows departure delay while a fresh API observation places the train at its stop", () => {
        expect(getStationDeviation(row, train(), postConfig.LG, now)).toMatchObject({departureMinutes: 5, departureEstimated: true});
        expect(getStationDeviation(row, train(), postConfig.LG, new Date("2026-09-07T12:06:00Z"))).toMatchObject({departureMinutes: 6});
    });
    it("prefers recorded arrival and departure independently over inferred delay", () => {
        const observed = train();
        observed.timetable = [{...row, indexOfPoint: 2,
            actualArrivalObject: new Date("2026-09-07T11:57:00Z"),
            actualDepartureObject: new Date("2026-09-07T12:02:00Z")} as any];
        expect(getStationDeviation(row, observed, postConfig.LG, now)).toEqual({arrivalMinutes: -1, departureMinutes: 2,
            arrivalEstimated: false, departureEstimated: false});
    });
    it("does not grow earliness or infer a departure while moving, distant, or already passed", () => {
        for (const patch of [{Velocity: 60}, {VDDelayedTimetableIndex: 3}]) {
            const moving = train();
            Object.assign(moving.TrainData, patch);
            expect(getStationDeviation(row, moving, postConfig.LG, now).departureMinutes).toBe(-3);
        }
        expect(getStationDeviation(row, {...train(), distanceFromStation: 5}, postConfig.LG, now).departureMinutes).toBe(-3);
    });
    it("caps extrapolation when observations become stale", () => {
        const stale = {...train(), receivedAt: Date.now() - 120000};
        expect(getStationDeviation(row, stale, postConfig.LG, now).departureMinutes).toBe(3);
    });
    it("does not count a future or placeholder API timestamp as an actual event", () => {
        const future = {...row, actualDepartureObject: new Date("2026-09-07T13:00:00Z")};
        expect(getStationDeviation(future, train(), postConfig.LG, now).departureEstimated).toBe(true);
    });
});
