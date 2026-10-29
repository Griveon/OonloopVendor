import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Modal,
    TextInput,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AppBar from "../../../components/utils/AppBar";
import { colors } from "../../../constants/AppThem";
import { manualDeliveryApi } from "../../../services/manualDeliveryApi";
import type { ManualDelivery } from "../../../types/manualDelivery.types";
import DriverManualDeliveryCard from "../../../components/manualDelivery/DriverManualDeliveryCard";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";

const DRIVER_STATUS_FILTERS = [
    { label: "All", value: "" },
    { label: "Assigned", value: "ASSIGNED" },
    { label: "Accepted", value: "ACCEPTED" },
    { label: "Picked Up", value: "PICKED_UP" },
    { label: "Out for Delivery", value: "OUT_FOR_DELIVERY" },
    { label: "Reached", value: "REACHED" },
    { label: "Delivered", value: "DELIVERED" },
    { label: "Failed", value: "FAILED" },
];

export const DriverManualDeliveryListScreen = ({ navigation }: any) => {
    const [deliveries, setDeliveries] = useState<ManualDelivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedStatus, setSelectedStatus] = useState("");

    // Reject Modal
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [targetDelivery, setTargetDelivery] = useState<ManualDelivery | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [rejecting, setRejecting] = useState(false);

    const fetchDeliveries = useCallback(
        async (
            targetPage = 1,
            status = selectedStatus,
            isRefresh = false
        ) => {
            try {
                if (targetPage === 1 && !isRefresh) setLoading(true);

                const res = await manualDeliveryApi.getDriverManualDeliveries({
                    page: targetPage,
                    limit: 15,
                    status: status || undefined,
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
                    }
                }
            } catch (error) {
                console.log("Error loading driver manual deliveries:", error);
            } finally {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        },
        [selectedStatus]
    );

    useFocusEffect(
        useCallback(() => {
            fetchDeliveries(1, selectedStatus);
        }, [fetchDeliveries, selectedStatus])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchDeliveries(1, selectedStatus, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && page < totalPages) {
            setLoadingMore(true);
            const nextPage = page + 1;
            fetchDeliveries(nextPage, selectedStatus);
        }
    };

    const handleSelectStatus = (status: string) => {
        setSelectedStatus(status);
        setPage(1);
        fetchDeliveries(1, status);
    };

    const handleAccept = async (delivery: ManualDelivery) => {
        try {
            const res = await manualDeliveryApi.driverAccept(delivery._id);
            if (res.success) {
                Toast.show({
                    type: "success",
                    text1: "Delivery Accepted",
                    text2: `You accepted #${delivery.deliveryNumber}. Head to store for pickup.`,
                });
                fetchDeliveries(1, selectedStatus);
            } else {
                Toast.show({
                    type: "error",
                    text1: "Action Failed",
                    text2: res.message || "Could not accept delivery.",
                });
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: error?.message || "Something went wrong",
            });
        }
    };

    const handleOpenReject = (delivery: ManualDelivery) => {
        setTargetDelivery(delivery);
        setRejectReason("");
        setRejectModalVisible(true);
    };

    const handleConfirmReject = async () => {
        if (!targetDelivery) return;

        try {
            setRejecting(true);
            const res = await manualDeliveryApi.driverReject(
                targetDelivery._id,
                rejectReason.trim() || "Driver unable to take this assignment"
            );

            if (res.success) {
                Toast.show({
                    type: "success",
                    text1: "Assignment Rejected",
                    text2: `Delivery #${targetDelivery.deliveryNumber} removed from your list.`,
                });
                setRejectModalVisible(false);
                fetchDeliveries(1, selectedStatus);
            } else {
                Toast.show({
                    type: "error",
                    text1: "Action Failed",
                    text2: res.message || "Could not reject delivery.",
                });
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: error?.message || "Something went wrong",
            });
        } finally {
            setRejecting(false);
        }
    };

    return (
        <View style={styles.container}>
            <AppBar
                title="Driver Deliveries"
                onBack={() => navigation.goBack()}
                rightElement={
                    <TouchableOpacity
                        style={styles.vendorModeBtn}
                        onPress={() => navigation.navigate("ManualDeliveryListing")}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="storefront-outline" size={14} color={colors.primary} />
                        <Text style={styles.vendorModeBtnText}>Vendor Mode</Text>
                    </TouchableOpacity>
                }
            />

            {/* Subtitle banner */}
            <View style={styles.subBanner}>
                <Ionicons name="bicycle" size={18} color="#7C3AED" />
                <Text style={styles.subBannerText}>
                    Assigned phone-order deliveries for your driver account
                </Text>
            </View>

            {/* Horizontal Filter Tabs */}
            <View style={styles.filterWrap}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContent}
                >
                    {DRIVER_STATUS_FILTERS.map((f) => {
                        const isActive = selectedStatus === f.value;
                        return (
                            <TouchableOpacity
                                key={f.value}
                                style={[
                                    styles.filterTab,
                                    isActive && styles.filterTabActive,
                                ]}
                                onPress={() => handleSelectStatus(f.value)}
                                activeOpacity={0.75}
                            >
                                <Text
                                    style={[
                                        styles.filterTabText,
                                        isActive && styles.filterTabTextActive,
                                    ]}
                                >
                                    {f.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                    <Text style={styles.loadingText}>Fetching assigned deliveries...</Text>
                </View>
            ) : (
                <FlatList
                    data={deliveries}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <DriverManualDeliveryCard
                            delivery={item}
                            onPressDetails={() =>
                                navigation.navigate("DriverManualDeliveryDetails", {
                                    id: item._id,
                                })
                            }
                            onAccept={() => handleAccept(item)}
                            onReject={() => handleOpenReject(item)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={["#7C3AED"]}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={styles.footerLoader}>
                                <ActivityIndicator size="small" color="#7C3AED" />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="bicycle-outline" size={42} color="#94A3B8" />
                            </View>
                            <Text style={styles.emptyTitle}>No Deliveries Assigned</Text>
                            <Text style={styles.emptySub}>
                                {selectedStatus
                                    ? "No deliveries match the selected filter."
                                    : "You currently have no manual deliveries assigned to your driver account."}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Reject Assignment Modal */}
            <Modal
                visible={rejectModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setRejectModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.rejectModalContent}>
                        <View style={styles.rejectIconWrap}>
                            <Ionicons name="close-circle-outline" size={32} color="#DC2626" />
                        </View>

                        <Text style={styles.rejectTitle}>Reject Assignment?</Text>
                        <Text style={styles.rejectSub}>
                            Delivery #{targetDelivery?.deliveryNumber} will be returned to the vendor store for reassignment.
                        </Text>

                        <TextInput
                            style={styles.rejectInput}
                            placeholder="Reason for rejection (optional)..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            numberOfLines={3}
                            maxLength={500}
                            value={rejectReason}
                            onChangeText={setRejectReason}
                        />

                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity
                                style={styles.modalBackBtn}
                                onPress={() => setRejectModalVisible(false)}
                                disabled={rejecting}
                            >
                                <Text style={styles.modalBackBtnText}>Keep</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalConfirmRejectBtn}
                                onPress={handleConfirmReject}
                                disabled={rejecting}
                            >
                                {rejecting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalConfirmRejectBtnText}>
                                        Confirm Reject
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.scaffoldBg,
    },
    vendorModeBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    vendorModeBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: colors.primary,
    },
    subBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F3FF",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#DDD6FE",
        gap: 8,
    },
    subBannerText: {
        flex: 1,
        fontSize: 12,
        color: "#6D28D9",
        fontWeight: "600",
    },
    filterWrap: {
        marginVertical: 10,
    },
    filterContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterTab: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    filterTabActive: {
        backgroundColor: "#7C3AED",
        borderColor: "#7C3AED",
    },
    filterTabText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748B",
    },
    filterTabTextActive: {
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
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#EDE9FE",
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
    emptySub: {
        fontSize: 13,
        color: "#64748B",
        textAlign: "center",
        lineHeight: 18,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    rejectModalContent: {
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        alignItems: "center",
    },
    rejectIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#FEF2F2",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    rejectTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#0F172A",
    },
    rejectSub: {
        fontSize: 13,
        color: "#64748B",
        textAlign: "center",
        lineHeight: 18,
        marginTop: 4,
        marginBottom: 14,
    },
    rejectInput: {
        width: "100%",
        backgroundColor: "#F8FAFC",
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        borderRadius: 10,
        padding: 10,
        fontSize: 13,
        color: "#1E293B",
        textAlignVertical: "top",
        height: 70,
        marginBottom: 16,
    },
    modalBtnRow: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    modalBackBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
    },
    modalBackBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#475569",
    },
    modalConfirmRejectBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#DC2626",
        alignItems: "center",
        justifyContent: "center",
    },
    modalConfirmRejectBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
});

export default DriverManualDeliveryListScreen;
