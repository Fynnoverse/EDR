import {addMinutes} from "date-fns";

/** Returns the operational time after applying the latest known deviation. */
export const getPredictedTrainTime = (scheduledTime: Date, deviationMinutes?: number) =>
    addMinutes(scheduledTime, deviationMinutes ?? 0);

/** Returns a sortable timestamp for an operational (predicted) train time. */
export const getPredictedTrainTimestamp = (scheduledTime: Date, deviationMinutes?: number) =>
    getPredictedTrainTime(scheduledTime, deviationMinutes).valueOf();
