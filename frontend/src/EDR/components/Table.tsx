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
import classNames from "classnames";
import { ISteamUser } from "../../config/ISteamUser";
import { TrainTimeTableRow } from "../../Sirius";
import { Dictionary } from "lodash";
import { TimeTableRow } from "../../customTypes/TimeTableRow";
import { isInactiveTrainAtStation, moveInactiveRowsLast } from "../functions/trainFilters";
import {hasTrainPassedStation, shouldHideByScheduledTime, shouldHideDepartedTrain} from "../functions/trainFilters";
import {SortDirection, sortTimetable, TrainSortKey} from "../functions/trainSorting";
import {differenceInMinutes} from "date-fns";
import {nowUTC} from "../../utils/date";

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
    const [filter, setFilter] = React.useState<string | undefined>();
    const [mapModalTrainId, setMapModalTrainId] = React.useState<string | undefined>();
    const [timetableModalTrainId, setTimetableModalTrainId] = React.useState<string | undefined>();
    const [streamMode, setStreamMode] = React.useState(false);
    const [sortKey, setSortKey] = React.useState<TrainSortKey | undefined>();
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
                const hasPassed = train !== undefined && hasTrainPassedStation(
                    train.TrainData.VDDelayedTimetableIndex,
                    tt.stationIndex,
                    secondaryStationIndices,
                );

                if (filterConfig.onlyApproaching && shouldHideDepartedTrain(hasPassed, train?.distanceFromStation, filterConfig.departedDistance)) return false;
                if (filterConfig.maxRange !== undefined && train?.distanceFromStation != null && train.distanceFromStation > filterConfig.maxRange) return false;

                return !shouldHideByScheduledTime(
                    filterConfig.maxTime,
                    differenceInMinutes(tt.scheduledArrivalObject, dateNow),
                    train?.lastDelay,
                );
            });
    const visibleTimetable = sortKey
        ? sortTimetable(filteredTimetable, sortKey, sortDirection, trainsWithDetails)
        : moveInactiveRowsLast(filteredTimetable,
        (tt) => isInactiveTrainAtStation(
            trainsWithDetails[tt.trainNoLocal]?.TrainData.VDDelayedTimetableIndex,
            tt.stationIndex,
            (tt.secondaryPostsRows || []).map(row => row.stationIndex),
        ),
    );

    return <div>
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
            streamMode={streamMode}
            setStreamMode={setStreamMode}
            filterConfig={filterConfig}
            setFilterConfig={setFilterConfig}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={changeSort}
        />
        <div className={classNames(
            "child:overflow-y-scroll ",
                streamMode ? "child:h-[calc(100vh-102px)]" : "child:h-[calc(100vh-166px)]"
            )}>
            <Table striped={true}>
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
                    />) : <div className="w-full text-center"><Spinner /></div>
                }
            </Table.Body>
            </Table>
        </div>
        </div>
}
