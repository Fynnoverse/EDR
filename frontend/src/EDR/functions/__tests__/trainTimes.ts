import {getPredictedTrainTime} from "../trainTimes";

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
