import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
import {
    View,
    Text,
    DeviceEventEmitter,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Dimensions,
    Image,
    StyleSheet,
    TextInput,
    ScrollView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";

import AppBar from "../../components/utils/AppBar";
import Pagination from "../../components/utils/Pagination";
import { colors, localStyles, textStyles } from "../../constants/AppThem";
import { getRequest, putRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";
import { getUserData } from "../../components/AsyncStorage/AsyncStorage";

const { height } = Dimensions.get("window");

// ─── Types ───────────────────────────────────────────────────────────

interface OrderItem {
    product: string;
    variant?: string;
    name: string;
    price: number;
    mrp?: number;
    quantity: number;
    images?: { url: string }[];
    total: number;
}

interface Address {
    name?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
}

interface PaymentMethod {
    _id: string;
    name: string;
    type: string;
}

interface OrderUser {
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
}

interface Driver {
    _id: string;
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
}
interface Order {
    _id: string;
    id?: string;

    parentOrder?: string | { _id?: string };
    orderNumber: string;
    vendorOrderNumber?: string;

    items: OrderItem[];

    user?: OrderUser;
    driver?: Driver;

    vendor?: string | {
        _id?: string;
        firstName?: string;
        lastName?: string;
        mobileNumber?: string;
        shopName?: string;
        businessName?: string;
    };

    billingAddress?: Address;
    shippingAddress?: Address;

    paymentMethod?: PaymentMethod;

    subtotal: number;
    discount: number;
    gstAmount: number;
    shippingCharge: number;
    totalAmount: number;

    status: string;
    sellerStatus?: string;
    deliveryStatus?: string;
    paymentStatus: string;

    sellerAcceptDeadlineAt?: string;
    sellerAcceptedAt?: string;
    pickingStartedAt?: string;
    packingStartedAt?: string;
    readyForPickupAt?: string;
    handedToRiderAt?: string;

    createdAt: string;
    updatedAt: string;
}

interface OrdersScreenProps {
    route?: {
        params?: {
            status?: string;
            sellerStatus?: string;
            vendorOrderId?: string;
            orderId?: string;
            notificationRefreshKey?: string | number;
        };
    };
    navigation?: any;
}

const VENDOR_ORDER_NOTIFICATION_EVENT =
    "vendor-order-notification";

// ─── Seller Flow ─────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { _id: "all", name: "All Orders" },
    { _id: "placed", name: "New Orders" },
    { _id: "seller_accepted", name: "Accepted" },
    { _id: "picking_products", name: "Picking Products" },
    { _id: "packing_order", name: "Packing Order" },
    { _id: "ready_for_pickup", name: "Ready for Pickup" },
    { _id: "shipped", name: "Picked Up / Shipped" },
    { _id: "delivered", name: "Delivered" },
    { _id: "cancelled", name: "Cancelled" },
    { _id: "returned", name: "Returned" },
];

const STATUS_FLOW: Record<string, string> = {
    placed: "seller_accepted",
    seller_accepted: "picking_products",
    picking_products: "packing_order",
    packing_order: "ready_for_pickup",
};

const ACTION_LABELS: Record<string, string> = {
    seller_accepted: "Accept Order",
    picking_products: "Start Picking Products",
    packing_order: "Start Packing Order",
    ready_for_pickup: "Mark Ready for Pickup",
};

const STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    placed: "New Order",
    seller_accepted: "Accepted",
    picking_products: "Picking Products",
    packing_order: "Packing Order",
    ready_for_pickup: "Ready for Pickup",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    returned: "Returned",
};

const SELLER_STATUS_LABELS: Record<string, string> = {
    pending_acceptance: "Pending Acceptance",
    accepted: "Accepted",
    picking_products: "Picking Products",
    packing_order: "Packing Order",
    ready_for_pickup: "Ready for Pickup",
    handed_to_rider: "Handed to Rider",
    cancelled: "Cancelled",
};

const DELIVERY_STATUS_LABELS: Record<string, string> = {
    not_assigned: "Driver Not Assigned",
    assigned: "Driver Assigned",
    delivery_accepted: "Delivery Accepted",
    proceeding_to_store: "Rider Proceeding to Store",
    reached_store: "Rider Reached Store",
    waiting_for_packing: "Rider Waiting for Packing",
    pickup_verification_pending: "Pickup Verification Pending",
    pickup_verified: "Pickup Verified",
    picked_up: "Picked Up",
    out_for_delivery: "Out for Delivery",
    reached_customer: "Reached Customer",
    customer_verification_pending: "Customer Verification Pending",
    delivered: "Delivered",
    failed: "Failed",
    returned: "Returned",
};

const FINAL_OR_RIDER_STATUSES = [
    "ready_for_pickup",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
];

const normalizeOrderStatus = (status?: string) => {
    const normalized = String(status || "all").toLowerCase();

    return STATUS_OPTIONS.some((opt) => opt._id === normalized)
        ? normalized
        : "all";
};

const canVendorUpdateStatus = (status: string) => {
    return Boolean(STATUS_FLOW[status]) && !FINAL_OR_RIDER_STATUSES.includes(status);
};

const canShowPickupOtp = (order: Order) => {
    const blockedDeliveryStatuses = [
        "pickup_verified",
        "picked_up",
        "out_for_delivery",
        "reached_customer",
        "customer_verification_pending",
        "delivered",
        "failed",
        "returned",
    ];

    return (
        order.status === "ready_for_pickup" &&
        order.sellerStatus !== "handed_to_rider" &&
        !blockedDeliveryStatuses.includes(order.deliveryStatus || "")
    );
};

const formatStatusLabel = (status?: string) => {
    if (!status) return "-";
    return STATUS_LABELS[status] || status.replace(/_/g, " ").toUpperCase();
};

const formatSellerStatusLabel = (status?: string) => {
    if (!status) return "-";
    return SELLER_STATUS_LABELS[status] || status.replace(/_/g, " ").toUpperCase();
};

const formatDeliveryStatusLabel = (status?: string) => {
    if (!status) return "-";
    return DELIVERY_STATUS_LABELS[status] || status.replace(/_/g, " ").toUpperCase();
};

const getStatusColor = (status?: string) => {
    switch (status) {
        case "placed":
            return colors.primary;

        case "seller_accepted":
        case "picking_products":
            return colors.primary;

        case "packing_order":
            return colors.warning;

        case "ready_for_pickup":
        case "delivered":
            return colors.success;

        case "shipped":
            return colors.primary;

        case "cancelled":
        case "returned":
            return colors.error;

        default:
            return colors.placeholder;
    }
};

const getNextStatusLabel = (nextStatus?: string) => {
    if (!nextStatus) return null;
    return ACTION_LABELS[nextStatus] || "Update Status";
};

const getRemarkForStatus = (status: string) => {
    switch (status) {
        case "seller_accepted":
            return "Seller accepted the order.";
        case "picking_products":
            return "Seller started picking products.";
        case "packing_order":
            return "Seller started packing the order.";
        case "ready_for_pickup":
            return "Order is ready for rider pickup.";
        default:
            return "Order status updated.";
    }
};

const formatDate = (iso?: string) => {
    if (!iso) return "-";

    const d = new Date(iso);

    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatCurrency = (amount?: number) => {
    return `₹${Number(amount || 0).toFixed(2)}`;
};

const getCustomerName = (order: Order) => {
    const addressName = order.shippingAddress?.name;

    if (addressName) {
        return addressName;
    }

    const firstName = order.user?.firstName || "";
    const lastName = order.user?.lastName || "";

    return `${firstName} ${lastName}`.trim() || "Customer";
};

const getOrderItemsCount = (order: Order) => {
    const items = Array.isArray(order?.items) ? order.items : [];

    return items.reduce((sum, item) => {
        return sum + Number(item?.quantity || 0);
    }, 0);
};

const extractOrdersPayload = (json: any) => {
    const data = json?.data;

    if (Array.isArray(data)) {
        return {
            items: data,
            totalPages: json?.pagination?.totalPages || 1,
        };
    }

    return {
        items: data?.items || [],
        totalPages: data?.totalPages || json?.pagination?.totalPages || 1,
    };
};

const showToast = (
    type: "success" | "error" | "info",
    text1: string,
    text2?: string
) => {
    Toast.show({
        type,
        text1,
        text2,
        position: "top",
        visibilityTime: 2500,
        autoHide: true,
        topOffset: 45,
    });
};

// ─── Confirm Status Modal ────────────────────────────────────────────

const ConfirmStatusModal = ({
    visible,
    order,
    nextStatus,
    onCancel,
    onConfirm,
    loading,
}: {
    visible: boolean;
    order: Order | null;
    nextStatus: string;
    onCancel: () => void;
    onConfirm: () => void;
    loading: boolean;
}) => {
    if (!order) return null;

    const label = getNextStatusLabel(nextStatus);
    const statusColor = getStatusColor(nextStatus);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalBackdrop}>
                <View style={styles.confirmSheet}>
                    <View
                        style={[
                            styles.confirmIcon,
                            { backgroundColor: statusColor + "18" },
                        ]}
                    >
                        <Ionicons
                            name="checkmark-done-outline"
                            size={30}
                            color={statusColor}
                        />
                    </View>

                    <Text style={styles.confirmTitle}>{label}</Text>

                    <Text style={styles.confirmDesc}>
                        Are you sure you want to update order{" "}
                        <Text style={styles.confirmStrong}>
                            {order.orderNumber}
                        </Text>{" "}
                        to{" "}
                        <Text style={styles.confirmStrong}>
                            {formatStatusLabel(nextStatus)}
                        </Text>
                        ?
                    </Text>

                    {nextStatus === "ready_for_pickup" && (
                        <View style={styles.readyInfoBox}>
                            <Ionicons
                                name="information-circle-outline"
                                size={18}
                                color={colors.primary}
                            />
                            <Text style={styles.readyInfoText}>
                                After this, the rider will verify pickup using OTP and collect the package.
                            </Text>
                        </View>
                    )}

                    <View style={styles.confirmActions}>
                        <TouchableOpacity
                            style={[styles.confirmBtn, styles.confirmCancelBtn]}
                            onPress={onCancel}
                            disabled={loading}
                        >
                            <Text style={styles.confirmCancelText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.confirmBtn,
                                styles.confirmOkBtn,
                                { backgroundColor: statusColor },
                                loading && { opacity: 0.7 },
                            ]}
                            onPress={() => {
                                if (!loading) {
                                    onConfirm();
                                }
                            }}
                            disabled={loading}
                            activeOpacity={loading ? 1 : 0.8}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.confirmOkText}>Confirm</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ─── Pickup OTP Modal ────────────────────────────────────────────────

const PickupOtpModal = ({
    visible,
    orderNumber,
    pickupOtp,
    onClose,
}: {
    visible: boolean;
    orderNumber: string;
    pickupOtp: string;
    onClose: () => void;
}) => {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalBackdrop}>
                <View style={styles.otpSheet}>
                    <View style={styles.otpIconBox}>
                        <Ionicons
                            name="keypad-outline"
                            size={32}
                            color={colors.primary}
                        />
                    </View>

                    <Text style={styles.otpTitle}>Pickup OTP</Text>

                    <Text style={styles.otpDesc}>
                        Share this OTP with the rider to verify pickup for order{" "}
                        <Text style={styles.confirmStrong}>{orderNumber}</Text>.
                    </Text>

                    <View style={styles.otpCodeBox}>
                        <Text style={styles.otpCode}>{pickupOtp}</Text>
                    </View>

                    <View style={styles.readyInfoBox}>
                        <Ionicons
                            name="shield-checkmark-outline"
                            size={18}
                            color={colors.primary}
                        />
                        <Text style={styles.readyInfoText}>
                            Rider should enter this OTP only after collecting the package from you.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.otpCloseBtn}
                        onPress={onClose}
                    >
                        <Text style={styles.otpCloseText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ─── Dropdown Picker ─────────────────────────────────────────────────

const DropdownPicker = ({
    label,
    value,
    placeholder,
    options,
    onSelect,
    loading,
}: {
    label: string;
    value: string;
    placeholder: string;
    options: any[];
    onSelect: (opt: any) => void;
    loading?: boolean;
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const selected = options.find((o) => o._id === value);

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;

        return options.filter((o) =>
            o.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [search, options]);

    return (
        <View style={ddStyles.wrapper}>
            <Text style={ddStyles.label}>{label}</Text>

            <TouchableOpacity
                style={ddStyles.trigger}
                onPress={() => setOpen(true)}
                activeOpacity={0.8}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <>
                        <Text
                            style={[
                                ddStyles.triggerText,
                                !selected && ddStyles.placeholder,
                            ]}
                            numberOfLines={1}
                        >
                            {selected ? selected.name : placeholder}
                        </Text>

                        <Ionicons
                            name="chevron-down-outline"
                            size={16}
                            color={colors.placeholder}
                        />
                    </>
                )}
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="fade">
                <TouchableOpacity
                    style={ddStyles.backdrop}
                    activeOpacity={1}
                    onPress={() => setOpen(false)}
                >
                    <View style={[ddStyles.sheet, { height: height * 0.75 }]}>
                        <View style={ddStyles.sheetHeader}>
                            <Text style={ddStyles.sheetTitle}>{label}</Text>

                            <TouchableOpacity onPress={() => setOpen(false)}>
                                <Ionicons
                                    name="close-outline"
                                    size={22}
                                    color={colors.secondary}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={ddStyles.searchContainer}>
                            <Ionicons
                                name="search-outline"
                                size={16}
                                color={colors.placeholder}
                            />

                            <TextInput
                                placeholder="Search..."
                                value={search}
                                onChangeText={setSearch}
                                style={ddStyles.searchInput}
                                placeholderTextColor={colors.placeholder}
                            />

                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch("")}>
                                    <Ionicons
                                        name="close-circle"
                                        size={16}
                                        color={colors.placeholder}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>

                        <FlatList
                            data={filteredOptions}
                            keyExtractor={(item) => item._id}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        ddStyles.option,
                                        item._id === value && ddStyles.optionSelected,
                                    ]}
                                    onPress={() => {
                                        onSelect(item);
                                        setOpen(false);
                                        setSearch("");
                                    }}
                                >
                                    <Text
                                        style={[
                                            ddStyles.optionText,
                                            item._id === value && ddStyles.optionTextSelected,
                                        ]}
                                    >
                                        {item.name}
                                    </Text>

                                    {item._id === value && (
                                        <Ionicons
                                            name="checkmark"
                                            size={16}
                                            color={colors.primary}
                                        />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={ddStyles.empty}>
                                    No results found
                                </Text>
                            }
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

// ─── Order Detail Bottom Sheet ───────────────────────────────────────

const OrderDetailSheet = ({
    visible,
    order,
    onClose,
    onUpdateStatus,
    onShowPickupOtp,
    updatingOrderId,
    pickupOtpLoadingId,
}: {
    visible: boolean;
    order: Order | null;
    onClose: () => void;
    onUpdateStatus: (order: Order, nextStatus: string) => void;
    onShowPickupOtp: (order: Order) => void;
    updatingOrderId: string | null;
    pickupOtpLoadingId: string | null;
}) => {
    if (!order) return null;

    const nextStatus = STATUS_FLOW[order.status];
    const showActionButton = canVendorUpdateStatus(order.status);
    const showPickupOtpButton = canShowPickupOtp(order);
    const isUpdating = updatingOrderId === order._id;
    const isPickupOtpLoading = pickupOtpLoadingId === getOrderIdForApi(order);
    const statusColor = getStatusColor(order.status);
    const btnLabel = getNextStatusLabel(nextStatus);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={detailStyles.overlay}>
                <TouchableOpacity
                    style={detailStyles.backdrop}
                    onPress={onClose}
                    activeOpacity={1}
                />

                <View style={detailStyles.sheet}>
                    <View style={detailStyles.dragHandle} />

                    <View style={detailStyles.sheetHeader}>
                        <View>
                            <Text style={detailStyles.sheetTitle}>Order Details</Text>
                            <Text style={detailStyles.orderNumber}>
                                {order.orderNumber}
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={onClose}
                            style={detailStyles.closeBtn}
                        >
                            <Ionicons
                                name="close"
                                size={24}
                                color={colors.secondary}
                            />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={detailStyles.scrollContent}
                    >
                        <View style={detailStyles.statusRow}>
                            <View
                                style={[
                                    detailStyles.statusBadge,
                                    { backgroundColor: statusColor + "20" },
                                ]}
                            >
                                <Text
                                    style={[
                                        detailStyles.statusText,
                                        { color: statusColor },
                                    ]}
                                >
                                    {formatStatusLabel(order.status).toUpperCase()}
                                </Text>
                            </View>

                            <View
                                style={[
                                    detailStyles.statusBadge,
                                    {
                                        backgroundColor:
                                            order.paymentStatus === "success"
                                                ? colors.success + "20"
                                                : colors.warning + "20",
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        detailStyles.statusText,
                                        {
                                            color:
                                                order.paymentStatus === "success"
                                                    ? colors.success
                                                    : colors.warning,
                                        },
                                    ]}
                                >
                                    {order.paymentStatus === "success" ? "PAID" : "PAYMENT PENDING"}
                                </Text>
                            </View>
                        </View>

                        <View style={detailStyles.infoRow}>
                            <Ionicons
                                name="calendar-outline"
                                size={16}
                                color={colors.placeholder}
                            />
                            <Text style={detailStyles.infoText}>
                                {formatDate(order.createdAt)}
                            </Text>
                        </View>

                        <View style={detailStyles.infoRow}>
                            <Ionicons
                                name="person-outline"
                                size={16}
                                color={colors.placeholder}
                            />
                            <Text style={detailStyles.infoText}>
                                {getCustomerName(order)}
                            </Text>
                        </View>

                        <View style={detailStyles.divider} />

                        <View style={detailStyles.section}>
                            <Text style={detailStyles.sectionTitle}>Seller Flow</Text>

                            <View style={detailStyles.flowCard}>
                                <View style={detailStyles.flowRow}>
                                    <Text style={detailStyles.flowLabel}>Seller Status</Text>
                                    <Text style={detailStyles.flowValue}>
                                        {formatSellerStatusLabel(order.sellerStatus)}
                                    </Text>
                                </View>

                                <View style={detailStyles.flowRow}>
                                    <Text style={detailStyles.flowLabel}>Delivery Status</Text>
                                    <Text style={detailStyles.flowValue}>
                                        {formatDeliveryStatusLabel(order.deliveryStatus)}
                                    </Text>
                                </View>

                                {order.sellerAcceptDeadlineAt && (
                                    <View style={detailStyles.flowRow}>
                                        <Text style={detailStyles.flowLabel}>Accept Deadline</Text>
                                        <Text style={detailStyles.flowValue}>
                                            {formatDate(order.sellerAcceptDeadlineAt)}
                                        </Text>
                                    </View>
                                )}

                                {order.readyForPickupAt && (
                                    <View style={detailStyles.flowRow}>
                                        <Text style={detailStyles.flowLabel}>Ready At</Text>
                                        <Text style={detailStyles.flowValue}>
                                            {formatDate(order.readyForPickupAt)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={detailStyles.divider} />

                        <View style={detailStyles.section}>
                            <Text style={detailStyles.sectionTitle}>
                                Items ({getOrderItemsCount(order)})
                            </Text>

                            {order.items.map((item, idx) => (
                                <View key={idx} style={detailStyles.itemCard}>
                                    {item.images?.[0]?.url ? (
                                        <Image
                                            source={{ uri: item.images[0].url }}
                                            style={detailStyles.itemImage}
                                        />
                                    ) : (
                                        <View style={detailStyles.itemImagePlaceholder}>
                                            <Ionicons
                                                name="cube-outline"
                                                size={24}
                                                color={colors.placeholder}
                                            />
                                        </View>
                                    )}

                                    <View style={detailStyles.itemDetails}>
                                        <Text
                                            style={detailStyles.itemName}
                                            numberOfLines={2}
                                        >
                                            {item.name}
                                        </Text>

                                        <Text style={detailStyles.itemMeta}>
                                            Qty: {item.quantity} × {formatCurrency(item.price)}
                                        </Text>

                                        <Text style={detailStyles.itemTotal}>
                                            {formatCurrency(item.total)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={detailStyles.divider} />

                        <View style={detailStyles.section}>
                            <Text style={detailStyles.sectionTitle}>Customer Address</Text>

                            <View style={detailStyles.addressCard}>
                                <Ionicons
                                    name="location-outline"
                                    size={20}
                                    color={colors.primary}
                                />

                                <View style={detailStyles.addressContent}>
                                    <Text style={detailStyles.addressName}>
                                        {order.shippingAddress?.name || getCustomerName(order)}
                                    </Text>

                                    {order.shippingAddress?.phone && (
                                        <Text style={detailStyles.addressText}>
                                            {order.shippingAddress.phone}
                                        </Text>
                                    )}

                                    <Text style={detailStyles.addressText}>
                                        {order.shippingAddress?.addressLine1 || ""}
                                        {order.shippingAddress?.addressLine2
                                            ? `, ${order.shippingAddress.addressLine2}`
                                            : ""}
                                    </Text>

                                    <Text style={detailStyles.addressText}>
                                        {order.shippingAddress?.city || ""}, {order.shippingAddress?.state || ""} -{" "}
                                        {order.shippingAddress?.pincode || ""}
                                    </Text>

                                    <Text style={detailStyles.addressText}>
                                        {order.shippingAddress?.country || "India"}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={detailStyles.divider} />

                        <View style={detailStyles.section}>
                            <Text style={detailStyles.sectionTitle}>Payment</Text>

                            <View style={detailStyles.paymentCard}>
                                <Ionicons
                                    name="card-outline"
                                    size={20}
                                    color={colors.primary}
                                />

                                <View style={detailStyles.paymentContent}>
                                    <Text style={detailStyles.paymentName}>
                                        {order.paymentMethod?.name || "Payment"}
                                    </Text>

                                    <Text style={detailStyles.paymentType}>
                                        {order.paymentMethod?.type?.toUpperCase() || ""}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={detailStyles.divider} />

                        <View style={detailStyles.section}>
                            <Text style={detailStyles.sectionTitle}>Price Details</Text>

                            <View style={detailStyles.priceRow}>
                                <Text style={detailStyles.priceLabel}>Subtotal</Text>
                                <Text style={detailStyles.priceValue}>
                                    {formatCurrency(order.subtotal)}
                                </Text>
                            </View>

                            {Number(order.discount || 0) > 0 && (
                                <View style={detailStyles.priceRow}>
                                    <Text
                                        style={[
                                            detailStyles.priceLabel,
                                            { color: colors.success },
                                        ]}
                                    >
                                        Discount
                                    </Text>

                                    <Text
                                        style={[
                                            detailStyles.priceValue,
                                            { color: colors.success },
                                        ]}
                                    >
                                        -{formatCurrency(order.discount)}
                                    </Text>
                                </View>
                            )}

                            {Number(order.gstAmount || 0) > 0 && (
                                <View style={detailStyles.priceRow}>
                                    <Text style={detailStyles.priceLabel}>GST</Text>
                                    <Text style={detailStyles.priceValue}>
                                        {formatCurrency(order.gstAmount)}
                                    </Text>
                                </View>
                            )}

                            <View style={detailStyles.priceRow}>
                                <Text style={detailStyles.priceLabel}>Shipping</Text>
                                <Text style={detailStyles.priceValue}>
                                    {formatCurrency(order.shippingCharge)}
                                </Text>
                            </View>

                            <View style={[detailStyles.priceRow, detailStyles.totalRow]}>
                                <Text style={detailStyles.totalLabel}>Total Amount</Text>
                                <Text style={detailStyles.totalValue}>
                                    {formatCurrency(order.totalAmount)}
                                </Text>
                            </View>
                        </View>

                        <View
                            style={{
                                height:
                                    (showActionButton && btnLabel) || showPickupOtpButton
                                        ? 130
                                        : 24,
                            }}
                        />
                    </ScrollView>

                    {((showActionButton && btnLabel) || showPickupOtpButton) && (
                        <View style={detailStyles.actionContainer}>
                            {showPickupOtpButton && (
                                <TouchableOpacity
                                    style={[
                                        detailStyles.pickupOtpBtn,
                                        isPickupOtpLoading && { opacity: 0.7 },
                                    ]}
                                    onPress={() => onShowPickupOtp(order)}
                                    disabled={isPickupOtpLoading}
                                >
                                    {isPickupOtpLoading ? (
                                        <ActivityIndicator
                                            size="small"
                                            color={colors.primary}
                                        />
                                    ) : (
                                        <>
                                            <Ionicons
                                                name="keypad-outline"
                                                size={18}
                                                color={colors.primary}
                                            />
                                            <Text style={detailStyles.pickupOtpBtnText}>
                                                Show Pickup OTP
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}

                            {showActionButton && btnLabel && (
                                <TouchableOpacity
                                    style={[
                                        detailStyles.actionBtn,
                                        { backgroundColor: statusColor },
                                        isUpdating && { opacity: 0.7 },
                                    ]}
                                    onPress={() => onUpdateStatus(order, nextStatus)}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Text style={detailStyles.actionBtnText}>
                                                {btnLabel}
                                            </Text>
                                            <Ionicons
                                                name="arrow-forward"
                                                size={18}
                                                color="#fff"
                                            />
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

// ─── Order Card ──────────────────────────────────────────────────────

const OrderCard = ({
    order,
    onUpdateStatus,
    onShowPickupOtp,
    updatingOrderId,
    pickupOtpLoadingId,
    onViewDetail,
}: {
    order: Order;
    onUpdateStatus: (order: Order, nextStatus: string) => void;
    onShowPickupOtp: (order: Order) => void;
    updatingOrderId: string | null;
    pickupOtpLoadingId: string | null;
    onViewDetail: (order: Order) => void;
}) => {
    const nextStatus = STATUS_FLOW[order.status];
    const showActionButton = canVendorUpdateStatus(order.status);
    const showPickupOtpButton = canShowPickupOtp(order);
    const isUpdating = updatingOrderId === order._id;
    const isPickupOtpLoading = pickupOtpLoadingId === getOrderIdForApi(order);
    const statusColor = getStatusColor(order.status);
    const btnLabel = getNextStatusLabel(nextStatus);

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onViewDetail(order)}
            activeOpacity={0.9}
        >
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                </View>

                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: statusColor + "15" },
                    ]}
                >
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {formatStatusLabel(order.status).toUpperCase()}
                    </Text>
                </View>
            </View>

            <View style={styles.flowMiniBox}>
                <View style={styles.flowMiniItem}>
                    <Text style={styles.flowMiniLabel}>Seller</Text>
                    <Text style={styles.flowMiniValue} numberOfLines={1}>
                        {formatSellerStatusLabel(order.sellerStatus)}
                    </Text>
                </View>

                <View style={styles.flowMiniDivider} />

                <View style={styles.flowMiniItem}>
                    <Text style={styles.flowMiniLabel}>Rider</Text>
                    <Text style={styles.flowMiniValue} numberOfLines={1}>
                        {formatDeliveryStatusLabel(order.deliveryStatus)}
                    </Text>
                </View>
            </View>

            {order.items.slice(0, 2).map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                    {item.images?.[0]?.url ? (
                        <Image
                            source={{ uri: item.images[0].url }}
                            style={styles.itemImage}
                        />
                    ) : (
                        <View style={styles.itemImagePlaceholder}>
                            <Ionicons
                                name="cube-outline"
                                size={20}
                                color={colors.placeholder}
                            />
                        </View>
                    )}

                    <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={2}>
                            {item.name}
                        </Text>

                        <Text style={styles.itemMeta}>
                            Qty: {item.quantity} × {formatCurrency(item.price)}
                        </Text>

                        <Text style={styles.itemTotal}>
                            {formatCurrency(item.total)}
                        </Text>
                    </View>
                </View>
            ))}

            {order.items.length > 2 && (
                <Text style={styles.moreItemsText}>
                    +{order.items.length - 2} more item(s)
                </Text>
            )}

            <View style={styles.addressBox}>
                <Ionicons
                    name="location-outline"
                    size={14}
                    color={colors.placeholder}
                />

                <Text style={styles.addressText} numberOfLines={2}>
                    {order.shippingAddress?.addressLine1 || "Address not available"},{" "}
                    {order.shippingAddress?.city || ""} - {order.shippingAddress?.pincode || ""}
                </Text>
            </View>

            <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>
                    {order.paymentMethod?.name || "Payment"}
                </Text>

                <Text
                    style={[
                        styles.paymentStatus,
                        {
                            color:
                                order.paymentStatus === "success"
                                    ? colors.success
                                    : colors.warning,
                        },
                    ]}
                >
                    {order.paymentStatus === "success" ? "Paid" : "Pending"}
                </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>
                    {formatCurrency(order.totalAmount)}
                </Text>
            </View>

            {showActionButton && btnLabel && (
                <TouchableOpacity
                    style={[
                        styles.actionBtn,
                        { backgroundColor: statusColor },
                        isUpdating && { opacity: 0.7 },
                    ]}
                    onPress={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(order, nextStatus);
                    }}
                    disabled={isUpdating}
                >
                    {isUpdating ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.actionBtnText}>{btnLabel}</Text>
                            <Ionicons
                                name="arrow-forward"
                                size={16}
                                color="#fff"
                            />
                        </>
                    )}
                </TouchableOpacity>
            )}

            {showPickupOtpButton && (
                <TouchableOpacity
                    style={[
                        styles.pickupOtpBtn,
                        isPickupOtpLoading && { opacity: 0.7 },
                    ]}
                    onPress={(e) => {
                        e.stopPropagation();
                        onShowPickupOtp(order);
                    }}
                    disabled={isPickupOtpLoading}
                >
                    {isPickupOtpLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <>
                            <Ionicons
                                name="keypad-outline"
                                size={16}
                                color={colors.primary}
                            />
                            <Text style={styles.pickupOtpBtnText}>
                                Show Pickup OTP
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

// ─── Main Screen ─────────────────────────────────────────────────────

const getLoggedInVendorId = async () => {
    const { user } = await getUserData();

    return (
        user?.user?._id ||
        user?._id ||
        user?.id ||
        ""
    );
};

const getOrderIdForApi = (order: Order | null) => {
    if (!order) return "";

    return (
        order._id ||
        order.id ||
        ""
    );
};

const getParentOrderId = (order: Order | null) => {
    if (!order) return "";

    if (typeof order.parentOrder === "string") {
        return order.parentOrder;
    }

    return order.parentOrder?._id || "";
};

const orderMatchesNotificationTarget = (order: Order, targetId: string) => {
    if (!targetId) return false;

    return (
        getOrderIdForApi(order) === targetId ||
        getParentOrderId(order) === targetId ||
        order.orderNumber === targetId ||
        order.vendorOrderNumber === targetId
    );
};

const extractPickupOtpPayload = (json: any) => {
    const data = json?.data || {};

    const pickupOtp =
        data?.pickupOtp ||
        data?.pickupVerification?.pickupOtp ||
        data?.order?.pickupVerification?.pickupOtp ||
        "";

    const pickupQrCode =
        data?.pickupQrCode ||
        data?.pickupVerification?.pickupQrCode ||
        data?.order?.pickupVerification?.pickupQrCode ||
        "";

    const orderNumber =
        data?.orderNumber ||
        data?.order?.orderNumber ||
        "";

    const vendorOrderNumber =
        data?.vendorOrderNumber ||
        data?.order?.vendorOrderNumber ||
        "";

    return {
        pickupOtp,
        pickupQrCode,
        orderNumber,
        vendorOrderNumber,
    };
};

const OrdersScreen = ({ route, navigation }: OrdersScreenProps) => {
    const initialStatus = normalizeOrderStatus(
        route?.params?.status || route?.params?.sellerStatus
    );

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState(initialStatus);
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [pickupOtpLoadingId, setPickupOtpLoadingId] = useState<string | null>(null);

    const fetchingRef = useRef(false);
    const statusFilterRef = useRef(initialStatus);
    const openedNotificationOrderRef = useRef("");

    /**
     * Ref locks prevent duplicate API calls from fast double taps.
     * React state is async, so ref lock is safer than only using loading state.
     */
    const statusUpdatingRef = useRef(false);
    const pickupOtpFetchingRef = useRef(false);

    const [detailSheet, setDetailSheet] = useState({
        visible: false,
        order: null as Order | null,
    });

    const [confirmModal, setConfirmModal] = useState({
        visible: false,
        order: null as Order | null,
        nextStatus: "",
    });

    const [pickupOtpModal, setPickupOtpModal] = useState({
        visible: false,
        orderNumber: "",
        pickupOtp: "",
    });

    const fetchOrders = useCallback(
        async (
            pageNum: number,
            isRefresh = false,
            statusOverride?: string
        ) => {
            if (fetchingRef.current && !isRefresh) return;

            fetchingRef.current = true;

            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const finalStatus = normalizeOrderStatus(
                statusOverride ?? statusFilterRef.current
            );

            try {
                const { user } = await getUserData();
                const vendorId = user?.user?._id ?? user?._id ?? "";

                if (!vendorId) {
                    setOrders([]);
                    setTotalPages(1);
                    setPage(1);
                    return;
                }

                const params: Record<string, any> = {
                    vendorId,
                    page: String(pageNum),
                    limit: "10",
                };

                if (finalStatus !== "all") {
                    params.status = finalStatus;
                }

                const json = await getRequest(
                    API_ENDPOINTS.VENDORORDERSGETALL,
                    params,
                    true,
                    false
                );

                if (json?.success) {
                    const payload = extractOrdersPayload(json);

                    setOrders(payload.items);
                    setTotalPages(payload.totalPages);
                    setPage(pageNum);
                } else {
                    setOrders([]);
                    setTotalPages(1);
                    setPage(1);
                }
            } catch (err) {
                console.error("Fetch orders error:", err);
                setOrders([]);
                setTotalPages(1);
            } finally {
                fetchingRef.current = false;
                setLoading(false);
                setRefreshing(false);
            }
        },
        []
    );

    useFocusEffect(
        useCallback(() => {
            const nextStatus = normalizeOrderStatus(
                route?.params?.status || route?.params?.sellerStatus
            );

            statusFilterRef.current = nextStatus;

            setStatusFilter((prev) =>
                prev === nextStatus ? prev : nextStatus
            );

            setPage(1);
            setTotalPages(1);

            fetchOrders(1, false, nextStatus);

            return () => { };
        }, [
            route?.params?.status,
            route?.params?.sellerStatus,
            route?.params?.notificationRefreshKey,
            fetchOrders,
        ])
    );

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener(
            VENDOR_ORDER_NOTIFICATION_EVENT,
            () => {
                fetchOrders(1, true, statusFilterRef.current);
            }
        );

        return () => {
            subscription.remove();
        };
    }, [fetchOrders]);

    const notificationTargetOrderId = String(
        route?.params?.vendorOrderId ||
        route?.params?.orderId ||
        ""
    ).trim();

    useEffect(() => {
        openedNotificationOrderRef.current = "";
    }, [
        notificationTargetOrderId,
        route?.params?.notificationRefreshKey,
    ]);

    useEffect(() => {
        if (!notificationTargetOrderId) return;

        const matchingOrder = orders.find((order) =>
            orderMatchesNotificationTarget(order, notificationTargetOrderId)
        );

        if (!matchingOrder) return;

        const matchedOrderId = getOrderIdForApi(matchingOrder);

        if (openedNotificationOrderRef.current === matchedOrderId) {
            return;
        }

        openedNotificationOrderRef.current = matchedOrderId;
        setDetailSheet({
            visible: true,
            order: matchingOrder,
        });
    }, [orders, notificationTargetOrderId]);

    const handleShowPickupOtp = useCallback(async (order: Order) => {
        if (pickupOtpFetchingRef.current) {
            showToast("info", "Please wait", "Pickup OTP is already being fetched.");
            return;
        }

        const orderId = getOrderIdForApi(order);

        if (!orderId) {
            showToast("error", "Invalid order", "Order ID not found.");
            console.error("Pickup OTP error: orderId missing", order);
            return;
        }

        try {
            pickupOtpFetchingRef.current = true;
            setPickupOtpLoadingId(orderId);

            const vendorId = await getLoggedInVendorId();

            if (!vendorId) {
                showToast("error", "Vendor not found", "Please login again and try.");
                console.error("Pickup OTP error: vendorId missing");
                return;
            }

            const json = await getRequest(
                `${API_ENDPOINTS.VENDORPICKUPOTP}/${orderId}`,
                {
                    vendorId,
                },
                true,
                false
            );

            const otpPayload = extractPickupOtpPayload(json);

            if (json?.success && otpPayload.pickupOtp) {
                setPickupOtpModal({
                    visible: true,
                    orderNumber:
                        otpPayload.vendorOrderNumber ||
                        otpPayload.orderNumber ||
                        order.vendorOrderNumber ||
                        order.orderNumber ||
                        "Order",
                    pickupOtp: otpPayload.pickupOtp,
                });

                showToast(
                    "success",
                    "Pickup OTP ready",
                    `OTP fetched for order ${otpPayload.vendorOrderNumber ||
                    otpPayload.orderNumber ||
                    order.vendorOrderNumber ||
                    order.orderNumber
                    }`
                );
            } else {
                const message =
                    json?.message ||
                    json?.data?.message ||
                    "Unable to fetch pickup OTP.";

                console.error("Pickup OTP fetch failed:", message, json);
                showToast("error", "Pickup OTP failed", message);
            }
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.data?.message ||
                err?.message ||
                "Something went wrong while fetching pickup OTP.";

            console.error("Pickup OTP error:", err);
            showToast("error", "Pickup OTP failed", message);
        } finally {
            pickupOtpFetchingRef.current = false;
            setPickupOtpLoadingId(null);
        }
    }, []);

    const closePickupOtpModal = () => {
        setPickupOtpModal({
            visible: false,
            orderNumber: "",
            pickupOtp: "",
        });
    };

    const handleStatusSelect = useCallback(
        (opt: any) => {
            const nextStatus = normalizeOrderStatus(opt?._id);

            statusFilterRef.current = nextStatus;

            setStatusFilter(nextStatus);
            setPage(1);
            setTotalPages(1);

            fetchOrders(1, false, nextStatus);
        },
        [fetchOrders]
    );

    const handlePageChange = (p: number) => {
        fetchOrders(p, false, statusFilterRef.current);
    };

    const onRefresh = () => {
        fetchOrders(1, true, statusFilterRef.current);
    };

    const handleViewDetail = (order: Order) => {
        setDetailSheet({
            visible: true,
            order,
        });
    };

    const handleCloseDetail = () => {
        setDetailSheet({
            visible: false,
            order: null,
        });
    };

    const handleUpdateStatus = (order: Order, nextStatus: string) => {
        if (!nextStatus) return;

        setConfirmModal({
            visible: true,
            order,
            nextStatus,
        });
    };

    const closeConfirmModal = () => {
        setConfirmModal({
            visible: false,
            order: null,
            nextStatus: "",
        });
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        if (statusUpdatingRef.current) {
            showToast("info", "Please wait", "Order status is already being updated.");
            return;
        }

        try {
            statusUpdatingRef.current = true;
            setUpdatingOrderId(orderId);

            const vendorId = await getLoggedInVendorId();

            if (!vendorId) {
                showToast("error", "Vendor not found", "Please login again and try.");
                console.error("Vendor ID not found");
                return;
            }

            const json = await putRequest(
                `${API_ENDPOINTS.VENDORORDERUPDATESTATUS}/${orderId}`,
                {
                    vendorId,
                    status: newStatus,
                    sellerStatus:
                        newStatus === "seller_accepted"
                            ? "accepted"
                            : newStatus,
                    remark: getRemarkForStatus(newStatus),
                },
                true
            );

            if (json?.success) {
                const updatedOrder = json?.data || {};

                setOrders((prev) =>
                    prev.map((item) => {
                        const currentId = getOrderIdForApi(item);

                        if (currentId !== orderId) {
                            return item;
                        }

                        return {
                            ...item,
                            ...updatedOrder,
                            _id: updatedOrder?._id || item._id,
                            status: updatedOrder?.status || newStatus,
                            sellerStatus:
                                updatedOrder?.sellerStatus ||
                                (newStatus === "seller_accepted"
                                    ? "accepted"
                                    : newStatus),
                        };
                    })
                );

                setDetailSheet((prev) => {
                    if (!prev.order || getOrderIdForApi(prev.order) !== orderId) {
                        return prev;
                    }

                    return {
                        ...prev,
                        order: {
                            ...prev.order,
                            ...updatedOrder,
                            _id: updatedOrder?._id || prev.order._id,
                            status: updatedOrder?.status || newStatus,
                            sellerStatus:
                                updatedOrder?.sellerStatus ||
                                (newStatus === "seller_accepted"
                                    ? "accepted"
                                    : newStatus),
                        } as Order,
                    };
                });

                closeConfirmModal();

                showToast(
                    "success",
                    "Order updated",
                    `Status changed to ${formatStatusLabel(newStatus)}.`
                );

                fetchOrders(page, true, statusFilterRef.current);
            } else {
                const message =
                    json?.message ||
                    json?.data?.message ||
                    "Unable to update order status.";

                console.error("Update status failed:", message, json);
                showToast("error", "Update failed", message);
            }
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.data?.message ||
                err?.message ||
                "Something went wrong while updating order status.";

            console.error("Update status error:", err);
            showToast("error", "Update failed", message);
        } finally {
            statusUpdatingRef.current = false;
            setUpdatingOrderId(null);
        }
    };

    const handleConfirmStatusUpdate = async () => {
        if (statusUpdatingRef.current) {
            showToast("info", "Please wait", "Order status is already being updated.");
            return;
        }

        if (!confirmModal.order || !confirmModal.nextStatus) {
            showToast("error", "Invalid order", "Please select an order again.");
            return;
        }

        const orderId = getOrderIdForApi(confirmModal.order);

        if (!orderId) {
            showToast("error", "Invalid order", "Order ID not found.");
            console.error("Confirm status error: orderId missing", confirmModal.order);
            return;
        }

        await updateOrderStatus(orderId, confirmModal.nextStatus);
    };

    return (
        <View style={localStyles.container}>
            <AppBar
                title="Orders"
                onBack={() => navigation?.goBack?.()}
            />

            <View style={styles.filterWrapper}>
                <DropdownPicker
                    label="Status"
                    value={statusFilter}
                    placeholder="Select Status"
                    options={STATUS_OPTIONS}
                    onSelect={handleStatusSelect}
                    loading={false}
                />
            </View>

            <FlatList
                data={orders}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                    />
                }
                renderItem={({ item }) => (
                    <OrderCard
                        order={item}
                        onUpdateStatus={handleUpdateStatus}
                        onShowPickupOtp={handleShowPickupOtp}
                        updatingOrderId={updatingOrderId}
                        pickupOtpLoadingId={pickupOtpLoadingId}
                        onViewDetail={handleViewDetail}
                    />
                )}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyBox}>
                            <Ionicons
                                name="receipt-outline"
                                size={48}
                                color={colors.placeholder}
                            />

                            <Text style={styles.emptyText}>
                                {statusFilter === "all"
                                    ? "No orders found"
                                    : `No ${formatStatusLabel(statusFilter)} orders`}
                            </Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={
                    loading && !refreshing ? (
                        <View style={{ paddingVertical: 24 }}>
                            <ActivityIndicator
                                size="small"
                                color={colors.primary}
                            />
                        </View>
                    ) : null
                }
            />

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                loading={loading && !refreshing}
            />

            <OrderDetailSheet
                visible={detailSheet.visible}
                order={detailSheet.order}
                onClose={handleCloseDetail}
                onUpdateStatus={handleUpdateStatus}
                onShowPickupOtp={handleShowPickupOtp}
                updatingOrderId={updatingOrderId}
                pickupOtpLoadingId={pickupOtpLoadingId}
            />

            <ConfirmStatusModal
                visible={confirmModal.visible}
                order={confirmModal.order}
                nextStatus={confirmModal.nextStatus}
                onCancel={closeConfirmModal}
                onConfirm={handleConfirmStatusUpdate}
                loading={Boolean(
                    updatingOrderId &&
                    confirmModal.order &&
                    updatingOrderId === confirmModal.order._id
                )}
            />

            <PickupOtpModal
                visible={pickupOtpModal.visible}
                orderNumber={pickupOtpModal.orderNumber}
                pickupOtp={pickupOtpModal.pickupOtp}
                onClose={closePickupOtpModal}
            />

            <Toast />
        </View>
    );
};

// ─── Dropdown Styles ─────────────────────────────────────────────────

const ddStyles = StyleSheet.create({
    wrapper: {
        marginBottom: 14,
    },
    label: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.secondary,
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    trigger: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.formBg,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 13,
        minHeight: 48,
    },
    triggerText: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.secondary,
        flex: 1,
    },
    placeholder: {
        color: colors.placeholder,
    },
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: colors.scaffoldBg,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "60%",
        paddingBottom: 30,
    },
    sheetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder,
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.secondary,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginHorizontal: 16,
        marginVertical: 10,
        gap: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: "#000",
    },
    option: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder,
    },
    optionSelected: {
        backgroundColor: "#EFF6FF",
    },
    optionText: {
        fontSize: 14,
        color: colors.secondary,
    },
    optionTextSelected: {
        color: colors.primary,
        fontWeight: "600",
    },
    empty: {
        textAlign: "center",
        color: colors.placeholder,
        padding: 24,
        fontSize: 13,
    },
});

// ─── Main Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
    filterWrapper: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: colors.formBg,
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: colors.formBorder + "50",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
        gap: 10,
    },
    orderNumber: {
        ...textStyles.titleMedium,
        fontSize: 14,
    },
    orderDate: {
        ...textStyles.bodyMedium,
        color: colors.placeholder,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    flowMiniBox: {
        flexDirection: "row",
        backgroundColor: colors.scaffoldBg,
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.formBorder + "40",
    },
    flowMiniItem: {
        flex: 1,
    },
    flowMiniDivider: {
        width: 1,
        backgroundColor: colors.formBorder,
        marginHorizontal: 10,
    },
    flowMiniLabel: {
        fontSize: 11,
        color: colors.placeholder,
        marginBottom: 2,
        fontWeight: "500",
    },
    flowMiniValue: {
        fontSize: 12,
        color: colors.secondary,
        fontWeight: "700",
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    itemImage: {
        width: 56,
        height: 56,
        borderRadius: 8,
        backgroundColor: colors.scaffoldBg,
        marginRight: 12,
    },
    itemImagePlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 8,
        backgroundColor: colors.scaffoldBg,
        marginRight: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        ...textStyles.bodyMedium,
        fontWeight: "500",
        lineHeight: 20,
    },
    itemMeta: {
        ...textStyles.bodyMedium,
        color: colors.placeholder,
        marginTop: 2,
    },
    itemTotal: {
        ...textStyles.bodyMedium,
        fontWeight: "700",
        marginTop: 2,
    },
    moreItemsText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: "600",
        marginBottom: 8,
    },
    addressBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.scaffoldBg,
        borderRadius: 8,
        padding: 10,
        marginTop: 4,
    },
    addressText: {
        ...textStyles.bodyMedium,
        color: colors.label,
        marginLeft: 6,
        flex: 1,
    },
    paymentRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 12,
    },
    paymentLabel: {
        ...textStyles.bodyMedium,
        color: colors.placeholder,
    },
    paymentStatus: {
        ...textStyles.bodyMedium,
        fontWeight: "600",
    },
    divider: {
        height: 1,
        backgroundColor: colors.formBorder,
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalLabel: {
        ...textStyles.bodyMedium,
        color: colors.label,
    },
    totalValue: {
        ...textStyles.titleLarge,
        fontSize: 16,
    },
    actionBtn: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
        paddingVertical: 12,
        marginTop: 14,
        gap: 6,
    },
    actionBtnText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
        fontFamily: "Roboto",
    },
    pickupOtpBtn: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
        paddingVertical: 12,
        marginTop: 10,
        gap: 6,
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: colors.primary + "40",
    },
    pickupOtpBtnText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: "700",
        fontFamily: "Roboto",
    },
    emptyBox: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyText: {
        ...textStyles.bodyMedium,
        color: colors.placeholder,
        marginTop: 12,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    confirmSheet: {
        backgroundColor: colors.formBg,
        borderRadius: 18,
        padding: 24,
        width: "100%",
        alignItems: "center",
    },
    confirmIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    confirmTitle: {
        ...textStyles.titleLarge,
        fontSize: 18,
        textAlign: "center",
    },
    confirmDesc: {
        ...textStyles.bodyMedium,
        color: colors.placeholder,
        textAlign: "center",
        marginTop: 8,
        lineHeight: 20,
    },
    confirmStrong: {
        color: colors.secondary,
        fontWeight: "700",
    },
    readyInfoBox: {
        flexDirection: "row",
        backgroundColor: "#EFF6FF",
        padding: 12,
        borderRadius: 10,
        marginTop: 16,
        gap: 8,
    },
    readyInfoText: {
        flex: 1,
        fontSize: 12,
        color: colors.secondary,
        lineHeight: 18,
    },
    confirmActions: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
        marginTop: 22,
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
    },
    confirmCancelBtn: {
        backgroundColor: colors.scaffoldBg,
    },
    confirmCancelText: {
        color: colors.label,
        fontSize: 14,
        fontWeight: "700",
    },
    confirmOkBtn: {
        backgroundColor: colors.primary,
    },
    confirmOkText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
    otpSheet: {
        backgroundColor: colors.formBg,
        borderRadius: 18,
        padding: 24,
        width: "100%",
        alignItems: "center",
    },
    otpIconBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    otpTitle: {
        ...textStyles.titleLarge,
        fontSize: 18,
        textAlign: "center",
    },
    otpDesc: {
        ...textStyles.bodyMedium,
        color: colors.placeholder,
        textAlign: "center",
        marginTop: 8,
        lineHeight: 20,
    },
    otpCodeBox: {
        backgroundColor: colors.scaffoldBg,
        borderRadius: 14,
        paddingHorizontal: 24,
        paddingVertical: 16,
        marginTop: 18,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: colors.primary + "30",
        width: "100%",
        alignItems: "center",
    },
    otpCode: {
        fontSize: 34,
        fontWeight: "900",
        color: colors.primary,
        letterSpacing: 8,
        fontFamily: "Roboto",
    },
    otpCloseBtn: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingVertical: 13,
        width: "100%",
        alignItems: "center",
        marginTop: 20,
    },
    otpCloseText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
});

// ─── Detail Sheet Styles ─────────────────────────────────────────────

const detailStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        backgroundColor: colors.scaffoldBg,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: height * 0.92,
        minHeight: height * 0.5,
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.formBorder,
        alignSelf: "center",
        marginTop: 12,
        marginBottom: 8,
    },
    sheetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder,
    },
    sheetTitle: {
        ...textStyles.titleLarge,
        fontSize: 18,
    },
    orderNumber: {
        ...textStyles.bodyMedium,
        color: colors.placeholder,
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    statusRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
        flexWrap: "wrap",
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
    },
    infoText: {
        ...textStyles.bodyMedium,
        color: colors.secondary,
    },
    divider: {
        height: 1,
        backgroundColor: colors.formBorder,
        marginVertical: 16,
    },
    section: {
        marginBottom: 4,
    },
    sectionTitle: {
        ...textStyles.titleMedium,
        fontSize: 14,
        marginBottom: 12,
    },
    flowCard: {
        backgroundColor: colors.formBg,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.formBorder + "40",
    },
    flowRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 14,
        marginBottom: 10,
    },
    flowLabel: {
        fontSize: 13,
        color: colors.placeholder,
        flex: 1,
    },
    flowValue: {
        fontSize: 13,
        color: colors.secondary,
        fontWeight: "700",
        flex: 1.2,
        textAlign: "right",
    },
    itemCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.formBg,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.formBorder + "30",
    },
    itemImage: {
        width: 64,
        height: 64,
        borderRadius: 8,
        backgroundColor: colors.scaffoldBg,
        marginRight: 12,
    },
    itemImagePlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 8,
        backgroundColor: colors.scaffoldBg,
        marginRight: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        ...textStyles.bodyMedium,
        fontWeight: "600",
        fontSize: 14,
        lineHeight: 20,
    },
    itemMeta: {
        ...textStyles.bodyMedium,
        color: colors.placeholder,
        fontSize: 13,
        marginTop: 2,
    },
    itemTotal: {
        ...textStyles.bodyMedium,
        fontWeight: "700",
        fontSize: 14,
        marginTop: 4,
        color: colors.primary,
    },
    addressCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: colors.formBg,
        borderRadius: 12,
        padding: 14,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.formBorder + "30",
    },
    addressContent: {
        flex: 1,
    },
    addressName: {
        ...textStyles.bodyMedium,
        fontWeight: "600",
        fontSize: 14,
        marginBottom: 2,
    },
    addressText: {
        ...textStyles.bodyMedium,
        color: colors.placeholder,
        fontSize: 13,
        lineHeight: 18,
    },
    paymentCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.formBg,
        borderRadius: 12,
        padding: 14,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.formBorder + "30",
    },
    paymentContent: {
        flex: 1,
    },
    paymentName: {
        ...textStyles.bodyMedium,
        fontWeight: "600",
        fontSize: 14,
    },
    paymentType: {
        ...textStyles.bodyMedium,
        color: colors.placeholder,
        fontSize: 12,
        marginTop: 2,
    },
    priceRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    priceLabel: {
        ...textStyles.bodyMedium,
        color: colors.placeholder,
        fontSize: 14,
    },
    priceValue: {
        ...textStyles.bodyMedium,
        fontWeight: "500",
        fontSize: 14,
    },
    totalRow: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.formBorder,
    },
    totalLabel: {
        ...textStyles.titleMedium,
        fontSize: 15,
    },
    totalValue: {
        ...textStyles.titleLarge,
        fontSize: 18,
        color: colors.primary,
    },
    actionContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.scaffoldBg,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: colors.formBorder,
    },
    actionBtn: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
    },
    actionBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
    },
    pickupOtpBtn: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: colors.primary + "40",
        marginBottom: 10,
    },
    pickupOtpBtnText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: "700",
    },
});

export default OrdersScreen;
