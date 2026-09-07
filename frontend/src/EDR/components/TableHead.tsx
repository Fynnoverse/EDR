import React from "react";
import {useTranslation} from "react-i18next";
import classNames from "classnames";
import {Bounds} from "./Table";
import {SortDirection, TrainSortKey} from "../functions/trainSorting";

const tableHeadCommonClassName = "px-3 py-3 text-left bg-white text-gray-800 dark:bg-slate-800 dark:text-gray-100"
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

export const TableHead: React.FC<Props> = ({firstColBounds, showStopColumn, sortKey, sortDirection, onSort}) => {
    const {t} = useTranslation();
    if (!firstColBounds) return null;
    // console_log("Fourth bou,ds", fourthColBounds)
    return <thead><tr className="font-bold">
        <th scope="col" className={tableHeadCommonClassName}>
            <SortableLabel column="trainNumber" activeColumn={sortKey} direction={sortDirection} onSort={onSort}>{t('EDR_TRAINHEADER_train_number')}</SortableLabel>
        </th>
        <th scope="col" className={classNames(tableHeadCommonClassName, 'text-center')} >
            <SortableLabel column="trainType" activeColumn={sortKey} direction={sortDirection} onSort={onSort}>{t('EDR_TRAINHEADER_train_type')}</SortableLabel>
        </th>
        <th scope="col" className={tableHeadCommonClassName}>
            <SortableLabel column="arrival" activeColumn={sortKey} direction={sortDirection} onSort={onSort}>{t('EDR_TRAINHEADER_train_arrival_time')}</SortableLabel>
        </th>
        <th scope="col" className={tableHeadCommonClassName}>
            <SortableLabel column="from" activeColumn={sortKey} direction={sortDirection} onSort={onSort}>{t('EDR_TRAINHEADER_train_from')}</SortableLabel>
        </th>
        <th scope="col" className={tableHeadCommonClassName}>
        {showStopColumn && <SortableLabel column="stop" activeColumn={sortKey} direction={sortDirection} onSort={onSort}>{t('EDR_TRAINHEADER_train_stop')}</SortableLabel>}
        </th>
        <th scope="col" className={tableHeadCommonClassName}>
            <SortableLabel column="departure" activeColumn={sortKey} direction={sortDirection} onSort={onSort}>{t('EDR_TRAINHEADER_train_departure_time')}</SortableLabel>
        </th>
        <th scope="col" className={tableHeadCommonClassName}>
            <SortableLabel column="to" activeColumn={sortKey} direction={sortDirection} onSort={onSort}>{t('EDR_TRAINHEADER_train_to')}</SortableLabel>
        </th>
    </tr></thead>;
}
