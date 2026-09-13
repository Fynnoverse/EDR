import {
    departureDistance,
    hasTrainPassedStation,
    isInactiveTrainAtStation,
    MAX_DEPARTED_TRAIN_HIDE_DISTANCE_KM,
    MIN_DEPARTED_TRAIN_HIDE_DISTANCE_KM,
    moveInactiveRowsLast,
    shouldHideByScheduledTime,
    shouldHideDepartedTrain,
} from "../trainFilters";

describe("departed trains with unavailable routing", () => {
    const station: [number, number] = [20.151522, 51.967741];

    it.each([null, undefined, NaN])("keeps departures visible without a valid single-post route distance %s", route => {
        const distance = departureDistance(route, station[0], station[1] + 0.002, station);
        expect(distance).toBeUndefined();
        expect(shouldHideDepartedTrain(true, distance, 0.1)).toBe(false);
        expect(shouldHideDepartedTrain(false, distance, 0.1)).toBe(false);
    });

    it("keeps departures within 100 m visible", () => {
        const distance = departureDistance(null, station[0], station[1] + 0.0004, station);
        expect(shouldHideDepartedTrain(true, distance, 0.1)).toBe(false);
    });

    it("retains routed distance and rejects missing coordinates", () => {
        expect(departureDistance(2, station[0], station[1], station)).toBe(2);
        expect(departureDistance(null, 0, 0, station)).toBeUndefined();
        expect(departureDistance(null, NaN, NaN, station)).toBeUndefined();
        expect(departureDistance(null, station[0], station[1])).toBeUndefined();
    });

    it("measures distance to the closest sub-station in multi-post station groups", () => {
        const mainPost: [number, number] = [19.264612, 50.366385]; // DG_ZABKOWICE
        const outerPost: [number, number] = [19.290825, 50.378906]; // DG_DZA (~2.3 km away)
        // Train is 0.05 km from the outer sub-station DG_DZA
        const trainNearOuter: [number, number] = [outerPost[0], outerPost[1] + 0.0004];

        const dist = departureDistance(null, trainNearOuter[0], trainNearOuter[1], [mainPost, outerPost]);
        expect(dist).toBeLessThan(0.1);
        expect(shouldHideDepartedTrain(true, dist, 0.5)).toBe(false);
    });
});

describe("hasTrainPassedStation", () => {
    it("only recognizes a train as departed after it passes the station index", () => {
        expect(hasTrainPassedStation(12, 12)).toBe(false);
        expect(hasTrainPassedStation(13, 12)).toBe(true);
    });

    it("waits until the train has passed all merged secondary posts", () => {
        expect(hasTrainPassedStation(13, 12, [14])).toBe(false);
        expect(hasTrainPassedStation(14, 12, [14])).toBe(false);
        expect(hasTrainPassedStation(15, 12, [14])).toBe(true);
    });
});

describe("inactive train ordering", () => {
    it("classifies offline and departed trains as inactive", () => {
        expect(isInactiveTrainAtStation(undefined, 12)).toBe(true);
        expect(isInactiveTrainAtStation(12, 12)).toBe(false);
        expect(isInactiveTrainAtStation(13, 12)).toBe(true);
    });

    it("moves inactive rows to the bottom without changing group order", () => {
        const rows = [
            {id: "inactive-1", inactive: true},
            {id: "active-1", inactive: false},
            {id: "inactive-2", inactive: true},
            {id: "active-2", inactive: false},
        ];

        expect(moveInactiveRowsLast(rows, row => row.inactive).map(row => row.id)).toEqual([
            "active-1",
            "active-2",
            "inactive-1",
            "inactive-2",
        ]);
    });
});

describe("shouldHideDepartedTrain", () => {
    it("keeps an approaching train visible even when it exceeds the selected distance", () => {
        expect(shouldHideDepartedTrain(false, 25, MIN_DEPARTED_TRAIN_HIDE_DISTANCE_KM)).toBe(false);
    });

    it("hides a departed train only after it exceeds the selected distance", () => {
        expect(shouldHideDepartedTrain(true, 0.09, MIN_DEPARTED_TRAIN_HIDE_DISTANCE_KM)).toBe(false);
        expect(shouldHideDepartedTrain(true, 0.1, MIN_DEPARTED_TRAIN_HIDE_DISTANCE_KM)).toBe(false);
        expect(shouldHideDepartedTrain(true, 0.11, MIN_DEPARTED_TRAIN_HIDE_DISTANCE_KM)).toBe(true);
        expect(shouldHideDepartedTrain(true, 4.99, MAX_DEPARTED_TRAIN_HIDE_DISTANCE_KM)).toBe(false);
        expect(shouldHideDepartedTrain(true, 5, MAX_DEPARTED_TRAIN_HIDE_DISTANCE_KM)).toBe(false);
        expect(shouldHideDepartedTrain(true, 5.01, MAX_DEPARTED_TRAIN_HIDE_DISTANCE_KM)).toBe(true);
    });

    it("keeps a train visible when no live distance is available", () => {
        expect(shouldHideDepartedTrain(true, undefined, 1)).toBe(false);
        expect(shouldHideDepartedTrain(true, null, 1)).toBe(false);
    });
});

describe("shouldHideByScheduledTime", () => {
    it("applies earliness to the scheduled difference", () => {
        expect(shouldHideByScheduledTime(30, 40, -15)).toBe(false);
        expect(shouldHideByScheduledTime(30, 90, -15)).toBe(true);
    });

    it("applies delays to the scheduled difference", () => {
        expect(shouldHideByScheduledTime(30, 90, undefined)).toBe(true);
        expect(shouldHideByScheduledTime(30, 90, 0)).toBe(true);
        expect(shouldHideByScheduledTime(30, 20, 10)).toBe(false);
        expect(shouldHideByScheduledTime(30, 20, 11)).toBe(true);
    });

    it("does not hide trains when the schedule filter is disabled", () => {
        expect(shouldHideByScheduledTime(undefined, 90, 10)).toBe(false);
    });
});

it("uses valid single-post routes without mixing in GPS distance, including zero", () => {
    expect(departureDistance(0, 20, 52.01, [20, 52])).toBe(0);
    expect(departureDistance(0.2, 20, 52.01, [20, 52])).toBe(0.2);
});
it("keeps group distance spatial even when a main-post route is present", () => {
    const posts: [number, number][] = [[20, 52], [20, 52.01]];
    const spatial = departureDistance(null, 20, 52.02, posts);
    expect(departureDistance(0.1, 20, 52.02, posts)).toBe(spatial);
    expect(departureDistance(12, 20, 52.02, posts)).toBe(spatial);
});

it("does not replace a group distance with the main-post route when GPS is missing", () => {
    expect(departureDistance(10, NaN, NaN, [[20, 52], [20, 52.01]])).toBeUndefined();
    expect(departureDistance(10, 20, 52.02, [[20, 52], [NaN, 52.01]])).toBeUndefined();
});
