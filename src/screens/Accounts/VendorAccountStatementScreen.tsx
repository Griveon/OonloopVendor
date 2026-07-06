import React, {
    useCallback,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    ScrollView,
    Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReactNativeBlobUtil from "react-native-blob-util";

import AppBar from "../../components/utils/AppBar";
import Pagination from "../../components/utils/Pagination";
import { colors, localStyles, textStyles } from "../../constants/AppThem";
import { postRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";
import { API_BASE_URL } from "../../constants/Environment";

interface AccountStatementItem {
    date: string;
    orderId: string;
    vendorOrderNumber: string;
    noOfProducts: number;
    amount: number;
    orderStatus: string;
    sellerStatus: string;
    paymentStatus: string;
    paymentMode: string;
}

interface AccountStatementSummary {
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    returnedOrders: number;
    totalAmount: number;
    completedAmount: number;
    pendingAmount: number;
}

interface AccountStatementData {
    filters: {
        fromDate: string;
        toDate: string;
        status: string;
    };
    summary: AccountStatementSummary;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    statements: AccountStatementItem[];
}

interface AccountStatementScreenProps {
    navigation?: any;
}

type FilterPayload = {
    fromDate: string;
    toDate: string;
    status: string;
};

const STATUS_OPTIONS = [
    { _id: "all", name: "All" },
    { _id: "placed", name: "New" },
    { _id: "seller_accepted", name: "Accepted" },
    { _id: "picking_products", name: "Picking" },
    { _id: "packing_order", name: "Packing" },
    { _id: "ready_for_pickup", name: "Ready" },
    { _id: "shipped", name: "Shipped" },
    { _id: "delivered", name: "Delivered" },
    { _id: "cancelled", name: "Cancelled" },
    { _id: "returned", name: "Returned" },
];

const STATUS_LABELS: Record<string, string> = {
    all: "All",
    pending: "Pending",
    placed: "New Order",
    seller_accepted: "Accepted",
    picking_products: "Picking",
    packing_order: "Packing",
    ready_for_pickup: "Ready",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    returned: "Returned",
};

const SELLER_STATUS_LABELS: Record<string, string> = {
    pending_acceptance: "Pending",
    accepted: "Accepted",
    picking_products: "Picking",
    packing_order: "Packing",
    ready_for_pickup: "Ready",
    handed_to_rider: "Handed",
    cancelled: "Cancelled",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    success: "Paid",
    failed: "Failed",
    refunded: "Refunded",
};

const emptySummary: AccountStatementSummary = {
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    returnedOrders: 0,
    totalAmount: 0,
    completedAmount: 0,
    pendingAmount: 0,
};

const formatStatusLabel = (status?: string) => {
    if (!status) return "-";
    return STATUS_LABELS[status] || status.replace(/_/g, " ");
};

const formatSellerStatusLabel = (status?: string) => {
    if (!status) return "-";
    return SELLER_STATUS_LABELS[status] || status.replace(/_/g, " ");
};

const formatPaymentStatusLabel = (status?: string) => {
    if (!status) return "-";
    return PAYMENT_STATUS_LABELS[status] || status.replace(/_/g, " ");
};

const getStatusColor = (status?: string) => {
    switch (status) {
        case "delivered":
        case "success":
            return colors.success;

        case "cancelled":
        case "returned":
        case "failed":
            return colors.error;

        case "packing_order":
        case "pending":
            return colors.warning;

        case "seller_accepted":
        case "picking_products":
        case "ready_for_pickup":
        case "shipped":
        case "placed":
            return colors.primary;

        default:
            return colors.placeholder;
    }
};

const formatCurrency = (amount?: number) => {
    return `₹${Number(amount || 0).toFixed(2)}`;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatMMDDYYYY = (date: Date) => {
    return `${pad2(date.getMonth() + 1)}-${pad2(
        date.getDate()
    )}-${date.getFullYear()}`;
};

const parseMMDDYYYYToDate = (value: string) => {
    const parts = value.split("-");

    if (parts.length !== 3) {
        return new Date();
    }

    const month = Number(parts[0]);
    const day = Number(parts[1]);
    const year = Number(parts[2]);

    if (!month || !day || !year) {
        return new Date();
    }

    return new Date(year, month - 1, day);
};

const getToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

const getSevenDaysAgo = () => {
    const date = getToday();
    date.setDate(date.getDate() - 6);
    return date;
};

const buildApiUrl = (baseUrl: string, endpoint: string) => {
    const cleanBase = String(baseUrl || "").replace(/\/+$/, "");
    const cleanEndpoint = String(endpoint || "").replace(/^\/+/, "");

    return `${cleanBase}/${cleanEndpoint}`;
};

const extractStatementPayload = (json: any): AccountStatementData => {
    const data = json?.data || {};

    return {
        filters: data?.filters || {
            fromDate: formatMMDDYYYY(getSevenDaysAgo()),
            toDate: formatMMDDYYYY(getToday()),
            status: "all",
        },
        summary: data?.summary || emptySummary,
        page: Number(data?.page || 1),
        limit: Number(data?.limit || 10),
        total: Number(data?.total || 0),
        totalPages: Number(data?.totalPages || 1),
        statements: Array.isArray(data?.statements) ? data.statements : [],
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

const DateButton = ({
    label,
    value,
    onPress,
}: {
    label: string;
    value: string;
    onPress: () => void;
}) => {
    return (
        <TouchableOpacity
            style={styles.dateButton}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <Text style={styles.filterLabel}>{label}</Text>

            <View style={styles.dateValueRow}>
                <Text style={styles.dateValue}>{value}</Text>
                <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={colors.primary}
                />
            </View>
        </TouchableOpacity>
    );
};

const StatusPill = ({
    item,
    selected,
    onPress,
}: {
    item: { _id: string; name: string };
    selected: boolean;
    onPress: () => void;
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.statusPill,
                selected && styles.statusPillActive,
            ]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <Text
                style={[
                    styles.statusPillText,
                    selected && styles.statusPillTextActive,
                ]}
            >
                {item.name}
            </Text>
        </TouchableOpacity>
    );
};

const SummaryChip = ({
    label,
    value,
    icon,
    color,
}: {
    label: string;
    value: string | number;
    icon: string;
    color: string;
}) => {
    return (
        <View style={styles.summaryChip}>
            <View
                style={[
                    styles.summaryIcon,
                    { backgroundColor: color + "15" },
                ]}
            >
                <Ionicons name={icon} size={16} color={color} />
            </View>

            <View style={styles.summaryTextBox}>
                <Text style={styles.summaryValue} numberOfLines={1}>
                    {value}
                </Text>
                <Text style={styles.summaryLabel} numberOfLines={1}>
                    {label}
                </Text>
            </View>
        </View>
    );
};

const StatementCard = ({ item }: { item: AccountStatementItem }) => {
    const orderColor = getStatusColor(item.orderStatus);
    const paymentColor = getStatusColor(item.paymentStatus);

    return (
        <View style={styles.statementCard}>
            <View style={styles.cardTopRow}>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderId} numberOfLines={1}>
                        {item.orderId || "-"}
                    </Text>

                    <Text style={styles.vendorOrderId} numberOfLines={1}>
                        {item.vendorOrderNumber || "-"}
                    </Text>
                </View>

                <View style={styles.amountBox}>
                    <Text style={styles.amountText}>
                        {formatCurrency(item.amount)}
                    </Text>

                    <Text style={styles.dateText}>{item.date || "-"}</Text>
                </View>
            </View>

            <View style={styles.compactInfoRow}>
                <View style={styles.compactCell}>
                    <Text style={styles.compactLabel}>Products</Text>
                    <Text style={styles.compactValue}>
                        {Number(item.noOfProducts || 0)}
                    </Text>
                </View>

                <View style={styles.compactCell}>
                    <Text style={styles.compactLabel}>Order</Text>

                    <View
                        style={[
                            styles.miniBadge,
                            { backgroundColor: orderColor + "15" },
                        ]}
                    >
                        <Text
                            style={[
                                styles.miniBadgeText,
                                { color: orderColor },
                            ]}
                            numberOfLines={1}
                        >
                            {formatStatusLabel(item.orderStatus)}
                        </Text>
                    </View>
                </View>

                <View style={styles.compactCell}>
                    <Text style={styles.compactLabel}>Seller</Text>
                    <Text style={styles.compactValue} numberOfLines={1}>
                        {formatSellerStatusLabel(item.sellerStatus)}
                    </Text>
                </View>

                <View style={styles.compactCell}>
                    <Text style={styles.compactLabel}>Payment</Text>
                    <Text
                        style={[
                            styles.compactValue,
                            { color: paymentColor },
                        ]}
                        numberOfLines={1}
                    >
                        {formatPaymentStatusLabel(item.paymentStatus)}
                    </Text>
                </View>
            </View>

            <View style={styles.paymentModeRow}>
                <Ionicons
                    name={
                        item.paymentMode === "cod"
                            ? "cash-outline"
                            : "card-outline"
                    }
                    size={14}
                    color={colors.placeholder}
                />

                <Text style={styles.paymentModeText}>
                    {String(item.paymentMode || "online").toUpperCase()}
                </Text>
            </View>
        </View>
    );
};

const FilterSheet = ({
    visible,
    fromDate,
    toDate,
    status,
    onClose,
    onApply,
    onReset,
}: {
    visible: boolean;
    fromDate: string;
    toDate: string;
    status: string;
    onClose: () => void;
    onApply: (payload: FilterPayload) => void;
    onReset: () => void;
}) => {
    const [localFromDate, setLocalFromDate] = useState(fromDate);
    const [localToDate, setLocalToDate] = useState(toDate);
    const [localStatus, setLocalStatus] = useState(status);
    const [pickerState, setPickerState] = useState<{
        visible: boolean;
        type: "from" | "to";
    }>({
        visible: false,
        type: "from",
    });

    React.useEffect(() => {
        if (visible) {
            setLocalFromDate(fromDate);
            setLocalToDate(toDate);
            setLocalStatus(status);
            setPickerState({
                visible: false,
                type: "from",
            });
        }
    }, [visible, fromDate, toDate, status]);

    const pickerValue =
        pickerState.type === "from"
            ? parseMMDDYYYYToDate(localFromDate)
            : parseMMDDYYYYToDate(localToDate);

    const handleDateChange = (_event: any, selectedDate?: Date) => {
        if (Platform.OS === "android") {
            setPickerState((prev) => ({
                ...prev,
                visible: false,
            }));
        }

        if (!selectedDate) {
            return;
        }

        selectedDate.setHours(0, 0, 0, 0);
        const formatted = formatMMDDYYYY(selectedDate);

        if (pickerState.type === "from") {
            setLocalFromDate(formatted);
        } else {
            setLocalToDate(formatted);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.sheetOverlay}>
                <TouchableOpacity
                    style={styles.sheetBackdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={styles.filterSheet}>
                    <View style={styles.dragHandle} />

                    <View style={styles.sheetHeader}>
                        <View>
                            <Text style={styles.sheetTitle}>Filters</Text>
                            <Text style={styles.sheetSubTitle}>
                                Date wise account statement
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onClose}
                        >
                            <Ionicons
                                name="close"
                                size={22}
                                color={colors.secondary}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.dateRow}>
                        <DateButton
                            label="From Date"
                            value={localFromDate}
                            onPress={() =>
                                setPickerState({
                                    visible: true,
                                    type: "from",
                                })
                            }
                        />

                        <DateButton
                            label="To Date"
                            value={localToDate}
                            onPress={() =>
                                setPickerState({
                                    visible: true,
                                    type: "to",
                                })
                            }
                        />
                    </View>

                    <Text style={styles.statusTitle}>Order Status</Text>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.statusScrollContent}
                    >
                        {STATUS_OPTIONS.map((item) => (
                            <StatusPill
                                key={item._id}
                                item={item}
                                selected={localStatus === item._id}
                                onPress={() => setLocalStatus(item._id)}
                            />
                        ))}
                    </ScrollView>

                    {pickerState.visible && (
                        <View style={styles.pickerBox}>
                            <DateTimePicker
                                value={pickerValue}
                                mode="date"
                                display={
                                    Platform.OS === "ios"
                                        ? "spinner"
                                        : "default"
                                }
                                onChange={handleDateChange}
                            />

                            {Platform.OS === "ios" && (
                                <TouchableOpacity
                                    style={styles.iosPickerDoneBtn}
                                    onPress={() =>
                                        setPickerState((prev) => ({
                                            ...prev,
                                            visible: false,
                                        }))
                                    }
                                >
                                    <Text style={styles.iosPickerDoneText}>
                                        Done
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    <View style={styles.sheetActions}>
                        <TouchableOpacity
                            style={styles.resetBtn}
                            onPress={onReset}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.resetBtnText}>Reset</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.applyBtn}
                            onPress={() =>
                                onApply({
                                    fromDate: localFromDate,
                                    toDate: localToDate,
                                    status: localStatus,
                                })
                            }
                            activeOpacity={0.85}
                        >
                            <Text style={styles.applyBtnText}>
                                Apply Filter
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const VendorAccountStatementScreen = ({
    navigation,
}: AccountStatementScreenProps) => {
    const defaultFromDate = useMemo(() => formatMMDDYYYY(getSevenDaysAgo()), []);
    const defaultToDate = useMemo(() => formatMMDDYYYY(getToday()), []);

    const [statements, setStatements] = useState<AccountStatementItem[]>([]);
    const [summary, setSummary] = useState<AccountStatementSummary>(emptySummary);

    const [fromDate, setFromDate] = useState(defaultFromDate);
    const [toDate, setToDate] = useState(defaultToDate);
    const [statusFilter, setStatusFilter] = useState("all");

    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [filterVisible, setFilterVisible] = useState(false);

    const fetchingRef = useRef(false);

    const buildPayload = useCallback(
        (pageNum: number, filter?: FilterPayload) => {
            const activeFromDate = filter?.fromDate || fromDate;
            const activeToDate = filter?.toDate || toDate;
            const activeStatus = filter?.status || statusFilter;

            return {
                fromDate: activeFromDate,
                toDate: activeToDate,
                page: pageNum,
                limit,
                ...(activeStatus && activeStatus !== "all"
                    ? { status: activeStatus }
                    : {}),
            };
        },
        [fromDate, toDate, statusFilter, limit]
    );

    const fetchStatements = useCallback(
        async (
            pageNum = 1,
            isRefresh = false,
            filterOverride?: FilterPayload
        ) => {
            if (fetchingRef.current && !isRefresh) {
                return;
            }

            fetchingRef.current = true;

            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            try {
                const json = await postRequest(
                    API_ENDPOINTS.VENDORACCOUNTSTATEMENTSGET,
                    buildPayload(pageNum, filterOverride),
                    true
                );

                if (json?.success) {
                    const payload = extractStatementPayload(json);

                    setStatements(payload.statements);
                    setSummary(payload.summary);
                    setPage(payload.page || pageNum);
                    setTotal(payload.total);
                    setTotalPages(payload.totalPages || 1);
                } else {
                    setStatements([]);
                    setSummary(emptySummary);
                    setPage(1);
                    setTotal(0);
                    setTotalPages(1);

                    showToast(
                        "error",
                        "Statement failed",
                        json?.message || "Unable to fetch statement."
                    );
                }
            } catch (error: any) {
                console.error("Vendor account statement error:", error);

                setStatements([]);
                setSummary(emptySummary);
                setPage(1);
                setTotal(0);
                setTotalPages(1);

                showToast(
                    "error",
                    "Statement failed",
                    error?.message || "Something went wrong."
                );
            } finally {
                fetchingRef.current = false;
                setLoading(false);
                setRefreshing(false);
            }
        },
        [buildPayload]
    );

    useFocusEffect(
        useCallback(() => {
            fetchStatements(1, false);

            return () => { };
        }, [fetchStatements])
    );

    const onRefresh = () => {
        fetchStatements(1, true);
    };

    const handlePageChange = (nextPage: number) => {
        if (nextPage === page || nextPage < 1 || nextPage > totalPages) {
            return;
        }

        fetchStatements(nextPage, false);
    };

    const handleApplyFilter = (payload: FilterPayload) => {
        const from = parseMMDDYYYYToDate(payload.fromDate);
        const to = parseMMDDYYYYToDate(payload.toDate);

        if (from.getTime() > to.getTime()) {
            showToast(
                "error",
                "Invalid date range",
                "From Date cannot be greater than To Date."
            );
            return;
        }

        setFromDate(payload.fromDate);
        setToDate(payload.toDate);
        setStatusFilter(payload.status);
        setFilterVisible(false);
        setPage(1);

        fetchStatements(1, false, payload);
    };

    const handleResetFilter = () => {
        const resetPayload = {
            fromDate: defaultFromDate,
            toDate: defaultToDate,
            status: "all",
        };

        setFromDate(resetPayload.fromDate);
        setToDate(resetPayload.toDate);
        setStatusFilter(resetPayload.status);
        setFilterVisible(false);
        setPage(1);

        fetchStatements(1, false, resetPayload);
    };

    const handleExport = async () => {
        if (exporting) {
            return;
        }

        try {
            setExporting(true);

            const token = await AsyncStorage.getItem("userToken");

            if (!token) {
                showToast("error", "Login required", "Please login again.");
                return;
            }

            const payload = {
                fromDate,
                toDate,
                ...(statusFilter && statusFilter !== "all"
                    ? { status: statusFilter }
                    : {}),
            };

            const safeFromDate = fromDate.replace(/[^\d-]/g, "");
            const safeToDate = toDate.replace(/[^\d-]/g, "");

            const fileName = `vendor-account-statement-${safeFromDate}-to-${safeToDate}.xlsx`;

            const exportUrl = buildApiUrl(
                API_BASE_URL,
                API_ENDPOINTS.VENDORACCOUNTSTATEMENTSEXPORT
            );

            const downloadPath =
                Platform.OS === "android"
                    ? `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`
                    : `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${fileName}`;

            const response = await ReactNativeBlobUtil.config({
                fileCache: true,
                appendExt: "xlsx",
                path: downloadPath,
                addAndroidDownloads:
                    Platform.OS === "android"
                        ? {
                            useDownloadManager: true,
                            notification: true,
                            title: fileName,
                            description:
                                "Vendor account statement downloaded",
                            mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            path: downloadPath,
                            mediaScannable: true,
                        }
                        : undefined,
            }).fetch(
                "POST",
                exportUrl,
                {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Type": "application/json",
                },
                JSON.stringify(payload)
            );

            const statusCode = response.info().status;

            if (statusCode < 200 || statusCode >= 300) {
                let errorMessage = "Unable to export statement.";

                try {
                    const responseText = await response.text();
                    const errorJson = JSON.parse(responseText);

                    errorMessage =
                        errorJson?.message ||
                        errorJson?.error ||
                        errorMessage;
                } catch (_error) {
                    // Ignore parse error.
                }

                throw new Error(errorMessage);
            }

            const savedPath = response.path();

            if (!savedPath) {
                throw new Error("Downloaded file path not found.");
            }

            showToast(
                "success",
                "Export downloaded",
                Platform.OS === "android"
                    ? "Excel saved in Downloads."
                    : "Excel saved successfully."
            );

            if (Platform.OS === "ios") {
                ReactNativeBlobUtil.ios.previewDocument(savedPath);
            }
        } catch (error: any) {
            console.error("Export statement error:", error);

            showToast(
                "error",
                "Export failed",
                error?.message || "Unable to export statement."
            );
        } finally {
            setExporting(false);
        }
    };

    const selectedStatusLabel =
        STATUS_OPTIONS.find((item) => item._id === statusFilter)?.name || "All";

    return (
        <View style={localStyles.container}>
            <AppBar
                title="Account Statement"
                onBack={() => navigation?.goBack?.()}
            />

            <View style={styles.headerSection}>
                <View style={styles.filterTopRow}>
                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setFilterVisible(true)}
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name="options-outline"
                            size={18}
                            color={colors.primary}
                        />

                        <Text style={styles.filterButtonText}>
                            {fromDate} - {toDate}
                        </Text>

                        <View style={styles.activeFilterBadge}>
                            <Text style={styles.activeFilterText}>
                                {selectedStatusLabel}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* <TouchableOpacity
                        style={[
                            styles.exportBtn,
                            exporting && { opacity: 0.7 },
                        ]}
                        onPress={handleExport}
                        disabled={exporting}
                        activeOpacity={0.85}
                    >
                        {exporting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons
                                name="download-outline"
                                size={18}
                                color="#fff"
                            />
                        )}
                    </TouchableOpacity> */}
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.summaryScrollContent}
                >
                    <SummaryChip
                        label="Total Orders"
                        value={summary.totalOrders}
                        icon="receipt-outline"
                        color={colors.primary}
                    />

                    <SummaryChip
                        label="Total Amount"
                        value={formatCurrency(summary.totalAmount)}
                        icon="wallet-outline"
                        color={colors.primary}
                    />

                    <SummaryChip
                        label="Pending"
                        value={`${summary.pendingOrders} / ${formatCurrency(
                            summary.pendingAmount
                        )}`}
                        icon="time-outline"
                        color={colors.warning}
                    />

                    <SummaryChip
                        label="Completed"
                        value={`${summary.completedOrders} / ${formatCurrency(
                            summary.completedAmount
                        )}`}
                        icon="checkmark-done-outline"
                        color={colors.success}
                    />

                    <SummaryChip
                        label="Cancelled"
                        value={summary.cancelledOrders}
                        icon="close-circle-outline"
                        color={colors.error}
                    />

                    <SummaryChip
                        label="Returned"
                        value={summary.returnedOrders}
                        icon="return-down-back-outline"
                        color={colors.error}
                    />
                </ScrollView>

                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 1.55 }]}>
                        Order
                    </Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.75 }]}>
                        Qty
                    </Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>
                        Status
                    </Text>
                    <Text
                        style={[
                            styles.tableHeaderText,
                            {
                                flex: 0.9,
                                textAlign: "right",
                            },
                        ]}
                    >
                        Amount
                    </Text>
                </View>
            </View>

            <FlatList
                data={statements}
                keyExtractor={(item, index) =>
                    `${item.vendorOrderNumber || item.orderId || "statement"}-${index}`
                }
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                    />
                }
                renderItem={({ item }) => <StatementCard item={item} />}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyBox}>
                            <Ionicons
                                name="document-text-outline"
                                size={48}
                                color={colors.placeholder}
                            />

                            <Text style={styles.emptyTitle}>
                                No statement found
                            </Text>

                            <Text style={styles.emptyText}>
                                Try changing date or status filter.
                            </Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={
                    loading && !refreshing ? (
                        <View style={styles.loaderBox}>
                            <ActivityIndicator
                                size="small"
                                color={colors.primary}
                            />
                        </View>
                    ) : (
                        <View style={{ height: 12 }} />
                    )
                }
            />

            <View style={styles.footerPagination}>
                <View style={styles.totalInfo}>
                    <Text style={styles.totalInfoText}>
                        {total} record{total === 1 ? "" : "s"}
                    </Text>
                </View>

                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    loading={loading && !refreshing}
                />
            </View>

            <FilterSheet
                visible={filterVisible}
                fromDate={fromDate}
                toDate={toDate}
                status={statusFilter}
                onClose={() => setFilterVisible(false)}
                onApply={handleApplyFilter}
                onReset={handleResetFilter}
            />

            <Toast />
        </View>
    );
};

const styles = StyleSheet.create({
    headerSection: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 8,
        backgroundColor: colors.scaffoldBg,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder,
    },
    filterTopRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    filterButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: 12,
        backgroundColor: colors.formBg,
        borderWidth: 1,
        borderColor: colors.formBorder,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    filterButtonText: {
        flex: 1,
        fontSize: 12,
        fontWeight: "700",
        color: colors.secondary,
        fontFamily: "Roboto",
    },
    activeFilterBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: "#EFF6FF",
    },
    activeFilterText: {
        fontSize: 10,
        fontWeight: "800",
        color: colors.primary,
        fontFamily: "Roboto",
    },
    exportBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    summaryScrollContent: {
        paddingTop: 10,
        gap: 8,
    },
    summaryChip: {
        width: 142,
        minHeight: 58,
        borderRadius: 12,
        backgroundColor: colors.formBg,
        borderWidth: 1,
        borderColor: colors.formBorder + "70",
        paddingHorizontal: 10,
        paddingVertical: 9,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    summaryIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    summaryTextBox: {
        flex: 1,
    },
    summaryValue: {
        fontSize: 13,
        fontWeight: "900",
        color: colors.secondary,
        fontFamily: "Roboto",
    },
    summaryLabel: {
        fontSize: 10,
        color: colors.placeholder,
        marginTop: 2,
        fontWeight: "600",
        fontFamily: "Roboto",
    },
    tableHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 4,
        paddingTop: 12,
    },
    tableHeaderText: {
        fontSize: 10,
        color: colors.placeholder,
        fontWeight: "800",
        letterSpacing: 0.3,
        textTransform: "uppercase",
        fontFamily: "Roboto",
    },
    listContent: {
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 100,
    },
    statementCard: {
        backgroundColor: colors.formBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.formBorder + "80",
        padding: 10,
        marginBottom: 8,
    },
    cardTopRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    orderInfo: {
        flex: 1,
        minWidth: 0,
    },
    orderId: {
        fontSize: 13,
        fontWeight: "900",
        color: colors.secondary,
        fontFamily: "Roboto",
    },
    vendorOrderId: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.placeholder,
        marginTop: 2,
        fontFamily: "Roboto",
    },
    amountBox: {
        alignItems: "flex-end",
    },
    amountText: {
        fontSize: 14,
        fontWeight: "900",
        color: colors.primary,
        fontFamily: "Roboto",
    },
    dateText: {
        fontSize: 10,
        color: colors.placeholder,
        marginTop: 2,
        fontWeight: "600",
        fontFamily: "Roboto",
    },
    compactInfoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.formBorder + "70",
    },
    compactCell: {
        flex: 1,
        paddingRight: 5,
        minWidth: 0,
    },
    compactLabel: {
        fontSize: 10,
        color: colors.placeholder,
        fontWeight: "600",
        marginBottom: 4,
        fontFamily: "Roboto",
    },
    compactValue: {
        fontSize: 11,
        color: colors.secondary,
        fontWeight: "800",
        textTransform: "capitalize",
        fontFamily: "Roboto",
    },
    miniBadge: {
        alignSelf: "flex-start",
        maxWidth: "100%",
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    miniBadgeText: {
        fontSize: 10,
        fontWeight: "900",
        textTransform: "capitalize",
        fontFamily: "Roboto",
    },
    paymentModeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 8,
    },
    paymentModeText: {
        fontSize: 10,
        color: colors.placeholder,
        fontWeight: "800",
        fontFamily: "Roboto",
    },
    emptyBox: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 70,
        paddingHorizontal: 24,
    },
    emptyTitle: {
        ...textStyles.titleMedium,
        marginTop: 12,
        fontSize: 15,
    },
    emptyText: {
        ...textStyles.bodyMedium,
        color: colors.placeholder,
        textAlign: "center",
        marginTop: 4,
    },
    loaderBox: {
        paddingVertical: 24,
    },
    footerPagination: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.scaffoldBg,
        borderTopWidth: 1,
        borderTopColor: colors.formBorder,
        paddingTop: 4,
    },
    totalInfo: {
        alignItems: "center",
        paddingTop: 4,
    },
    totalInfoText: {
        fontSize: 11,
        color: colors.placeholder,
        fontWeight: "700",
        fontFamily: "Roboto",
    },
    sheetOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    filterSheet: {
        backgroundColor: colors.scaffoldBg,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 26,
    },
    dragHandle: {
        width: 42,
        height: 4,
        borderRadius: 99,
        backgroundColor: colors.formBorder,
        alignSelf: "center",
        marginBottom: 12,
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 14,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: "900",
        color: colors.secondary,
        fontFamily: "Roboto",
    },
    sheetSubTitle: {
        fontSize: 12,
        color: colors.placeholder,
        marginTop: 2,
        fontWeight: "500",
        fontFamily: "Roboto",
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.formBg,
        alignItems: "center",
        justifyContent: "center",
    },
    dateRow: {
        flexDirection: "row",
        gap: 10,
    },
    dateButton: {
        flex: 1,
        backgroundColor: colors.formBg,
        borderWidth: 1,
        borderColor: colors.formBorder,
        borderRadius: 12,
        padding: 12,
    },
    filterLabel: {
        fontSize: 11,
        color: colors.placeholder,
        fontWeight: "700",
        marginBottom: 6,
        fontFamily: "Roboto",
    },
    dateValueRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    dateValue: {
        fontSize: 13,
        color: colors.secondary,
        fontWeight: "900",
        fontFamily: "Roboto",
    },
    statusTitle: {
        fontSize: 13,
        color: colors.secondary,
        fontWeight: "900",
        marginTop: 18,
        marginBottom: 10,
        fontFamily: "Roboto",
    },
    statusScrollContent: {
        gap: 8,
        paddingRight: 12,
    },
    statusPill: {
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: colors.formBg,
        borderWidth: 1,
        borderColor: colors.formBorder,
    },
    statusPillActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    statusPillText: {
        fontSize: 12,
        color: colors.secondary,
        fontWeight: "800",
        fontFamily: "Roboto",
    },
    statusPillTextActive: {
        color: "#fff",
    },
    pickerBox: {
        marginTop: 14,
        backgroundColor: colors.formBg,
        borderRadius: 12,
        overflow: "hidden",
    },
    iosPickerDoneBtn: {
        paddingVertical: 12,
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: colors.formBorder,
    },
    iosPickerDoneText: {
        color: colors.primary,
        fontWeight: "900",
        fontSize: 14,
        fontFamily: "Roboto",
    },
    sheetActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 20,
    },
    resetBtn: {
        flex: 1,
        minHeight: 46,
        borderRadius: 12,
        backgroundColor: colors.formBg,
        borderWidth: 1,
        borderColor: colors.formBorder,
        alignItems: "center",
        justifyContent: "center",
    },
    resetBtnText: {
        fontSize: 14,
        fontWeight: "900",
        color: colors.secondary,
        fontFamily: "Roboto",
    },
    applyBtn: {
        flex: 1.3,
        minHeight: 46,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    applyBtnText: {
        fontSize: 14,
        fontWeight: "900",
        color: "#fff",
        fontFamily: "Roboto",
    },
});

export default VendorAccountStatementScreen;