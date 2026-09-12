import React from "react";
import Bell from "../../sounds/train_departure";

export const useSoundNotification = (): [React.FC, (callback: () => void) => void] => {
    const notificationPlayer = React.useRef<HTMLAudioElement>(null);
    const playTrainDepartureNotification = React.useCallback((callback: () => void) => {
        if (!notificationPlayer.current) {
            callback?.();
            return;
        }
        return notificationPlayer.current.play()
            .then(() => callback?.())
            .catch(() => callback?.());
    }, [notificationPlayer]);

    return [
       React.memo(() => <audio ref={notificationPlayer} src={Bell}/>),
        playTrainDepartureNotification
    ]
}
