import {ReactNode} from "react";
import {fireEvent, render, screen} from "@testing-library/react";
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

    it("triggers notification when delay is reduced while alarm is enabled", () => {
        const playSound = jest.fn((cb?: () => void) => cb?.());
        const dateNow = new Date("2026-09-07T11:46:00Z");

        // Initial render: train delayed by 10 minutes (departure 11:57, so at 11:46 it's 11 min away)
        const {rerender} = render(
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

        // User clicks bell button to enable alarm
        const notifyBtn = screen.getByRole("button", {name: "Benachrichtigen"});
        fireEvent.click(notifyBtn);
        expect(playSound).not.toHaveBeenCalled();

        // Delay decreases from +10 min to 0 min (calculated departure is now 11:47:00, exactly <= 1 min away at 11:46:00)
        const updatedTrain = {
            ...delayedTrain,
            lastDelay: 0,
        };

        rerender(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={row}
                        trainDetails={updatedTrain}
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

        // playSoundNotification must have been triggered because remaining time dropped to under 1 minute
        expect(playSound).toHaveBeenCalledTimes(1);
    });

    it("triggers mobile vibration, browser notification, and visual row highlighting when alarm fires", () => {
        const playSound = jest.fn((cb?: () => void) => cb?.());
        const vibrateMock = jest.fn();
        Object.defineProperty(navigator, "vibrate", {
            value: vibrateMock,
            writable: true,
            configurable: true,
        });

        const notificationConstructor = jest.fn();
        const requestPermissionMock = jest.fn().mockResolvedValue("granted");
        (notificationConstructor as any).permission = "default";
        (notificationConstructor as any).requestPermission = requestPermissionMock;

        Object.defineProperty(window, "Notification", {
            value: notificationConstructor,
            writable: true,
            configurable: true,
        });

        const standingTrain = {
            ...delayedTrain,
            lastDelay: 0,
        };

        const dateNow = new Date("2026-09-07T11:46:00Z"); // exactly 1 min before 11:47 departure
        const {container} = render(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={row}
                        trainDetails={standingTrain}
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

        // Before alarm activation, train row is not alarming
        const rowElement = container.querySelector("tr");
        expect(rowElement).not.toHaveAttribute("data-alarming");

        // Now test enabling alarm when not alarming:
        // Render at 11:40 (departure is 11:47)
        const earlyDate = new Date("2026-09-07T11:40:00Z");
        const {rerender} = render(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={row}
                        trainDetails={standingTrain}
                        serverTime={earlyDate.getTime()}
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

        const notifyBtn = screen.getAllByRole("button", {name: "Benachrichtigen"})[0];
        fireEvent.click(notifyBtn);
        expect(requestPermissionMock).toHaveBeenCalled();

        (notificationConstructor as any).permission = "granted";

        // Now advance time to 11:46:00 (departure in 1 min)
        rerender(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={row}
                        trainDetails={standingTrain}
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

        // Vibration called with pattern
        expect(vibrateMock).toHaveBeenCalledWith([300, 150, 300, 150, 450]);

        // Browser notification instantiated
        expect(notificationConstructor).toHaveBeenCalledWith(
            expect.stringContaining("11507"),
            expect.objectContaining({
                body: expect.stringContaining("1 Minute"),
                icon: "/favicon.ico",
                tag: "departure-11507",
            })
        );

        // Sound played
        expect(playSound).toHaveBeenCalled();
    });
});
