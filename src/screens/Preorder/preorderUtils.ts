// ─── Types ───────────────────────────────────────────────────────────

export interface PreorderSlot {
    _id?: string;
    label: string;
    start: string;
    end: string;
}

export interface PreorderSameDayRules {
    enabled: boolean;
    readyWithinHours: number;
    cutoffTime: string;
}

export interface PreorderScheduledRules {
    enabled: boolean;
    minLeadDays: number;
    horizonDays: number;
    slots: PreorderSlot[];
}

export interface PreorderConfig {
    _id: string;
    isActive: boolean;
    product:
        | string
        | {
            _id: string;
            name?: string;
            mrp?: number;
            images?: { url: string }[];
            isActive?: boolean;
        };
    sameDay?: PreorderSameDayRules;
    scheduled?: PreorderScheduledRules;
}

export interface PreorderOrderItem {
    name: string;
    qty: number;
    price: number;
    total: number;
}

export interface PreorderOrder {
    _id: string;
    orderNumber: string;
    status: string;
    paymentStatus?: string;
    fulfillmentMode?: "scheduled" | "sameDay" | string;
    scheduled?: {
        date?: string;
        slotLabel?: string;
        slotStart?: string;
        slotEnd?: string;
    };
    sameDay?: {
        readyWithinHours?: number;
        promisedReadyAt?: string;
    };
    items?: PreorderOrderItem[];
    subtotal?: number;
    totalAmount?: number;
    user?: {
        firstName?: string;
        lastName?: string;
        mobileNumber?: string;
    };
    delivery?: {
        mobileNumber?: string;
        addressLine1?: string;
    };
}

// ─── Constants ───────────────────────────────────────────────────────

export const VENDOR_PREORDER_NOTIFICATION_EVENT =
    "vendor-preorder-notification";

export const PREORDER_STATUS_TABS = [
    { key: "placed", label: "New" },
    { key: "preparing", label: "Preparing" },
    { key: "ready", label: "Ready" },
    { key: "out_for_delivery", label: "Out for delivery" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
];

export const PREORDER_STATUS_LABELS: Record<string, string> = {
    placed: "New",
    preparing: "Preparing",
    ready: "Ready",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

export const PREORDER_STATUS_COLORS: Record<string, string> = {
    placed: "#3B82F6",
    preparing: "#F59E0B",
    ready: "#10B981",
    out_for_delivery: "#6366F1",
    delivered: "#14B8A6",
    cancelled: "#EF4444",
};

/** Seller can only move placed → preparing → ready. */
export const PREORDER_NEXT_STATUS: Record<string, string> = {
    placed: "preparing",
    preparing: "ready",
};

export const PREORDER_ACTION_LABELS: Record<string, string> = {
    preparing: "Start Preparing",
    ready: "Mark Ready",
};

export const PREORDER_CANCELLABLE_STATUSES = ["placed", "preparing"];

/** Rider already has the package once delivery reaches any of these. */
export const PICKUP_DONE_DELIVERY_STATUSES = [
    "pickup_verified",
    "picked_up",
    "out_for_delivery",
    "reached_customer",
    "customer_verification_pending",
    "delivered",
    "failed",
    "returned",
];

// ─── Helpers ─────────────────────────────────────────────────────────

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Backend stores times in UTC but they are IST wall-clock values
 * (scheduled.date is IST midnight). Shift and read the UTC fields so the
 * result is the IST value regardless of the device timezone.
 */
const toIst = (iso?: string): Date | null => {
    if (!iso) return null;

    const time = new Date(iso).getTime();

    return isNaN(time) ? null : new Date(time + IST_OFFSET_MS);
};

const istDayNumber = (date: Date) => Math.floor(date.getTime() / DAY_MS);

/** "Today" / "Tomorrow" / "Tue, 13 Oct" for the IST calendar day. */
export const formatIstDay = (iso?: string): string => {
    const date = toIst(iso);
    if (!date) return "";

    const today = istDayNumber(new Date(Date.now() + IST_OFFSET_MS));
    const diff = istDayNumber(date) - today;

    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";

    return `${WEEKDAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
};

/** "09:00" → "9:00 AM" */
export const formatTime12 = (time?: string): string => {
    if (!time || !/^\d{2}:\d{2}$/.test(time)) return time || "";

    const [hh, mm] = time.split(":");
    const h = Number(hh);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;

    return `${h12}:${mm} ${ampm}`;
};

/** "Today, 6:30 PM" in IST for a full timestamp. */
export const formatIstDateTime = (iso?: string): string => {
    const date = toIst(iso);
    if (!date) return "";

    const hh = String(date.getUTCHours()).padStart(2, "0");
    const mm = String(date.getUTCMinutes()).padStart(2, "0");

    return `${formatIstDay(iso)}, ${formatTime12(`${hh}:${mm}`)}`;
};

export const formatCurrency = (amount?: number) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

export const getConfigProductId = (config: PreorderConfig): string =>
    typeof config.product === "string"
        ? config.product
        : config.product?._id || "";

/** "Same-day 3h · Scheduled 2 slots" */
export const getRulesSummary = (config: PreorderConfig): string => {
    const parts: string[] = [];

    if (config.sameDay?.enabled) {
        parts.push(`Same-day ${config.sameDay.readyWithinHours}h`);
    }

    if (config.scheduled?.enabled) {
        const count = config.scheduled.slots?.length || 0;
        parts.push(`Scheduled ${count} slot${count !== 1 ? "s" : ""}`);
    }

    return parts.join(" · ") || "No mode enabled";
};

/** When the order is due, as shown on the queue card. */
export const getFulfillmentLabel = (order: PreorderOrder): string => {
    if (order.fulfillmentMode === "scheduled") {
        const day = formatIstDay(order.scheduled?.date);
        const window = [
            formatTime12(order.scheduled?.slotStart),
            formatTime12(order.scheduled?.slotEnd),
        ]
            .filter(Boolean)
            .join(" – ");
        const label = order.scheduled?.slotLabel
            ? ` (${order.scheduled.slotLabel})`
            : "";

        return [day, window].filter(Boolean).join(", ") + label;
    }

    const promised = formatIstDateTime(order.sameDay?.promisedReadyAt);

    return promised ? `Ready by ${promised}` : "Same day";
};
