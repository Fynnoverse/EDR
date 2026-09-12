import React from "react";
import {tableCellCommonClassnames} from "../TrainRow";
import {useTranslation} from "react-i18next";
import {edrImagesMap} from "../../../config";
import Tooltip from "rc-tooltip";
import { TimeTableRow } from "../../../customTypes/TimeTableRow";
import {DetailedTrain} from "../../functions/trainDetails";
import {StationConfig} from "../../../config/stations";
import {getStationDeviation} from "../../functions/stationDeviation";

type LiveStopProps = {trainDetails?: DetailedTrain; postCfg?: StationConfig; serverNow?: Date};

const PlatformData: React.FC<{ttRow: TimeTableRow} & LiveStopProps> = ({ttRow, trainDetails, postCfg, serverNow}) => {
    const {t} = useTranslation();
    const deviation = postCfg && serverNow ? getStationDeviation(ttRow, trainDetails, postCfg, serverNow) : undefined;
    const planned = Math.max(0, ttRow.plannedStop || 0);
    const arrivalMinutes = deviation?.arrivalMinutes;
    const deviationUnknown = deviation === undefined || arrivalMinutes === undefined;
    const effectiveDeviation = arrivalMinutes ?? 0;
    const late = effectiveDeviation > 0;
    const earlyMinutes = Math.max(0, -effectiveDeviation);
    const liveStop = planned > 0
        ? (late
            ? Math.max(1, planned - effectiveDeviation)
            : planned + earlyMinutes)
        : 0;
    const formatMinutes = (minutes: number) => Number(minutes.toFixed(2)).toString();
    const estimated = deviation?.arrivalEstimated || deviation?.departureEstimated;

    return ttRow.platform?.replace(" ", '') || Math.ceil(ttRow.plannedStop) !== 0 ? (
        <div className="flex flex-wrap items-center gap-y-2">
            {planned > 0 && <span className="flex items-center whitespace-nowrap">
                <Tooltip placement="top" overlay={<span>{t("EDR_TRAINROW_layover")}</span>}>
                    <img id="layover_test" className="h-[13px] lg:h-[20px] mx-2" src={edrImagesMap.LAYOVER} alt="layover" />
                </Tooltip>
                <span className="flex flex-col leading-tight">
                    <span className="font-bold whitespace-nowrap" data-testid="live-stop-duration" title={estimated ? "Schätzung aus dem letzten API-Datenstand" : "Berechnete Haltzeit"}>
                        {estimated && <span aria-label="geschätzt">≈ </span>}
                        {formatMinutes(liveStop)}&nbsp;{t("EDR_TRAINROW_layover_minutes")}
                    </span>
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400 whitespace-nowrap" data-testid="planned-stop-duration" title={t("EDR_TRAINROW_scheduled", {defaultValue: "Plan"})}>
                        {t("EDR_TRAINROW_scheduled", {defaultValue: "Plan"})} {formatMinutes(planned)}&nbsp;{t("EDR_TRAINROW_layover_minutes")}
                        <span className={deviationUnknown
                            ? "text-gray-500 dark:text-gray-400 ml-1 font-bold"
                            : effectiveDeviation > 0
                                ? "text-red-600 ml-1 font-bold"
                                : effectiveDeviation < 0
                                    ? "text-green-600 ml-1 font-bold"
                                    : "text-gray-500 dark:text-gray-400 ml-1 font-bold"}>
                            {deviationUnknown ? "—" : <>{effectiveDeviation > 0 ? "+" : effectiveDeviation < 0 ? "-" : "±"}{formatMinutes(Math.abs(effectiveDeviation))}</>}
                        </span>
                    </span>
                </span>
            </span>}
            <span className="flex items-center whitespace-nowrap">
                {ttRow.platform && <>
                    <Tooltip placement="top" overlay={<span>{t("EDR_TRAINROW_platform")}</span>}>
                        <img className="mx-2 pl-1 h-[13px] lg:h-[20px]" src={edrImagesMap.TRACK} alt="track"/>
                    </Tooltip>
                    {ttRow.platform}&nbsp;/&nbsp;{ttRow.track}</>
                }
            </span>
        </div>
    ) : null;
};

type Props = LiveStopProps & {
    ttRow: TimeTableRow;
    headerFifthColRef: any;
    secondaryPostData: TimeTableRow[];
    streamMode: boolean;
};

export const TrainPlatformCell: React.FC<Props> = ({headerFifthColRef, ttRow, secondaryPostData, streamMode, ...liveProps}) => {
    return <td className={tableCellCommonClassnames(streamMode)} ref={headerFifthColRef} width="170">
        <PlatformData ttRow={ttRow} {...liveProps} />
        { secondaryPostData.map((spd: TimeTableRow, i: number) => {
            if (spd.platform || spd.plannedStop > 0) {
                return (
                    <span key={spd.trainNoLocal + i}>
                        <hr />
                        <PlatformData ttRow={spd} {...liveProps} />
                    </span>
                )
            } else {
                return <span key={spd.trainNoLocal + i}></span>; 
            }
        })}
    </td>
};
