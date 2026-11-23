import { Platform } from 'react-native';
import {
    ORDER_NOTIFICATION_CHANNEL_ID,
    ORDER_NOTIFICATION_CHANNEL_V1_ID,
    ORDER_NOTIFICATION_CHANNEL_V2_ID,
    ORDER_NOTIFICATION_SILENT_CHANNEL_ID,
    DEFAULT_NOTIFICATION_CHANNEL_ID,
    ORDER_NOTIFICATION_SOUND,
    ORDER_NOTIFICATION_SOUND_V1,
    ORDER_NOTIFICATION_SOUND_V2,
    ORDER_APNS_SOUND_V1,
    ORDER_APNS_SOUND_V2,
    DRIVER_NEW_PAID_ORDER_TYPE,
    VENDOR_NEW_ORDER_TYPE,
    PAYMENT_SUCCESS_EVENT,
    isDriverOrderNotification,
    isVendorOrderNotification,
    isOrderNotification,
    getNotificationChannelId,
    getNotificationSound,
    getNotificationApnsSound,
    createNotificationChannels,
    setupNotificationChannels,
    handleNotificationNavigation,
} from '../src/FirebaseService/notifications/firebaseNotificationService';
import { navigate } from '../src/components/utils/NavigationService';

jest.mock('../src/components/utils/NavigationService', () => ({
    navigate: jest.fn(),
}));

jest.mock('@react-native-firebase/messaging', () => {
    const messaging = () => ({
        registerDeviceForRemoteMessages: jest.fn(),
        getToken: jest.fn(),
        onTokenRefresh: jest.fn(() => jest.fn()),
        onMessage: jest.fn(() => jest.fn()),
        onNotificationOpenedApp: jest.fn(() => jest.fn()),
        getInitialNotification: jest.fn(),
        requestPermission: jest.fn().mockResolvedValue(1),
    });
    messaging.AuthorizationStatus = { AUTHORIZED: 1, PROVISIONAL: 2 };
    return messaging;
});

jest.mock('@notifee/react-native', () => ({
    createChannel: jest.fn(),
    displayNotification: jest.fn(),
    requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
    onForegroundEvent: jest.fn(() => jest.fn()),
    onBackgroundEvent: jest.fn(),
    getInitialNotification: jest.fn(),
    AndroidImportance: { HIGH: 4 },
    AndroidVisibility: { PUBLIC: 1 },
    AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 },
    EventType: { PRESS: 1 },
}));

jest.mock('react-native-device-info', () => ({
    getUniqueId: jest.fn().mockResolvedValue('test-device-id'),
    getBrand: jest.fn().mockReturnValue('Samsung'),
    getModel: jest.fn().mockReturnValue('S21'),
    getSystemName: jest.fn().mockReturnValue('Android'),
    getSystemVersion: jest.fn().mockReturnValue('13'),
    getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../src/components/AsyncStorage/AsyncStorage', () => ({
    getUserData: jest.fn().mockResolvedValue({ token: 'test-user-token' }),
    getLocalPreferences: jest.fn().mockResolvedValue({}),
}));

jest.mock('../src/constants/ApiClient', () => ({
    postRequest: jest.fn().mockResolvedValue({ success: true }),
}));

describe('firebaseNotificationService - Driver & Vendor Alignment', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isOrderNotification detection', () => {
        it('recognizes DRIVER_NEW_PAID_ORDER type', () => {
            const msg: any = { data: { type: DRIVER_NEW_PAID_ORDER_TYPE } };
            expect(isDriverOrderNotification(msg)).toBe(true);
            expect(isOrderNotification(msg)).toBe(true);
        });

        it('recognizes DRIVER_NEW_MANUAL_DELIVERY and MANUAL_DELIVERY_ASSIGNED types', () => {
            expect(isDriverOrderNotification({ data: { type: 'DRIVER_NEW_MANUAL_DELIVERY' } } as any)).toBe(true);
            expect(isDriverOrderNotification({ data: { type: 'MANUAL_DELIVERY_ASSIGNED' } } as any)).toBe(true);
            expect(isDriverOrderNotification({ data: { type: 'MANUAL_DELIVERY_STATUS_UPDATED' } } as any)).toBe(true);
        });

        it('recognizes NEW_VENDOR_ORDER and PAYMENT_SUCCESS types', () => {
            expect(isVendorOrderNotification({ data: { type: VENDOR_NEW_ORDER_TYPE } } as any)).toBe(true);
            expect(isVendorOrderNotification({ data: { event: PAYMENT_SUCCESS_EVENT } } as any)).toBe(true);
        });

        it('recognizes manual delivery payloads by deliveryId or deliveryType', () => {
            expect(isOrderNotification({ data: { deliveryId: 'del-123' } } as any)).toBe(true);
            expect(isOrderNotification({ data: { deliveryType: 'manual_delivery' } } as any)).toBe(true);
        });

        it('recognizes vendor order payloads by vendorOrderId or orderId', () => {
            expect(isOrderNotification({ data: { vendorOrderId: 'vo-999' } } as any)).toBe(true);
            expect(isOrderNotification({ data: { orderId: 'ord-888' } } as any)).toBe(true);
        });

        it('recognizes messages specifying order channel or sound directly', () => {
            expect(isOrderNotification({ data: { channelId: ORDER_NOTIFICATION_CHANNEL_ID } } as any)).toBe(true);
            expect(isOrderNotification({ data: { sound: ORDER_NOTIFICATION_SOUND } } as any)).toBe(true);
            expect(isOrderNotification({ data: { channelId: ORDER_NOTIFICATION_CHANNEL_V2_ID } } as any)).toBe(true);
            expect(isOrderNotification({ data: { sound: ORDER_NOTIFICATION_SOUND_V2 } } as any)).toBe(true);
        });

        it('returns false for unrelated general notifications', () => {
            const msg: any = { data: { type: 'MARKETING_ANNOUNCEMENT' } };
            expect(isOrderNotification(msg)).toBe(false);
        });
    });

    describe('Sound and Channel Resolution', () => {
        it('returns ORDER_NOTIFICATION_SOUND (order_alert) for any order notification', () => {
            const msg: any = { data: { type: DRIVER_NEW_PAID_ORDER_TYPE } };
            expect(getNotificationSound(msg)).toBe(ORDER_NOTIFICATION_SOUND);
            expect(getNotificationSound(msg)).toBe('order_alert');
        });

        it('returns ORDER_NOTIFICATION_SOUND_V2 when sound or channel specifies V2', () => {
            expect(getNotificationSound({ data: { sound: ORDER_NOTIFICATION_SOUND_V2 } } as any)).toBe(ORDER_NOTIFICATION_SOUND_V2);
            expect(getNotificationSound({ data: { channelId: ORDER_NOTIFICATION_CHANNEL_V2_ID } } as any)).toBe(ORDER_NOTIFICATION_SOUND_V2);
            expect(getNotificationSound({ data: { sound: 'order_alert_sound_v2' } } as any)).toBe('order_alert_sound_v2');
        });

        it('returns default sound for non-order notification', () => {
            const msg: any = { data: { type: 'GENERAL' } };
            expect(getNotificationSound(msg)).toBe('default');
        });

        it('returns ORDER_NOTIFICATION_CHANNEL_ID (new_paid_orders_v1) for order notifications', () => {
            const msg: any = { data: { type: VENDOR_NEW_ORDER_TYPE } };
            expect(getNotificationChannelId(msg)).toBe(ORDER_NOTIFICATION_CHANNEL_ID);
            expect(getNotificationChannelId(msg)).toBe('new_paid_orders_v1');
        });

        it('returns ORDER_NOTIFICATION_CHANNEL_V2_ID when sound or channelId specifies V2', () => {
            expect(getNotificationChannelId({ data: { sound: ORDER_NOTIFICATION_SOUND_V2 } } as any)).toBe(ORDER_NOTIFICATION_CHANNEL_V2_ID);
            expect(getNotificationChannelId({ data: { channelId: ORDER_NOTIFICATION_CHANNEL_V2_ID } } as any)).toBe(ORDER_NOTIFICATION_CHANNEL_V2_ID);
            expect(getNotificationChannelId({ data: { channelId: 'new_paid_orders_v2' } } as any)).toBe('new_paid_orders_v2');
        });

        it('returns DEFAULT_NOTIFICATION_CHANNEL_ID for non-order notifications', () => {
            const msg: any = { data: { type: 'ANNOUNCEMENT' } };
            expect(getNotificationChannelId(msg)).toBe(DEFAULT_NOTIFICATION_CHANNEL_ID);
        });

        it('respects explicitly provided channelId if sent in data payload', () => {
            const msg: any = { data: { channelId: 'custom_promo_channel' } };
            expect(getNotificationChannelId(msg)).toBe('custom_promo_channel');
        });
    });

    describe('iOS APNs Sound Resolution', () => {
        it('returns ORDER_APNS_SOUND_V1 (order_alert.wav) for standard order notification', () => {
            const msg: any = { data: { type: DRIVER_NEW_PAID_ORDER_TYPE } };
            expect(getNotificationApnsSound(msg)).toBe(ORDER_APNS_SOUND_V1);
            expect(getNotificationApnsSound(msg)).toBe('order_alert.wav');
        });

        it('returns ORDER_APNS_SOUND_V2 (order_alert_sound_v2.mpeg) for V2 order sound or channel', () => {
            expect(getNotificationApnsSound({ data: { sound: ORDER_NOTIFICATION_SOUND_V2 } } as any)).toBe(ORDER_APNS_SOUND_V2);
            expect(getNotificationApnsSound({ data: { channelId: ORDER_NOTIFICATION_CHANNEL_V2_ID } } as any)).toBe(ORDER_APNS_SOUND_V2);
            expect(getNotificationApnsSound({ data: { sound: ORDER_NOTIFICATION_SOUND_V2 } } as any)).toBe('order_alert_sound_v2.mpeg');
        });

        it('returns default for non-order notification', () => {
            const msg: any = { data: { type: 'GENERAL' } };
            expect(getNotificationApnsSound(msg)).toBe('default');
        });
    });

    describe('createNotificationChannels', () => {
        const originalOS = Platform.OS;

        beforeEach(() => {
            Platform.OS = 'android';
        });

        afterEach(() => {
            Platform.OS = originalOS;
        });

        it('registers default, v1, v2, and silent notification channels with Notifee on Android', async () => {
            const notifee = require('@notifee/react-native');
            await createNotificationChannels();

            expect(notifee.createChannel).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: DEFAULT_NOTIFICATION_CHANNEL_ID,
                    sound: 'default',
                })
            );

            expect(notifee.createChannel).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: ORDER_NOTIFICATION_CHANNEL_V1_ID,
                    name: 'Order Alerts (Classic)',
                    sound: ORDER_NOTIFICATION_SOUND_V1,
                })
            );

            expect(notifee.createChannel).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: ORDER_NOTIFICATION_CHANNEL_V2_ID,
                    name: 'Order Alerts (V2)',
                    sound: ORDER_NOTIFICATION_SOUND_V2,
                })
            );

            expect(notifee.createChannel).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: ORDER_NOTIFICATION_SILENT_CHANNEL_ID,
                })
            );
        });

        it('exports setupNotificationChannels as an alias for createNotificationChannels', () => {
            expect(setupNotificationChannels).toBe(createNotificationChannels);
        });

        it('skips channel creation on non-Android platforms', async () => {
            Platform.OS = 'ios';
            const notifee = require('@notifee/react-native');
            await createNotificationChannels();
            expect(notifee.createChannel).not.toHaveBeenCalled();
        });
    });

    describe('handleNotificationNavigation', () => {
        it('navigates to ManualDeliveryDetails when deliveryId is present', () => {
            handleNotificationNavigation({
                type: 'DRIVER_NEW_MANUAL_DELIVERY',
                deliveryId: 'del-456',
            });
            expect(navigate).toHaveBeenCalledWith('ManualDeliveryDetails', { id: 'del-456' });
        });

        it('navigates to ManualDeliveryListing when it is a manual delivery without specific deliveryId', () => {
            handleNotificationNavigation({
                type: 'DRIVER_NEW_MANUAL_DELIVERY',
            });
            expect(navigate).toHaveBeenCalledWith('ManualDeliveryListing');
        });

        it('navigates to Orders when order notification arrives', () => {
            handleNotificationNavigation({
                type: DRIVER_NEW_PAID_ORDER_TYPE,
                vendorOrderId: 'vo-12345',
                orderId: 'ord-67890',
            });
            expect(navigate).toHaveBeenCalledWith('Orders', expect.objectContaining({
                status: 'placed',
                vendorOrderId: 'vo-12345',
                orderId: 'ord-67890',
            }));
        });

        it('navigates to Orders with fallback when only type is DRIVER_NEW_PAID_ORDER_TYPE', () => {
            handleNotificationNavigation({
                type: DRIVER_NEW_PAID_ORDER_TYPE,
            });
            expect(navigate).toHaveBeenCalledWith('Orders', expect.objectContaining({
                status: 'placed',
            }));
        });
    });
});
