import {Server, Station, Train} from "@simrail/types";
import { ISteamUser } from "../config/ISteamUser";
import { TrainTimeTableRow } from "../Sirius";
import { TimeTableRow } from "../customTypes/TimeTableRow";
import { ExtendedTrain } from "../customTypes/ExtendedTrain";
import { toServerTime } from "../utils/serverTime";

export const BASE_API_URL = process.env.REACT_APP_API_URL ?? (
    process.env.NODE_ENV === "development"
        ? `${window.location.protocol}//${window.location.hostname}:8080/`
        : "/"
);

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

const expectArray = <T>(data: unknown, endpoint: string): T[] => {
    if (!Array.isArray(data)) {
        throw new TypeError(`Expected an array from ${endpoint}`);
    }
    return data as T[];
};

export const getTimetable = (post: string, serverCode: string, serverTzOffset: number): Promise<TimeTableRow[]> =>
    baseApiCall<unknown>(`dispatch/${serverCode}/${post}?mergePosts=true`).then(data => expectArray<TimeTableRow>(data, "dispatch").map(tr => {
        tr.actualArrivalObject = toServerTime(tr.actualArrivalObject, serverTzOffset);
        tr.actualDepartureObject = toServerTime(tr.actualDepartureObject, serverTzOffset);
        tr.scheduledArrivalObject = toServerTime(tr.scheduledArrivalObject, serverTzOffset);
        tr.scheduledDepartureObject = toServerTime(tr.scheduledDepartureObject, serverTzOffset);

        return tr;
    }));

export const getTrainTimetable = (trainId: string, serverCode: string, serverTzOffset: number): Promise<TrainTimeTableRow[]> =>
    baseApiCall<unknown>(`train/${serverCode}/${trainId}`).then(data => expectArray<TrainTimeTableRow>(data, "train").map(tr => {
        tr.actualArrivalObject = toServerTime(tr.actualArrivalObject, serverTzOffset);
        tr.actualDepartureObject = toServerTime(tr.actualDepartureObject, serverTzOffset);
        tr.scheduledArrivalObject = toServerTime(tr.scheduledArrivalObject, serverTzOffset);
        tr.scheduledDepartureObject = toServerTime(tr.scheduledDepartureObject, serverTzOffset);

        return tr;
    }));

export const getTrains = (serverCode: string): Promise<Train[]> =>
    baseApiCall<unknown>(`trains/${serverCode}`).then(data => expectArray<Train>(data, "trains"));

export const getTrainsForPost = (serverCode: string, post: string): Promise<ExtendedTrain[]> =>
    baseApiCall<unknown>(`trains/${serverCode}/${post}`).then(data => expectArray<ExtendedTrain>(data, "trains for post"));

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
