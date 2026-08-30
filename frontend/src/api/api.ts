import {Server, Station, Train} from "@simrail/types";
import { ISteamUser } from "../config/ISteamUser";
import { TrainTimeTableRow } from "../Sirius";
import { TimeTableRow } from "../customTypes/TimeTableRow";
import { ExtendedTrain } from "../customTypes/ExtendedTrain";
import { toServerTime } from "../utils/serverTime";

const configuredBaseApiUrl = process.env.REACT_APP_API_URL ?? (
    process.env.NODE_ENV === "development"
        ? `${window.location.protocol}//${window.location.hostname}:8080/`
        : "/"
);
/**
 * Normalizes an API base URL to exactly one trailing slash.
 *
 * @param baseUrl - Configured absolute or same-origin API base URL.
 * @returns The normalized base URL, ready for endpoint concatenation.
 */
export const normalizeBaseApiUrl = (baseUrl: string) => `${baseUrl.replace(/\/+$/, "")}/`;
export const BASE_API_URL = normalizeBaseApiUrl(configuredBaseApiUrl);

const baseApiCall = async <T>(URL: string): Promise<T> => {
    const outbound = BASE_API_URL + URL;
    const response = await fetch(outbound);
    const responseText = await response.text();
    let data: unknown;

    try {
        data = responseText ? JSON.parse(responseText) : null;
    } catch {
        data = responseText;
    }

    if (!response.ok) {
        const message = typeof data === "object" && data !== null && "message" in data
            ? String(data.message)
            : `API request failed with status ${response.status}`;
        throw new Error(message);
    }

    return data as T;
}

/**
 * Verifies that an untrusted API response has an array as its top-level value.
 *
 * @param data - Raw value returned by the API.
 * @param endpoint - Human-readable endpoint name included in validation errors.
 * @returns The response narrowed to an array of the expected element type.
 * @throws {TypeError} If the response is not an array.
 */
const expectArray = <T>(data: unknown, endpoint: string): T[] => {
    if (!Array.isArray(data)) {
        throw new TypeError(`Expected an array from ${endpoint}`);
    }
    return data as T[];
};

/**
 * Validates every train returned by the live post endpoint.
 * The backend uses `null` when routing data is temporarily unavailable.
 *
 * @param data - Raw response from the trains-for-post endpoint.
 * @returns Validated train objects with numeric or unavailable distance values.
 * @throws {TypeError} If the response or a distance value has an invalid shape.
 */
export const expectExtendedTrainArray = (data: unknown): ExtendedTrain[] =>
    expectArray<unknown>(data, "trains for post").map((value, index) => {
        if (typeof value !== "object" || value === null || !("distanceFromStation" in value)) {
            throw new TypeError(`Expected train ${index} to contain distanceFromStation`);
        }

        const distance = value.distanceFromStation;
        if (distance !== null && (typeof distance !== "number" || !Number.isFinite(distance))) {
            throw new TypeError(`Expected distanceFromStation for train ${index} to be a finite number or null`);
        }

        return value as ExtendedTrain;
    });

export const getTimetable = (post: string, serverCode: string): Promise<TimeTableRow[]> =>
    baseApiCall<unknown>(`dispatch/${serverCode}/${post}?mergePosts=true`).then(data => expectArray<TimeTableRow>(data, "dispatch").map(tr => {
        tr.actualArrivalObject = toServerTime(tr.actualArrivalObject);
        tr.actualDepartureObject = toServerTime(tr.actualDepartureObject);
        tr.scheduledArrivalObject = toServerTime(tr.scheduledArrivalObject);
        tr.scheduledDepartureObject = toServerTime(tr.scheduledDepartureObject);

        return tr;
    }));

export const getTrainTimetable = (trainId: string, serverCode: string): Promise<TrainTimeTableRow[]> =>
    baseApiCall<unknown>(`train/${serverCode}/${trainId}`).then(data => expectArray<TrainTimeTableRow>(data, "train").map(tr => {
        tr.actualArrivalObject = toServerTime(tr.actualArrivalObject);
        tr.actualDepartureObject = toServerTime(tr.actualDepartureObject);
        tr.scheduledArrivalObject = toServerTime(tr.scheduledArrivalObject);
        tr.scheduledDepartureObject = toServerTime(tr.scheduledDepartureObject);

        return tr;
    }));

export const getTrains = (serverCode: string): Promise<Train[]> =>
    baseApiCall<unknown>(`trains/${serverCode}`).then(data => expectArray<Train>(data, "trains"));

export const getTrainsForPost = (serverCode: string, post: string): Promise<ExtendedTrain[]> =>
    baseApiCall<unknown>(`trains/${serverCode}/${post}`).then(expectExtendedTrainArray);

export const getStations = (serverCode: string): Promise<Station[]> =>
    baseApiCall<unknown>(`stations/${serverCode}`).then(data => expectArray<Station>(data, "stations"));

export const getServers = (): Promise<Server[]> =>
    baseApiCall<unknown>("servers").then(data => expectArray<Server>(data, "servers"));

export const getPlayer = (steamId: string): Promise<ISteamUser> =>
    baseApiCall<ISteamUser>(`steam/${steamId}`);

export const getTzOffset = (serverCode: string): Promise<number> =>
    baseApiCall<number>(`server/tz/${serverCode}`);

export const getServerTime = (serverCode: string): Promise<number> =>
    baseApiCall<number>(`server/time/${serverCode}`);
