import { shouldHideDepartedTrain } from "../trainFilters";

describe("shouldHideDepartedTrain", () => {
    it("keeps an approaching train visible even when it is more than 10 km away", () => {
        expect(shouldHideDepartedTrain(false, 25)).toBe(false);
    });

    it("keeps a departed train visible until it is 10 km past the station", () => {
        expect(shouldHideDepartedTrain(true, 9.99)).toBe(false);
        expect(shouldHideDepartedTrain(true, 10)).toBe(true);
    });

    it("keeps a train visible when no live distance is available", () => {
        expect(shouldHideDepartedTrain(true, undefined)).toBe(false);
    });
});
