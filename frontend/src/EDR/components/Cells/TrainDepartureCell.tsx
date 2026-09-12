import React from "react";
import {Badge, Button} from "flowbite-react";
import {edrImagesMap} from "../../../config";
import {tableCellCommonClassnames} from "../TrainRow";
import {useTranslation} from "react-i18next";
import Tooltip from "rc-tooltip";
import { TimeTableRow } from "../../../customTypes/TimeTableRow";
import {TrainTimeDisplay} from "./TrainTimeDisplay";
import {getDisplayedDepartureTime} from "../../functions/trainTimes";

type Props = {
    headerSixthhColRef: any;
    ttRow: TimeTableRow;
    trainHasPassedStation: boolean;
    trainMustDepart: boolean;
    playSoundNotification: (callBack: () => void) => void
    streamMode: boolean;
    isTrainOffline: boolean;
    deviationMinutes?: number;
    serverNow: Date;
    estimated?: boolean;
    arrivalDeviationMinutes?: number;
    standingDepartureTime?: Date;
}
export const TrainDepartureCell: React.FC<Props> = ({trainMustDepart,playSoundNotification, ttRow, headerSixthhColRef, trainHasPassedStation, streamMode, isTrainOffline, deviationMinutes, serverNow, estimated, arrivalDeviationMinutes, standingDepartureTime}) => {
    const {t} = useTranslation();
    const [notificationEnabled, setNotificationEnabled] = React.useState(false);

    React.useEffect(() => {
        if (trainMustDepart && notificationEnabled)
            playSoundNotification(() => setNotificationEnabled(false));
        // eslint-disable-next-line
    }, [notificationEnabled, trainMustDepart]);

    return (
        <td className={tableCellCommonClassnames(streamMode)} width="190" style={{minWidth: 190}} ref={headerSixthhColRef}>
            <div className="flex items-center justify-start gap-3 h-full">
                <TrainTimeDisplay scheduledTime={ttRow.scheduledDepartureObject} deviationMinutes={deviationMinutes} serverNow={serverNow} estimated={estimated}
                    predictedTime={getDisplayedDepartureTime(ttRow.scheduledArrivalObject, ttRow.scheduledDepartureObject,
                        deviationMinutes, arrivalDeviationMinutes, estimated, standingDepartureTime, ttRow.plannedStop > 0)} />
                <div className="hidden lg:flex items-center justify-center shrink-0 min-w-[32px]">
                    {
                        !trainHasPassedStation && !isTrainOffline && (trainMustDepart ?
                                <Badge className="animate-pulse duration-1000" color="warning">{t('EDR_TRAINROW_train_departing')}</Badge>
                                :
                            <Tooltip placement="top" overlay={<span>{t("EDR_TRAINROW_notify")}</span>}>
                                    <Button
                                        outline
                                        color="light"
                                        className="w-8 h-8 min-w-8 min-h-8 p-0 flex shrink-0 items-center justify-center overflow-visible dark:bg-slate-200"
                                        pill
                                        size="xs"
                                        aria-label={t("EDR_TRAINROW_notify") ?? 'notify'}
                                        onClick={() => setNotificationEnabled(!notificationEnabled)}
                                    >
                                        <img
                                            className="block w-5 h-5 min-w-5 min-h-5 max-w-none object-contain"
                                            src={notificationEnabled ? edrImagesMap.CHECK : edrImagesMap.BELL}
                                            alt=""
                                            aria-hidden="true"
                                        />
                                    </Button>
                            </Tooltip>
                        )
                    }
                </div>
            </div>
        </td>
    );
}
