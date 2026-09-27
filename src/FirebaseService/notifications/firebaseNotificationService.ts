import {
    AppState,
    AppStateStatus,
    PermissionsAndroid,
    Platform,
} from 'react-native';
import { Alert } from 'react-native';
import messaging, {
    FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';

import notifee, {
    AndroidImportance,
    AndroidStyle,
    AndroidVisibility,
    AuthorizationStatus,
} from '@notifee/react-native';

import DeviceInfo from 'react-native-device-info';
import { getUserData } from '../../components/AsyncStorage/AsyncStorage';
import { postRequest } from '../../constants/ApiClient';
import { API_ENDPOINTS } from '../../constants/ApiEndpoints';


/* =====================================================
   Notification Constants
===================================================== */

export const DEFAULT_NOTIFICATION_CHANNEL_ID =
    'default_notifications_v1';

export const ORDER_NOTIFICATION_CHANNEL_ID =
    'new_paid_orders_v1';

export const ORDER_NOTIFICATION_SOUND =
    'order_alert';

export const DRIVER_NEW_PAID_ORDER_TYPE =
    'DRIVER_NEW_PAID_ORDER';

/*
 * IMPORTANT:
 *
 * Notifee requires EVEN number of values.
 *
 * Vibrate 300
 * Pause   500
 * Vibrate 300
 * Pause   500
 * Vibrate 700
 * Pause   500
 */

export const ORDER_VIBRATION_PATTERN = [
    300,
    500,
    300,
    500,
    700,
    500,
];

const TOKEN_SYNC_RETRY_DELAY =
    3000;

const TOKEN_SYNC_MAX_RETRIES =
    5;

/* =====================================================
   Internal State
===================================================== */

let notificationInitialized =
    false;

let appStateSubscription:
    | ReturnType<
        typeof AppState.addEventListener
    >
    | null = null;

/* =====================================================
   Helpers
===================================================== */

const delay = (
    milliseconds: number,
): Promise<void> => {
    return new Promise(resolve => {
        setTimeout(
            resolve,
            milliseconds,
        );
    });
};

const getNotificationType = (
    remoteMessage:
        FirebaseMessagingTypes.RemoteMessage,
): string => {
    return String(
        remoteMessage?.data?.type || '',
    ).trim();
};

const getNotificationTitle = (
    remoteMessage:
        FirebaseMessagingTypes.RemoteMessage,
): string => {
    return String(
        remoteMessage
            ?.notification
            ?.title ||
        remoteMessage
            ?.data
            ?.title ||
        'New Notification',
    );
};

const getNotificationBody = (
    remoteMessage:
        FirebaseMessagingTypes.RemoteMessage,
): string => {
    return String(
        remoteMessage
            ?.notification
            ?.body ||
        remoteMessage
            ?.data
            ?.body ||
        remoteMessage
            ?.data
            ?.paragraph ||
        '',
    );
};

const isDriverOrderNotification = (
    remoteMessage:
        FirebaseMessagingTypes.RemoteMessage,
): boolean => {
    return (
        getNotificationType(
            remoteMessage,
        ) ===
        DRIVER_NEW_PAID_ORDER_TYPE
    );
};

const getNotificationChannelId = (
    remoteMessage:
        FirebaseMessagingTypes.RemoteMessage,
): string => {
    const channelId =
        String(
            remoteMessage
                ?.data
                ?.channelId ||
            '',
        ).trim();

    if (channelId) {
        return channelId;
    }

    if (
        isDriverOrderNotification(
            remoteMessage,
        )
    ) {
        return (
            ORDER_NOTIFICATION_CHANNEL_ID
        );
    }

    return (
        DEFAULT_NOTIFICATION_CHANNEL_ID
    );
};
const getNotificationSound = (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): string => {
    if (isDriverOrderNotification(remoteMessage)) {
        return ORDER_NOTIFICATION_SOUND; // 'order_alert'
    }
    return 'default';
};
/* =====================================================
   Notification Permission
===================================================== */

export const requestNotificationPermission =
    async (): Promise<boolean> => {
        try {
            console.log(
                '[NOTIFICATION] Requesting permission',
            );

            if (
                Platform.OS ===
                'android' &&
                Number(
                    Platform.Version,
                ) >= 33
            ) {
                const androidPermission =
                    await PermissionsAndroid
                        .request(
                            PermissionsAndroid
                                .PERMISSIONS
                                .POST_NOTIFICATIONS,
                        );

                console.log(
                    '[NOTIFICATION] Android permission:',
                    androidPermission,
                );

                if (
                    androidPermission !==
                    PermissionsAndroid
                        .RESULTS
                        .GRANTED
                ) {
                    console.log(
                        '[NOTIFICATION] Android notification permission denied',
                    );

                    return false;
                }
            }

            const notifeeSettings =
                await notifee
                    .requestPermission();

            console.log(
                '[NOTIFICATION] Notifee authorization:',
                notifeeSettings
                    .authorizationStatus,
            );

            if (
                Platform.OS === 'ios'
            ) {
                const firebaseAuthorization =
                    await messaging()
                        .requestPermission();

                const firebaseEnabled =
                    firebaseAuthorization ===
                    messaging
                        .AuthorizationStatus
                        .AUTHORIZED ||
                    firebaseAuthorization ===
                    messaging
                        .AuthorizationStatus
                        .PROVISIONAL;

                console.log(
                    '[NOTIFICATION] Firebase iOS authorization:',
                    firebaseAuthorization,
                );

                return firebaseEnabled;
            }

            return (
                notifeeSettings
                    .authorizationStatus ===
                AuthorizationStatus
                    .AUTHORIZED ||
                notifeeSettings
                    .authorizationStatus ===
                AuthorizationStatus
                    .PROVISIONAL
            );
        } catch (error) {
            console.log(
                '[NOTIFICATION] Permission error:',
                error,
            );

            return false;
        }
    };

/* =====================================================
   Android Notification Channels
===================================================== */

export const createNotificationChannels =
    async (): Promise<void> => {
        if (
            Platform.OS !== 'android'
        ) {
            return;
        }

        try {
            const defaultChannelId =
                await notifee
                    .createChannel({
                        id:
                            DEFAULT_NOTIFICATION_CHANNEL_ID,

                        name:
                            'General Notifications',

                        description:
                            'General Oonloop notifications',

                        importance:
                            AndroidImportance
                                .HIGH,

                        visibility:
                            AndroidVisibility
                                .PUBLIC,

                        vibration:
                            true,

                        sound:
                            'default',

                        lights:
                            true,

                        badge:
                            true,
                    });

            const orderChannelId =
                await notifee
                    .createChannel({
                        id:
                            ORDER_NOTIFICATION_CHANNEL_ID,

                        name:
                            'New Paid Orders',

                        description:
                            'Immediate alerts for new paid delivery orders',

                        importance:
                            AndroidImportance
                                .HIGH,

                        visibility:
                            AndroidVisibility
                                .PUBLIC,

                        sound:
                            ORDER_NOTIFICATION_SOUND,

                        vibration:
                            true,

                        vibrationPattern:
                            ORDER_VIBRATION_PATTERN,

                        lights:
                            true,

                        badge:
                            true,
                    });

            console.log(
                '[NOTIFICATION] Channels created:',
                {
                    defaultChannelId,
                    orderChannelId,
                },
            );
        } catch (error) {
            console.log(
                '[NOTIFICATION] Channel creation error:',
                error,
            );
        }
    };

/* =====================================================
   FCM Token
===================================================== */

export const getFcmToken =
    async (): Promise<
        string | null
    > => {
        try {
            await messaging()
                .registerDeviceForRemoteMessages();

            const token =
                await messaging()
                    .getToken();

            console.log(
                '[FCM] CURRENT DEVICE TOKEN:',
                token,
            );

            return token || null;
        } catch (error) {
            console.log(
                '[FCM] Get token error:',
                error,
            );

            return null;
        }
    };

/* =====================================================
   Save Firebase Token
===================================================== */

export const saveFirebaseTokenToBackend =
    async (
        fcmToken: string,
    ): Promise<any | null> => {
        try {
            if (!fcmToken) {
                console.log(
                    '[FCM] Token save skipped: empty token',
                );

                return null;
            }

            const userData =
                await getUserData();

            console.log(
                '[FCM] User auth available:',
                Boolean(
                    userData?.token,
                ),
            );

            if (
                !userData?.token
            ) {
                console.log(
                    '[FCM] Token save skipped: user is not logged in',
                );

                return null;
            }

            const uniqueId =
                await DeviceInfo
                    .getUniqueId();

            const brand =
                DeviceInfo.getBrand();

            const model =
                DeviceInfo.getModel();

            const systemName =
                DeviceInfo
                    .getSystemName();

            const systemVersion =
                DeviceInfo
                    .getSystemVersion();

            const appVersion =
                DeviceInfo.getVersion();

            const payload = {
                token:
                    fcmToken,

                platform:
                    Platform.OS === 'ios'
                        ? 'ios'
                        : 'android',

                deviceId:
                    uniqueId,

                deviceName:
                    `${brand} ${model}`,

                appVersion,

                systemName,

                systemVersion,
            };

            console.log(
                '[FCM] Saving device token:',
                payload,
            );

            const response =
                await postRequest(
                    API_ENDPOINTS
                        .FIREBASE_TOKEN_SAVE,

                    payload,

                    true,
                );

            console.log(
                '[FCM] TOKEN SAVE SUCCESS:',
                response,
            );

            return response;
        } catch (error) {
            console.log(
                '[FCM] TOKEN SAVE ERROR:',
                error,
            );

            return null;
        }
    };

/* =====================================================
   Sync Current Device Token
===================================================== */

export const syncFirebaseTokenToBackend =
    async (
        retry = true,
    ): Promise<boolean> => {
        const totalAttempts =
            retry
                ? TOKEN_SYNC_MAX_RETRIES
                : 1;

        for (
            let attempt = 1;
            attempt <= totalAttempts;
            attempt++
        ) {
            try {
                console.log(
                    `[FCM] Token sync attempt ${attempt}/${totalAttempts}`,
                );

                const userData =
                    await getUserData();

                if (
                    !userData?.token
                ) {
                    console.log(
                        '[FCM] User not logged in yet',
                    );

                    if (
                        attempt <
                        totalAttempts
                    ) {
                        await delay(
                            TOKEN_SYNC_RETRY_DELAY,
                        );

                        continue;
                    }

                    return false;
                }

                const fcmToken =
                    await getFcmToken();

                if (!fcmToken) {
                    console.log(
                        '[FCM] Current FCM token missing',
                    );

                    if (
                        attempt <
                        totalAttempts
                    ) {
                        await delay(
                            TOKEN_SYNC_RETRY_DELAY,
                        );

                        continue;
                    }

                    return false;
                }

                const response =
                    await saveFirebaseTokenToBackend(
                        fcmToken,
                    );

                if (response) {
                    console.log(
                        '[FCM] DEVICE TOKEN SYNCED',
                    );

                    return true;
                }
            } catch (error) {
                console.log(
                    '[FCM] Token sync attempt error:',
                    error,
                );
            }

            if (
                attempt <
                totalAttempts
            ) {
                await delay(
                    TOKEN_SYNC_RETRY_DELAY,
                );
            }
        }

        console.log(
            '[FCM] DEVICE TOKEN SYNC FAILED',
        );

        return false;
    };

/* =====================================================
   Display Local Notification
===================================================== */

// Update displayLocalNotification android configuration block
export const displayLocalNotification = async (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> => {
    try {
        await createNotificationChannels();

        const type = getNotificationType(remoteMessage);
        const title = getNotificationTitle(remoteMessage);
        const body = getNotificationBody(remoteMessage);

        const channelId = getNotificationChannelId(remoteMessage);
        const sound = getNotificationSound(remoteMessage);

        const isOrder = isDriverOrderNotification(remoteMessage);

        await notifee.displayNotification({
            id:
                remoteMessage?.messageId ||
                `${type || 'notification'}-${Date.now()}`,

            title,
            body,

            data: {
                ...remoteMessage.data,
                type,
                channelId,
                sound,
            },

            android: {
                channelId: isOrder
                    ? 'new_paid_orders_v1'
                    : channelId,

                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,

                pressAction: {
                    id: 'default',
                    launchActivity: 'default',
                },

                smallIcon: 'ic_launcher',

                sound: sound,

                autoCancel: true,
                showTimestamp: true,
                timestamp: Date.now(),
            },

            ios: {
                sound: isOrder
                    ? 'order_alert.mp3'
                    : 'default',
            },
        });
    } catch (error) {
        console.log('[NOTIFICATION] DISPLAY ERROR:', error);
    }
};

/* =====================================================
   Foreground FCM Listener
===================================================== */

export const listenForegroundNotifications =
    () => {
        console.log(
            '[FCM] Foreground listener registered',
        );

        return messaging()
            .onMessage(
                async remoteMessage => {
                    console.log(
                        '[FCM] FOREGROUND MESSAGE RECEIVED',
                    );

                    await displayLocalNotification(
                        remoteMessage,
                    );
                },
            );
    };

/* =====================================================
   Background FCM Handler
===================================================== */

export const firebaseBackgroundMessageHandler =
    async (
        remoteMessage:
            FirebaseMessagingTypes.RemoteMessage,
    ): Promise<void> => {
        try {
            console.log(
                '[FCM] BACKGROUND MESSAGE RECEIVED',
            );

            console.log(
                JSON.stringify(
                    remoteMessage,
                    null,
                    2,
                ),
            );

            // Always handle the notification through Notifee.
            // This ensures the custom channel/sound is used
            // even when the app is in background or closed.
            await displayLocalNotification(
                remoteMessage,
            );

        } catch (error) {
            console.log(
                '[FCM] Background handler error:',
                error,
            );
        }
    };

/* =====================================================
App Active Token Sync
===================================================== */

const listenForAppActiveTokenSync =
    (): void => {
        if (
            appStateSubscription
        ) {
            return;
        }

        appStateSubscription =
            AppState.addEventListener(
                'change',
                async (
                    nextAppState:
                        AppStateStatus,
                ) => {
                    if (
                        nextAppState ===
                        'active'
                    ) {
                        console.log(
                            '[FCM] App active - syncing token',
                        );

                        await syncFirebaseTokenToBackend(
                            false,
                        );
                    }
                },
            );
    };

/* =====================================================
   Initialize Notifications
===================================================== */

export const initializeNotifications =
    async () => {
        try {
            if (
                notificationInitialized
            ) {
                console.log(
                    '[NOTIFICATION] Already initialized',
                );

                await syncFirebaseTokenToBackend(
                    false,
                );

                return null;
            }

            notificationInitialized =
                true;

            console.log(
                '[NOTIFICATION] INITIALIZING',
            );

            const hasPermission =
                await requestNotificationPermission();

            console.log(
                '[NOTIFICATION] Permission granted:',
                hasPermission,
            );

            await createNotificationChannels();

            const token =
                await getFcmToken();

            if (token) {
                await saveFirebaseTokenToBackend(
                    token,
                );
            }

            const unsubscribeTokenRefresh =
                messaging()
                    .onTokenRefresh(
                        async newToken => {
                            console.log(
                                '[FCM] TOKEN REFRESHED:',
                                newToken,
                            );

                            await saveFirebaseTokenToBackend(
                                newToken,
                            );
                        },
                    );

            const unsubscribeForeground =
                listenForegroundNotifications();

            const unsubscribeOpenedApp =
                messaging()
                    .onNotificationOpenedApp(
                        remoteMessage => {
                            console.log(
                                '[FCM] NOTIFICATION OPENED:',
                                remoteMessage
                                    ?.data,
                            );
                        },
                    );

            const initialNotification =
                await messaging()
                    .getInitialNotification();

            if (
                initialNotification
            ) {
                console.log(
                    '[FCM] INITIAL NOTIFICATION:',
                    initialNotification
                        ?.data,
                );
            }

            listenForAppActiveTokenSync();

            console.log(
                '[NOTIFICATION] INITIALIZED',
            );

            return {
                token,

                hasPermission,

                unsubscribe: () => {
                    unsubscribeTokenRefresh();

                    unsubscribeForeground();

                    unsubscribeOpenedApp();

                    appStateSubscription
                        ?.remove();

                    appStateSubscription =
                        null;

                    notificationInitialized =
                        false;
                },
            };
        } catch (error) {
            notificationInitialized =
                false;

            console.log(
                '[NOTIFICATION] INITIALIZE ERROR:',
                error,
            );

            return null;
        }
    };

/* =====================================================
   Call After Login
===================================================== */

export const registerCurrentDeviceForNotifications =
    async (): Promise<boolean> => {
        try {
            console.log(
                '[FCM] Registering logged-in device',
            );

            await createNotificationChannels();

            const token =
                await getFcmToken();

            if (!token) {
                console.log(
                    '[FCM] Device registration failed: token missing',
                );

                return false;
            }

            const response =
                await saveFirebaseTokenToBackend(
                    token,
                );

            const success =
                Boolean(response);

            console.log(
                '[FCM] Logged-in device registration:',
                success
                    ? 'SUCCESS'
                    : 'FAILED',
            );

            return success;
        } catch (error) {
            console.log(
                '[FCM] Register current device error:',
                error,
            );

            return false;
        }
    };