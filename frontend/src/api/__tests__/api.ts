import {BASE_API_URL, expectExtendedTrainArray, normalizeBaseApiUrl} from "../api";

describe("Invalid configuration will not ship to production", () => {
    it("Base API URL is not localhost", () => {
        expect(BASE_API_URL).not.toBe("http://localhost:8080/")
    })
});

describe("API URL normalization", () => {
    it("adds a missing trailing slash", () => {
        expect(normalizeBaseApiUrl("https://example.com/api")).toBe("https://example.com/api/");
    });

    it("keeps exactly one trailing slash", () => {
        expect(normalizeBaseApiUrl("https://example.com/api///")).toBe("https://example.com/api/");
        expect(normalizeBaseApiUrl("/")).toBe("/");
    });
});

describe("train distance response validation", () => {
    it("accepts numeric and unavailable distances", () => {
        const trains = expectExtendedTrainArray([
            {distanceFromStation: 12.5},
            {distanceFromStation: null},
        ]);

        expect(trains).toHaveLength(2);
    });

    it("rejects missing and invalid distances", () => {
        expect(() => expectExtendedTrainArray([{}])).toThrow("contain distanceFromStation");
        expect(() => expectExtendedTrainArray([{distanceFromStation: "12.5"}])).toThrow("finite number or null");
        expect(() => expectExtendedTrainArray([{distanceFromStation: Number.NaN}])).toThrow("finite number or null");
    });
});
