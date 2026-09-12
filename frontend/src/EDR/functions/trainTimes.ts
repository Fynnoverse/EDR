import {addMinutes} from "date-fns";

/** Returns the operational time after applying the latest known deviation. */
export const getPredictedTrainTime = (scheduledTime: Date, deviationMinutes?: number) =>
    addMinutes(scheduledTime, deviationMinutes ?? 0);

/** Returns a sortable timestamp for an operational (predicted) train time. */
export const getPredictedTrainTimestamp = (scheduledTime: Date, deviationMinutes?: number) =>
    getPredictedTrainTime(scheduledTime, deviationMinutes).valueOf();

/** Late stopping trains use one minute of dwell, without departing before schedule. */
export const getPredictedDepartureTime = (
    scheduledArrival: Date, scheduledDeparture: Date, deviationMinutes?: number, hasStop = true,
) => (deviationMinutes ?? 0) > 0
    ? new Date(Math.max(scheduledDeparture.valueOf(),
        addMinutes(scheduledArrival, deviationMinutes! + (hasStop ? 1 : 0)).valueOf()))
    : scheduledDeparture;
