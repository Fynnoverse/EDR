import {render, screen} from "@testing-library/react";
import {TrainArrivalCell} from "../../components/Cells/TrainArrivalCell";
import {getStationArrivalStatus, isTrainInStationArea, isTrainStandingAtStation} from "../stationPresence";
import {TimeTableRow} from "../../../customTypes/TimeTableRow";
import {DetailedTrain} from "../trainDetails";
import {postConfig} from "../../../config/stations";
import {getStationDeviation} from "../stationDeviation";
import {hasTrainPassedStation} from "../trainFilters";

jest.mock("react-i18next", () => ({useTranslation: () => ({t: (key: string, options?: {defaultValue?: string}) => options?.defaultValue ?? key})}));
jest.mock("../../components/TrainRow", () => ({tableCellCommonClassnames: () => ""}));

const now = new Date("2026-09-12T12:00:00Z");
const row = {trainNoLocal: "11565", pointId: "1", stationIndex: 2, plannedStop: 5,
    scheduledArrivalObject: new Date("2026-09-12T12:00:00Z"), scheduledDepartureObject: new Date("2026-09-12T12:05:00Z"),
    actualArrivalObject: new Date("2026-09-12T11:58:00Z"), actualDepartureObject: new Date(0)} as TimeTableRow;
const train = {distanceFromStation: 1.2, timetable: [],
    TrainData: {Velocity: 0, VDDelayedTimetableIndex: 2}} as unknown as DetailedTrain;

it("shows a two-minute early badge even without routed distance", () => {
    render(<table><tbody><tr><TrainArrivalCell ttRow={row} trainDetails={{...train, distanceFromStation: null}}
        trainHasPassedStation={false} thirdColRef={null} streamMode={false}
        arrivalTimeDelay={-2} deviationMinutes={-2} estimated={false} serverNow={now}/></tr></tbody></table>);
    expect(screen.getByTestId("scheduled-train-time")).toHaveTextContent("-2");
    expect(screen.getByText("EDR_TRAINROW_train_early")).toBeVisible();
});

it("accepts a recorded arrival beyond the coordinate radius and while moving inside the station", () => {
    expect(getStationArrivalStatus(row, train, now)).toEqual({estimated: false});
    expect(isTrainStandingAtStation(row, train, postConfig.KOL, now)).toBe(true);
    const moving = {...train, TrainData: {...train.TrainData, Velocity: 12}};
    expect(getStationArrivalStatus(row, moving, now)).toEqual({estimated: false});
    expect(isTrainStandingAtStation(row, moving, postConfig.KOL, now)).toBe(false);
});

it("does not label proximity alone, a future arrival or an actual departure as arrived", () => {
    expect(getStationArrivalStatus({...row, actualArrivalObject: new Date(0)}, train, now)).toBeUndefined();
    expect(getStationArrivalStatus({...row, actualArrivalObject: new Date("2026-09-12T12:01:00Z")}, train, now)).toBeUndefined();
    expect(getStationArrivalStatus({...row, actualDepartureObject: now}, {...train, TrainData: {...train.TrainData, Velocity: 20}}, now)).toBeUndefined();
});

it("recognizes arrival at a secondary point within the selected post", () => {
    expect(getStationArrivalStatus({...row, pointId: "other", stationIndex: 1, actualArrivalObject: new Date(0), secondaryPostsRows: [row]}, train, now))
        .toEqual({estimated: false});
});

it("recognizes the live 144063 unplanned stop at Koluszki signal 1803_KO_E101", () => {
    const freightRow = {...row, trainNoLocal: "144063", pointId: "1803", stationIndex: 9, plannedStop: 0,
        scheduledArrivalObject: new Date("2026-09-12T12:18:30Z"), scheduledDepartureObject: new Date("2026-09-12T12:18:30Z"),
        actualArrivalObject: new Date("2026-09-12T12:16:30Z"), actualDepartureObject: new Date("2026-09-12T12:19:30Z")};
    const freight = {...train, receivedAt: Date.now(), distanceFromStation: null, TrainData: {...train.TrainData, VDDelayedTimetableIndex: 9,
        Latititute: 51.748451232910156, Longitute: 19.821212768554688, SignalInFront: "1803_KO_E101@44668167649,4"}};
    const serverNow = new Date("2026-09-12T12:22:30Z");
    expect(isTrainStandingAtStation(freightRow, freight, postConfig.KOL, serverNow)).toBe(true);
    expect(getStationArrivalStatus(freightRow, freight, serverNow)).toEqual({estimated: false});
    expect(getStationDeviation(freightRow, freight, postConfig.KOL, serverNow))
        .toMatchObject({arrivalMinutes: -2, departureMinutes: 4, departureEstimated: true,
            standingDepartureTime: new Date("2026-09-12T12:23:30Z")});
});

it("does not turn unconfirmed plan copies into arrival events as server time passes", () => {
    const placeholder = {...row, isConfirmed: false, actualArrivalObject: row.scheduledArrivalObject};
    expect(getStationArrivalStatus(placeholder, train, new Date("2026-09-12T12:02:00Z"))).toBeUndefined();
});

it("keeps train in station area when shunting or moving in larger station areas (trainPosRange > 0.5km)", () => {
    const largeStation = {...postConfig.KOL, trainPosRange: 1.8};
    const stationRow = {...row, stationIndex: 4};
    // Train has progressed timetable index (5 > 4) and is moving at 15 km/h, but is 1.1 km away (within 1.8 km)
    const shuntingTrain = {
        ...train,
        distanceFromStation: 1.1,
        TrainData: {
            ...train.TrainData,
            Velocity: 15,
            VDDelayedTimetableIndex: 5,
        },
    } as DetailedTrain;

    expect(isTrainInStationArea(stationRow, shuntingTrain, largeStation)).toBe(true);
    // Standing is false because Velocity > 1
    expect(isTrainStandingAtStation(stationRow, shuntingTrain, largeStation, now)).toBe(false);

    // Train outside station range (2.5 km > 1.8 km) is not in station area
    const departedTrain = {
        ...shuntingTrain,
        distanceFromStation: 2.5,
    };
    expect(isTrainInStationArea(stationRow, departedTrain, largeStation)).toBe(false);
});
