import {addMinutes} from "date-fns";

const isValidDate = (d: Date | undefined): boolean =>
    d instanceof Date && !isNaN(d.valueOf()) && d.getUTCFullYear() > 1970 && d.getUTCFullYear() < 3000;

/** Returns the operational time after applying the latest known deviation. */
export const getPredictedTrainTime = (scheduledTime: Date, deviationMinutes?: number) =>
    addMinutes(scheduledTime, deviationMinutes ?? 0);

/** Returns a sortable timestamp for an operational (predicted) train time. */
export const getPredictedTrainTimestamp = (scheduledTime: Date, deviationMinutes?: number) =>
    getPredictedTrainTime(scheduledTime, deviationMinutes).valueOf();

/** Late stopping trains use one minute of dwell, without departing before schedule. */
export const getPredictedDepartureTime = (
    scheduledArrival: Date, scheduledDeparture: Date, deviationMinutes?: number, hasStop = true,
) => {
    const hasValidArrival = isValidDate(scheduledArrival);
    const delay = deviationMinutes ?? 0;
    if (!hasValidArrival) {
        return delay > 0 ? addMinutes(scheduledDeparture, delay) : scheduledDeparture;
    }
    return hasStop
        ? (delay > 0
            ? new Date(Math.max(scheduledDeparture.valueOf(),
                addMinutes(scheduledArrival, delay + (hasStop ? 1 : 0)).valueOf()))
            : scheduledDeparture)
        : new Date(Math.max(scheduledDeparture.valueOf(), addMinutes(scheduledArrival, delay).valueOf()));
};

/** Shared by the departure cell and sorting; the displayed delay stays separate. */
export const getDisplayedDepartureTime = (
    scheduledArrival: Date,
    scheduledDeparture: Date,
    departureMinutes?: number,
    arrivalMinutes?: number,
    estimated?: boolean,
    standingDepartureTime?: Date,
    hasStop = true
) => {
    if (standingDepartureTime) {
        return new Date(Math.max(scheduledDeparture.valueOf(), standingDepartureTime.valueOf()));
    }
    if (estimated === false && (hasStop ? (departureMinutes ?? 0) > 0 : departureMinutes !== undefined)) {
        return getPredictedTrainTime(scheduledDeparture, Math.max(0, departureMinutes ?? 0));
    }
    const hasValidArrival = isValidDate(scheduledArrival);
    if (!hasValidArrival) {
        const effectiveDelay = departureMinutes ?? arrivalMinutes ?? 0;
        return effectiveDelay > 0 ? addMinutes(scheduledDeparture, effectiveDelay) : scheduledDeparture;
    }
    if (!hasStop) {
        const effectiveDelay = departureMinutes !== undefined && arrivalMinutes !== undefined
            ? Math.max(departureMinutes, arrivalMinutes)
            : (departureMinutes ?? arrivalMinutes ?? 0);
        return new Date(Math.max(scheduledDeparture.valueOf(), addMinutes(scheduledArrival, effectiveDelay).valueOf()));
    }

    const minByArrival = (arrivalMinutes ?? 0) > 0
        ? addMinutes(scheduledArrival, arrivalMinutes! + 1).valueOf()
        : scheduledArrival.valueOf();
    const minByDeparture = (departureMinutes ?? 0) > 0
        ? addMinutes(scheduledDeparture, departureMinutes!).valueOf()
        : scheduledDeparture.valueOf();

    return new Date(Math.max(scheduledDeparture.valueOf(), minByArrival, minByDeparture));
};
