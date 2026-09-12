import React from "react";
import {Table} from "flowbite-react";
import {nowUTC} from "../../utils/date";
import {configByType} from "../../config/trains";
import { DetailedTrain } from "../functions/trainDetails";
import { subMinutes } from "date-fns";
import {TrainInfoCell} from "./Cells/TrainInfoCell";
import {TrainTypeCell} from "./Cells/TrainTypeCell";
import {TrainArrivalCell} from "./Cells/TrainArrivalCell";
import {TrainFromCell} from "./Cells/TrainFromCell";
import {TrainPlatformCell} from "./Cells/TrainPlatformCell";
import {TrainDepartureCell} from "./Cells/TrainDepartureCell";
import {TrainToCell} from "./Cells/TrainToCell";
import { ISteamUser } from "../../config/ISteamUser";
import { StationConfig } from "../../config/stations";
import { TimeTableRow } from "../../customTypes/TimeTableRow";
import { isInactiveTrainAtStation } from "../functions/trainFilters";
import { getServerTimeNumber } from "../../utils/serverTime";
import {getStationDeviation} from "../functions/stationDeviation";
import {getStationGroupIndices, isTrainInStationArea, isTrainStandingAtStation} from "../functions/stationPresence";
import {getDisplayedDepartureTime} from "../functions/trainTimes";
import {
    getTrainNotificationKey,
    isTrainNotificationStored,
    removeStoredTrainNotification,
    setStoredTrainNotification
} from "../functions/trainNotificationStorage";


export const tableCellCommonClassnames = (streamMode: boolean = false) =>
    streamMode ? "px-2 py-1.5 align-middle" : "px-4 py-2 align-middle";
type Props = {
    setModalTrainId: React.Dispatch<React.SetStateAction<string | undefined>>,
    setTimetableTrainId: React.Dispatch<React.SetStateAction<string | undefined>>,
    ttRow: TimeTableRow,
    trainDetails: DetailedTrain | undefined,
    serverTime: number | undefined,
    firstColRef: any,
    secondColRef: any,
    thirdColRef: any,
    headerFourthColRef: any,
    headerFifthColRef: any,
    headerSixthhColRef: any,
    headerSeventhColRef: any,
    playSoundNotification: any,
    isWebpSupported: boolean,
    streamMode: boolean;
    serverCode: string;
    players: ISteamUser[] | undefined;
    postCfg: StationConfig;
    autoAlarmVisible?: boolean;
}

const TableRow: React.FC<Props> = (
    {setModalTrainId, ttRow, trainDetails, serverTime,
        firstColRef, secondColRef, thirdColRef, headerFourthColRef, headerFifthColRef, headerSixthhColRef, headerSeventhColRef,
        playSoundNotification, isWebpSupported, streamMode, setTimetableTrainId,
        serverCode, players, postCfg, autoAlarmVisible
    }: Props
) => {
    const dateNow = nowUTC(serverTime);
    const deviation = getStationDeviation(ttRow, trainDetails, postCfg, dateNow);
    const standingAtStation = isTrainStandingAtStation(ttRow, trainDetails, postCfg, dateNow);
    const inStationArea = isTrainInStationArea(ttRow, trainDetails, postCfg);

    const secondaryStationIndices = getStationGroupIndices(ttRow, trainDetails, postCfg).filter(idx => idx !== ttRow.stationIndex);
    const trainHasPassedStation = trainDetails && !standingAtStation && !inStationArea
        ? isInactiveTrainAtStation(trainDetails.TrainData.VDDelayedTimetableIndex, ttRow.stationIndex, secondaryStationIndices)
        : false;
    const isInactive = !standingAtStation && !inStationArea && isInactiveTrainAtStation(trainDetails?.TrainData.VDDelayedTimetableIndex, ttRow.stationIndex, secondaryStationIndices);
    const calculatedDeparture = getDisplayedDepartureTime(
        ttRow.scheduledArrivalObject,
        ttRow.scheduledDepartureObject,
        deviation.departureMinutes,
        deviation.arrivalMinutes,
        deviation.departureEstimated,
        deviation.standingDepartureTime,
        ttRow.plannedStop > 0
    );

    const arrivalTimeDelay = deviation.arrivalMinutes ?? 0;

    const notifKey = React.useMemo(() => getTrainNotificationKey(ttRow, serverCode, postCfg), [ttRow, serverCode, postCfg]);

    const wasArmedRef = React.useRef<boolean>(Boolean(autoAlarmVisible) || isTrainNotificationStored(notifKey));

    const [notificationEnabled, setNotificationEnabledState] = React.useState<boolean>(() => {
        if (trainHasPassedStation) {
            removeStoredTrainNotification(notifKey);
            return false;
        }
        return Boolean(autoAlarmVisible) || isTrainNotificationStored(notifKey);
    });
    const [alarmTriggered, setAlarmTriggered] = React.useState(false);

    const trainMustDepart = !trainHasPassedStation && (subMinutes(calculatedDeparture, 1) <= dateNow);

    const setNotificationEnabled = React.useCallback((value: React.SetStateAction<boolean>) => {
        if (trainHasPassedStation) {
            removeStoredTrainNotification(notifKey);
            setNotificationEnabledState(false);
            wasArmedRef.current = false;
            return;
        }
        setNotificationEnabledState(prev => {
            const next = typeof value === "function" ? value(prev) : value;
            setStoredTrainNotification(notifKey, next);
            if (!trainMustDepart) {
                wasArmedRef.current = next;
            }
            return next;
        });
    }, [trainHasPassedStation, notifKey, trainMustDepart]);

    const trainBadgeColor = configByType[ttRow.trainType]?.color ?? "purple";
    const secondaryPostData = ttRow?.secondaryPostsRows ?? [];

    React.useEffect(() => {
        if (trainHasPassedStation) {
            removeStoredTrainNotification(notifKey);
            if (notificationEnabled || alarmTriggered) {
                setNotificationEnabledState(false);
                setAlarmTriggered(false);
            }
            wasArmedRef.current = false;
            return;
        }

        if (autoAlarmVisible) {
            wasArmedRef.current = true;
            if (!notificationEnabled && !alarmTriggered) {
                setStoredTrainNotification(notifKey, true);
                setNotificationEnabledState(true);
            }
        }

        if (!trainMustDepart) {
            if (alarmTriggered) {
                setAlarmTriggered(false);
            }
            if (autoAlarmVisible || wasArmedRef.current || isTrainNotificationStored(notifKey)) {
                wasArmedRef.current = true;
                setStoredTrainNotification(notifKey, true);
                if (!notificationEnabled) {
                    setNotificationEnabledState(true);
                }
            }
        }
    }, [trainMustDepart, trainHasPassedStation, autoAlarmVisible, notifKey, alarmTriggered, notificationEnabled]);

    const isAlarming = (alarmTriggered || (notificationEnabled && trainMustDepart)) && !trainHasPassedStation;

    return <Table.Row
        className={`
            dark:text-gray-100 light:text-gray-800 hover:bg-gray-200 dark:hover:bg-gray-600 
            ${isInactive ? 'opacity-50' : 'opacity-100'}
            ${isAlarming ? '!bg-amber-100 dark:!bg-amber-950/70 border-l-4 border-amber-500 dark:border-amber-400 animate-pulse' : ''}
        `} data-timeoffset={Math.abs(getServerTimeNumber(dateNow) - getServerTimeNumber(ttRow.scheduledArrivalObject))}
        data-alarming={isAlarming ? "true" : undefined}
    >
        <TrainInfoCell
            ttRow={ttRow}
            trainDetails={trainDetails}
            trainBadgeColor={trainBadgeColor}
            setModalTrainId={setModalTrainId}
            setTimetableTrainId={setTimetableTrainId}
            firstColRef={firstColRef}
            trainHasPassedStation={trainHasPassedStation}
            isWebpSupported={isWebpSupported}
            streamMode={streamMode}
            serverCode={serverCode}
            players={players}
            postCfg={postCfg}
            serverNow={dateNow}
        />
        <TrainTypeCell
            secondColRef={secondColRef}
            trainBadgeColor={trainBadgeColor}
            trainDetails={trainDetails}
            ttRow={ttRow}
            streamMode={streamMode}
        />
        <TrainArrivalCell
            ttRow={ttRow}
            trainDetails={trainDetails}
            trainHasPassedStation={trainHasPassedStation}
            thirdColRef={thirdColRef}
            streamMode={streamMode}
            arrivalTimeDelay={arrivalTimeDelay}
            serverNow={dateNow}
            deviationMinutes={deviation.arrivalMinutes}
            estimated={deviation.arrivalEstimated}
        />
        <TrainFromCell headerFourthColRef={headerFourthColRef} ttRow={ttRow} secondaryPostData={secondaryPostData}
                       streamMode={streamMode} />
        <TrainPlatformCell ttRow={ttRow} headerFifthColRef={headerFifthColRef} secondaryPostData={secondaryPostData}
                           trainDetails={trainDetails} postCfg={postCfg} serverNow={dateNow}
                           streamMode={streamMode} />
        <TrainDepartureCell
            headerSixthhColRef={headerSixthhColRef}
            ttRow={ttRow}
            trainHasPassedStation={trainHasPassedStation}
            trainMustDepart={trainMustDepart}
            playSoundNotification={playSoundNotification}
            streamMode={streamMode}
            isTrainOffline={!trainDetails}
            deviationMinutes={deviation.departureMinutes}
            arrivalDeviationMinutes={deviation.arrivalMinutes}
            standingDepartureTime={deviation.standingDepartureTime}
            estimated={deviation.departureEstimated}
            serverNow={dateNow}
            notificationEnabled={notificationEnabled}
            setNotificationEnabled={setNotificationEnabled}
            onAlarmTriggered={() => setAlarmTriggered(true)}
        />
        <TrainToCell ttRow={ttRow} headerSeventhColRef={headerSeventhColRef} secondaryPostData={secondaryPostData}
                     streamMode={streamMode}/>
    </Table.Row>
}

export default React.memo(TableRow, (prevProps, nextProps) => {
    return JSON.stringify(prevProps.trainDetails) === JSON.stringify(nextProps.trainDetails)
    && JSON.stringify(prevProps.ttRow) === JSON.stringify(nextProps.ttRow)
    && prevProps.serverTime === nextProps.serverTime
    && prevProps.streamMode === nextProps.streamMode
    && prevProps.autoAlarmVisible === nextProps.autoAlarmVisible
})
