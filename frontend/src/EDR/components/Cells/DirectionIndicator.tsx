import React from "react";
import {dispatchDirections} from "../../../config/stations";
import {StationId} from "../../../enums/stationId";

type TrackSide = "left" | "right" | "up" | "down";
type ArrowDirection = TrackSide;

type Props = {
    pointId: string;
    adjacentPostId?: string;
    relation: "from" | "to";
}

const arrowPaths: Record<ArrowDirection, string> = {
    left: "M16 5 9 12l7 7M9 12h14",
    right: "m16 5 7 7-7 7M23 12H9",
    up: "m5 16 7-7 7 7M12 9v14",
    down: "m5 16 7 7 7-7M12 23V9"
};

const colors: Record<ArrowDirection, string> = {
    left: "text-orange-400",
    right: "text-teal-400",
    up: "text-green-400",
    down: "text-purple-400"
};

const movementFromSide: Record<TrackSide, ArrowDirection> = {
    left: "right",
    right: "left",
    up: "down",
    down: "up"
};

const directionNames: Record<ArrowDirection, string> = {
    left: "links",
    right: "rechts",
    up: "oben",
    down: "unten"
};

const getTrackSide = (pointId: string, adjacentPostId?: string): TrackSide | undefined => {
    if (!adjacentPostId) return undefined;

    const directions = dispatchDirections[parseInt(pointId)];
    const adjacentId = parseInt(adjacentPostId) as StationId;

    return (["left", "right", "up", "down"] as TrackSide[])
        .find(side => directions?.[side]?.includes(adjacentId));
};

export const DirectionIndicator: React.FC<Props> = ({pointId, adjacentPostId, relation}) => {
    const side = getTrackSide(pointId, adjacentPostId);
    if (!side) return null;

    const arrowDirection = relation === "from" ? movementFromSide[side] : side;
    const label = relation === "from"
        ? `Zug kommt von ${directionNames[side]} und fährt nach ${directionNames[arrowDirection]}`
        : `Zug fährt nach ${directionNames[arrowDirection]}`;

    return <span
        className={`mr-2 inline-flex h-6 min-w-9 shrink-0 items-center justify-center font-bold ${colors[arrowDirection]}`}
        title={label}
        role="img"
        aria-label={label}
    >
        <span aria-hidden="true">【</span>
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 32 32" fill="none">
            <path d={arrowPaths[arrowDirection]} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span aria-hidden="true">】</span>
    </span>;
};
