import React from "react";
import {useTranslation} from "react-i18next";
import {formatServerTime, isNextServerDay} from "../../../utils/serverTime";
import {getPredictedTrainTime} from "../../functions/trainTimes";

type Props = {
    scheduledTime: Date;
    deviationMinutes?: number;
    serverNow: Date;
    estimated?: boolean;
};

/** Shows the live-adjusted time prominently and retains the scheduled time as context. */
export const TrainTimeDisplay: React.FC<Props> = ({scheduledTime, deviationMinutes, serverNow, estimated}) => {
    const {t} = useTranslation();
    const predictedTime = getPredictedTrainTime(scheduledTime, deviationMinutes);
    const effectiveDeviation = deviationMinutes ?? 0;
    const scheduledLabel = t("EDR_TRAINROW_scheduled", {defaultValue: "Plan"});

    return <div className="flex flex-col leading-tight">
        <div className="font-bold whitespace-nowrap" data-testid="predicted-train-time" title={estimated ? "Schätzung aus dem letzten API-Datenstand" : undefined}>
            {estimated && <span aria-label="geschätzt">≈ </span>}
            {formatServerTime(predictedTime)}
            {isNextServerDay(predictedTime, serverNow) && <sup>+1</sup>}
        </div>
        <div className="text-xs font-normal text-gray-500 dark:text-gray-400 whitespace-nowrap" title={scheduledLabel} data-testid="scheduled-train-time">
            {scheduledLabel} {formatServerTime(scheduledTime)}
            {isNextServerDay(scheduledTime, serverNow) && <sup>+1</sup>}
            <span className={effectiveDeviation > 0
                ? "text-red-600 ml-1 font-bold"
                : effectiveDeviation < 0
                    ? "text-green-600 ml-1 font-bold"
                    : "text-gray-500 dark:text-gray-400 ml-1 font-bold"}>
                {deviationMinutes === undefined ? "—" : <>{effectiveDeviation > 0 ? "+" : effectiveDeviation < 0 ? "-" : "±"}{Math.abs(effectiveDeviation)}</>}
            </span>
        </div>
    </div>;
};
