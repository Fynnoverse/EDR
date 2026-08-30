import {isNextServerDay, toServerTime} from "../serverTime";
import {nowUTC} from "../date";

describe("toServerTime", () => {
    it("uses the SimRail server offset instead of the browser timezone", () => {
        const converted = toServerTime("2026-08-30T10:48:00.000Z", 2);

        expect(converted.getUTCHours()).toBe(12);
        expect(converted.getUTCMinutes()).toBe(48);
    });

    it("supports negative server offsets", () => {
        const converted = toServerTime("2026-08-30T10:48:00.000Z", -4);

        expect(converted.getUTCHours()).toBe(6);
        expect(converted.getUTCMinutes()).toBe(48);
    });

    it("does not normalize server wall-clock times across browser DST gaps", () => {
        const before = toServerTime("2026-03-08T00:30:00.000Z", 2);
        const after = toServerTime("2026-03-08T01:00:00.000Z", 2);

        expect(before.getUTCHours()).toBe(2);
        expect(before.getUTCMinutes()).toBe(30);
        expect(after.getUTCHours()).toBe(3);
        expect(before.valueOf()).toBeLessThan(after.valueOf());
    });
});

describe("current server time", () => {
    it("does not apply the timezone offset a second time", () => {
        const serverTime = Date.parse("2026-08-30T10:48:00.000Z");

        expect(nowUTC(serverTime).getUTCHours()).toBe(10);
    });
});

describe("server calendar boundaries", () => {
    const serverNow = new Date("2026-08-30T23:55:00.000Z");

    it("marks only the next server-calendar day", () => {
        expect(isNextServerDay(new Date("2026-08-31T00:05:00.000Z"), serverNow)).toBe(true);
        expect(isNextServerDay(new Date("2026-08-30T23:59:00.000Z"), serverNow)).toBe(false);
        expect(isNextServerDay(new Date("2026-09-01T00:05:00.000Z"), serverNow)).toBe(false);
    });
});
