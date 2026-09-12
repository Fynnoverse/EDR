import React from "react";
import {getPlayer, getServerTime, getStations, getTimetable, getTrainsForPost, getTrainTimetable, getTzOffset} from "../api/api";
import {Alert} from "flowbite-react";
import {EDRTable} from "./components/Table";
import _keyBy from "lodash/fp/keyBy";
import {useTranslation} from "react-i18next";
import _difference from "lodash/difference";

import {LoadingScreen} from "./components/LoadingScreen";
import {DetailedTrain, getTrainDetails} from "./functions/trainDetails";
import {postConfig} from "../config/stations";
import { Station } from "@simrail/types";
import { Dictionary } from "lodash";
import {redirect, useParams} from "react-router-dom";
import {StringParam, useQueryParam} from "use-query-params";
import { ISteamUser } from "../config/ISteamUser";
import { TrainTimeTableRow } from "../Sirius";
import { TimeTableRow } from "../customTypes/TimeTableRow";
import { ExtendedTrain } from "../customTypes/ExtendedTrain";
import { nowUTC } from "../utils/date";
import { DEFAULT_DEPARTED_TRAIN_HIDE_DISTANCE_KM } from "./functions/trainFilters";
import {useLocalStorage} from "usehooks-ts";
const Graph = React.lazy(() => import("./components/Graph"));

type Props = {
    isWebpSupported: boolean,
    playSoundNotification: (cb: () => void) => void
}

export type FilterConfig = {
    maxRange?: number;
    maxTime?: number;
    onlyApproaching: boolean;
    onlyOnTrack: boolean;
    departedDistance: number;
}

export const presetFilterConfig: {[k: string]: FilterConfig} = {
    default: {
        onlyApproaching: false,
        onlyOnTrack: false,
        departedDistance: DEFAULT_DEPARTED_TRAIN_HIDE_DISTANCE_KM
    },
    near: {
        onlyApproaching: false,
        onlyOnTrack: true,
        departedDistance: DEFAULT_DEPARTED_TRAIN_HIDE_DISTANCE_KM
    },
    approaching: {
        onlyApproaching: true,
        onlyOnTrack: false,
        departedDistance: DEFAULT_DEPARTED_TRAIN_HIDE_DISTANCE_KM
    }
}

/**
 * This component is responsible to get and batch all the data before it goes downstream to the table
 */
export const EDR: React.FC<Props> = ({playSoundNotification, isWebpSupported}) => {
    const {serverCode, post} = useParams<{
        serverCode: string,
        post: string
    }>();

    const [loading, setLoading] = React.useState(true);
    const [stations, setStations] = React.useState<Dictionary<Station> | undefined>();
    const [trains, setTrains] = React.useState<ExtendedTrain[] | undefined>();
    const [trainTimetables, setTrainTimetables] = React.useState<Dictionary<TrainTimeTableRow[]> | undefined>();
    const [timetable, setTimetable] = React.useState<TimeTableRow[] | undefined>();
    const [players, setPlayers] = React.useState<ISteamUser[] | undefined>();
    const [tzOffset, setTzOffset] = React.useState<number | undefined>();
    const [trainsWithDetails, setTrainsWithDetails] = React.useState<{ [k: string]: DetailedTrain } | undefined>();
    const [isGraphModalOpen, setGraphModalOpen] = React.useState<boolean>(false);
    const [filterConfig, setFilterConfig] = useLocalStorage<FilterConfig>("edr-filter-config", presetFilterConfig.default);
    const [serverTime, setServerTime] = React.useState<number | undefined>();
    const clockAnchor = React.useRef<{time: number; receivedAt: number} | undefined>(undefined);
    const [lastLiveReceipt, setLastLiveReceipt] = React.useState<number>();
    const [liveRefreshFailed, setLiveRefreshFailed] = React.useState(false);
    const {t} = useTranslation();

    const dataGeneration = React.useRef(0);
    const detailRequests = React.useRef(new Map<string, {index: number; at: number; pending: boolean}>());
    const previousTrains = React.useRef<{ [k: string]: DetailedTrain } | null>(null);
    const previousPlayers = React.useRef<ISteamUser[] | undefined>(undefined);
    const graphFullScreenMode = !!useQueryParam("graphFullScreenMode", StringParam)[0];

    const currentStation = post ? postConfig[post] : undefined;

    // One request cycle per view; an old view must never overwrite the current one.
    React.useEffect(() => {
        if (!serverCode || !post || !currentStation) return;
        let cancelled = false;
        dataGeneration.current++;
        detailRequests.current = new Map();
        let timer: ReturnType<typeof setTimeout>;
        let initialized = false;
        let lastClockSync = 0;
        setLoading(true);
        setTrains(undefined);
        setTrainTimetables(undefined);
        setTrainsWithDetails(undefined);
        setLastLiveReceipt(undefined);
        setLiveRefreshFailed(false);
        previousTrains.current = null;
        clockAnchor.current = undefined;
        const refresh = async () => {
            const started = Date.now();
            try {
                if (!initialized) {
                    const [offset, clock, schedule, stationList, liveTrains] = await Promise.all([
                        getTzOffset(serverCode), getServerTime(serverCode).then(time => ({time, receivedAt: Date.now()})),
                        getTimetable(post, serverCode), getStations(serverCode),
                        getTrainsForPost(serverCode, post)
                    ]);
                    if (cancelled) return;
                    const receivedAt = Date.now();
                    setTzOffset(offset);
                    clockAnchor.current = clock;
                    setServerTime(clock.time + receivedAt - clock.receivedAt);
                    lastClockSync = receivedAt;
                    setTimetable(schedule.sort((a, b) => a.scheduledArrivalObject.valueOf() - b.scheduledArrivalObject.valueOf()));
                    setStations(_keyBy('Name', stationList));
                    setTrains(liveTrains.map(train => ({...train, receivedAt})));
                    setLastLiveReceipt(receivedAt);
                    setTrainTimetables({});
                    setLoading(false);
                    initialized = true;
                } else {
                    const liveTrains = await getTrainsForPost(serverCode, post);
                    if (cancelled) return;
                    const receivedAt = Date.now();
                    setTrains(liveTrains.map(train => ({...train, receivedAt})));
                    setLastLiveReceipt(receivedAt);
                    if (receivedAt - lastClockSync >= 30000) {
                        // Clock failure must not discard a successful train update.
                        try {
                            const clock = await getServerTime(serverCode);
                            if (cancelled) return;
                            clockAnchor.current = {time: clock, receivedAt: Date.now()};
                            setServerTime(clock);
                            lastClockSync = Date.now();
                        } catch { /* Keep advancing the last synchronized clock. */ }
                    }
                }
                if (!cancelled) setLiveRefreshFailed(false);
            } catch {
                if (!cancelled) setLiveRefreshFailed(true);
            } finally {
                if (!cancelled) timer = setTimeout(refresh, Math.max(1000, 5000 - (Date.now() - started)));
            }
        };
        void refresh();
        return () => { cancelled = true; dataGeneration.current++; clearTimeout(timer); };
        // eslint-disable-next-line
    }, [serverCode, post]);

    // Advance from the clock anchor, including after a background-tab pause.
    React.useEffect(() => {
        const timer = setInterval(() => {
            const anchor = clockAnchor.current;
            if (anchor) setServerTime(anchor.time + Date.now() - anchor.receivedAt);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Keeps previous data in memory for comparing changes
    React.useEffect(() => {
        previousTrains.current = trainsWithDetails as { [k: string]: DetailedTrain };
    }, [trainsWithDetails]);

    React.useEffect(() => {
        previousPlayers.current = players;
    }, [players]);

    // Recalculate when a new observation or timetable arrives, not on every clock tick.
    React.useEffect(() => {
        if (loading || !trains || !trainTimetables) return;
        const addDetails = getTrainDetails(previousTrains, trainTimetables, nowUTC(serverTime));
        setTrainsWithDetails(_keyBy('TrainNoLocal', trains.map(addDetails)));
        // eslint-disable-next-line
    }, [trains, trainTimetables, loading]);

    // Refresh details on checkpoint changes and periodically for API-recorded events.
    React.useEffect(() => {
        if (!trains || !serverCode || !timetable) return;
        const generation = dataGeneration.current;
        const requests = detailRequests.current;
        const relevant = new Set(timetable.map(row => row.trainNoLocal));
        trains.filter(train => relevant.has(train.TrainNoLocal)).forEach(train => {
            const id = train.TrainNoLocal;
            const index = train.TrainData.VDDelayedTimetableIndex;
            const previous = requests.get(id);
            if (previous?.pending || (previous?.index === index && Date.now() - previous.at < 30000)) return;
            requests.set(id, {index, at: Date.now(), pending: true});
            getTrainTimetable(id, serverCode).then(rows => {
                if (generation !== dataGeneration.current) return;
                setTrainTimetables(existing => ({...existing, [id]: rows}));
                requests.set(id, {index, at: Date.now(), pending: false});
            }).catch(() => {
                requests.delete(id); // Retry on the next live cycle; keep the last usable timetable.
            });
        });
    }, [trains, timetable, serverCode]);

    React.useEffect(() => {
        if (!serverCode || !post) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;
        const refresh = async () => {
            try {
                const rows = await getTimetable(post, serverCode);
                if (!cancelled) setTimetable(rows.sort((a, b) => a.scheduledArrivalObject.valueOf() - b.scheduledArrivalObject.valueOf()));
            } catch { /* Keep the last station timetable and retry. */ }
            finally { if (!cancelled) timer = setTimeout(refresh, 15000); }
        };
        timer = setTimeout(refresh, 15000);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [serverCode, post]);

    // Get new player info when someone takes over a train
    React.useEffect(() => {
        if (!Array.isArray(trains)) return;
        const allPlayerIds = trains.map((t) => t.TrainData.ControlledBySteamID).filter((trainNumber): trainNumber is Exclude<typeof trainNumber, null> => trainNumber !== null);
        const previousPlayerIds = previousPlayers?.current?.map(player => player.steamid) ?? [];
        const difference = _difference(allPlayerIds, previousPlayerIds);
        if (difference.length === 0) return;
        Promise.all(difference.map(getPlayer)).then(data => setPlayers(players !== undefined ? players?.concat(data) : data));
    }, [trains, players])

    if (!serverCode || !post)
        redirect("/");

    if (!loading && trains && trains.length === 0) {
        return <Alert className="mt-8" color="error">{t("APP_no_trains")}</Alert>
    }

    if (!loading && !timetable) {
        return <Alert color="failure">{t("APP_no_timetable")}</Alert>
    }

    if (!loading && !currentStation)
        return <Alert color="failure">{t("APP_station_not_found")}</Alert>

    if (loading)
        return <>{liveRefreshFailed && <Alert color="failure">Live-Daten konnten nicht geladen werden. Neuer Versuch läuft automatisch.</Alert>}<LoadingScreen timetable={timetable as TimeTableRow[]}
                              trains={trains}
                              stations={stations as Dictionary<Station>}
                              tzOffset={tzOffset}
                              trainSchedules={trainTimetables}
        /></>

    return <div className="edr-page">
        <div className="px-4 py-1 text-xs text-gray-600 dark:text-gray-300" role="status">
            {lastLiveReceipt ? `Live-Abruf vor ${Math.max(0, Math.floor((Date.now() - lastLiveReceipt) / 1000))} s` : "Warte auf Live-Daten"}
            {liveRefreshFailed && " · Aktualisierung fehlgeschlagen; letzter Datenstand bleibt sichtbar"}
        </div>
        {
            timetable && tzOffset !== undefined && post && timetable.length && (isGraphModalOpen || graphFullScreenMode)
                ? <Graph
                    fullScreenMode={graphFullScreenMode}
                    isOpen={isGraphModalOpen}
                    timetable={timetable}
                    post={post} onClose={() =>
                    setGraphModalOpen(false)}
                    serverTime={serverTime}
                    serverCode={serverCode}
                />
                : null
        }
        { !graphFullScreenMode && tzOffset !== undefined && trainTimetables
            ? <EDRTable playSoundNotification={playSoundNotification}
                timetable={timetable!}
                serverTzOffset={tzOffset}
                trainsWithDetails={trainsWithDetails as { [k: string]: DetailedTrain }}
                post={post!}
                serverCode={serverCode!}
                isWebpSupported={isWebpSupported}
                filterConfig={filterConfig}
                setFilterConfig={setFilterConfig}
                players={players}
                trainTimetables={trainTimetables}
                serverTime={serverTime}
            />
            : null
        }
    </div>
}

export default EDR;
