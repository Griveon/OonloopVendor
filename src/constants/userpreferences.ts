export const USER_PREFERENCES = {
    THEME: {
        key: "theme",
        type: "string",
        default: "system",
        allowed: ["light", "dark", "system"],
    },

    LAST_SELECTED_WORKSPACE: {
        key: "lastSelectedWorkspace",
        type: "objectId",
        ref: "Workspace",
        default: null,
    },

    LAST_SELECTED_BOARD: {
        key: "lastSelectedBoard",
        type: "objectId",
        ref: "Board",
        default: null,
    },

    IS_SIDEBAR_COLLAPSED: {
        key: "isSidebarCollapsed",
        type: "boolean",
        default: false,
    },

    LANGUAGE: {
        key: "language",
        type: "string",
        default: "en",
    },

    TIMEZONE: {
        key: "timezone",
        type: "string",
        default: "Asia/Kolkata",
    },

    EMAIL_NOTIFICATIONS: {
        key: "notifications.email",
        type: "boolean",
        default: true,
    },

    PUSH_NOTIFICATIONS: {
        key: "notifications.push",
        type: "boolean",
        default: true,
    },

    DASHBOARD_VIEW: {
        key: "dashboard.view",
        type: "string",
        default: "grid",
        allowed: ["grid", "list"],
    },

    VENDOR_ORDER_NOTIFICATIONS: {
        key: "isVendorWantsOrderNotifications",
        type: "boolean",
        default: true,
    },

    VENDOR_ORDER_NOTIFICATION_SOUND: {
        key: "vendorOrderNotificationSound",
        type: "string",
        default: "order_alert",
        allowed: ["order_alert", "order_alert_sound_v2"],
    },
    
    DRIVER_ORDER_NOTIFICATIONS: {
        key: "isDriverWantsOrderNotifications",
        type: "boolean",
        default: true,
    },
} as const;