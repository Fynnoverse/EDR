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
