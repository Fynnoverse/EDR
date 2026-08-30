import React from "react";
import {Button, Checkbox, Modal} from "flowbite-react";
import {FilterConfig, presetFilterConfig} from "../index";
import { useTranslation } from "react-i18next";
import {
    MAX_DEPARTED_TRAIN_HIDE_DISTANCE_KM,
    MIN_DEPARTED_TRAIN_HIDE_DISTANCE_KM,
} from "../functions/trainFilters";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    filterConfig: FilterConfig;
    setFilterConfig: (fc: FilterConfig) => void;
}
export const ColumnFilterModal: React.FC<Props> = ({filterConfig, setFilterConfig, isOpen, onClose}) => {
    const [pendingFilterConfig, setPendingFilterConfig] = React.useState(filterConfig);
    const { t } = useTranslation()

    React.useEffect(() => {
        if (isOpen) setPendingFilterConfig(filterConfig);
    }, [filterConfig, isOpen]);

    const applyPartialUpdateToFilterConfig = (field: string, value: string | number | boolean | undefined) => {
        setPendingFilterConfig({
            ...pendingFilterConfig,
            [field]: value
        });
    }

    return (
        <React.Fragment>
        <Modal show={isOpen} style={{zIndex: 9999999}} onClose={onClose}>
            <Modal.Header>
                <span className="font-bold">{t('EDR_UI_filter_customisation')}</span>
            </Modal.Header>
            <Modal.Body>
                <div className="text-black dark:text-white">
                    <div className="m1 text-primary">{t('EDR_UI_filter_hide_offline')}  <Checkbox checked={pendingFilterConfig.onlyOnTrack} onChange={() => applyPartialUpdateToFilterConfig('onlyOnTrack', !pendingFilterConfig.onlyOnTrack)}/></div>
                    <div className="m1">{t('EDR_UI_filter_hide_left')}  <Checkbox checked={pendingFilterConfig.onlyApproaching} onChange={() => applyPartialUpdateToFilterConfig('onlyApproaching', !pendingFilterConfig.onlyApproaching)}/></div>
                    <div className={`mb-4 mt-2 ${pendingFilterConfig.onlyApproaching ? '' : 'opacity-50'}`}>
                        <div className="mb-1 flex justify-between text-sm">
                            <span>{MIN_DEPARTED_TRAIN_HIDE_DISTANCE_KM} km</span>
                            <strong>{pendingFilterConfig.departedDistance} km</strong>
                            <span>{MAX_DEPARTED_TRAIN_HIDE_DISTANCE_KM} km</span>
                        </div>
                        <input
                            id="departedTrainDistance"
                            type="range"
                            min={MIN_DEPARTED_TRAIN_HIDE_DISTANCE_KM}
                            max={MAX_DEPARTED_TRAIN_HIDE_DISTANCE_KM}
                            step={1}
                            value={pendingFilterConfig.departedDistance}
                            disabled={!pendingFilterConfig.onlyApproaching}
                            aria-label={t('EDR_UI_filter_hide_left')}
                            onChange={(event) => applyPartialUpdateToFilterConfig('departedDistance', Number(event.target.value))}
                            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600 disabled:cursor-not-allowed dark:bg-gray-700"
                        />
                    </div>
                    <div className="m1">{t('EDR_UI_filter_radius')}</div>
                    <div className="flex mb-1 mt-2">
                        <Button className="mr-2" color={pendingFilterConfig.maxRange === 10 ? undefined : 'gray'} onClick={() => applyPartialUpdateToFilterConfig('maxRange', 10)}>10</Button>
                        <Button className="mr-2" color={pendingFilterConfig.maxRange === 25 ? undefined : 'gray'}  onClick={() => applyPartialUpdateToFilterConfig('maxRange', 25)}>25</Button>
                        <Button className="mr-2" color={pendingFilterConfig.maxRange === 50 ? undefined : 'gray'}  onClick={() => applyPartialUpdateToFilterConfig('maxRange', 50)}>50</Button>
                        <Button className="mr-2" color={pendingFilterConfig.maxRange === 100 ? undefined : 'gray'} onClick={() => applyPartialUpdateToFilterConfig('maxRange', 100)}>100</Button>
                        <Button className="mr-2" color={pendingFilterConfig.maxRange === undefined ? undefined : 'gray'} onClick={() => applyPartialUpdateToFilterConfig('maxRange', undefined)}>No Limit</Button>
                    </div>
                    <div>Filter by scheduled time</div>
                    <div className="flex mb-1 mt-2">
                        <Button className="mr-2" color={pendingFilterConfig.maxTime === 30 ? undefined : 'gray'} onClick={() => applyPartialUpdateToFilterConfig('maxTime', 30)}>30mn</Button>
                        <Button className="mr-2" color={pendingFilterConfig.maxTime === 60 ? undefined : 'gray'} onClick={() => applyPartialUpdateToFilterConfig('maxTime', 60)}>1h</Button>
                        <Button className="mr-2" color={pendingFilterConfig.maxTime === 120 ? undefined : 'gray'} onClick={() => applyPartialUpdateToFilterConfig('maxTime', 120)}>2h</Button>
                        <Button className="mr-2" color={pendingFilterConfig.maxTime === undefined ? undefined : 'gray'} onClick={() => applyPartialUpdateToFilterConfig('maxTime', undefined)}>No Limit</Button>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <div className="w-full flex justify-between">
                <Button color="gray" onClick={() => {setFilterConfig(presetFilterConfig.default); onClose();}}>{t('EDR_UI_reset_button')}</Button>
                <Button onClick={() => setFilterConfig(pendingFilterConfig)}>{t('EDR_UI_save_button')}</Button>
                </div>
            </Modal.Footer>
        </Modal>
        </React.Fragment>
    )
}
