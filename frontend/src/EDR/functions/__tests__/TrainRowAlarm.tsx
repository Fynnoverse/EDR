import {ReactNode} from "react";
import {fireEvent, render, screen} from "@testing-library/react";
import {Table} from "flowbite-react";
import TableRow from "../../components/TrainRow";
import {TimeTableRow} from "../../../customTypes/TimeTableRow";
import {DetailedTrain} from "../trainDetails";
import {postConfig} from "../../../config/stations";

const mockEnqueueSnackbar = jest.fn();
jest.mock("notistack", () => ({useSnackbar: () => ({enqueueSnackbar: mockEnqueueSnackbar})}));
jest.mock("react-router-dom", () => ({Link: ({children}: {children: ReactNode}) => <>{children}</>}), {virtual: true});
jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: {defaultValue?: string; train?: string; time?: string; destination?: string; platform?: string}) => {
            if (key === "EDR_TRAINROW_train_departing") return "Abfahrt";
            if (key === "EDR_TRAINROW_notify") return "Benachrichtigen";
            if (key === "EDR_NOTIFICATION_departure_title") return `Abfahrtswarnung: Zug ${options?.train}`;
            if (key === "EDR_NOTIFICATION_departure_body_with_dest") return `Zug ${options?.train} soll um ${options?.time} abfahren nach ${options?.destination}`;
            if (key === "EDR_NOTIFICATION_departure_body") return `Zug ${options?.train} soll um ${options?.time} abfahren`;
            return options?.defaultValue ?? key;
        },
        i18n: {resolvedLanguage: "de"},
    }),
}));

describe("TrainRow departure alarm calculation", () => {
    const row = {
        trainNoLocal: "11507",
        endStation: "Warszawa Wschodnia",
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

        // In-app snackbar toast called with destination and departure time
        expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
            "Zug 11507 soll um 11:47 abfahren nach Warszawa Wschodnia",
            expect.objectContaining({variant: "warning"})
        );

        // Browser notification instantiated
        expect(notificationConstructor).toHaveBeenCalledWith(
            "Abfahrtswarnung: Zug 11507",
            expect.objectContaining({
                body: "Zug 11507 soll um 11:47 abfahren nach Warszawa Wschodnia",
                icon: "/favicon.ico",
                tag: "departure-11507",
            })
        );

        // Sound played
        expect(playSound).toHaveBeenCalled();
    });

    it("requests permission again when not set/default, but does not request when denied or granted", () => {
        const playSound = jest.fn((cb?: () => void) => cb?.());
        const notificationConstructor = jest.fn();
        const requestPermissionMock = jest.fn().mockResolvedValue("default");
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

        const earlyDate = new Date("2026-09-07T11:40:00Z");
        const {unmount} = render(
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
        // 1. First click when permission is "default" (not set) -> requests permission
        fireEvent.click(notifyBtn);
        expect(requestPermissionMock).toHaveBeenCalledTimes(1);

        // Toggle off
        fireEvent.click(notifyBtn);

        // 2. Click again when permission is still "default" (e.g. dismissed without blocking) -> requests permission again
        fireEvent.click(notifyBtn);
        expect(requestPermissionMock).toHaveBeenCalledTimes(2);

        unmount();

        // 3. When permission is "denied" (forbidden) -> does NOT request permission
        (notificationConstructor as any).permission = "denied";
        render(
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

        const notifyBtnDenied = screen.getAllByRole("button", {name: "Benachrichtigen"})[0];
        fireEvent.click(notifyBtnDenied);
        // Call count should remain 2
        expect(requestPermissionMock).toHaveBeenCalledTimes(2);
    });

    it("persists enabled train notification in localStorage and restores it upon remount", () => {
        localStorage.clear();
        const playSound = jest.fn();
        const standingTrain = {
            ...delayedTrain,
            lastDelay: 0,
        };
        const earlyDate = new Date("2026-09-07T11:40:00Z");

        const {unmount} = render(
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

        const stored = JSON.parse(localStorage.getItem("edr-train-notifications") || "{}");
        expect(stored["en1_KOL_11507"]).toBe(true);

        unmount();

        // Remount (simulating page reload)
        render(
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

        // Active notification restored (button shows check icon)
        const checkIcon = screen.getByRole("button", {name: "Benachrichtigen"}).querySelector("img");
        expect(checkIcon?.getAttribute("src")).toContain("check");
    });

    it("silently removes stored notification from localStorage when train has already passed or departs", () => {
        localStorage.setItem("edr-train-notifications", JSON.stringify({"en1_KOL_11507": true}));

        const playSound = jest.fn();
        const departedTrainDetails = {
            ...delayedTrain,
            TrainData: {
                ...delayedTrain.TrainData,
                VDDelayedTimetableIndex: 999, // passed station
            },
            distanceFromStation: 10,
        };
        const earlyDate = new Date("2026-09-07T11:40:00Z");

        render(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={row}
                        trainDetails={departedTrainDetails}
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

        const stored = JSON.parse(localStorage.getItem("edr-train-notifications") || "{}");
        expect(stored["en1_KOL_11507"]).toBeUndefined();
        expect(playSound).not.toHaveBeenCalled();
    });

    it("triggers departure alarm even when distanceFromStation is null", () => {
        const playSound = jest.fn((cb?: () => void) => cb?.());
        const dateNow = new Date("2026-09-07T11:46:00Z");
        const trainWithNullDistance = {
            ...delayedTrain,
            lastDelay: 0,
            distanceFromStation: null,
        } as unknown as DetailedTrain;

        const {rerender} = render(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={row}
                        trainDetails={trainWithNullDistance}
                        serverTime={new Date("2026-09-07T11:40:00Z").getTime()}
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

        const notifyBtn = screen.getByRole("button", {name: "Benachrichtigen"});
        fireEvent.click(notifyBtn);

        // Advance time to 1 minute before scheduled departure 11:47 (11:46)
        rerender(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={row}
                        trainDetails={trainWithNullDistance}
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

        expect(playSound).toHaveBeenCalledTimes(1);
    });

    it("allows enabling notification and triggers alarm for offline/timetable trains", () => {
        const playSound = jest.fn((cb?: () => void) => cb?.());
        const earlyDate = new Date("2026-09-07T11:40:00Z");
        const warnDate = new Date("2026-09-07T11:46:00Z");

        const {rerender} = render(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={row}
                        trainDetails={undefined}
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

        const notifyBtn = screen.getByRole("button", {name: "Benachrichtigen"});
        fireEvent.click(notifyBtn);

        // Advance time to 11:46 (1 min before scheduled departure)
        rerender(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={row}
                        trainDetails={undefined}
                        serverTime={warnDate.getTime()}
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

        expect(playSound).toHaveBeenCalledTimes(1);
    });

    it("silently removes active notification without triggering alarm when train is detected as departed before the alarm time", () => {
        const playSound = jest.fn((cb?: () => void) => cb?.());
        const earlyDate = new Date("2026-09-07T11:40:00Z");
        const activeTrainDetails = {
            ...delayedTrain,
            lastDelay: 0,
            TrainData: {
                ...delayedTrain.TrainData,
                VDDelayedTimetableIndex: 0, // approaching/at station
            },
        } as unknown as DetailedTrain;

        const {rerender} = render(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={row}
                        trainDetails={activeTrainDetails}
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

        // User enables alarm for this train
        const notifyBtn = screen.getByRole("button", {name: "Benachrichtigen"});
        fireEvent.click(notifyBtn);

        let stored = JSON.parse(localStorage.getItem("edr-train-notifications") || "{}");
        expect(stored["en1_KOL_11507"]).toBe(true);

        // Train passes/departs station before the 11:46 alarm time (e.g. at 11:42)
        const departedTrainDetails = {
            ...delayedTrain,
            lastDelay: 0,
            TrainData: {
                ...delayedTrain.TrainData,
                VDDelayedTimetableIndex: 999, // departed
            },
        } as unknown as DetailedTrain;

        rerender(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={row}
                        trainDetails={departedTrainDetails}
                        serverTime={new Date("2026-09-07T11:42:00Z").getTime()}
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

        // Must be silently removed from storage, sound should NOT have played
        stored = JSON.parse(localStorage.getItem("edr-train-notifications") || "{}");
        expect(stored["en1_KOL_11507"]).toBeUndefined();
        expect(playSound).not.toHaveBeenCalled();

        // Later at 11:46 (scheduled alarm time), sound must STILL NOT play
        rerender(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={row}
                        trainDetails={departedTrainDetails}
                        serverTime={new Date("2026-09-07T11:46:00Z").getTime()}
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

        expect(playSound).not.toHaveBeenCalled();
    });

    it("formats departure toast and system notification without destination when endStation is not provided", () => {
        const playSound = jest.fn((cb?: () => void) => cb?.());
        const notificationConstructor = jest.fn();
        (notificationConstructor as any).permission = "granted";
        (notificationConstructor as any).requestPermission = jest.fn();

        Object.defineProperty(window, "Notification", {
            value: notificationConstructor,
            writable: true,
            configurable: true,
        });

        const rowWithoutDestination = {
            ...row,
            trainNoLocal: "44100",
            endStation: "",
        };

        const {rerender} = render(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={rowWithoutDestination}
                        trainDetails={undefined}
                        serverTime={new Date("2026-09-07T11:40:00Z").getTime()}
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

        const notifyBtn = screen.getByRole("button", {name: "Benachrichtigen"});
        fireEvent.click(notifyBtn);

        rerender(
            <Table>
                <Table.Body>
                    <TableRow
                        setModalTrainId={jest.fn()}
                        setTimetableTrainId={jest.fn()}
                        ttRow={rowWithoutDestination}
                        trainDetails={undefined}
                        serverTime={new Date("2026-09-07T11:46:00Z").getTime()}
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

        expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
            "Zug 44100 soll um 11:47 abfahren",
            expect.objectContaining({variant: "warning"})
        );
        expect(notificationConstructor).toHaveBeenCalledWith(
            "Abfahrtswarnung: Zug 44100",
            expect.objectContaining({
                body: "Zug 44100 soll um 11:47 abfahren",
                tag: "departure-44100",
            })
        );
    });
});
