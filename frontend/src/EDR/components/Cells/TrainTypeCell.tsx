import React from "react";
import {tableCellCommonClassnames} from "../TrainRow";
import {DetailedTrain} from "../../functions/trainDetails";
import { TimeTableRow } from "../../../customTypes/TimeTableRow";
import {TrainCategoryBadge} from "./TrainCategoryBadge";

type Props = {
    secondColRef: any;
    trainBadgeColor: string;
    ttRow: TimeTableRow;
    trainDetails: DetailedTrain | undefined;
    streamMode: boolean;
}
export const TrainTypeCell: React.FC<Props> = ({secondColRef, trainBadgeColor, ttRow, trainDetails, streamMode}) =>
    <td className={tableCellCommonClassnames(streamMode)}  ref={secondColRef} width="135">
        <div className="flex flex-col items-center justify-center gap-1">
            <TrainCategoryBadge trainType={ttRow.trainType} vehicles={trainDetails?.Vehicles} badgeColor={trainBadgeColor} />
            <span className="whitespace-nowrap">{Math.floor(trainDetails?.TrainData?.Velocity ?? 0)} km/h</span>
        </div>
    </td>;
