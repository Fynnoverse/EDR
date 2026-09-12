import React from "react";
import {Button, DarkThemeToggle, TextInput} from "flowbite-react";
import {useTranslation} from "react-i18next";
import {useSnackbar} from "notistack";
import {DateTimeDisplay} from "./DateTimeDisplay";
import {Bounds} from "./Table";

import { StationConfig } from "../../config/stations";
import {Link} from "react-router-dom";
import _minBy from "lodash/fp/minBy";
import {ColumnFilterModal} from "./CustomFilterModal";
import {FilterConfig, presetFilterConfig} from "../index";
import {ArrivalSortMode, SortDirection, TrainSortKey} from "../functions/trainSorting";
import {requestPushNotificationPermission, sendPushNotification} from "../functions/pushNotification";

type Props = {
    serverTzOffset: number;
    serverTime: number | undefined;
    serverCode: string;
    postCfg: StationConfig;

    bounds: Bounds;
    timetableLength: number;

    filter: string;
    setFilter: (value: string) => void;
    streamMode: boolean;
    setStreamMode: (v: boolean) => void;
    showDirectionText: boolean;
    setShowDirectionText: (value: boolean) => void;
    autoAlarmVisible?: boolean;
    setAutoAlarmVisible?: (value: boolean) => void;
    filterConfig: FilterConfig;
    setFilterConfig: (fc: FilterConfig) => void;
    sortKey: TrainSortKey | undefined;
    sortDirection: SortDirection;
    onSort: (key: TrainSortKey) => void;
    onResetSort: () => void;
    arrivalSortMode: ArrivalSortMode;
    setArrivalSortMode: (mode: ArrivalSortMode) => void;
    playSoundNotification?: (callBack: () => void) => void;
}


const scrollToNearestTrain = (targetLn: number) => {
    let interval = setTimeout(() => {
        const allTrainRows = [...Array.from(document.querySelectorAll('[data-timeoffset]').values())];
        // console_log(allTrainRows.length);
        if (allTrainRows.length === 0 && allTrainRows.length === targetLn)
            return;
        clearInterval(interval);
        const el = _minBy((el) => {
                return el.getAttribute("data-timeoffset") ? Number.parseInt(el.getAttribute("data-timeoffset")!) : 999999;
            }
            , allTrainRows);

        if (el) {
            el.scrollIntoView({
                block: "center"
            })
        }
    }, 1000);
}

const getDisplayMode = (filterConfig: FilterConfig) => {
    const _filterConfig = JSON.stringify(filterConfig);
    if (_filterConfig === JSON.stringify(presetFilterConfig.default)) return "default";
    if (_filterConfig === JSON.stringify(presetFilterConfig.near)) return "near";
    if (_filterConfig === JSON.stringify(presetFilterConfig.approaching)) return "approaching";
    return "custom";
}

export const Header: React.FC<Props> = ({
    serverTzOffset, serverCode, postCfg, timetableLength, serverTime,
    filter, setFilter, streamMode, setStreamMode, filterConfig, setFilterConfig,
    sortKey, onResetSort, showDirectionText, setShowDirectionText,
    autoAlarmVisible, setAutoAlarmVisible,
    arrivalSortMode, setArrivalSortMode,
    playSoundNotification
}) => {
    const {t} = useTranslation();
    const {enqueueSnackbar} = useSnackbar();
    const [configModalOpen, setConfigModaOpen] = React.useState(false);

    const displayMode = getDisplayMode(filterConfig);

    const handleAutoAlarmChange = (enabled: boolean) => {
        setAutoAlarmVisible?.(enabled);
        if (enabled) {
            void requestPushNotificationPermission();
        }
    };

    const handleTestNotification = () => {
        if (playSoundNotification) {
            playSoundNotification(() => {});
        }

        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
                navigator.vibrate([300, 150, 300, 150, 450]);
            } catch {
                // ignore
            }
        }

        try {
            enqueueSnackbar(t('EDR_NOTIFICATION_test_body', {
                defaultValue: 'Benachrichtigung, Ton und Vibration funktionieren einwandfrei.'
            }), {
                variant: 'info',
                autoHideDuration: 4000,
                preventDuplicate: true,
            });
        } catch {
            // ignore
        }

        const title = t('EDR_NOTIFICATION_test_title', {
            defaultValue: 'Testbenachrichtigung'
        });
        const body = t('EDR_NOTIFICATION_test_body', {
            defaultValue: 'Benachrichtigung, Ton und Vibration funktionieren einwandfrei.'
        });

        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                void sendPushNotification(title, {
                    body,
                    icon: '/favicon.ico',
                    tag: 'test-notification',
                    renotify: true,
                });
            } else if (Notification.permission !== 'denied') {
                void requestPushNotificationPermission().then((permission) => {
                    if (permission === 'granted') {
                        void sendPushNotification(title, {
                            body,
                            icon: '/favicon.ico',
                            tag: 'test-notification',
                            renotify: true,
                        });
                    }
                });
            }
        }
    };

    return (
        <div className="w-full bg-white text-gray-800 shadow-md dark:bg-slate-800 dark:text-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                <div className="flex flex-col">
                    <span>{postCfg.srName}</span>
                    <Link to={`/${serverCode}`} className="underline flex">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />
                        </svg>
                        {!streamMode ? t('EDR_UI_back') : ''}
                    </Link>
                </div>
                <DateTimeDisplay serverTzOffset={serverTzOffset} serverCode={serverCode} serverTime={serverTime}/>
                <div className="flex flex-wrap items-center gap-2">
                    <label className="mr-3 inline-flex items-center gap-1 text-xs cursor-pointer">
                        <input type="checkbox" checked={showDirectionText} onChange={event => setShowDirectionText(event.target.checked)} />
                        {t("EDR_UI_direction_text", {defaultValue: "Text an Pfeilen"})}
                    </label>
                    <label className="mr-3 inline-flex items-center gap-1 text-xs cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoAlarmVisible ?? false}
                            onChange={event => handleAutoAlarmChange(event.target.checked)}
                        />
                        {t("EDR_UI_auto_alarm_visible", {defaultValue: "Alarm für alle sichtbaren Züge"})}
                    </label>
                    <Button size="xs" className="mr-2" onClick={() => setStreamMode(!streamMode)}>{t("EDR_UI_stream_mode")}</Button>
                    <Button size="xs" color="gray" className="mr-2" onClick={handleTestNotification}>{t("EDR_UI_test_notification")}</Button>
                    <>{t('EDR_UI_dark_light_mode_switch') ?? ''} :&nbsp;</>
                    <DarkThemeToggle />
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full px-3 mt-2">
                <label className="mb-2 flex items-center gap-2 text-xs">
                    Standardsortierung
                    <select className="rounded border-gray-300 text-sm dark:bg-slate-700" value={arrivalSortMode}
                        onChange={event => setArrivalSortMode(event.target.value as ArrivalSortMode)}>
                        <option value="predicted">Berechnete Ankunft</option>
                        <option value="scheduled">Geplante Ankunft</option>
                    </select>
                </label>
                <TextInput sizing={streamMode ? "sm" : "md"} id="trainNumberFilter" className="mb-2 min-w-[100px] grow" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('EDR_UI_train_number') ?? ''}/>
                <div className="flex flex-wrap gap-1 mb-2">
                    {sortKey && <Button
                        size={streamMode ? "xs" : "md"}
                        className="shrink-0 mr-2"
                        color="gray"
                        onClick={onResetSort}
                    >
                        {t('EDR_UI_reset_sort') ?? ''}
                    </Button>}
                    <Button size={streamMode ? "xs" : "md"} className="shrink-0" color={displayMode !== "default" ? "default" : undefined}
                            onClick={() => { setFilterConfig(presetFilterConfig.default); scrollToNearestTrain(timetableLength); }}>
                        {t('EDR_UI_filter_train_all') ?? ''}
                    </Button>
                    <Button size={streamMode ? "xs" : "md"} className="shrink-0" color={displayMode !== "near" ? "default" : undefined}
                            onClick={() => setFilterConfig(presetFilterConfig.near)}>
                        {t('EDR_UI_filter_train_online') ?? ''}
                    </Button>
                    <Button size={streamMode ? "xs" : "md"} className="shrink-0" color={displayMode !== "approaching" ? "default" : undefined}
                            onClick={() => setFilterConfig(presetFilterConfig.approaching)}>
                        {t('EDR_UI_filter_train_approaching') ?? ''}
                    </Button>
                    <Button size={streamMode ? "xs" : "md"} className="shrink-0" color={displayMode !== "custom" ? "default" : undefined}
                            onClick={() => setConfigModaOpen(true)}>
                        {t('EDR_UI_filter_custom') ?? ''}
                    </Button>
                </div>
            </div>
            <ColumnFilterModal isOpen={configModalOpen} onClose={() => setConfigModaOpen(false)} setFilterConfig={setFilterConfig} filterConfig={filterConfig}/>
        </div>
    )
}
