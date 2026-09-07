import React from "react";
import { dispatchDirections } from "../../../config/stations";
import {tableCellCommonClassnames} from "../TrainRow";
import { TimeTableRow } from "../../../customTypes/TimeTableRow";

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
            const directions = dispatchDirections[parseInt(row.pointId)];
            const isFromLeft = row.fromPostId ? directions?.left?.includes(parseInt(row.fromPostId)) : false;
            const isFromRight = row.fromPostId ? directions?.right?.includes(parseInt(row.fromPostId)) : false;
            const isFromUp = row.fromPostId ? directions?.up?.includes(parseInt(row.fromPostId)) : false;
            const isFromDown = row.fromPostId ? directions?.down?.includes(parseInt(row.fromPostId)) : false;
            
            return (<React.Fragment key={`${row.pointId}-${row.fromPostId ?? row.fromPost}`}>
                {index > 0 && <hr />}
                <div className="inline-flex">
                    <span className="pr-2">
                        { isFromLeft && <span className="font-bold text-teal-400">【🢂】</span>}
                        { isFromRight && <span className="font-bold text-orange-400">【🢀】</span>}
                        { isFromUp && <span className="font-bold text-purple-400">【🢃】</span>}
                        { isFromDown && <span className="font-bold text-green-400">【🢁】</span>}
                    </span>
                    <span>
                        {row.fromPost}
                    </span>
                </div>
            </React.Fragment>
            );
        })}
    </td>);
};
