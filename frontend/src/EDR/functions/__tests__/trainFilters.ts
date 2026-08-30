import { shouldHideByScheduledTime, shouldHideDepartedTrain } from "../trainFilters";

describe("shouldHideDepartedTrain", () => {
    it("keeps an approaching train visible even when it is more than 10 km away", () => {
        expect(shouldHideDepartedTrain(false, 25, 10)).toBe(false);
    });

    it("uses the configured distance for a departed train", () => {
        expect(shouldHideDepartedTrain(true, 5.99, 6)).toBe(false);
        expect(shouldHideDepartedTrain(true, 6, 6)).toBe(true);
        expect(shouldHideDepartedTrain(true, 10, 10)).toBe(true);
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
