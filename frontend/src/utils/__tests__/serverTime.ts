import {toServerTime} from "../serverTime";

describe("toServerTime", () => {
    it("uses the SimRail server offset instead of the browser timezone", () => {
        const converted = toServerTime("2026-08-30T10:48:00.000Z", 2);

        expect(converted.getHours()).toBe(12);
        expect(converted.getMinutes()).toBe(48);
    });

    it("supports negative server offsets", () => {
        const converted = toServerTime("2026-08-30T10:48:00.000Z", -4);

        expect(converted.getHours()).toBe(6);
        expect(converted.getMinutes()).toBe(48);
    });
});
