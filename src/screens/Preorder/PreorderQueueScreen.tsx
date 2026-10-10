import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    Alert,
    DeviceEventEmitter,
    FlatList,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    StyleSheet,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";

import AppBar from "../../components/utils/AppBar";
import Pagination from "../../components/utils/Pagination";
import { appTheme, colors, textStyles } from "../../constants/AppThem";
import { Fonts } from "../../constants/Fonts";
import { getRequest, putRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";
import {
    PICKUP_DONE_DELIVERY_STATUSES,
    PREORDER_ACTION_LABELS,
    PREORDER_CANCELLABLE_STATUSES,
    PREORDER_NEXT_STATUS,
    PREORDER_STATUS_COLORS,
    PREORDER_STATUS_LABELS,
    PREORDER_STATUS_TABS,
    PreorderOrder,
    VENDOR_PREORDER_NOTIFICATION_EVENT,
    formatCurrency,
    getFulfillmentLabel,
} from "./preorderUtils";

const PAGE_LIMIT = 10;

const normalizeStatus = (status?: string) =>
    PREORDER_STATUS_TABS.some((tab) => tab.key === status)
        ? (status as string)
        : "placed";

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
}) => (
    <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
    >
        <View style={styles.modalBackdrop}>
            <View style={styles.otpSheet}>
                <View style={styles.otpIconBox}>
                    <Ionicons name="keypad-outline" size={32} color={colors.primary} />
                </View>

                <Text style={styles.otpTitle}>Pickup OTP</Text>

                <Text style={styles.otpDesc}>
                    Share this OTP with the rider to verify pickup for preorder{" "}
                    <Text style={styles.strong}>{orderNumber}</Text>.
                </Text>

                <View style={styles.otpCodeBox}>
                    <Text style={styles.otpCode}>{pickupOtp}</Text>
                </View>

                <TouchableOpacity style={styles.otpCloseBtn} onPress={onClose}>
                    <Text style={styles.otpCloseText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

// ─── Order Card ──────────────────────────────────────────────────────

const PreorderCard = ({
    order,
    highlighted,
    busy,
    onUpdateStatus,
    onShowPickupOtp,
}: {
    order: PreorderOrder;
    highlighted: boolean;
    busy: boolean;
    onUpdateStatus: (order: PreorderOrder, status: string) => void;
    onShowPickupOtp: (order: PreorderOrder) => void;
}) => {
    const statusColor = PREORDER_STATUS_COLORS[order.status] || colors.placeholder;
    const nextStatus = PREORDER_NEXT_STATUS[order.status];
    const canCancel = PREORDER_CANCELLABLE_STATUSES.includes(order.status);
    const isScheduled = order.fulfillmentMode === "scheduled";

    const customerName =
        [order.user?.firstName, order.user?.lastName]
            .filter(Boolean)
            .join(" ") || "Customer";
    const phone = order.delivery?.mobileNumber || order.user?.mobileNumber;

    return (
        <View style={[styles.card, highlighted && styles.cardHighlighted]}>
            <View style={styles.cardHeader}>
                <Text style={styles.orderNumber} numberOfLines={1}>
                    {order.orderNumber}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {PREORDER_STATUS_LABELS[order.status] || order.status}
                    </Text>
                </View>
            </View>

            <View style={styles.dueBox}>
                <Ionicons
                    name={isScheduled ? "calendar-outline" : "flash-outline"}
                    size={16}
                    color={colors.primary}
                />
                <View style={{ flex: 1 }}>
                    <Text style={styles.dueMode}>
                        {isScheduled ? "Scheduled" : "Same-day"}
                    </Text>
                    <Text style={styles.dueText}>{getFulfillmentLabel(order)}</Text>
                </View>
            </View>

            {(order.items || []).map((item, index) => (
                <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={2}>
                        {item.qty} × {item.name}
                    </Text>
                    <Text style={styles.itemTotal}>
                        {formatCurrency(item.total)}
                    </Text>
                </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={14} color={colors.placeholder} />
                <Text style={styles.metaText} numberOfLines={1}>
                    {customerName}
                    {phone ? ` · ${phone}` : ""}
                </Text>
            </View>

            {order.delivery?.addressLine1 ? (
                <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={14} color={colors.placeholder} />
                    <Text style={styles.metaText} numberOfLines={2}>
                        {order.delivery.addressLine1}
                    </Text>
                </View>
            ) : null}

            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                    {formatCurrency(order.totalAmount)}
                </Text>
            </View>

            {nextStatus && (
                <TouchableOpacity
                    style={[
                        styles.actionBtn,
                        { backgroundColor: PREORDER_STATUS_COLORS[nextStatus] },
                        busy && { opacity: 0.7 },
                    ]}
                    onPress={() => onUpdateStatus(order, nextStatus)}
                    disabled={busy}
                >
                    {busy ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.actionBtnText}>
                                {PREORDER_ACTION_LABELS[nextStatus]}
                            </Text>
                            <Ionicons name="arrow-forward" size={16} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            )}

            {order.status === "ready" && (
                <TouchableOpacity
                    style={[styles.outlineBtn, busy && { opacity: 0.7 }]}
                    onPress={() => onShowPickupOtp(order)}
                    disabled={busy}
                >
                    {busy ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <>
                            <Ionicons name="keypad-outline" size={16} color={colors.primary} />
                            <Text style={styles.outlineBtnText}>Show Pickup OTP</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}

            {canCancel && (
                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => onUpdateStatus(order, "cancelled")}
                    disabled={busy}
                >
                    <Text style={styles.cancelBtnText}>Cancel Preorder</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

// ─── Main Screen ─────────────────────────────────────────────────────

const PreorderQueueScreen = ({ route, navigation }: any) => {
    const [status, setStatus] = useState(normalizeStatus(route?.params?.status));
    const [orders, setOrders] = useState<PreorderOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
    const [otpModal, setOtpModal] = useState({
        visible: false,
        orderNumber: "",
        pickupOtp: "",
    });

    // Ignore responses from a tab or page the vendor has already left.
    const requestIdRef = useRef(0);
    const statusRef = useRef(status);
    const pageRef = useRef(page);
    statusRef.current = status;
    pageRef.current = page;

    const highlightedId = String(route?.params?.preorderId || "");

    const fetchOrders = useCallback(
        async (statusValue: string, pageNum: number, isRefresh = false) => {
            const requestId = ++requestIdRef.current;

            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const res: any = await getRequest(
                API_ENDPOINTS.PREORDERVENDORORDERS,
                { status: statusValue, page: pageNum, limit: PAGE_LIMIT }
            );

            if (requestId !== requestIdRef.current) return;

            if (res?.success) {
                setOrders(Array.isArray(res?.data) ? res.data : []);
                setTotalPages(res?.meta?.totalPages || 1);
            }

            setLoading(false);
            setRefreshing(false);
        },
        []
    );

    useFocusEffect(
        useCallback(() => {
            fetchOrders(status, page);
        }, [fetchOrders, status, page])
    );

    // Opened from the dashboard or a push notification — jump to the tab it points at.
    useEffect(() => {
        if (!route?.params?.status) return;

        setStatus(normalizeStatus(route?.params?.status));
        setPage(1);
    }, [route?.params?.notificationRefreshKey, route?.params?.status]);

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener(
            VENDOR_PREORDER_NOTIFICATION_EVENT,
            () => {
                fetchOrders(statusRef.current, pageRef.current, true);
            }
        );

        return () => {
            subscription.remove();
        };
    }, [fetchOrders]);

    const handleTabPress = (key: string) => {
        if (key === status) return;

        setOrders([]);
        setTotalPages(1);
        setPage(1);
        setStatus(key);
    };

    const updateStatus = async (order: PreorderOrder, nextStatus: string) => {
        setBusyOrderId(order._id);

        const res: any = await putRequest(
            `${API_ENDPOINTS.PREORDERVENDORORDERS}/${order._id}/status`,
            { status: nextStatus }
        );

        setBusyOrderId(null);

        if (res?.success) {
            Toast.show({
                type: "success",
                text1: `Preorder ${order.orderNumber}`,
                text2: `Moved to ${PREORDER_STATUS_LABELS[nextStatus] || nextStatus}`,
            });
            fetchOrders(statusRef.current, pageRef.current, true);
        }
    };

    const handleUpdateStatus = (order: PreorderOrder, nextStatus: string) => {
        if (busyOrderId) return;

        const isCancel = nextStatus === "cancelled";

        const message = isCancel
            ? "The customer has already paid. Cancelling does not refund them automatically — the refund must be arranged separately."
            : nextStatus === "ready"
                ? "This releases the order to a rider. You cannot cancel it after this."
                : "Start preparing this preorder?";

        Alert.alert(
            isCancel
                ? `Cancel ${order.orderNumber}?`
                : PREORDER_ACTION_LABELS[nextStatus],
            message,
            [
                { text: "Back", style: "cancel" },
                {
                    text: isCancel ? "Cancel Preorder" : "Confirm",
                    style: isCancel ? "destructive" : "default",
                    onPress: () => updateStatus(order, nextStatus),
                },
            ]
        );
    };

    const handleShowPickupOtp = async (order: PreorderOrder) => {
        if (busyOrderId) return;

        setBusyOrderId(order._id);

        const res: any = await getRequest(
            `${API_ENDPOINTS.PREORDERVENDORORDERS}/${order._id}/pickup-otp`
        );

        setBusyOrderId(null);

        if (!res?.success) return;

        // The OTP comes nested under pickupVerification; keep the flat shape as a fallback.
        const verification = res?.data?.pickupVerification || {};
        const pickupOtp = verification.pickupOtp || res?.data?.pickupOtp;
        const deliveryStatus = String(
            res?.data?.deliveryStatus || verification.deliveryStatus || ""
        );

        if (PICKUP_DONE_DELIVERY_STATUSES.includes(deliveryStatus)) {
            Toast.show({
                type: "info",
                text1: "Already picked up",
                text2: "The rider has collected this preorder.",
            });
            return;
        }

        if (!pickupOtp) {
            Toast.show({
                type: "error",
                text1: "Pickup OTP not available yet",
            });
            return;
        }

        setOtpModal({
            visible: true,
            orderNumber: order.orderNumber,
            pickupOtp: String(pickupOtp),
        });
    };

    return (
        <View style={appTheme.scaffold}>
            <AppBar
                title="Preorders"
                onBack={() => navigation.goBack()}
            />

            <View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsRow}
                >
                    {PREORDER_STATUS_TABS.map((tab) => {
                        const active = tab.key === status;

                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.tab, active && styles.tabActive]}
                                activeOpacity={0.8}
                                onPress={() => handleTabPress(tab.key)}
                            >
                                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <FlatList
                data={orders}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchOrders(status, page, true)}
                        colors={[colors.primary]}
                    />
                }
                renderItem={({ item }) => (
                    <PreorderCard
                        order={item}
                        highlighted={item._id === highlightedId}
                        busy={busyOrderId === item._id}
                        onUpdateStatus={handleUpdateStatus}
                        onShowPickupOtp={handleShowPickupOtp}
                    />
                )}
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.emptyBox}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : (
                        <View style={styles.emptyBox}>
                            <Ionicons
                                name="calendar-outline"
                                size={48}
                                color={colors.placeholder}
                            />
                            <Text style={styles.emptyText}>
                                No {(PREORDER_STATUS_LABELS[status] || "").toLowerCase()} preorders
                            </Text>
                        </View>
                    )
                }
            />

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                loading={loading && !refreshing}
            />

            <PickupOtpModal
                visible={otpModal.visible}
                orderNumber={otpModal.orderNumber}
                pickupOtp={otpModal.pickupOtp}
                onClose={() => setOtpModal((prev) => ({ ...prev, visible: false }))}
            />
        </View>
    );
};

export default PreorderQueueScreen;

const styles = StyleSheet.create({
    tabsRow: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.formBorder,
        backgroundColor: colors.formBg,
    },
    tabActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    tabText: {
        fontSize: 13,
        color: colors.label,
        fontFamily: Fonts.Medium,
    },
    tabTextActive: {
        color: "#fff",
    },
    listContent: {
        paddingHorizontal: 14,
        paddingBottom: 24,
        flexGrow: 1,
    },
    card: {
        backgroundColor: colors.formBg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.formBorder,
        padding: 14,
        marginBottom: 12,
    },
    cardHighlighted: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    orderNumber: {
        ...textStyles.titleLarge,
        fontSize: 15,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontFamily: Fonts.Medium,
    },
    dueBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#EFF6FF",
        borderRadius: 10,
        padding: 10,
        marginTop: 12,
        marginBottom: 10,
    },
    dueMode: {
        fontSize: 11,
        color: colors.primary,
        fontFamily: Fonts.Medium,
    },
    dueText: {
        ...textStyles.titleLarge,
        fontSize: 14,
        marginTop: 1,
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 4,
    },
    itemName: {
        ...textStyles.bodyMedium,
        fontSize: 13,
        flex: 1,
    },
    itemTotal: {
        fontSize: 13,
        color: colors.label,
        fontFamily: Fonts.Medium,
    },
    divider: {
        height: 1,
        backgroundColor: colors.formBorder,
        marginVertical: 10,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 4,
    },
    metaText: {
        fontSize: 12,
        color: colors.label,
        fontFamily: Fonts.Regular,
        flex: 1,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 6,
    },
    totalLabel: {
        fontSize: 13,
        color: colors.placeholder,
        fontFamily: Fonts.Regular,
    },
    totalValue: {
        ...textStyles.titleLarge,
        fontSize: 16,
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: 10,
        paddingVertical: 12,
        marginTop: 12,
    },
    actionBtnText: {
        color: "#fff",
        fontSize: 14,
        fontFamily: Fonts.Medium,
    },
    outlineBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary,
        paddingVertical: 12,
        marginTop: 12,
    },
    outlineBtnText: {
        color: colors.primary,
        fontSize: 14,
        fontFamily: Fonts.Medium,
    },
    cancelBtn: {
        alignItems: "center",
        paddingVertical: 10,
        marginTop: 6,
    },
    cancelBtnText: {
        color: colors.error,
        fontSize: 13,
        fontFamily: Fonts.Medium,
    },
    emptyBox: {
        flex: 1,
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
    strong: {
        color: colors.secondary,
        fontFamily: Fonts.Medium,
    },
    otpCodeBox: {
        backgroundColor: colors.scaffoldBg,
        borderRadius: 14,
        paddingHorizontal: 24,
        paddingVertical: 16,
        marginTop: 18,
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
        fontFamily: Fonts.Medium,
    },
});
