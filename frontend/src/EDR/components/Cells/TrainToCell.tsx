import React from "react";
import {CellLineData} from "./CellLineData";
import {tableCellCommonClassnames} from "../TrainRow";
import { TimeTableRow } from "../../../customTypes/TimeTableRow";

type Props = {
    ttRow: TimeTableRow;
    headerSeventhColRef: any;
    secondaryPostData: TimeTableRow[];
    streamMode: boolean;
}
export const TrainToCell: React.FC<Props> = ({headerSeventhColRef, ttRow, secondaryPostData, streamMode}) => {
    const visibleRows = [ttRow, ...secondaryPostData].filter((row, index, rows) =>
        row.toPost && rows.findIndex(candidate =>
            (candidate.toPostId ?? candidate.toPost) === (row.toPostId ?? row.toPost)
            && (candidate.toLine ?? candidate.line) === (row.toLine ?? row.line)
        ) === index
    );

    return (
        <td className={tableCellCommonClassnames(streamMode)} ref={headerSeventhColRef} width="450">
            {visibleRows.map((row, index) => <React.Fragment key={`${row.pointId}-${row.toPostId ?? row.toPost}`}>
                {index > 0 && <hr />}
                <div className="flex flex-wrap items-center gap-x-1 gap-y-2"><CellLineData ttRow={row} /></div>
            </React.Fragment>)}
        </td>
    );
}
