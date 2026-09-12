import React from "react";
import {Table, Spinner} from "flowbite-react";
import {searchSeparator} from "../../config";
import TableRow from "./TrainRow";
import useMeasure, {RectReadOnly} from "react-use-measure";
import {SimRailMapModal} from "./SimRailMapModal";
import {Header} from "./Header";
import {postConfig} from "../../config/stations";
import {FilterConfig} from "..";
import { DetailedTrain } from "../functions/trainDetails";
import {TrainTimetableModal} from "./TrainTimetableModal";
import {TableHead} from "./TableHead";
import { ISteamUser } from "../../config/ISteamUser";
import { TrainTimeTableRow } from "../../Sirius";
import { Dictionary } from "lodash";
import { TimeTableRow } from "../../customTypes/TimeTableRow";
import { isInactiveTrainAtStation, moveInactiveRowsLast } from "../functions/trainFilters";
import {departureDistance, hasTrainPassedStation, shouldHideByScheduledTime, shouldHideDepartedTrain} from "../functions/trainFilters";
import {ArrivalSortMode, SortDirection, sortTimetable, TrainSortKey} from "../functions/trainSorting";
import {getStationDeviation} from "../functions/stationDeviation";
import {getDisplayedDepartureTime} from "../functions/trainTimes";
import {isTrainInStationArea, isTrainStandingAtStation} from "../functions/stationPresence";
import {differenceInMinutes} from "date-fns";
import {nowUTC} from "../../utils/date";
import {useLocalStorage} from "usehooks-ts";
import {DirectionTextContext} from "./Cells/DirectionIndicator";
import {getTrainNotificationKey, pruneDepartedTrainNotifications} from "../functions/trainNotificationStorage";

export type Bounds = {
    firstColBounds: RectReadOnly;
    secondColBounds: RectReadOnly;
    thirdColBounds: RectReadOnly;
    fourthColBounds: RectReadOnly;
    fifthColBounds: RectReadOnly;
    sixthColBounds: RectReadOnly;
    seventhColBounds: RectReadOnly;
    showStopColumn: boolean;
}

type Props = {
    timetable: TimeTableRow[];
    trainsWithDetails: {[k: string]: DetailedTrain};
    serverTzOffset: number
    playSoundNotification: (callback: () => void) => void;
    post: string;
    serverCode: string;
    isWebpSupported: boolean;
    filterConfig: FilterConfig;
    setFilterConfig: (newFilterConfig: FilterConfig) => void;
    players: ISteamUser[] | undefined;
    trainTimetables: Dictionary<TrainTimeTableRow[]>;
    serverTime: number | undefined;
}

export const EDRTable: React.FC<Props> = ({
      playSoundNotification, timetable, trainsWithDetails, serverTzOffset, serverTime,
      post, serverCode, isWebpSupported, filterConfig, setFilterConfig, players, trainTimetables
    }) => {
    const [filter, setFilter] = React.useState("");
    const [mapModalTrainId, setMapModalTrainId] = React.useState<string | undefined>();
    const [timetableModalTrainId, setTimetableModalTrainId] = React.useState<string | undefined>();
    const [streamMode, setStreamMode] = React.useState(false);
    const [showDirectionText, setShowDirectionText] = useLocalStorage("edr-show-direction-text", false);
    const [autoAlarmVisible, setAutoAlarmVisible] = useLocalStorage("edr-auto-alarm-visible", false);
    const [sortKey, setSortKey] = React.useState<TrainSortKey | undefined>();
    const [arrivalSortMode, setArrivalSortMode] = useLocalStorage<ArrivalSortMode>("edr-arrival-sort-mode", "predicted");
    const [sortDirection, setSortDirection] = React.useState<SortDirection>("ascending");

    const [headerFirstColRef, firstColBounds] = useMeasure();
    const [headerSecondColRef, secondColBounds] = useMeasure();
    const [headerThirdColRef, thirdColBounds] = useMeasure();
    const [headerFourthColRef, fourthColBounds] = useMeasure();
    const [headerFifthColRef, fifthColBounds] = useMeasure();
    const [headerSixthhColRef, sixthColBounds] = useMeasure();
    const [headerSeventhColRef, seventhColBounds] = useMeasure();

    const bounds = {
        firstColBounds,
        secondColBounds,
        thirdColBounds,
        fourthColBounds,
        fifthColBounds,
        sixthColBounds,
        seventhColBounds
    }

    React.useEffect(() => {
        if (trainsWithDetails && post && serverTime && timetable.length > 0) {
            const currentPostCfg = postConfig[post];
            const dateNow = nowUTC(serverTime);
            const validActiveKeys = new Set<string>();
            for (const row of timetable) {
                const train = trainsWithDetails[row.trainNoLocal];
                const secondaryStationIndices = (row.secondaryPostsRows || []).map(r => r.stationIndex);
                const standing = isTrainStandingAtStation(row, train, currentPostCfg, dateNow);
                const inArea = isTrainInStationArea(row, train, currentPostCfg);
                const hasPassed = train !== undefined && !standing && !inArea && hasTrainPassedStation(
                    train.TrainData.VDDelayedTimetableIndex,
                    row.stationIndex,
                    secondaryStationIndices
                );
                if (!hasPassed) {
                    validActiveKeys.add(getTrainNotificationKey(row, serverCode, currentPostCfg));
                }
            }
            pruneDepartedTrainNotifications(validActiveKeys, serverCode, currentPostCfg);
        }
    }, [timetable, trainsWithDetails, post, serverCode, serverTime]);

    if (!trainsWithDetails || !post || !serverTime) return null;
    const postCfg = postConfig[post];
    const showStopColumn = timetable.length > 0 && timetable.some((row) => row.platform || Math.ceil(row.plannedStop) !== 0);
    const changeSort = (key: TrainSortKey) => {
        if (sortKey === key) {
            setSortDirection(direction => direction === "ascending" ? "descending" : "ascending");
        } else {
            setSortKey(key);
            setSortDirection("ascending");
        }
    };

    const resetSort = () => {
        setSortKey(undefined);
        setSortDirection("ascending");
    };

    const dateNow = nowUTC(serverTime);

    const filteredTimetable = timetable
            .filter((tt) => filter ?
                filter.replace(/\s+/g, '')
                    .split(searchSeparator)
                    .filter(n => n)
                    .some((trainFilter) => tt.trainNoLocal.startsWith(trainFilter)) : true)
            .filter((tt) => filterConfig.onlyOnTrack ? !!trainsWithDetails[tt.trainNoLocal] : true)
            .filter((tt) => {
                const train = trainsWithDetails[tt.trainNoLocal];
                const secondaryStationIndices = (tt.secondaryPostsRows || []).map(row => row.stationIndex);
                const standing = isTrainStandingAtStation(tt, train, postCfg, dateNow);
                const inArea = isTrainInStationArea(tt, train, postCfg);
                const hasPassed = train !== undefined && !standing && !inArea && hasTrainPassedStation(
                    train.TrainData.VDDelayedTimetableIndex,
                    tt.stationIndex,
                    secondaryStationIndices,
                );

                const distanceAfterDeparture = train && hasPassed ? departureDistance(
                    train.distanceFromStation,
                    train.TrainData.Longitute,
                    train.TrainData.Latititute,
                    postCfg.platformPosOverride,
                ) : undefined;
                if (filterConfig.onlyApproaching && shouldHideDepartedTrain(hasPassed, distanceAfterDeparture, filterConfig.departedDistance)) return false;
                if (filterConfig.maxRange !== undefined && train?.distanceFromStation != null && train.distanceFromStation > filterConfig.maxRange) return false;

                // A train still waiting here or in station area must not vanish as its arrival moves out of the time window.
                if (standing || inArea) return true;

                return !shouldHideByScheduledTime(
                    filterConfig.maxTime,
                    differenceInMinutes(tt.scheduledArrivalObject, dateNow),
                    getStationDeviation(tt, train, postCfg, dateNow).arrivalMinutes,
                );
            });
    const arrivalDeviation = (row: TimeTableRow) => getStationDeviation(row, trainsWithDetails[row.trainNoLocal], postCfg, dateNow).arrivalMinutes;
    const departureTime = (row: TimeTableRow) => {
        const deviation = getStationDeviation(row, trainsWithDetails[row.trainNoLocal], postCfg, dateNow);
        return getDisplayedDepartureTime(row.scheduledArrivalObject, row.scheduledDepartureObject,
            deviation.departureMinutes, deviation.arrivalMinutes, deviation.departureEstimated, deviation.standingDepartureTime, row.plannedStop > 0);
    };
    const visibleTimetable = sortKey
        ? sortTimetable(filteredTimetable, sortKey, sortDirection, trainsWithDetails, arrivalDeviation, departureTime)
        : moveInactiveRowsLast(sortTimetable(filteredTimetable, "arrival", "ascending", trainsWithDetails,
            arrivalSortMode === "scheduled" ? () => 0 : arrivalDeviation),
        (tt) => !isTrainStandingAtStation(tt, trainsWithDetails[tt.trainNoLocal], postCfg, dateNow)
            && !isTrainInStationArea(tt, trainsWithDetails[tt.trainNoLocal], postCfg)
            && isInactiveTrainAtStation(
            trainsWithDetails[tt.trainNoLocal]?.TrainData.VDDelayedTimetableIndex,
            tt.stationIndex,
            (tt.secondaryPostsRows || []).map(row => row.stationIndex),
        ),
    );

    return <DirectionTextContext.Provider value={showDirectionText}><div className="edr-layout">
        <SimRailMapModal serverCode={serverCode} trainId={mapModalTrainId} setModalTrainId={setMapModalTrainId} />
        <TrainTimetableModal trainDetails={timetableModalTrainId ? trainsWithDetails[timetableModalTrainId] : undefined} setModalTrainId={setTimetableModalTrainId} trainTimetable={timetableModalTrainId ? trainTimetables[timetableModalTrainId] : undefined}/>
        <Header
            serverTzOffset={serverTzOffset}
            serverTime={serverTime}
            serverCode={serverCode}
            postCfg={postCfg}
            bounds={{...bounds, showStopColumn}}
            timetableLength={timetable.length}
            setFilter={setFilter}
            filter={filter}
            streamMode={streamMode}
            setStreamMode={setStreamMode}
            showDirectionText={showDirectionText}
            setShowDirectionText={setShowDirectionText}
            autoAlarmVisible={autoAlarmVisible}
            setAutoAlarmVisible={setAutoAlarmVisible}
            filterConfig={filterConfig}
            setFilterConfig={setFilterConfig}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={changeSort}
            onResetSort={resetSort}
            arrivalSortMode={arrivalSortMode}
            setArrivalSortMode={mode => { setArrivalSortMode(mode); resetSort(); }}
            playSoundNotification={playSoundNotification}
        />
        <div className="edr-table-scroll" tabIndex={0}>
            <Table striped={true} className="edr-table">
            {!streamMode && <TableHead {...bounds} showStopColumn={showStopColumn} sortKey={sortKey} sortDirection={sortDirection} onSort={changeSort} />}
            <Table.Body>
                {timetable.length > 0
                    ? visibleTimetable.map(tr =>
                    <TableRow
                        key={tr.trainNoLocal + "_" + tr.fromPost + "_" + tr.toPost}
                        ttRow={tr}
                        serverTime={serverTime}
                        firstColRef={ headerFirstColRef}
                        secondColRef={headerSecondColRef}
                        thirdColRef={headerThirdColRef}
                        headerFourthColRef={headerFourthColRef}
                        headerFifthColRef={headerFifthColRef}
                        headerSixthhColRef={headerSixthhColRef}
                        headerSeventhColRef={headerSeventhColRef}
                        trainDetails={trainsWithDetails[tr.trainNoLocal]}
                        playSoundNotification={playSoundNotification}
                        setModalTrainId={setMapModalTrainId}
                        setTimetableTrainId={setTimetableModalTrainId}
                        isWebpSupported={isWebpSupported}
                        streamMode={streamMode}
                        serverCode={serverCode}
                        players={players}
                        postCfg={postCfg}
                        autoAlarmVisible={autoAlarmVisible}
                    />) : <tr><td colSpan={7} className="text-center p-4"><Spinner /></td></tr>
                }
            </Table.Body>
            </Table>
        </div>
        </div></DirectionTextContext.Provider>
}
