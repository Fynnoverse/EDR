import React from "react";
import {Badge} from "flowbite-react";
import {tableCellCommonClassnames} from "../TrainRow";
import {DetailedTrain} from "../../functions/trainDetails";
import {useTranslation} from "react-i18next";
import { TimeTableRow } from "../../../customTypes/TimeTableRow";
import {TrainTimeDisplay} from "./TrainTimeDisplay";

type Props = {
    ttRow: TimeTableRow;
    trainDetails?: DetailedTrain;
    trainHasPassedStation: boolean;
    thirdColRef: any;
    streamMode: boolean;
    arrivalTimeDelay: number;
    serverNow: Date;
    deviationMinutes?: number;
    estimated?: boolean;
}

export const TrainArrivalCell: React.FC<Props> = ({
    ttRow, trainHasPassedStation,
    thirdColRef, streamMode, arrivalTimeDelay, serverNow, deviationMinutes, estimated
}) => {
    const {t} = useTranslation();
    const effectiveDeviation = deviationMinutes ?? arrivalTimeDelay;
    const isDelayed = effectiveDeviation > 0;
    const isEarly = effectiveDeviation < 0;
    return (
        <td className={tableCellCommonClassnames(streamMode)} width="150" ref={thirdColRef}>
            <div className="flex items-center justify-center h-full">
                <TrainTimeDisplay scheduledTime={ttRow.scheduledArrivalObject} deviationMinutes={deviationMinutes} serverNow={serverNow} estimated={estimated} />
            </div>
            <div className="flex justify-center">
                {
                    !trainHasPassedStation && isDelayed
                        ? <Badge className="animate-pulse duration-1000"
                                 color="failure">{t('EDR_TRAINROW_train_delayed')}</Badge>
                        : undefined
                }
                {
                    !trainHasPassedStation && isEarly
                        ? <Badge className="animate-pulse" color="info">{t('EDR_TRAINROW_train_early')}</Badge>
                        : undefined
                }
            </div>
        </td>
    );
}
