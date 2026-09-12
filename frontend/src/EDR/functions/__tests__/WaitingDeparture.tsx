import {render, screen} from "@testing-library/react";
import {TrainDepartureCell} from "../../components/Cells/TrainDepartureCell";
import {getStationDeviation} from "../stationDeviation";
import {TimeTableRow} from "../../../customTypes/TimeTableRow";
import {DetailedTrain} from "../trainDetails";
import {postConfig} from "../../../config/stations";

jest.mock("react-i18next", () => ({useTranslation: () => ({t: (_key: string, options?: {defaultValue?: string}) => options?.defaultValue ?? _key})}));
jest.mock("../../components/TrainRow", () => ({tableCellCommonClassnames: () => ""}));

it("updates the departure cell after 11:47 without adding the internal minute to its delay", () => {
    const row = {trainNoLocal: "11507", pointId: "1", stationIndex: 2, plannedStop: 7,
        scheduledArrivalObject: new Date("2026-09-07T11:40:00Z"), scheduledDepartureObject: new Date("2026-09-07T11:47:00Z"),
        actualArrivalObject: new Date("2026-09-07T11:42:00Z"), actualDepartureObject: new Date(0)} as TimeTableRow;
    const train = {lastDelay: 2, receivedAt: Date.now(), distanceFromStation: 0.17,
        TrainData: {Velocity: 0, VDDelayedTimetableIndex: 2}, timetable: []} as unknown as DetailedTrain;
    const cell = (time: string) => {
        const now = new Date(time);
        const deviation = getStationDeviation(row, train, postConfig.KOL, now);
        return <table><tbody><tr><TrainDepartureCell ttRow={row} serverNow={now}
            deviationMinutes={deviation.departureMinutes} arrivalDeviationMinutes={deviation.arrivalMinutes}
            estimated={deviation.departureEstimated} standingDepartureTime={deviation.standingDepartureTime}
            headerSixthhColRef={null} trainHasPassedStation={false} trainMustDepart={true}
            playSoundNotification={jest.fn()} streamMode={false} isTrainOffline={false} /></tr></tbody></table>;
    };
    const {rerender} = render(cell("2026-09-07T11:55:00Z"));
    expect(screen.getByTestId("scheduled-train-time")).toHaveTextContent("Plan 11:47+8");
    expect(screen.getByTestId("predicted-train-time")).toHaveTextContent("11:56");
    rerender(cell("2026-09-07T11:56:00Z"));
    expect(screen.getByTestId("scheduled-train-time")).toHaveTextContent("Plan 11:47+9");
    expect(screen.getByTestId("predicted-train-time")).toHaveTextContent("11:57");
});
