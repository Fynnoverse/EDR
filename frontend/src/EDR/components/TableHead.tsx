import React from "react";
import {useTranslation} from "react-i18next";
import classNames from "classnames";
import {Bounds} from "./Table";
import {SortDirection, TrainSortKey} from "../functions/trainSorting";

const tableHeadCommonClassName = "p-4 max-h-[56px] truncate"
type Props = Bounds & {
    sortKey: TrainSortKey | undefined;
    sortDirection: SortDirection;
    onSort: (key: TrainSortKey) => void;
};

const SortableLabel: React.FC<{column: TrainSortKey; activeColumn?: TrainSortKey; direction: SortDirection; onSort: (key: TrainSortKey) => void; children: React.ReactNode}> = ({
    column, activeColumn, direction, onSort, children
}) => <button
    type="button"
    className="font-bold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
    onClick={() => onSort(column)}
    aria-pressed={activeColumn === column}
>
    {children} <span aria-hidden="true">{activeColumn === column ? (direction === "ascending" ? "▲" : "▼") : "↕"}</span>
</button>;

export const TableHead: React.FC<Props> = ({firstColBounds, secondColBounds, thirdColBounds, fourthColBounds, fifthColBounds, sixthColBounds, seventhColBounds, showStopColumn, sortKey, sortDirection, onSort}) => {
    const {t} = useTranslation();
    if (!firstColBounds) return null;
    // console_log("Fourth bou,ds", fourthColBounds)
    return <div className="flex items-center font-bold max-w-screen">
        <div className={tableHeadCommonClassName} style={{minWidth: firstColBounds.width}}>
            <SortableLabel column="trainNumber" activeColumn={sortKey} direction={sortDirection} onSort={onSort}>{t('EDR_TRAINHEADER_train_number')}</SortableLabel>
        </div>
        <div className={classNames(tableHeadCommonClassName, 'text-center')}  style={{minWidth: secondColBounds.width}}>
            <SortableLabel column="trainType" activeColumn={sortKey} direction={sortDirection} onSort={onSort}>{t('EDR_TRAINHEADER_train_type')}</SortableLabel>
        </div>
        <div className={tableHeadCommonClassName} style={{width: thirdColBounds.width}}>
            <SortableLabel column="arrival" activeColumn={sortKey} direction={sortDirection} onSort={onSort}>{t('EDR_TRAINHEADER_train_arrival_time')}</SortableLabel>
        </div>
        <div className={tableHeadCommonClassName} style={{width: fourthColBounds.width}}>
            <SortableLabel column="from" activeColumn={sortKey} direction={sortDirection} onSort={onSort}>{t('EDR_TRAINHEADER_train_from')}</SortableLabel>
        </div>
        <div className={tableHeadCommonClassName} style={{width: fifthColBounds.width}}>
        {showStopColumn && <SortableLabel column="stop" activeColumn={sortKey} direction={sortDirection} onSort={onSort}>{t('EDR_TRAINHEADER_train_stop')}</SortableLabel>}
        </div>
        <div className={tableHeadCommonClassName} style={{width: sixthColBounds.width}}>
            <SortableLabel column="departure" activeColumn={sortKey} direction={sortDirection} onSort={onSort}>{t('EDR_TRAINHEADER_train_departure_time')}</SortableLabel>
        </div>
        <div className={tableHeadCommonClassName} style={{width: seventhColBounds.width}}>
            <SortableLabel column="to" activeColumn={sortKey} direction={sortDirection} onSort={onSort}>{t('EDR_TRAINHEADER_train_to')}</SortableLabel>
        </div>
    </div>;
}
