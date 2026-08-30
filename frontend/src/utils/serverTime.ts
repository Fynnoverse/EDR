/**
 * Encodes the SimRail server's wall-clock time in UTC fields. Consumers must
 * use UTC getters/formatters so browser timezone and DST rules cannot alter it.
 */
export const toServerTime = (value: Date | string | number, serverTzOffset: number): Date => {
    const absoluteTime = new Date(value);
    if (Number.isNaN(absoluteTime.getTime())) return absoluteTime;

    return new Date(absoluteTime.getTime() + serverTzOffset * 60 * 60 * 1000);
};

/** Formats UTC-encoded server wall-clock fields without applying the browser timezone. */
export const formatServerTime = (date: Date, separator = ":") =>
    `${date.getUTCHours().toString().padStart(2, "0")}${separator}${date.getUTCMinutes().toString().padStart(2, "0")}`;

/** Returns an HHmm-style number used by existing timetable proximity comparisons. */
export const getServerTimeNumber = (date: Date) => date.getUTCHours() * 100 + date.getUTCMinutes();

/** Checks whether a timetable value is on the next server-calendar day. */
export const isNextServerDay = (date: Date, serverNow: Date) => {
    const dateDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const currentDay = Date.UTC(serverNow.getUTCFullYear(), serverNow.getUTCMonth(), serverNow.getUTCDate());
    return dateDay - currentDay === 24 * 60 * 60 * 1000;
};
