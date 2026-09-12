export interface PushNotificationOptions extends NotificationOptions {
    autoCloseTimeoutMs?: number;
    renotify?: boolean;
    vibrate?: number | number[];
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
    if (
        typeof window === 'undefined' ||
        typeof navigator === 'undefined' ||
        !('serviceWorker' in navigator) ||
        typeof navigator.serviceWorker.register !== 'function'
    ) {
        return Promise.resolve(undefined);
    }
    return navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => {
            console.debug('ServiceWorker registration error:', err);
            return undefined;
        });
}

export function requestPushNotificationPermission(): Promise<NotificationPermission | undefined> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return Promise.resolve(undefined);
    }
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        return Promise.resolve(Notification.permission);
    }
    try {
        void registerServiceWorker();
        const req = Notification.requestPermission();
        if (req && typeof (req as any).then === 'function') {
            return req;
        }
        return Promise.resolve(Notification.permission);
    } catch {
        return Promise.resolve(Notification.permission);
    }
}

export function sendPushNotification(
    title: string,
    options: PushNotificationOptions = {}
): Notification | void {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }

    const { autoCloseTimeoutMs = 8000, ...restOptions } = options;
    const finalOptions: NotificationOptions = {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        renotify: true,
        ...restOptions,
        data: {
            url: typeof window !== 'undefined' ? window.location.href : '/',
            ...(restOptions.data || {}),
        },
    };

    // 1. If ServiceWorker registration is ready, use showNotification for reliable background delivery on Windows
    if (
        typeof navigator !== 'undefined' &&
        'serviceWorker' in navigator &&
        navigator.serviceWorker &&
        typeof navigator.serviceWorker.ready?.then === 'function'
    ) {
        navigator.serviceWorker.ready
            .then((reg) => {
                if (reg && typeof reg.showNotification === 'function') {
                    return reg.showNotification(title, finalOptions);
                }
            })
            .catch(() => {
                // Fallback to Notification constructor
            });
    }

    // 2. Fallback to standard window Notification constructor
    try {
        const notif = new Notification(title, finalOptions);
        notif.onclick = () => {
            try {
                window.focus();
            } catch {
                // ignore
            }
            try {
                notif.close();
            } catch {
                // ignore
            }
        };
        if (autoCloseTimeoutMs > 0) {
            setTimeout(() => {
                try {
                    notif.close();
                } catch {
                    // ignore
                }
            }, autoCloseTimeoutMs);
        }
        return notif;
    } catch {
        // ignore
    }
}
