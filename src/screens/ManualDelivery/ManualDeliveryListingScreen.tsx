import React, { useState, useCallback, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AppBar from "../../components/utils/AppBar";
import { colors } from "../../constants/AppThem";
import { manualDeliveryApi } from "../../services/manualDeliveryApi";
import type { ManualDelivery } from "../../types/manualDelivery.types";
import ManualDeliveryCard from "../../components/manualDelivery/ManualDeliveryCard";
import AssignDriverModal from "../../components/manualDelivery/AssignDriverModal";
import CancelDeliveryModal from "../../components/manualDelivery/CancelDeliveryModal";
import { useFocusEffect } from "@react-navigation/native";
import { MANUAL_DELIVERY_FEATURES } from "../../constants/manualDeliveryConfig";

const STATUS_FILTERS = [
    { label: "All", value: "" },
    { label: "Created", value: "CREATED" },
    { label: "Assigned", value: "ASSIGNED" },
    { label: "Accepted", value: "ACCEPTED" },
    { label: "Picked Up", value: "PICKED_UP" },
    { label: "Out for Delivery", value: "OUT_FOR_DELIVERY" },
    { label: "Reached", value: "REACHED" },
    { label: "Delivered", value: "DELIVERED" },
    { label: "Cancelled", value: "CANCELLED" },
    { label: "Failed", value: "FAILED" },
];

export const ManualDeliveryListingScreen = ({ navigation }: any) => {
    const [deliveries, setDeliveries] = useState<ManualDelivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [selectedStatus, setSelectedStatus] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Modals
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [activeDelivery, setActiveDelivery] = useState<ManualDelivery | null>(null);

    const fetchDeliveries = useCallback(
        async (
            targetPage = 1,
            status = selectedStatus,
            search = searchQuery,
            isRefresh = false
        ) => {
            try {
                if (targetPage === 1 && !isRefresh) {
                    setLoading(true);
                }

                const res = await manualDeliveryApi.getManualDeliveries({
                    page: targetPage,
                    limit: 15,
                    status: status || undefined,
                    search: search.trim() || undefined,
                });

                if (res.success && res.data) {
                    if (targetPage === 1) {
                        setDeliveries(res.data);
                    } else {
                        setDeliveries((prev) => [...prev, ...res.data]);
                    }

                    if (res.meta) {
                        setPage(res.meta.page);
                        setTotalPages(res.meta.totalPages);
                        setTotalCount(res.meta.total);
                    }
                }
            } catch (error) {
                console.log("Error fetching manual deliveries:", error);
            } finally {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        },
        [selectedStatus, searchQuery]
    );

    useFocusEffect(
        useCallback(() => {
            fetchDeliveries(1, selectedStatus, searchQuery);
        }, [fetchDeliveries, selectedStatus, searchQuery])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchDeliveries(1, selectedStatus, searchQuery, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && page < totalPages) {
            setLoadingMore(true);
            const nextPage = page + 1;
            fetchDeliveries(nextPage, selectedStatus, searchQuery);
        }
    };

    const handleSearchChange = (text: string) => {
        setSearchQuery(text);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        debounceTimeout.current = setTimeout(() => {
            setPage(1);
            fetchDeliveries(1, selectedStatus, text);
        }, 400);
    };

    const handleSelectStatus = (status: string) => {
        setSelectedStatus(status);
        setPage(1);
        fetchDeliveries(1, status, searchQuery);
    };

    const handleOpenAssign = (item: ManualDelivery) => {
        setActiveDelivery(item);
        setAssignModalVisible(true);
    };

    const handleOpenCancel = (item: ManualDelivery) => {
        setActiveDelivery(item);
        setCancelModalVisible(true);
    };

    const handleRecreateOrder = (item: ManualDelivery) => {
        navigation.navigate("ManualDeliveryCreate", {
            prefillData: {
                customer: {
                    name: item.customer?.name || "",
                    mobileNumber: item.customer?.mobileNumber || "",
                    countryCode: item.customer?.countryCode || "+91",
                },
                dropoff: {
                    addressLine1: item.dropoff?.addressLine1 || "",
                    addressLine2: item.dropoff?.addressLine2 || "",
                    area: item.dropoff?.area || "",
                    city: item.dropoff?.city || "",
                    state: item.dropoff?.state || "",
                    postalCode: item.dropoff?.postalCode || "",
                    landmark: item.dropoff?.landmark || "",
                    latitude: item.dropoff?.latitude ?? null,
                    longitude: item.dropoff?.longitude ?? null,
                    formattedAddress: item.dropoff?.formattedAddress || "",
                    mapLink: item.dropoff?.mapLink || "",
                },
                customerNotes: item.customerNotes || "",
            },
        });
    };

    return (
        <View style={styles.container}>
            <AppBar
                title="Manual Deliveries"
                onBack={() => navigation.goBack()}
                rightElement={
                    <TouchableOpacity
                        style={styles.newBtn}
                        onPress={() => navigation.navigate("ManualDeliveryCreate")}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="add" size={18} color={colors.primary} />
                        <Text style={styles.newBtnText}>New</Text>
                    </TouchableOpacity>
                }
            />

            {/* Subtitle bar */}
            <View style={styles.subtitleBar}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.subText}>
                        Manage delivery requests received by phone
                    </Text>
                    {totalCount > 0 && (
                        <Text style={styles.countText}>{totalCount} deliveries recorded</Text>
                    )}
                </View>

                {/* Driver view shortcut */}
                {MANUAL_DELIVERY_FEATURES.ENABLE_DRIVER_MODULE && (
                    <TouchableOpacity
                        style={styles.driverShortcut}
                        onPress={() => navigation.navigate("DriverManualDeliveryListing")}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="bicycle" size={14} color="#7C3AED" />
                        <Text style={styles.driverShortcutText}>Driver View</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Search Input */}
            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons
                        name="search-outline"
                        size={17}
                        color="#94A3B8"
                        style={{ marginRight: 8 }}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by delivery #, customer, mobile..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => handleSearchChange("")}>
                            <Ionicons name="close-circle" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Status Filter Horizontal Tabs */}
            <View style={styles.filtersWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersContainer}
                >
                    {STATUS_FILTERS.map((f) => {
                        const isActive = selectedStatus === f.value;
                        return (
                            <TouchableOpacity
                                key={f.value}
                                style={[
                                    styles.filterPill,
                                    isActive && styles.filterPillActive,
                                ]}
                                onPress={() => handleSelectStatus(f.value)}
                                activeOpacity={0.75}
                            >
                                <Text
                                    style={[
                                        styles.filterPillText,
                                        isActive && styles.filterPillTextActive,
                                    ]}
                                >
                                    {f.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Delivery List */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading manual deliveries...</Text>
                </View>
            ) : (
                <FlatList
                    data={deliveries}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <ManualDeliveryCard
                            delivery={item}
                            onPressDetails={() =>
                                navigation.navigate("ManualDeliveryDetails", {
                                    id: item._id,
                                })
                            }
                            onPressRecreate={() => handleRecreateOrder(item)}
                            onPressAssignDriver={
                                MANUAL_DELIVERY_FEATURES.ENABLE_DRIVER_MODULE
                                    ? () => handleOpenAssign(item)
                                    : undefined
                            }
                            onPressCancel={() => handleOpenCancel(item)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={styles.footerLoader}>
                                <ActivityIndicator size="small" color={colors.primary} />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconWrap}>
                                <Ionicons
                                    name="call-outline"
                                    size={42}
                                    color="#94A3B8"
                                />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {searchQuery || selectedStatus
                                    ? "No Matching Deliveries"
                                    : "No Manual Deliveries Yet"}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {searchQuery || selectedStatus
                                    ? "Try adjusting your search terms or filter."
                                    : "Take phone-call delivery orders directly from your customers and dispatch drivers easily."}
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyCreateBtn}
                                onPress={() =>
                                    navigation.navigate("ManualDeliveryCreate")
                                }
                                activeOpacity={0.8}
                            >
                                <Ionicons name="add-circle" size={18} color="#fff" />
                                <Text style={styles.emptyCreateBtnText}>
                                    Create First Delivery
                                </Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Assign Driver Modal */}
            {activeDelivery && (
                <AssignDriverModal
                    visible={assignModalVisible}
                    deliveryId={activeDelivery._id}
                    deliveryNumber={activeDelivery.deliveryNumber}
                    onClose={() => setAssignModalVisible(false)}
                    onAssigned={() => fetchDeliveries(1, selectedStatus, searchQuery)}
                />
            )}

            {/* Cancel Delivery Modal */}
            {activeDelivery && (
                <CancelDeliveryModal
                    visible={cancelModalVisible}
                    deliveryId={activeDelivery._id}
                    deliveryNumber={activeDelivery.deliveryNumber}
                    onClose={() => setCancelModalVisible(false)}
                    onCancelled={() => fetchDeliveries(1, selectedStatus, searchQuery)}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.scaffoldBg,
    },
    newBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 3,
    },
    newBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.primary,
    },
    subtitleBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    subText: {
        fontSize: 12,
        color: "#64748B",
    },
    countText: {
        fontSize: 11,
        fontWeight: "700",
        color: colors.primary,
        marginTop: 2,
    },
    driverShortcut: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F3FF",
        borderWidth: 1,
        borderColor: "#DDD6FE",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        gap: 4,
    },
    driverShortcutText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#7C3AED",
    },
    searchSection: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: "#1E293B",
        paddingVertical: 2,
    },
    filtersWrapper: {
        marginBottom: 10,
    },
    filtersContainer: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterPill: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    filterPillActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterPillText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748B",
    },
    filterPillTextActive: {
        color: "#FFFFFF",
        fontWeight: "700",
    },
    listContent: {
        paddingTop: 4,
        paddingBottom: 24,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    loadingText: {
        fontSize: 13,
        color: "#64748B",
        marginTop: 10,
    },
    footerLoader: {
        paddingVertical: 14,
        alignItems: "center",
    },
    emptyContainer: {
        paddingHorizontal: 28,
        paddingVertical: 60,
        alignItems: "center",
    },
    emptyIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 13,
        color: "#64748B",
        textAlign: "center",
        lineHeight: 18,
        marginBottom: 20,
    },
    emptyCreateBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    emptyCreateBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
});

export default ManualDeliveryListingScreen;
