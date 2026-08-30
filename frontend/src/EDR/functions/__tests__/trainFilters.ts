import {
    hasTrainPassedStation,
    MAX_DEPARTED_TRAIN_HIDE_DISTANCE_KM,
    MIN_DEPARTED_TRAIN_HIDE_DISTANCE_KM,
    shouldHideByScheduledTime,
    shouldHideDepartedTrain,
} from "../trainFilters";

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
    it("keeps early trains visible outside the scheduled window", () => {
        expect(shouldHideByScheduledTime(30, 90, -1)).toBe(false);
        expect(shouldHideByScheduledTime(30, 90, -15)).toBe(false);
    });

    it("continues to filter non-early trains by their scheduled time", () => {
        expect(shouldHideByScheduledTime(30, 90, undefined)).toBe(true);
        expect(shouldHideByScheduledTime(30, 90, 0)).toBe(true);
        expect(shouldHideByScheduledTime(30, 90, 10)).toBe(true);
        expect(shouldHideByScheduledTime(30, 20, 10)).toBe(false);
    });

    it("does not hide trains when the schedule filter is disabled", () => {
        expect(shouldHideByScheduledTime(undefined, 90, 10)).toBe(false);
    });
});
