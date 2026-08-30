export const MIN_DEPARTED_TRAIN_HIDE_DISTANCE_KM = 1;
export const MAX_DEPARTED_TRAIN_HIDE_DISTANCE_KM = 10;
export const DEFAULT_DEPARTED_TRAIN_HIDE_DISTANCE_KM = 10;

/**
 * The distance supplied by the live API is unsigned. It must therefore only
 * be used after the timetable index confirms that the train passed the post.
 *
 * @param trainHasPassedStation - Whether the train is already beyond the post.
 * @param distanceFromStation - Live routed distance, or no value when unavailable.
 * @param hideDistance - Configured post-departure threshold in kilometres.
 * @returns Whether the departed train should be removed from the timetable.
 */
export const shouldHideDepartedTrain = (
    trainHasPassedStation: boolean,
    distanceFromStation: number | null | undefined,
    hideDistance: number,
) => trainHasPassedStation
    && distanceFromStation != null
    && distanceFromStation >= hideDistance;

/**
 * Applies the scheduled-time window unless live data reports an early train.
 * Early trains remain operationally relevant even when their scheduled arrival
 * is still outside the configured timetable window.
 *
 * @param maxTime - Configured schedule window in minutes, or no limit.
 * @param scheduledTimeDifference - Minutes between now and scheduled arrival.
 * @param liveDelay - Latest live deviation in minutes; negative values are early.
 * @returns Whether the row should be hidden by the scheduled-time filter.
 */
export const shouldHideByScheduledTime = (
    maxTime: number | undefined,
    scheduledTimeDifference: number,
    liveDelay: number | undefined,
) => maxTime !== undefined
    && !(liveDelay !== undefined && liveDelay < 0)
    && Math.abs(scheduledTimeDifference) > maxTime;
