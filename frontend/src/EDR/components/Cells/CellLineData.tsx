import React from "react";
import {useTranslation} from "react-i18next";
import {edrImagesMap} from "../../../config";
import { TimeTableRow } from "../../../customTypes/TimeTableRow";
import { DetailedTrain } from "../../functions/trainDetails";
import {DirectionIndicator} from "./DirectionIndicator";

type Props = {
    ttRow: TimeTableRow;
    trainDetails: DetailedTrain | undefined;
}
export const CellLineData: React.FC<Props> = ({ttRow, trainDetails}) => {
    const {t} = useTranslation();
    const timetable = trainDetails?.timetable;
    const pointIndex = timetable?.findIndex(entry => entry.pointId === ttRow.pointId) ?? -1;
    const outgoingLine = ttRow.toLine ?? (pointIndex >= 0 ? timetable?.[pointIndex + 1]?.line : undefined);

    return <>
        <DirectionIndicator pointId={ttRow.pointId} adjacentPostId={ttRow.toPostId} relation="to" line={outgoingLine} />
        <span>{ttRow.toPost}</span>
        <span className="inline-flex items-center whitespace-nowrap"><img className="inline-block pl-1 pb-1" src={edrImagesMap.RIGHT_ARROW} height={18} width={18} alt="r_arrow"/>️
        <b><span className="hidden lg:inline">&nbsp;{t("EDR_TRAINROW_line")}:&nbsp;</span>{outgoingLine ?? ttRow.line}</b></span>
    </>
}
