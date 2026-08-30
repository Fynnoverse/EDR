/**
 * Parses a timetable timestamp while preserving the server wall-clock values
 * already encoded by the backend in UTC fields. Consumers must use UTC
 * getters/formatters so browser timezone and DST rules cannot alter it.
 *
 * @param value - Timestamp received from a timetable endpoint.
 * @returns A Date whose UTC fields retain the backend's wall-clock time.
 */
export const toServerTime = (value: Date | string | number): Date => new Date(value);

/**
 * Formats UTC-encoded server wall-clock fields without applying the browser timezone.
 *
 * @param date - Date containing server wall-clock values in its UTC fields.
 * @param separator - Text placed between the two-digit hour and minute values.
 * @returns A formatted server time such as `10:35` or `1035`.
 */
export const formatServerTime = (date: Date, separator = ":") =>
    `${date.getUTCHours().toString().padStart(2, "0")}${separator}${date.getUTCMinutes().toString().padStart(2, "0")}`;

/**
 * Converts a server wall-clock value to the existing HHmm-style numeric format.
 *
 * @param date - Date containing server wall-clock values in its UTC fields.
 * @returns A number such as `1035` for 10:35 server time.
 */
export const getServerTimeNumber = (date: Date) => date.getUTCHours() * 100 + date.getUTCMinutes();

/**
 * Checks whether a timetable value is on the next server-calendar day.
 *
 * @param date - UTC-encoded timetable value to inspect.
 * @param serverNow - Current wall-clock value returned by the SimRail server.
 * @returns `true` only when the timetable value falls on the following server day.
 */
export const isNextServerDay = (date: Date, serverNow: Date) => {
    const dateDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const currentDay = Date.UTC(serverNow.getUTCFullYear(), serverNow.getUTCMonth(), serverNow.getUTCDate());
    return dateDay - currentDay === 24 * 60 * 60 * 1000;
};
