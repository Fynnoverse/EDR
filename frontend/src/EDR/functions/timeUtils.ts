import { differenceInMinutes } from "date-fns";

export const getDateWithHourAndMinutes = (dateNow: Date, expectedHours: number, expectedMinutes: number, isArrivalNextDay: boolean, isArrivalPreviousDay: boolean) => {
    const dayOffset = isArrivalNextDay ? 1 : isArrivalPreviousDay ? -1 : 0;
    return new Date(Date.UTC(
        dateNow.getUTCFullYear(),
        dateNow.getUTCMonth(),
        dateNow.getUTCDate() + dayOffset,
        expectedHours,
        expectedMinutes,
    ));
}

export const getTimeDelay = (actual: Date, expected: Date) =>
    differenceInMinutes(actual, expected);
