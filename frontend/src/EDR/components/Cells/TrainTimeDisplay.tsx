import React from "react";
import {useTranslation} from "react-i18next";
import {formatServerTime, isNextServerDay} from "../../../utils/serverTime";
import {getPredictedTrainTime} from "../../functions/trainTimes";

type Props = {
    scheduledTime: Date;
    deviationMinutes?: number;
    serverNow: Date;
};

/** Shows the live-adjusted time prominently and retains the scheduled time as context. */
export const TrainTimeDisplay: React.FC<Props> = ({scheduledTime, deviationMinutes, serverNow}) => {
    const {t} = useTranslation();
    const predictedTime = getPredictedTrainTime(scheduledTime, deviationMinutes);
    const hasDeviation = deviationMinutes !== undefined && deviationMinutes !== 0;

    return <div className="flex flex-col leading-tight">
        <div className="font-bold whitespace-nowrap">
            {formatServerTime(predictedTime)}
            {isNextServerDay(predictedTime, serverNow) && <sup>+1</sup>}
            {hasDeviation && <span className={deviationMinutes > 0 ? "text-red-600 ml-1" : "text-green-600 ml-1"}>
                {deviationMinutes > 0 ? "+" : "-"}{Math.abs(deviationMinutes)}
            </span>}
        </div>
        {hasDeviation && <div className="text-xs font-normal text-gray-500 dark:text-gray-400 whitespace-nowrap" title={t("EDR_TRAINROW_scheduled") ?? ""}>
            {t("EDR_TRAINROW_scheduled")} {formatServerTime(scheduledTime)}
            {isNextServerDay(scheduledTime, serverNow) && <sup>+1</sup>}
        </div>}
    </div>;
};
