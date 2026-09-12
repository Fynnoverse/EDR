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
    it("updates the departure of a stopped train 170 metres from the station reference", () => {
        const stopped = {...train(), lastDelay: 2, distanceFromStation: 0.17};
        const result = getStationDeviation(row, stopped, postConfig.LG, now);
        expect(result).toMatchObject({arrivalMinutes: 2, departureMinutes: 5});
        expect(result.standingDepartureTime?.toISOString()).toBe("2026-09-07T12:06:00.000Z");
    });
    it("keeps departure punctual during remaining scheduled dwell despite a late arrival", () => {
        const stopped = {...train(), lastDelay: 2, distanceFromStation: 0.17};
        const result = getStationDeviation(row, stopped, postConfig.LG, new Date("2026-09-07T11:59:00Z"));
        expect(result.departureMinutes).toBe(0);
        expect(result.standingDepartureTime).toEqual(row.scheduledDepartureObject);
    });
    it("recognizes a stop at a merged secondary station", () => {
        const grouped = {...row, stationIndex: 1, secondaryPostsRows: [row]};
        expect(getStationDeviation(grouped, {...train(), distanceFromStation: 0.17}, postConfig.LG, now)
            .departureMinutes).toBe(5);
    });
    it("does not infer a platform stop for a passing train or an invalid velocity", () => {
        expect(getStationDeviation({...row, plannedStop: 0, scheduledDepartureObject: row.scheduledArrivalObject}, train(), postConfig.LG, now).standingDepartureTime).toBeUndefined();
        const invalid = train();
        invalid.TrainData.Velocity = -50;
        expect(getStationDeviation(row, invalid, postConfig.LG, now).standingDepartureTime).toBeUndefined();
    });
    it("prefers recorded arrival and departure independently over inferred delay", () => {
        const observed = train();
        observed.timetable = [{...row, indexOfPoint: 2,
            actualArrivalObject: new Date("2026-09-07T11:57:00Z"),
            actualDepartureObject: new Date("2026-09-07T12:02:00Z")} as any];
        expect(getStationDeviation(row, observed, postConfig.LG, now)).toMatchObject({arrivalMinutes: -1, departureMinutes: 2,
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
    it("shows +8 at 11:55 for train 11507 scheduled at 11:47, with +1 only in its forecast", () => {
        const waitingRow = {...row, trainNoLocal: "11507", scheduledDepartureObject: new Date("2026-09-07T11:47:00Z"),
            scheduledArrivalObject: new Date("2026-09-07T11:40:00Z")};
        const waiting = {...train(), lastDelay: 2, distanceFromStation: 0.17};
        waiting.timetable = [{...waitingRow, indexOfPoint: row.stationIndex, isStoped: true, leftTrack: false,
            actualArrivalObject: new Date("2026-09-07T11:42:00Z"),
            actualDepartureObject: new Date("2026-09-07T11:49:00Z")} as any];
        const result = getStationDeviation(waitingRow, waiting, postConfig.KOL, new Date("2026-09-07T11:55:00Z"));
        expect(result).toMatchObject({arrivalMinutes: 2, departureMinutes: 8, departureEstimated: true});
        expect(result.standingDepartureTime?.toISOString()).toBe("2026-09-07T11:56:00.000Z");
        expect(getStationDeviation(waitingRow, waiting, postConfig.KOL, new Date("2026-09-07T11:56:00Z")).departureMinutes).toBe(9);
        waiting.TrainData.VDDelayedTimetableIndex = 3;
        expect(getStationDeviation(waitingRow, waiting, postConfig.KOL, new Date("2026-09-07T11:55:00Z")).departureMinutes).toBe(8);
        waiting.timetable[0].leftTrack = true;
        expect(getStationDeviation(waitingRow, waiting, postConfig.KOL, new Date("2026-09-07T11:55:00Z")))
            .toMatchObject({departureMinutes: 2, departureEstimated: false, standingDepartureTime: undefined});
    });
    it("accepts a reported stop with a recorded arrival when routing is unavailable", () => {
        const waiting = {...train(), distanceFromStation: null};
        waiting.timetable = [{...row, indexOfPoint: row.stationIndex, isStoped: true, leftTrack: false,
            actualArrivalObject: new Date("2026-09-07T12:00:00Z")} as any];
        expect(getStationDeviation(row, waiting, postConfig.KOL, now).departureMinutes).toBe(5);
    });
});
