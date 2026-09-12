import React from "react";
import {Table} from "flowbite-react";
import {nowUTC} from "../../utils/date";
import { getDateWithHourAndMinutes } from "../functions/timeUtils";
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
import {isTrainStandingAtStation} from "../functions/stationPresence";


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
}

const TableRow: React.FC<Props> = (
    {setModalTrainId, ttRow, trainDetails, serverTime,
        firstColRef, secondColRef, thirdColRef, headerFourthColRef, headerFifthColRef, headerSixthhColRef, headerSeventhColRef,
        playSoundNotification, isWebpSupported, streamMode, setTimetableTrainId,
        serverCode, players, postCfg
    }: Props
) => {
    const dateNow = nowUTC(serverTime);
    const deviation = getStationDeviation(ttRow, trainDetails, postCfg, dateNow);
    const standingAtStation = isTrainStandingAtStation(ttRow, trainDetails, postCfg, dateNow);

    const secondaryStationIndices = (ttRow.secondaryPostsRows || []).map(row => row.stationIndex);
    const trainHasPassedStation = trainDetails && !standingAtStation
        ? isInactiveTrainAtStation(trainDetails.TrainData.VDDelayedTimetableIndex, ttRow.stationIndex, secondaryStationIndices)
        : false;
    const isInactive = !standingAtStation && isInactiveTrainAtStation(trainDetails?.TrainData.VDDelayedTimetableIndex, ttRow.stationIndex, secondaryStationIndices);
    const departureExpectedHours = ttRow.scheduledDepartureObject.getUTCHours();
    const departureExpectedMinutes = ttRow.scheduledDepartureObject.getUTCMinutes();
    // console_log("Is next day ? " + ttRow.train_number, isNextDay);
    const isDepartureNextDay = dateNow.getUTCHours() >= 20 && departureExpectedHours < 12;  // TODO: less but still clunky
    const isDeparturePreviousDay = departureExpectedHours >= 20 && dateNow.getUTCHours() < 12; // TODO: less but still Clunky
    const expectedDeparture = getDateWithHourAndMinutes(dateNow, departureExpectedHours, departureExpectedMinutes, isDepartureNextDay, isDeparturePreviousDay);

    const arrivalTimeDelay = deviation.arrivalMinutes ?? 0;

    const distanceFromStation = trainDetails?.distanceFromStation;
    const trainMustDepart = !trainHasPassedStation && distanceFromStation != null && distanceFromStation < 1.5 && (subMinutes(expectedDeparture, 1) <= dateNow); // 1.5 for temporary zawierce freight fix
    const trainBadgeColor = configByType[ttRow.trainType]?.color ?? "purple";
    const secondaryPostData = ttRow?.secondaryPostsRows ?? [];

    return <Table.Row
        className={`
            dark:text-gray-100 light:text-gray-800 hover:bg-gray-200 dark:hover:bg-gray-600 
            ${isInactive ? 'opacity-50' : 'opacity-100'}
        `} data-timeoffset={Math.abs(getServerTimeNumber(dateNow) - getServerTimeNumber(ttRow.scheduledArrivalObject))}
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
            departureDeviationMinutes={deviation.departureMinutes}
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
})
