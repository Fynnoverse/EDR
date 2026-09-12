import {getDisplayedDepartureTime, getPredictedDepartureTime, getPredictedTrainTime} from "../trainTimes";

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

    it("subtracts earliness for a train without stop", () => {
        expect(getPredictedDepartureTime(arrival, departure, -5, false).toISOString()).toBe("2026-09-07T23:45:00.000Z");
    });

    it("keeps scheduled time for a train without stop when deviation is 0 or undefined", () => {
        expect(getPredictedDepartureTime(arrival, departure, 0, false)).toEqual(arrival);
        expect(getPredictedDepartureTime(arrival, departure, undefined, false)).toEqual(arrival);
    });

    it("applies delay to originating trains where arrival is a placeholder date (epoch 1970)", () => {
        const originArrival = new Date(0);
        expect(getPredictedDepartureTime(originArrival, departure, 10).toISOString()).toBe("2026-09-08T00:05:00.000Z");
        expect(getPredictedDepartureTime(originArrival, departure, 0)).toEqual(departure);
    });
});

describe("displayed departure", () => {
    const arrival = new Date("2026-09-07T23:50:00Z");
    const departure = new Date("2026-09-07T23:55:00Z");

    it("subtracts earliness for a non-stopping train", () => {
        expect(getDisplayedDepartureTime(arrival, departure, -4, -4, true, undefined, false).toISOString())
            .toBe("2026-09-07T23:46:00.000Z");
    });

    it("retains scheduled departure for an early stopping train", () => {
        expect(getDisplayedDepartureTime(arrival, departure, -4, -4, true, undefined, true))
            .toEqual(departure);
    });

    it("calculates correct departure when departure delay exceeds arrival delay", () => {
        // Arrived on time (0 delay), but departure delayed by +15 min
        expect(getDisplayedDepartureTime(arrival, departure, 15, 0, true, undefined, true).toISOString())
            .toBe("2026-09-08T00:10:00.000Z");
    });

    it("calculates correct departure for delayed originating trains", () => {
        const originArrival = new Date(0);
        expect(getDisplayedDepartureTime(originArrival, departure, 10, undefined, true, undefined, true).toISOString())
            .toBe("2026-09-08T00:05:00.000Z");
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
