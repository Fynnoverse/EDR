export const validEventTime = (date: Date | undefined, now: Date) =>
    date instanceof Date && Number.isFinite(date.valueOf())
    && date.getUTCFullYear() > 1970 && date.getUTCFullYear() < 3000 && date <= now;

export const stationEventKey = (pointId: string, index: number, scheduled: Date) =>
    `${pointId}:${index}:${scheduled.valueOf()}`;

export const LIVE_OBSERVATION_GRACE_MS = 15000;
