import {
    registerServiceWorker,
    requestPushNotificationPermission,
    sendPushNotification,
} from "../pushNotification";

describe("pushNotification helper", () => {
    const originalNotification = window.Notification;
    const originalNavigator = window.navigator;

    afterEach(() => {
        Object.defineProperty(window, "Notification", {
            value: originalNotification,
            writable: true,
            configurable: true,
        });
    });

    it("registers service worker when available in navigator", async () => {
        const registerMock = jest.fn().mockResolvedValue({} as ServiceWorkerRegistration);
        Object.defineProperty(navigator, "serviceWorker", {
            value: {
                register: registerMock,
            },
            writable: true,
            configurable: true,
        });

        const reg = await registerServiceWorker();
        expect(registerMock).toHaveBeenCalledWith("/sw.js");
        expect(reg).toBeDefined();
    });

    it("dispatches notification via ServiceWorkerRegistration.showNotification when ready", async () => {
        const showNotificationMock = jest.fn().mockResolvedValue(undefined);
        const readyPromise = Promise.resolve({
            showNotification: showNotificationMock,
        } as unknown as ServiceWorkerRegistration);

        Object.defineProperty(navigator, "serviceWorker", {
            value: {
                ready: readyPromise,
                register: jest.fn().mockResolvedValue({}),
            },
            writable: true,
            configurable: true,
        });

        const mockNotificationConstructor = jest.fn();
        (mockNotificationConstructor as any).permission = "granted";
        Object.defineProperty(window, "Notification", {
            value: mockNotificationConstructor,
            writable: true,
            configurable: true,
        });

        sendPushNotification("Zug 11507 fährt ab", {
            body: "Bitte abfahren",
            tag: "departure-11507",
        });

        await readyPromise;
        expect(showNotificationMock).toHaveBeenCalledWith(
            "Zug 11507 fährt ab",
            expect.objectContaining({
                body: "Bitte abfahren",
                tag: "departure-11507",
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                renotify: true,
            })
        );
    });

    it("falls back to window.Notification constructor when ServiceWorker is unavailable", () => {
        Object.defineProperty(navigator, "serviceWorker", {
            value: undefined,
            writable: true,
            configurable: true,
        });

        const mockNotificationConstructor = jest.fn();
        (mockNotificationConstructor as any).permission = "granted";
        Object.defineProperty(window, "Notification", {
            value: mockNotificationConstructor,
            writable: true,
            configurable: true,
        });

        sendPushNotification("Test Title", {
            body: "Test Body",
            tag: "test-tag",
        });

        expect(mockNotificationConstructor).toHaveBeenCalledWith(
            "Test Title",
            expect.objectContaining({
                body: "Test Body",
                tag: "test-tag",
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                renotify: true,
            })
        );
    });

    it("requests permission and registers service worker", async () => {
        const registerMock = jest.fn().mockResolvedValue({});
        Object.defineProperty(navigator, "serviceWorker", {
            value: {
                register: registerMock,
            },
            writable: true,
            configurable: true,
        });

        const requestPermissionMock = jest.fn().mockResolvedValue("granted");
        const mockNotification = jest.fn();
        (mockNotification as any).permission = "default";
        (mockNotification as any).requestPermission = requestPermissionMock;

        Object.defineProperty(window, "Notification", {
            value: mockNotification,
            writable: true,
            configurable: true,
        });

        const permissionPromise = requestPushNotificationPermission();
        expect(requestPermissionMock).toHaveBeenCalled();
        expect(registerMock).toHaveBeenCalledWith("/sw.js");

        const result = await permissionPromise;
        expect(result).toBe("granted");
    });
});
