import {getPredictedDepartureTime, getPredictedTrainTime} from "../trainTimes";

describe("predicted departure", () => {
    const arrival = new Date("2026-09-07T23:50:00Z");
    const departure = new Date("2026-09-07T23:55:00Z");

    it.each([-5, 0, undefined, 2])("keeps the planned departure for deviation %s", delay => {
        expect(getPredictedDepartureTime(arrival, departure, delay)).toEqual(departure);
    });

    it("replaces scheduled dwell with one minute for a late arrival across midnight", () => {
        expect(getPredictedDepartureTime(arrival, departure, 12).toISOString()).toBe("2026-09-08T00:03:00.000Z");
    });

    it("does not add dwell to a passing train", () => {
        expect(getPredictedDepartureTime(arrival, arrival, 12, false).toISOString()).toBe("2026-09-08T00:02:00.000Z");
    });
});

describe("predicted train time", () => {
    const scheduled = new Date("2026-09-07T23:55:00.000Z");

    it("adds a delay across midnight", () => {
        expect(getPredictedTrainTime(scheduled, 10).toISOString()).toBe("2026-09-08T00:05:00.000Z");
    });

    it("subtracts earliness", () => {
        expect(getPredictedTrainTime(scheduled, -5).toISOString()).toBe("2026-09-07T23:50:00.000Z");
    });

    it("uses the scheduled time while no live deviation is known", () => {
        expect(getPredictedTrainTime(scheduled).toISOString()).toBe(scheduled.toISOString());
    });
});
