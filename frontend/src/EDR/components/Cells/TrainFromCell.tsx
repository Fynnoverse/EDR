import React from "react";
import {tableCellCommonClassnames} from "../TrainRow";
import { TimeTableRow } from "../../../customTypes/TimeTableRow";
import {DirectionIndicator} from "./DirectionIndicator";

type Props = {
    headerFourthColRef: any;
    ttRow: TimeTableRow;
    secondaryPostData: TimeTableRow[];
    streamMode: boolean;
}
export const TrainFromCell: React.FC<Props> = ({headerFourthColRef, ttRow, secondaryPostData, streamMode}) => {
    const visibleRows = [ttRow, ...secondaryPostData].filter((row, index, rows) =>
        row.fromPost && rows.findIndex(candidate =>
            (candidate.fromPostId ?? candidate.fromPost) === (row.fromPostId ?? row.fromPost)
        ) === index
    );

    return (<td className={tableCellCommonClassnames(streamMode)} ref={headerFourthColRef}>
        {visibleRows.map((row, index) => {
            return (<React.Fragment key={`${row.pointId}-${row.fromPostId ?? row.fromPost}`}>
                {index > 0 && <hr />}
                <div className="inline-flex items-center">
                    <DirectionIndicator pointId={row.pointId} adjacentPostId={row.fromPostId} relation="from" />
                    <span>
                        {row.fromPost}
                    </span>
                </div>
            </React.Fragment>
            );
        })}
    </td>);
};
