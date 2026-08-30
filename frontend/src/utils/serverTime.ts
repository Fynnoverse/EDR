/**
 * Converts an absolute API timestamp into a Date whose local getters expose
 * the SimRail server's wall-clock time. This keeps date-fns formatting and
 * existing comparisons independent of the browser/Windows timezone.
 */
export const toServerTime = (value: Date | string | number, serverTzOffset: number): Date => {
    const absoluteTime = new Date(value);
    if (Number.isNaN(absoluteTime.getTime())) return absoluteTime;

    const serverWallTime = new Date(absoluteTime.getTime() + serverTzOffset * 60 * 60 * 1000);
    return new Date(
        serverWallTime.getUTCFullYear(),
        serverWallTime.getUTCMonth(),
        serverWallTime.getUTCDate(),
        serverWallTime.getUTCHours(),
        serverWallTime.getUTCMinutes(),
        serverWallTime.getUTCSeconds(),
        serverWallTime.getUTCMilliseconds(),
    );
};
