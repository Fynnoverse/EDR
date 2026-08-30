import { shouldHideDepartedTrain } from "../trainFilters";

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
