import {render, screen} from "@testing-library/react";
import {TrainDepartureCell} from "../../components/Cells/TrainDepartureCell";
import {TimeTableRow} from "../../../customTypes/TimeTableRow";
import {DetailedTrain} from "../trainDetails";
import {hasTrainLeftStationArea, stationPresenceKey} from "../stationPresence";
import {postConfig} from "../../../config/stations";
import mockGermanTranslations from "../../../../public/locales/de/translation.json";

jest.mock("react-i18next", () => ({useTranslation: () => ({t: (key: string, options?: {defaultValue?: string}) =>
    (mockGermanTranslations as Record<string, string>)[key] ?? options?.defaultValue ?? key})}));
jest.mock("notistack", () => ({useSnackbar: () => ({enqueueSnackbar: jest.fn()})}));
jest.mock("../../components/TrainRow", () => ({tableCellCommonClassnames: () => ""}));

const now = new Date("2026-09-12T12:00:00Z");
const station = postConfig.DG_ZA;
const row = {trainNoLocal: "100", pointId: station.id, stationIndex: 4, plannedStop: 0,
    scheduledArrivalObject: new Date("2026-09-12T11:50:00Z"),
    scheduledDepartureObject: new Date("2026-09-12T11:50:00Z"),
    secondaryPostsRows: [{stationIndex: 6, pointId: postConfig.DG_DZA.id}],
} as TimeTableRow;
const live = (index: number | undefined, observed = false) => ({
    timetable: [], distanceFromStation: 10,
    observedStationAreas: observed ? {[stationPresenceKey(row, station)]: true} : {},
    TrainData: {VDDelayedTimetableIndex: index, Velocity: 40, Longitute: 19.35, Latititute: 50.45},
} as unknown as DetailedTrain);

it("never reuses a cached departed label for the time-based warning", () => {
    const translations = mockGermanTranslations as Record<string, string>;
    const due = translations.EDR_TRAINROW_train_departure_due;
    const old = translations.EDR_TRAINROW_train_departing;
    try {
        delete translations.EDR_TRAINROW_train_departure_due;
        translations.EDR_TRAINROW_train_departing = "abgefahren";
        render(<table><tbody><tr><TrainDepartureCell ttRow={row} headerSixthhColRef={null}
            trainHasPassedStation={false} trainMustDepart={true} isAtStation={true} playSoundNotification={jest.fn()}
            streamMode={false} serverNow={now}/></tr></tbody></table>);
        expect(screen.queryByText("abgefahren")).not.toBeInTheDocument();
        expect(screen.getByText("Departure due")).toBeVisible();
    } finally {
        translations.EDR_TRAINROW_train_departure_due = due;
        translations.EDR_TRAINROW_train_departing = old;
    }
});

it.each([
    ["offline", undefined],
    ["missing index", live(undefined, true)],
    ["invalid index", live(NaN, true)],
    ["infinite index", live(Infinity, true)],
    ["approaching", live(3)],
    ["between substations", live(5, true)],
    ["first seen beyond the station", live(7)],
] as const)("does not show abgefahren for %s even after the departure time", (_label, train) => {
    render(<table><tbody><tr><TrainDepartureCell ttRow={row} headerSixthhColRef={null}
        trainHasPassedStation={hasTrainLeftStationArea(row, train, station, now)}
        trainMustDepart={true} playSoundNotification={jest.fn()} streamMode={false} serverNow={now}
        isTrainOffline={!train}/></tr></tbody></table>);
    expect(screen.queryByText("abgefahren")).not.toBeInTheDocument();
    expect(screen.queryByText("Abfahrt fällig")).not.toBeInTheDocument();
});

it("shows abgefahren only after observed presence and leaving the whole group", () => {
    render(<table><tbody><tr><TrainDepartureCell ttRow={row} headerSixthhColRef={null}
        trainHasPassedStation={hasTrainLeftStationArea(row, live(7, true), station, now)}
        trainMustDepart={false} playSoundNotification={jest.fn()} streamMode={false} serverNow={now}
        /></tr></tbody></table>);
    expect(screen.getByText("abgefahren")).toBeVisible();
    expect(screen.queryByText("Abfahrt fällig")).not.toBeInTheDocument();
});

it("shows the due warning only while the train is in the station area", () => {
    render(<table><tbody><tr><TrainDepartureCell ttRow={row} headerSixthhColRef={null}
        trainHasPassedStation={false} trainMustDepart={true} isAtStation={true}
        playSoundNotification={jest.fn()} streamMode={false} serverNow={now}/></tr></tbody></table>);
    expect(screen.getByText("Abfahrt fällig")).toBeVisible();
    expect(screen.queryByText("abgefahren")).not.toBeInTheDocument();
});
