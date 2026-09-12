import {
    EDR_NOTIFICATIONS_STORAGE_KEY,
    getStoredTrainNotifications,
    getTrainNotificationKey,
    isTrainNotificationStored,
    pruneDepartedTrainNotifications,
    removeStoredTrainNotification,
    setStoredTrainNotification,
} from "../trainNotificationStorage";
import { TimeTableRow } from "../../../customTypes/TimeTableRow";
import { postConfig } from "../../../config/stations";

describe("trainNotificationStorage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    const mockRow = {
        trainNoLocal: "40102",
        stationIndex: 3,
    } as TimeTableRow;

    it("generates correct storage keys", () => {
        const key = getTrainNotificationKey(mockRow, "en1", postConfig.KOL);
        expect(key).toBe("en1_KOL_40102");

        const fallbackKey = getTrainNotificationKey(mockRow);
        expect(fallbackKey).toBe("default_3_40102");
    });

    it("saves, checks, and removes train notifications in localStorage", () => {
        expect(isTrainNotificationStored("en1_KOL_40102")).toBe(false);

        setStoredTrainNotification("en1_KOL_40102", true);
        expect(isTrainNotificationStored("en1_KOL_40102")).toBe(true);
        expect(getStoredTrainNotifications()).toEqual({"en1_KOL_40102": true});

        removeStoredTrainNotification("en1_KOL_40102");
        expect(isTrainNotificationStored("en1_KOL_40102")).toBe(false);
        expect(getStoredTrainNotifications()).toEqual({});
    });

    it("prunes departed train notifications for a specific station/server", () => {
        localStorage.setItem(
            EDR_NOTIFICATIONS_STORAGE_KEY,
            JSON.stringify({
                "en1_KOL_40102": true,
                "en1_KOL_50201": true,
                "en1_DG_60301": true,
            })
        );

        const validActiveKeys = new Set(["en1_KOL_40102"]);
        pruneDepartedTrainNotifications(validActiveKeys, "en1", postConfig.KOL);

        const stored = getStoredTrainNotifications();
        // 50201 was departed so pruned; 40102 kept; 60301 untouched because it belongs to DG
        expect(stored["en1_KOL_40102"]).toBe(true);
        expect(stored["en1_KOL_50201"]).toBeUndefined();
        expect(stored["en1_DG_60301"]).toBe(true);
    });

    it("handles invalid json gracefully", () => {
        localStorage.setItem(EDR_NOTIFICATIONS_STORAGE_KEY, "invalid-json");
        expect(getStoredTrainNotifications()).toEqual({});
        expect(isTrainNotificationStored("key")).toBe(false);
    });
});
