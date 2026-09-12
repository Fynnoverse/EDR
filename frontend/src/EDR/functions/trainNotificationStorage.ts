import { TimeTableRow } from "../../customTypes/TimeTableRow";
import { StationConfig } from "../../config/stations";

export const EDR_NOTIFICATIONS_STORAGE_KEY = "edr-train-notifications";

export const getTrainNotificationKey = (
    ttRow: TimeTableRow,
    serverCode?: string,
    postCfg?: StationConfig
): string => {
    const server = serverCode || "default";
    const post = postCfg?.id || postCfg?.srName || (ttRow.stationIndex !== undefined ? String(ttRow.stationIndex) : "default");
    return `${server}_${post}_${ttRow.trainNoLocal}`;
};

export const getStoredTrainNotifications = (): Record<string, boolean> => {
    if (typeof window === "undefined" || !window.localStorage) {
        return {};
    }
    try {
        const raw = window.localStorage.getItem(EDR_NOTIFICATIONS_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed;
        }
        return {};
    } catch {
        return {};
    }
};

export const isTrainNotificationStored = (key: string): boolean => {
    const notifications = getStoredTrainNotifications();
    return Boolean(notifications[key]);
};

export const setStoredTrainNotification = (key: string, enabled: boolean): void => {
    if (typeof window === "undefined" || !window.localStorage) {
        return;
    }
    try {
        const notifications = getStoredTrainNotifications();
        if (enabled) {
            notifications[key] = true;
        } else {
            delete notifications[key];
        }
        window.localStorage.setItem(EDR_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    } catch {
        // ignore storage errors
    }
};

export const removeStoredTrainNotification = (key: string): void => {
    setStoredTrainNotification(key, false);
};

export const clearStoredTrainNotifications = (): void => {
    try {
        window.localStorage.removeItem(EDR_NOTIFICATIONS_STORAGE_KEY);
    } catch {
        // Alarms can still be disabled in memory when storage is unavailable.
    }
};

export const pruneDepartedTrainNotifications = (
    validActiveKeys: Set<string>,
    serverCode?: string,
    postCfg?: StationConfig
): void => {
    if (typeof window === "undefined" || !window.localStorage) {
        return;
    }
    try {
        const notifications = getStoredTrainNotifications();
        const postId = postCfg?.id || postCfg?.srName;
        const prefix = serverCode && postId
            ? `${serverCode}_${postId}_`
            : undefined;

        let modified = false;
        for (const key of Object.keys(notifications)) {
            if (prefix) {
                if (key.startsWith(prefix) && !validActiveKeys.has(key)) {
                    delete notifications[key];
                    modified = true;
                }
            } else if (!validActiveKeys.has(key)) {
                delete notifications[key];
                modified = true;
            }
        }

        if (modified) {
            window.localStorage.setItem(EDR_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
        }
    } catch {
        // ignore storage errors
    }
};
