import {ReactNode} from "react";
import {render, screen} from "@testing-library/react";
import {Table} from "flowbite-react";
import TableRow from "../../components/TrainRow";
import {TimeTableRow} from "../../../customTypes/TimeTableRow";
import {DetailedTrain} from "../trainDetails";
import {postConfig} from "../../../config/stations";

jest.mock("notistack", () => ({useSnackbar: () => ({enqueueSnackbar: jest.fn()})}));
jest.mock("react-router-dom", () => ({Link: ({children}: {children: ReactNode}) => <>{children}</>}), {virtual: true});
jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: {defaultValue?: string}) => {
            if (key === "EDR_TRAINROW_train_departing") return "Abfahrt";
            if (key === "EDR_TRAINROW_notify") return "Benachrichtigen";
            return options?.defaultValue ?? key;
        },
        i18n: {resolvedLanguage: "de"},
    }),
}));

describe("TrainRow departure alarm calculation", () => {
    const row = {
        trainNoLocal: "11507",
        pointId: "1",
        stationIndex: 2,
        plannedStop: 5,
        trainType: "RO",
        scheduledArrivalObject: new Date("2026-09-07T11:40:00Z"),
        scheduledDepartureObject: new Date("2026-09-07T11:47:00Z"),
        actualArrivalObject: new Date(0),
        actualDepartureObject: new Date(0),
    } as TimeTableRow;

    const delayedTrain = {
        lastDelay: 10,
        distanceFromStation: 0.2,
        receivedAt: Date.now(),
        TrainData: {Velocity: 50, VDDelayedTimetableIndex: 1},
        timetable: [],
    } as unknown as DetailedTrain;

    const renderRowAt = (timeString: string, playSound = jest.fn()) => {
        const dateNow = new Date(timeString);
        return render(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={row}
                        trainDetails={delayedTrain}
                        serverTime={dateNow.getTime()}
                        firstColRef={null}
                        secondColRef={null}
                        thirdColRef={null}
                        headerFourthColRef={null}
                        headerFifthColRef={null}
                        headerSixthhColRef={null}
                        headerSeventhColRef={null}
                        playSoundNotification={playSound}
                        isWebpSupported={false}
                        streamMode={false}
                        serverCode="en1"
                        players={[]}
                        postCfg={postConfig.KOL}
                    />
                </Table.Body>
            </Table>
        );
    };

    it("does not warn at planned departure minus 1 minute (11:46) when delayed to 11:57", () => {
        renderRowAt("2026-09-07T11:46:00Z");
        // Calculated departure is 11:57 (+10 min delay on scheduled 11:47).
        // At 11:46:00, the train must NOT depart yet.
        expect(screen.queryByText("Abfahrt")).toBeNull();
    });

    it("warns at calculated departure minus 1 minute (11:56) for delayed train", () => {
        renderRowAt("2026-09-07T11:56:00Z");
        // At 11:56:00 (1 minute before calculated departure 11:57), the departing badge is active.
        expect(screen.getByText("Abfahrt")).toBeInTheDocument();
    });
});
