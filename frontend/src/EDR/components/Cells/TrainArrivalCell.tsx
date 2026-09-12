import React from "react";
import {Badge} from "flowbite-react";
import {tableCellCommonClassnames} from "../TrainRow";
import {DetailedTrain} from "../../functions/trainDetails";
import {useTranslation} from "react-i18next";
import { TimeTableRow } from "../../../customTypes/TimeTableRow";
import {TrainTimeDisplay} from "./TrainTimeDisplay";

type Props = {
    ttRow: TimeTableRow;
    trainDetails: DetailedTrain | undefined;
    trainHasPassedStation: boolean;
    thirdColRef: any;
    streamMode: boolean;
    arrivalTimeDelay: number;
    serverNow: Date;
    deviationMinutes?: number;
    estimated?: boolean;
    departureDeviationMinutes?: number;
}

export const TrainArrivalCell: React.FC<Props> = ({
    ttRow, trainDetails, trainHasPassedStation,
    thirdColRef, streamMode, arrivalTimeDelay, serverNow, deviationMinutes, estimated, departureDeviationMinutes
}) => {
    const {t} = useTranslation();
    const isDelayed = arrivalTimeDelay > 0 || (departureDeviationMinutes ?? 0) > 0;
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
                    !trainHasPassedStation && !isDelayed && arrivalTimeDelay < 0
                        ? <Badge className="animate-pulse" color="info">{t('EDR_TRAINROW_train_early')}</Badge>
                        : undefined
                }
            </div>
        </td>
    );
}
