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

    return <>
        <DirectionIndicator pointId={ttRow.pointId} adjacentPostId={ttRow.toPostId} relation="to" />
        <span>{ttRow.toPost}</span>
        <span className="inline-flex items-center whitespace-nowrap"><img className="inline-block pl-1 pb-1" src={edrImagesMap.RIGHT_ARROW} height={18} width={18} alt="r_arrow"/>️
        <b><span className="hidden lg:inline">&nbsp;{t("EDR_TRAINROW_line")}:&nbsp;</span>{trainDetails?.timetable?.[trainDetails?.timetable?.findIndex(entry => entry.pointId === ttRow.pointId) + 1]?.line ?? ttRow.line}</b></span>
    </>
}
