import {render, screen} from "@testing-library/react";
import {TrainPlatformCell} from "../../components/Cells/TrainPlatformCell";
import {TimeTableRow} from "../../../customTypes/TimeTableRow";
import {DetailedTrain} from "../trainDetails";
import {postConfig} from "../../../config/stations";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: {defaultValue?: string}) => {
            if (key === "EDR_TRAINROW_layover_minutes") return "min";
            if (key === "EDR_TRAINROW_scheduled") return "Plan";
            return options?.defaultValue ?? key;
        },
    }),
}));
jest.mock("../../components/TrainRow", () => ({tableCellCommonClassnames: () => ""}));

describe("TrainPlatformCell Haltzeit", () => {
    const serverNow = new Date("2026-09-07T13:00:00Z");
    const ttRow = {
        pointId: "1",
        stationIndex: 2,
        plannedStop: 5,
        platform: "1",
        track: "2",
        scheduledArrivalObject: new Date("2026-09-07T13:10:00Z"),
        scheduledDepartureObject: new Date("2026-09-07T13:15:00Z"),
        actualArrivalObject: new Date(0),
        actualDepartureObject: new Date(0),
    } as TimeTableRow;

    const baseTrain = {
        distanceFromStation: 10,
        timetable: [],
        TrainData: {Velocity: 100, VDDelayedTimetableIndex: 1},
        lastDelay: 0,
    } as unknown as DetailedTrain;

    it("shows 1 min halt and red +delay when delay exceeds planned stop (delay 6 min, planned 5 min)", () => {
        const delayedTrain = {
            ...baseTrain,
            lastDelay: 6,
        };
        render(
            <table><tbody><tr>
                <TrainPlatformCell
                    headerFifthColRef={null}
                    ttRow={ttRow}
                    secondaryPostData={[]}
                    streamMode={false}
                    trainDetails={delayedTrain}
                    postCfg={postConfig.KOL}
                    serverNow={serverNow}
                />
            </tr></tbody></table>
        );

        expect(screen.getByTestId("live-stop-duration")).toHaveTextContent("1 min");
        expect(screen.getByTestId("planned-stop-duration")).toHaveTextContent("Plan 5 min+6");
    });

    it("reduces halt time to remaining buffer when delay is less than planned stop (delay 2 min, planned 5 min -> 3 min)", () => {
        const slightlyDelayedTrain = {
            ...baseTrain,
            lastDelay: 2,
        };
        render(
            <table><tbody><tr>
                <TrainPlatformCell
                    headerFifthColRef={null}
                    ttRow={ttRow}
                    secondaryPostData={[]}
                    streamMode={false}
                    trainDetails={slightlyDelayedTrain}
                    postCfg={postConfig.KOL}
                    serverNow={serverNow}
                />
            </tr></tbody></table>
        );

        expect(screen.getByTestId("live-stop-duration")).toHaveTextContent("3 min");
        expect(screen.getByTestId("planned-stop-duration")).toHaveTextContent("Plan 5 min+2");
    });

    it("adds early arrival time to planned halt (planned 5 min + 3 min early = 8 min)", () => {
        const earlyTrain = {
            ...baseTrain,
            lastDelay: -3,
        };
        render(
            <table><tbody><tr>
                <TrainPlatformCell
                    headerFifthColRef={null}
                    ttRow={ttRow}
                    secondaryPostData={[]}
                    streamMode={false}
                    trainDetails={earlyTrain}
                    postCfg={postConfig.KOL}
                    serverNow={serverNow}
                />
            </tr></tbody></table>
        );

        expect(screen.getByTestId("live-stop-duration")).toHaveTextContent("8 min");
        expect(screen.getByTestId("planned-stop-duration")).toHaveTextContent("Plan 5 min-3");
    });

    it("shows planned halt when on time", () => {
        const onTimeTrain = {
            ...baseTrain,
            lastDelay: 0,
        };
        render(
            <table><tbody><tr>
                <TrainPlatformCell
                    headerFifthColRef={null}
                    ttRow={ttRow}
                    secondaryPostData={[]}
                    streamMode={false}
                    trainDetails={onTimeTrain}
                    postCfg={postConfig.KOL}
                    serverNow={serverNow}
                />
            </tr></tbody></table>
        );

        expect(screen.getByTestId("live-stop-duration")).toHaveTextContent("5 min");
        expect(screen.getByTestId("planned-stop-duration")).toHaveTextContent("Plan 5 min±0");
    });

    it("shows unknown dash when live telemetry is unavailable", () => {
        render(
            <table><tbody><tr>
                <TrainPlatformCell
                    headerFifthColRef={null}
                    ttRow={ttRow}
                    secondaryPostData={[]}
                    streamMode={false}
                    trainDetails={undefined}
                    postCfg={undefined}
                    serverNow={undefined}
                />
            </tr></tbody></table>
        );

        expect(screen.getByTestId("live-stop-duration")).toHaveTextContent("5 min");
        expect(screen.getByTestId("planned-stop-duration")).toHaveTextContent("Plan 5 min—");
    });
});
