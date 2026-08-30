export const DEPARTED_TRAIN_HIDE_DISTANCE_KM = 10;

/**
 * The distance supplied by the live API is unsigned. It must therefore only
 * be used after the timetable index confirms that the train passed the post.
 */
export const shouldHideDepartedTrain = (
    trainHasPassedStation: boolean,
    distanceFromStation: number | undefined,
) => trainHasPassedStation
    && distanceFromStation !== undefined
    && distanceFromStation >= DEPARTED_TRAIN_HIDE_DISTANCE_KM;
