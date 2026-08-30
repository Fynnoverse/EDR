/**
 * Encodes the SimRail server's wall-clock time in UTC fields. Consumers must
 * use UTC getters/formatters so browser timezone and DST rules cannot alter it.
 */
export const toServerTime = (value: Date | string | number, serverTzOffset: number): Date => {
    const absoluteTime = new Date(value);
    if (Number.isNaN(absoluteTime.getTime())) return absoluteTime;

    return new Date(absoluteTime.getTime() + serverTzOffset * 60 * 60 * 1000);
};

export const formatServerTime = (date: Date, separator = ":") =>
    `${date.getUTCHours().toString().padStart(2, "0")}${separator}${date.getUTCMinutes().toString().padStart(2, "0")}`;

export const getServerTimeNumber = (date: Date) => date.getUTCHours() * 100 + date.getUTCMinutes();
