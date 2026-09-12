import {getStationAreaDistance} from "../displayDistance";
import {isTrainInStationArea} from "../stationPresence";
import {DetailedTrain} from "../trainDetails";
import {TimeTableRow} from "../../../customTypes/TimeTableRow";
import {StationConfig} from "../../../config/stations";

it("uses GPS for station presence independently of routing detours or snapped zero distances", () => {
    expect(getStationAreaDistance(8, 20, 52, [20, 52])).toBe(0);
    expect(getStationAreaDistance(0, 20, 52.02, [20, 52])).toBeGreaterThan(2);
    expect(getStationAreaDistance(0.2, undefined, undefined, [20, 52])).toBe(0.2);
});
it.each([null, 0, 8])("station-area classification remains spatial with routed distance %s", routed => {
    const station = {id: "test", platformPosOverride: [20, 52], trainPosRange: 0.5} as StationConfig;
    const row = {stationIndex: 2} as TimeTableRow;
    const train = (latitude: number) => ({distanceFromStation: routed,
        TrainData: {VDDelayedTimetableIndex: 2, Longitute: 20, Latititute: latitude}} as DetailedTrain);
    expect(isTrainInStationArea(row, train(52), station)).toBe(true);
    expect(isTrainInStationArea(row, train(52.02), station)).toBe(false);
});
