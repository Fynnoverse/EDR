import {TimeTableRow} from "../../../customTypes/TimeTableRow";
import {ExtendedTrain} from "../../../customTypes/ExtendedTrain";
import {postConfig} from "../../../config/stations";
import {DetailedTrain, getTrainDetails} from "../trainDetails";
import {hasTrainLeftStationArea} from "../stationPresence";

const station = postConfig.DG_ZA;
const outer = postConfig.DG_DZA.platformPosOverride!;
const now = new Date("2026-09-12T12:00:00Z");
const row = {trainNoLocal: "100", pointId: station.id, stationIndex: 4,
    scheduledArrivalObject: now, scheduledDepartureObject: now, plannedStop: 0,
    secondaryPostsRows: [{pointId: postConfig.DG_DZA.id, stationIndex: 6,
        scheduledArrivalObject: now, scheduledDepartureObject: now, plannedStop: 0}],
} as TimeTableRow;
const sample = (index: number, atOuter = false) => ({TrainNoLocal: "100", distanceFromStation: 10,
    TrainData: {VDDelayedTimetableIndex: index, Velocity: 40,
        Longitute: atOuter ? outer[0] : 19.35, Latititute: atOuter ? outer[1] : 50.45},
} as ExtendedTrain);
const observe = (live: ExtendedTrain, previous?: DetailedTrain, stationRow = row) =>
    getTrainDetails({current: previous ? {"100": previous} : null}, {}, now, [stationRow], station)(live);

it("requires entry before departure and waits until the outer substation has been left", () => {
    const approaching = observe(sample(3));
    expect(hasTrainLeftStationArea(row, approaching, station, now)).toBe(false);
    const between = observe(sample(5), approaching);
    expect(hasTrainLeftStationArea(row, between, station, now)).toBe(false);
    const atLastPoint = observe(sample(6, true), between);
    expect(hasTrainLeftStationArea(row, atLastPoint, station, now)).toBe(false);
    const pastIndexButInside = observe(sample(7, true), atLastPoint);
    expect(hasTrainLeftStationArea(row, pastIndexButInside, station, now)).toBe(false);
    const outside = observe(sample(7), pastIndexButInside);
    expect(hasTrainLeftStationArea(row, outside, station, now)).toBe(true);
    expect(hasTrainLeftStationArea(row, observe(sample(8), outside), station, now)).toBe(true);
});

it("does not interpret a first load beyond the post or a skipped area as a departure", () => {
    expect(hasTrainLeftStationArea(row, observe(sample(7)), station, now)).toBe(false);
    expect(hasTrainLeftStationArea(row, observe(sample(7), observe(sample(3))), station, now)).toBe(false);
    expect(hasTrainLeftStationArea(row, undefined, station, now)).toBe(false);
});

it("does not reuse presence for a restarted train or a different timetable visit", () => {
    const inside = observe(sample(5));
    const restarted = observe(sample(3), inside);
    expect(hasTrainLeftStationArea(row, observe(sample(7), restarted), station, now)).toBe(false);
    const nextVisit = {...row, scheduledArrivalObject: new Date("2026-09-13T12:00:00Z")};
    expect(hasTrainLeftStationArea(nextVisit, observe(sample(7), inside, nextVisit), station, now)).toBe(false);
});

it("keeps a previously observed train active when it returns inside an outer post", () => {
    const outside = observe(sample(7), observe(sample(5)));
    expect(hasTrainLeftStationArea(row, observe(sample(7, true), outside), station, now)).toBe(false);
});
