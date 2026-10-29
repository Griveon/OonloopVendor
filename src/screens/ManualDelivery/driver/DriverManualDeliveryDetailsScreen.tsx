import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    RefreshControl,
    Platform,
    Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AppBar from "../../../components/utils/AppBar";
import { colors } from "../../../constants/AppThem";
import { manualDeliveryApi } from "../../../services/manualDeliveryApi";
import type {
    ManualDelivery,
    ManualDeliveryStatus,
} from "../../../types/manualDelivery.types";
import ManualDeliveryStatusBadge from "../../../components/manualDelivery/ManualDeliveryStatusBadge";
import ManualDeliveryTimeline from "../../../components/manualDelivery/ManualDeliveryTimeline";
import DriverStatusUpdateModal from "../../../components/manualDelivery/DriverStatusUpdateModal";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";

const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
        const d = new Date(dateString);
        return d.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    } catch {
        return dateString;
    }
};

export const DriverManualDeliveryDetailsScreen = ({ route, navigation }: any) => {
    const deliveryId = route?.params?.id;

    const [delivery, setDelivery] = useState<ManualDelivery | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Status Update Modal
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [targetStatus, setTargetStatus] = useState<ManualDeliveryStatus>("PICKED_UP");

    const fetchDetails = useCallback(
        async (isRefresh = false) => {
            if (!deliveryId) return;

            try {
                if (!isRefresh) setLoading(true);
                const res = await manualDeliveryApi.getDriverManualDeliveryById(deliveryId);
                if (res.success && res.data) {
                    setDelivery(res.data);
                }
            } catch (error) {
                console.log("Error loading driver delivery details:", error);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [deliveryId]
    );

    useFocusEffect(
        useCallback(() => {
            fetchDetails();
        }, [fetchDetails])
    );

    const handleCall = (phone?: string) => {
        if (phone) Linking.openURL(`tel:${phone}`);
    };

    const handleNavigateToCoordsOrAddress = (
        lat?: number | null,
        lng?: number | null,
        addressText?: string
    ) => {
        if (lat && lng) {
            const url = Platform.select({
                ios: `maps://app?daddr=${lat},${lng}`,
                android: `google.navigation:q=${lat},${lng}`,
            });
            Linking.canOpenURL(url!).then((supported) => {
                if (supported) {
                    Linking.openURL(url!);
                } else {
                    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
                }
            });
        } else if (addressText) {
            const encoded = encodeURIComponent(addressText);
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`);
        } else {
            Alert.alert("Navigation", "No coordinates or address available for navigation.");
        }
    };

    const handleAccept = async () => {
        if (!delivery) return;
        try {
            const res = await manualDeliveryApi.driverAccept(delivery._id);
            if (res.success) {
                Toast.show({
                    type: "success",
                    text1: "Accepted!",
                    text2: "Delivery accepted. Proceed to the store for pickup.",
                });
                fetchDetails(true);
            } else {
                Toast.show({
                    type: "error",
                    text1: "Action Failed",
                    text2: res.message || "Failed to accept assignment.",
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

    const handleReject = () => {
        if (!delivery) return;
        Alert.prompt
            ? Alert.prompt(
                  "Reject Assignment",
                  "Enter reason for rejecting this delivery (optional):",
                  [
                      { text: "Cancel", style: "cancel" },
                      {
                          text: "Reject",
                          style: "destructive",
                          onPress: async (reason?: string) => {
                              const res = await manualDeliveryApi.driverReject(
                                  delivery._id,
                                  reason || "Driver rejected assignment"
                              );
                              if (res.success) {
                                  Toast.show({
                                      type: "success",
                                      text1: "Rejected",
                                      text2: "Assignment was returned to store.",
                                  });
                                  navigation.goBack();
                              }
                          },
                      },
                  ]
              )
            : Alert.alert(
                  "Reject Assignment",
                  "Are you sure you want to reject this delivery assignment? It will return to the store.",
                  [
                      { text: "Cancel", style: "cancel" },
                      {
                          text: "Reject",
                          style: "destructive",
                          onPress: async () => {
                              const res = await manualDeliveryApi.driverReject(
                                  delivery._id,
                                  "Driver rejected assignment"
                              );
                              if (res.success) {
                                  Toast.show({
                                      type: "success",
                                      text1: "Rejected",
                                      text2: "Assignment was returned to store.",
                                  });
                                  navigation.goBack();
                              }
                          },
                      },
                  ]
              );
    };

    const openStatusUpdate = (status: ManualDeliveryStatus) => {
        setTargetStatus(status);
        setStatusModalVisible(true);
    };

    if (loading && !delivery) {
        return (
            <View style={styles.container}>
                <AppBar title="Delivery Details" onBack={() => navigation.goBack()} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                    <Text style={styles.loadingText}>Loading delivery...</Text>
                </View>
            </View>
        );
    }

    if (!delivery) {
        return (
            <View style={styles.container}>
                <AppBar title="Delivery Details" onBack={() => navigation.goBack()} />
                <View style={styles.centerContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
                    <Text style={styles.errorTitle}>Delivery Not Found</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.retryBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const formattedPickup =
        delivery.pickup.formattedAddress ||
        [
            delivery.pickup.storeName,
            delivery.pickup.addressLine1,
            delivery.pickup.city,
        ]
            .filter(Boolean)
            .join(", ");

    const formattedDropoff =
        delivery.dropoff.formattedAddress ||
        [
            delivery.dropoff.addressLine1,
            delivery.dropoff.landmark ? `Near ${delivery.dropoff.landmark}` : null,
            delivery.dropoff.city,
        ]
            .filter(Boolean)
            .join(", ");

    return (
        <View style={styles.container}>
            <AppBar
                title={`Delivery #${delivery.deliveryNumber}`}
                onBack={() => navigation.goBack()}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            fetchDetails(true);
                        }}
                        colors={["#7C3AED"]}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* ── CARD 1: STATUS SUMMARY ── */}
                <View style={styles.card}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.deliveryNumberLabel}>DELIVERY NUMBER</Text>
                            <Text style={styles.deliveryNumberText}>
                                {delivery.deliveryNumber}
                            </Text>
                        </View>
                        <ManualDeliveryStatusBadge status={delivery.status} />
                    </View>

                    <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={14} color="#64748B" />
                        <Text style={styles.metaText}>
                            Assigned: {formatDate(delivery.assignedAt || delivery.createdAt)}
                        </Text>
                        {typeof delivery.distance?.valueKm === "number" && (
                            <View style={styles.distanceBadge}>
                                <Ionicons name="compass" size={12} color="#059669" />
                                <Text style={styles.distanceBadgeText}>
                                    {delivery.distance.valueKm.toFixed(1)} km
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Failure / Cancel Banner */}
                    {delivery.failureReason && (
                        <View style={styles.redBanner}>
                            <Ionicons name="alert-circle" size={16} color="#DC2626" />
                            <Text style={styles.redBannerText}>
                                Reason: {delivery.failureReason}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── CARD 2: STORE PICKUP ── */}
                <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                        <Ionicons name="storefront" size={16} color="#2563EB" />
                        <Text style={styles.cardTitle}>STORE PICKUP</Text>
                    </View>

                    <Text style={styles.storeNameText}>
                        {delivery.pickup.storeName || "Vendor Store"}
                    </Text>
                    <Text style={styles.addressBodyText}>{formattedPickup}</Text>

                    {/* Quick Store Actions: Call & Navigate */}
                    <View style={styles.quickActionsRow}>
                        {delivery.pickup.contactPhone && (
                            <TouchableOpacity
                                style={styles.quickActionBtn}
                                onPress={() => handleCall(delivery.pickup.contactPhone)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="call" size={15} color="#2563EB" />
                                <Text style={styles.quickActionBtnText}>Call Store</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.quickActionBtn, styles.navBtn]}
                            onPress={() =>
                                handleNavigateToCoordsOrAddress(
                                    delivery.pickup.latitude,
                                    delivery.pickup.longitude,
                                    formattedPickup
                                )
                            }
                            activeOpacity={0.8}
                        >
                            <Ionicons name="navigate" size={15} color="#FFFFFF" />
                            <Text style={styles.navBtnText}>Navigate to Store</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── CARD 3: CUSTOMER DROPOFF ── */}
                <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                        <Ionicons name="person" size={16} color="#059669" />
                        <Text style={styles.cardTitle}>CUSTOMER DROPOFF</Text>
                    </View>

                    <Text style={styles.customerNameText}>
                        {delivery.customer.name}
                    </Text>
                    <Text style={styles.customerPhoneText}>
                        📞 {delivery.customer.countryCode || "+91"}{" "}
                        {delivery.customer.mobileNumber}
                    </Text>

                    <Text style={[styles.addressBodyText, { marginTop: 6 }]}>
                        {formattedDropoff}
                    </Text>

                    {delivery.dropoff.landmark ? (
                        <Text style={styles.landmarkText}>
                            📍 Landmark: {delivery.dropoff.landmark}
                        </Text>
                    ) : null}

                    {/* Customer Notes */}
                    {delivery.customerNotes ? (
                        <View style={styles.notesBox}>
                            <Ionicons name="document-text-outline" size={14} color="#D97706" />
                            <View style={{ flex: 1, marginLeft: 6 }}>
                                <Text style={styles.notesTitle}>Customer Instructions / Items:</Text>
                                <Text style={styles.notesBody}>{delivery.customerNotes}</Text>
                            </View>
                        </View>
                    ) : null}

                    {/* Quick Customer Actions: Call & Navigate */}
                    <View style={styles.quickActionsRow}>
                        <TouchableOpacity
                            style={styles.quickActionBtn}
                            onPress={() => handleCall(delivery.customer.mobileNumber)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="call" size={15} color="#059669" />
                            <Text style={[styles.quickActionBtnText, { color: "#059669" }]}>
                                Call Customer
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.quickActionBtn, styles.navBtnGreen]}
                            onPress={() =>
                                handleNavigateToCoordsOrAddress(
                                    delivery.dropoff.latitude,
                                    delivery.dropoff.longitude,
                                    formattedDropoff
                                )
                            }
                            activeOpacity={0.8}
                        >
                            <Ionicons name="navigate" size={15} color="#FFFFFF" />
                            <Text style={styles.navBtnText}>Navigate to Customer</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── CARD 4: TIMELINE ── */}
                <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                        <Ionicons name="time" size={16} color="#475569" />
                        <Text style={styles.cardTitle}>DELIVERY TIMELINE</Text>
                    </View>

                    <ManualDeliveryTimeline history={delivery.statusHistory} />
                </View>
            </ScrollView>

            {/* ── STICKY DRIVER WORKFLOW ACTION BAR ── */}
            <View style={styles.stickyFooterBar}>
                {delivery.status === "ASSIGNED" && (
                    <View style={styles.workflowRow}>
                        <TouchableOpacity
                            style={styles.driverRejectBtn}
                            onPress={handleReject}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                            <Text style={styles.driverRejectBtnText}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.driverAcceptBtn}
                            onPress={handleAccept}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                            <Text style={styles.driverAcceptBtnText}>Accept Delivery</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {delivery.status === "ACCEPTED" && (
                    <View style={styles.workflowRow}>
                        <TouchableOpacity
                            style={styles.failedBtn}
                            onPress={() => openStatusUpdate("FAILED")}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.failedBtnText}>Mark Failed</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.primaryActionBtn, { backgroundColor: "#D97706" }]}
                            onPress={() => openStatusUpdate("PICKED_UP")}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="cube" size={18} color="#FFFFFF" />
                            <Text style={styles.primaryActionBtnText}>Mark Picked Up</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {delivery.status === "PICKED_UP" && (
                    <View style={styles.workflowRow}>
                        <TouchableOpacity
                            style={styles.failedBtn}
                            onPress={() => openStatusUpdate("FAILED")}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.failedBtnText}>Mark Failed</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.primaryActionBtn, { backgroundColor: "#EA580C" }]}
                            onPress={() => openStatusUpdate("OUT_FOR_DELIVERY")}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="bicycle" size={18} color="#FFFFFF" />
                            <Text style={styles.primaryActionBtnText}>Start Delivery Trip</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {delivery.status === "OUT_FOR_DELIVERY" && (
                    <View style={styles.workflowRow}>
                        <TouchableOpacity
                            style={styles.failedBtn}
                            onPress={() => openStatusUpdate("FAILED")}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.failedBtnText}>Failed</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.primaryActionBtn, { backgroundColor: "#4F46E5", flex: 1 }]}
                            onPress={() => openStatusUpdate("REACHED")}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="location" size={16} color="#FFFFFF" />
                            <Text style={styles.primaryActionBtnText}>Mark Reached</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.primaryActionBtn, { backgroundColor: "#059669", flex: 1.2 }]}
                            onPress={() => openStatusUpdate("DELIVERED")}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                            <Text style={styles.primaryActionBtnText}>Delivered</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {delivery.status === "REACHED" && (
                    <View style={styles.workflowRow}>
                        <TouchableOpacity
                            style={styles.failedBtn}
                            onPress={() => openStatusUpdate("FAILED")}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.failedBtnText}>Mark Failed</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.primaryActionBtn, { backgroundColor: "#059669" }]}
                            onPress={() => openStatusUpdate("DELIVERED")}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                            <Text style={styles.primaryActionBtnText}>Confirm Delivered</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {["DELIVERED", "FAILED", "CANCELLED"].includes(delivery.status) && (
                    <View style={styles.terminalNotice}>
                        <Ionicons
                            name={
                                delivery.status === "DELIVERED"
                                    ? "checkmark-done-circle"
                                    : "information-circle"
                            }
                            size={18}
                            color="#64748B"
                        />
                        <Text style={styles.terminalNoticeText}>
                            This delivery is completed and in {delivery.status} status.
                        </Text>
                    </View>
                )}
            </View>

            {/* Status Update Modal */}
            <DriverStatusUpdateModal
                visible={statusModalVisible}
                deliveryId={delivery._id}
                deliveryNumber={delivery.deliveryNumber}
                targetStatus={targetStatus}
                onClose={() => setStatusModalVisible(false)}
                onUpdated={() => fetchDetails(true)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.scaffoldBg,
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
    errorTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1E293B",
        marginTop: 10,
    },
    retryBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 12,
    },
    retryBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#fff",
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 30,
        gap: 14,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },
    deliveryNumberLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: "#64748B",
        letterSpacing: 0.5,
    },
    deliveryNumberText: {
        fontSize: 17,
        fontWeight: "800",
        color: "#0F172A",
        marginTop: 1,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
        gap: 6,
    },
    metaText: {
        fontSize: 12,
        color: "#64748B",
    },
    distanceBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ECFDF5",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 4,
        marginLeft: 8,
    },
    distanceBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#059669",
    },
    redBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF2F2",
        padding: 8,
        borderRadius: 8,
        marginTop: 10,
        gap: 6,
    },
    redBannerText: {
        fontSize: 12,
        color: "#B91C1C",
        fontWeight: "600",
    },
    cardTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: "800",
        color: "#475569",
        letterSpacing: 0.5,
    },
    storeNameText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
    },
    customerNameText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
    },
    customerPhoneText: {
        fontSize: 13,
        color: "#64748B",
        marginTop: 2,
    },
    addressBodyText: {
        fontSize: 13,
        color: "#334155",
        lineHeight: 18,
        marginTop: 2,
    },
    landmarkText: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 4,
    },
    notesBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#FFFBEB",
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#FDE68A",
        marginTop: 10,
    },
    notesTitle: {
        fontSize: 11,
        fontWeight: "700",
        color: "#B45309",
    },
    notesBody: {
        fontSize: 12,
        color: "#78350F",
        marginTop: 2,
        lineHeight: 16,
    },
    quickActionsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 14,
        gap: 10,
    },
    quickActionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    quickActionBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#2563EB",
    },
    navBtn: {
        backgroundColor: "#2563EB",
        borderColor: "#2563EB",
    },
    navBtnGreen: {
        backgroundColor: "#059669",
        borderColor: "#059669",
    },
    navBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    stickyFooterBar: {
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === "ios" ? 24 : 14,
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 8,
    },
    workflowRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    driverRejectBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        paddingVertical: 13,
        borderRadius: 12,
        gap: 6,
    },
    driverRejectBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#DC2626",
    },
    driverAcceptBtn: {
        flex: 1.5,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#059669",
        paddingVertical: 13,
        borderRadius: 12,
        gap: 6,
    },
    driverAcceptBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    failedBtn: {
        paddingHorizontal: 14,
        paddingVertical: 13,
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        borderRadius: 12,
    },
    failedBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#DC2626",
    },
    primaryActionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 13,
        borderRadius: 12,
        gap: 6,
    },
    primaryActionBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    terminalNotice: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        gap: 8,
    },
    terminalNoticeText: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "500",
    },
});

export default DriverManualDeliveryDetailsScreen;
