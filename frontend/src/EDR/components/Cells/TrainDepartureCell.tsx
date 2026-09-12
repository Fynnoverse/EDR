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
    notificationEnabled?: boolean;
    setNotificationEnabled?: React.Dispatch<React.SetStateAction<boolean>>;
    onAlarmTriggered?: () => void;
}
export const TrainDepartureCell: React.FC<Props> = ({
    trainMustDepart,
    playSoundNotification,
    ttRow,
    headerSixthhColRef,
    trainHasPassedStation,
    streamMode,
    isTrainOffline,
    deviationMinutes,
    serverNow,
    estimated,
    arrivalDeviationMinutes,
    standingDepartureTime,
    notificationEnabled: controlledNotificationEnabled,
    setNotificationEnabled: controlledSetNotificationEnabled,
    onAlarmTriggered
}) => {
    const {t} = useTranslation();
    const [localNotificationEnabled, setLocalNotificationEnabled] = React.useState(false);
    const notificationEnabled = controlledNotificationEnabled !== undefined ? controlledNotificationEnabled : localNotificationEnabled;
    const setNotificationEnabled = controlledSetNotificationEnabled ?? setLocalNotificationEnabled;

    React.useEffect(() => {
        if (trainMustDepart && notificationEnabled) {
            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                try {
                    navigator.vibrate([300, 150, 300, 150, 450]);
                } catch {
                    // ignore if vibration is unsupported or blocked
                }
            }

            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                    const title = t('EDR_NOTIFICATION_departure_title', {
                        train: ttRow.trainNoLocal,
                        defaultValue: `Abfahrtswarnung: Zug ${ttRow.trainNoLocal}`
                    });
                    const body = t('EDR_NOTIFICATION_departure_body', {
                        platform: ttRow.platform || '—',
                        defaultValue: `Gleis ${ttRow.platform || '—'} · Abfahrt in 1 Minute`
                    });
                    const notif = new Notification(title, {
                        body,
                        icon: '/favicon.ico',
                        tag: `departure-${ttRow.trainNoLocal}`
                    });
                    notif.onclick = () => {
                        window.focus();
                        notif.close();
                    };
                } catch {
                    // ignore if notification creation fails
                }
            }

            onAlarmTriggered?.();
            playSoundNotification(() => setNotificationEnabled(false));
        }
        // eslint-disable-next-line
    }, [notificationEnabled, trainMustDepart]);

    const handleToggleNotification = () => {
        if (!notificationEnabled) {
            if (
                typeof window !== 'undefined' &&
                'Notification' in window &&
                Notification.permission !== 'denied' &&
                Notification.permission !== 'granted'
            ) {
                try {
                    const req = Notification.requestPermission();
                    if (req && typeof (req as any).then === 'function') {
                        (req as any).catch(() => {});
                    }
                } catch {
                    // ignore if requestPermission fails
                }
            }
            setNotificationEnabled(true);
        } else {
            setNotificationEnabled(false);
        }
    };

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
                                        onClick={handleToggleNotification}
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
