import React from "react";
import {Badge, Button} from "flowbite-react";
import {edrImagesMap} from "../../../config";
import {tableCellCommonClassnames} from "../TrainRow";
import {useTranslation} from "react-i18next";
import Tooltip from "rc-tooltip";
import { useSnackbar } from "notistack";
import { TimeTableRow } from "../../../customTypes/TimeTableRow";
import {TrainTimeDisplay} from "./TrainTimeDisplay";
import {getDisplayedDepartureTime} from "../../functions/trainTimes";
import {formatServerTime} from "../../../utils/serverTime";
import {requestPushNotificationPermission, sendPushNotification} from "../../functions/pushNotification";

type Props = {
    headerSixthhColRef: any;
    ttRow: TimeTableRow;
    trainHasPassedStation: boolean;
    trainMustDepart: boolean;
    playSoundNotification: (callBack: () => void) => void
    streamMode: boolean;
    isTrainOffline?: boolean;
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
    const {enqueueSnackbar} = useSnackbar();
    const [localNotificationEnabled, setLocalNotificationEnabled] = React.useState(false);
    const notificationEnabled = controlledNotificationEnabled !== undefined ? controlledNotificationEnabled : localNotificationEnabled;
    const setNotificationEnabled = controlledSetNotificationEnabled ?? setLocalNotificationEnabled;

    React.useEffect(() => {
        if (trainHasPassedStation && notificationEnabled) {
            setNotificationEnabled(false);
        }
    }, [trainHasPassedStation, notificationEnabled, setNotificationEnabled]);

    React.useEffect(() => {
        if (trainMustDepart && notificationEnabled) {
            const displayedDeparture = getDisplayedDepartureTime(
                ttRow.scheduledArrivalObject,
                ttRow.scheduledDepartureObject,
                deviationMinutes,
                arrivalDeviationMinutes,
                estimated,
                standingDepartureTime,
                ttRow.plannedStop > 0
            );
            const departureTimeStr = formatServerTime(displayedDeparture);

            const line = ttRow.toLine ?? ttRow.line;
            const lineStr = line !== undefined && line !== null ? String(line) : '—';

            if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                try {
                    navigator.vibrate([300, 150, 300, 150, 450]);
                } catch {
                    // ignore if vibration is unsupported or blocked
                }
            }

            const title = t('EDR_NOTIFICATION_departure_title', {
                train: ttRow.trainNoLocal,
                line: lineStr,
                defaultValue: `Abfahrtswarnung: Zug ${ttRow.trainNoLocal} (Linie ${lineStr})`
            });
            const body = ttRow.endStation
                ? t('EDR_NOTIFICATION_departure_body_with_dest', {
                    train: ttRow.trainNoLocal,
                    line: lineStr,
                    time: departureTimeStr,
                    destination: ttRow.endStation,
                    platform: ttRow.platform || '—',
                    defaultValue: `Zug ${ttRow.trainNoLocal} (Linie ${lineStr}) soll um ${departureTimeStr} abfahren nach ${ttRow.endStation}`
                })
                : t('EDR_NOTIFICATION_departure_body', {
                    train: ttRow.trainNoLocal,
                    line: lineStr,
                    time: departureTimeStr,
                    platform: ttRow.platform || '—',
                    defaultValue: `Zug ${ttRow.trainNoLocal} (Linie ${lineStr}) soll um ${departureTimeStr} abfahren`
                });

            try {
                enqueueSnackbar(body, {
                    variant: 'warning',
                    autoHideDuration: 6000,
                    preventDuplicate: true,
                });
            } catch {
                // ignore if toast/snackbar fails
            }

            void sendPushNotification(title, {
                body,
                icon: '/favicon.ico',
                tag: `departure-${ttRow.trainNoLocal}`,
                renotify: true,
            });

            onAlarmTriggered?.();
            playSoundNotification(() => setNotificationEnabled(false));
        }
        // eslint-disable-next-line
    }, [notificationEnabled, trainMustDepart]);

    const handleToggleNotification = () => {
        if (!notificationEnabled) {
            void requestPushNotificationPermission();
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
                <div className="flex items-center justify-center shrink-0 min-w-[32px]">
                    {
                        !trainHasPassedStation && (trainMustDepart ?
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
