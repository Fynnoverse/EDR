import {ReactNode} from "react";
import {fireEvent, render, screen} from "@testing-library/react";

jest.mock("usehooks-ts", () => jest.requireActual("usehooks-ts/dist/index.cjs"));

const mockEnqueueSnackbar = jest.fn();
jest.mock("notistack", () => ({
    useSnackbar: () => ({
        enqueueSnackbar: mockEnqueueSnackbar
    })
}));

import {Header} from "../../components/Header";
import {postConfig} from "../../../config/stations";
import {presetFilterConfig} from "../../index";

jest.mock("react-router-dom", () => ({Link: ({children}: {children: ReactNode}) => <>{children}</>}), {virtual: true});
jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: {defaultValue?: string}) => {
            if (key === "EDR_UI_test_notification") return "Benachrichtigung testen";
            if (key === "EDR_NOTIFICATION_test_title") return "Testbenachrichtigung";
            if (key === "EDR_NOTIFICATION_test_body") return "Benachrichtigung, Ton und Vibration funktionieren einwandfrei.";
            return options?.defaultValue ?? key;
        },
        i18n: {resolvedLanguage: "de"},
    }),
}));

describe("Notification Test Button in Header", () => {
    const defaultBounds = {
        firstColBounds: {} as any,
        secondColBounds: {} as any,
        thirdColBounds: {} as any,
        fourthColBounds: {} as any,
        fifthColBounds: {} as any,
        sixthColBounds: {} as any,
        seventhColBounds: {} as any,
        showStopColumn: true,
    };

    it("triggers sound, vibration, and browser notification when permission is granted", () => {
        const playSound = jest.fn((cb?: () => void) => cb?.());
        const vibrateMock = jest.fn();
        Object.defineProperty(navigator, "vibrate", {
            value: vibrateMock,
            writable: true,
            configurable: true,
        });

        const notificationConstructor = jest.fn();
        (notificationConstructor as any).permission = "granted";
        (notificationConstructor as any).requestPermission = jest.fn();

        Object.defineProperty(window, "Notification", {
            value: notificationConstructor,
            writable: true,
            configurable: true,
        });

        render(
            <Header
                serverTzOffset={2}
                serverTime={Date.now()}
                serverCode="en1"
                postCfg={postConfig.KOL}
                bounds={defaultBounds}
                timetableLength={5}
                filter=""
                setFilter={jest.fn()}
                streamMode={false}
                setStreamMode={jest.fn()}
                showDirectionText={false}
                setShowDirectionText={jest.fn()}
                filterConfig={presetFilterConfig.default}
                setFilterConfig={jest.fn()}
                sortKey={undefined}
                sortDirection="ascending"
                onSort={jest.fn()}
                onResetSort={jest.fn()}
                arrivalSortMode="predicted"
                setArrivalSortMode={jest.fn()}
                playSoundNotification={playSound}
            />
        );

        const testBtn = screen.getByRole("button", {name: "Benachrichtigung testen"});
        expect(testBtn).toBeInTheDocument();

        fireEvent.click(testBtn);

        expect(playSound).toHaveBeenCalled();
        expect(vibrateMock).toHaveBeenCalledWith([300, 150, 300, 150, 450]);
        expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
            "Benachrichtigung, Ton und Vibration funktionieren einwandfrei.",
            expect.objectContaining({variant: "info"})
        );
        expect(notificationConstructor).toHaveBeenCalledWith(
            "Testbenachrichtigung",
            expect.objectContaining({
                body: "Benachrichtigung, Ton und Vibration funktionieren einwandfrei.",
                icon: "/favicon.ico",
                tag: "test-notification",
            })
        );
    });

    it("requests permission when not set (default) and shows notification once granted", async () => {
        const playSound = jest.fn((cb?: () => void) => cb?.());
        const vibrateMock = jest.fn();
        Object.defineProperty(navigator, "vibrate", {
            value: vibrateMock,
            writable: true,
            configurable: true,
        });

        const notificationConstructor = jest.fn();
        const requestPermissionMock = jest.fn().mockImplementation(() => {
            (notificationConstructor as any).permission = "granted";
            return Promise.resolve("granted");
        });
        (notificationConstructor as any).permission = "default";
        (notificationConstructor as any).requestPermission = requestPermissionMock;

        Object.defineProperty(window, "Notification", {
            value: notificationConstructor,
            writable: true,
            configurable: true,
        });

        render(
            <Header
                serverTzOffset={2}
                serverTime={Date.now()}
                serverCode="en1"
                postCfg={postConfig.KOL}
                bounds={defaultBounds}
                timetableLength={5}
                filter=""
                setFilter={jest.fn()}
                streamMode={false}
                setStreamMode={jest.fn()}
                showDirectionText={false}
                setShowDirectionText={jest.fn()}
                filterConfig={presetFilterConfig.default}
                setFilterConfig={jest.fn()}
                sortKey={undefined}
                sortDirection="ascending"
                onSort={jest.fn()}
                onResetSort={jest.fn()}
                arrivalSortMode="predicted"
                setArrivalSortMode={jest.fn()}
                playSoundNotification={playSound}
            />
        );

        const testBtn = screen.getByRole("button", {name: "Benachrichtigung testen"});
        fireEvent.click(testBtn);

        expect(requestPermissionMock).toHaveBeenCalled();
        // Wait for microtask resolution
        await Promise.resolve();

        expect(playSound).toHaveBeenCalled();
        expect(vibrateMock).toHaveBeenCalled();
        expect(notificationConstructor).toHaveBeenCalledWith(
            "Testbenachrichtigung",
            expect.objectContaining({
                tag: "test-notification",
            })
        );
    });
});
