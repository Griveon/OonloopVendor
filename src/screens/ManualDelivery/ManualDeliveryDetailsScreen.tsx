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
} from "react-native";
import { Alert } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import RazorpayCheckout from "react-native-razorpay";
import { getUserData } from "../../components/AsyncStorage/AsyncStorage";
import AppBar from "../../components/utils/AppBar";
import { colors } from "../../constants/AppThem";
import { manualDeliveryApi } from "../../services/manualDeliveryApi";
import type { ManualDelivery } from "../../types/manualDelivery.types";
import ManualDeliveryStatusBadge from "../../components/manualDelivery/ManualDeliveryStatusBadge";
import ManualDeliveryTimeline from "../../components/manualDelivery/ManualDeliveryTimeline";
import AssignDriverModal from "../../components/manualDelivery/AssignDriverModal";
import CancelDeliveryModal from "../../components/manualDelivery/CancelDeliveryModal";
import { useFocusEffect } from "@react-navigation/native";
import { MANUAL_DELIVERY_FEATURES } from "../../constants/manualDeliveryConfig";

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

export const ManualDeliveryDetailsScreen = ({ route, navigation }: any) => {
    const deliveryId = route?.params?.id;

    const [delivery, setDelivery] = useState<ManualDelivery | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [paying, setPaying] = useState(false);

    const fetchDetails = useCallback(async (isRefresh = false) => {
        if (!deliveryId) return;

        try {
            if (!isRefresh) setLoading(true);
            const res = await manualDeliveryApi.getManualDeliveryById(deliveryId);
            if (res.success && res.data) {
                setDelivery(res.data);
            }
        } catch (error) {
            console.log("Error loading delivery details:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [deliveryId]);

    useFocusEffect(
        useCallback(() => {
            fetchDetails();
        }, [fetchDetails])
    );

        const handleRetryPayment = async () => {
        if (!delivery || paying) return;

        try {
            setPaying(true);

            // 1. Initialize payment transaction
            const txnRes = await manualDeliveryApi.createPaymentOrder(delivery._id);
            const txnData = txnRes?.data;

            if (!txnRes?.success || !txnData) {
                throw new Error(txnRes?.message || "Failed to initialize payment transaction.");
            }

            // Handle DEV demo mode if enabled
            if (txnData.demo) {
                const verifyRes = await manualDeliveryApi.verifyPayment({
                    transactionId: txnData.transactionId,
                    razorpay_order_id: txnData.orderId,
                    razorpay_payment_id: `DEMO-PAY-${Date.now()}`,
                    razorpay_signature: "demo",
                });

                if (verifyRes?.success) {
                    Alert.alert("Success", "Payment verified & manual delivery confirmed!");
                    fetchDetails(true);
                } else {
                    Alert.alert("Error", verifyRes?.message || "Payment verification failed.");
                }
                return;
            }

            // 2. Open Razorpay Checkout modal
            const { user: sessionUser } = await getUserData();
            const fullName =
                sessionUser?.name ||
                [sessionUser?.firstName, sessionUser?.lastName].filter(Boolean).join(" ") ||
                delivery.pickup?.storeName ||
                "Seller";

            const options: any = {
                description: `Delivery charges for #${delivery.deliveryNumber || "Manual Order"}`,
                currency: txnData.currency || "INR",
                key: txnData.key,
                amount: txnData.amount,
                order_id: txnData.orderId,
                name: "Oonloop",
                prefill: {
                    email: sessionUser?.email || "seller@oonloop.com",
                    contact: sessionUser?.mobileNumber || sessionUser?.phone || sessionUser?.mobile || "",
                    name: fullName,
                },
                theme: { color: colors.primary || "#0F8A5F" },
            };

            let paymentResponse: any;
            try {
                paymentResponse = await RazorpayCheckout.open(options);
            } catch (razorpayError: any) {
                console.log("Razorpay payment cancelled or failed:", razorpayError);
                Alert.alert(
                    "Payment Incomplete",
                    "Payment was cancelled or failed. You can retry at any time."
                );
                return;
            }

            // 3. Verify Payment with backend
            try {
                const verifyRes = await manualDeliveryApi.verifyPaymentWithRetry({
                    transactionId: txnData.transactionId,
                    razorpay_order_id: paymentResponse.razorpay_order_id,
                    razorpay_payment_id: paymentResponse.razorpay_payment_id,
                    razorpay_signature: paymentResponse.razorpay_signature,
                });

                if (verifyRes?.success) {
                    Alert.alert(
                        "Payment Successful",
                        "Your manual delivery order has been broadcasted to nearby drivers."
                    );
                    fetchDetails(true);
                } else {
                    Alert.alert(
                        "Verification Pending",
                        "Payment received. If order confirmation takes a moment, please refresh."
                    );
                    fetchDetails(true);
                }
            } catch (verifyError: any) {
                console.error("Verification retry failed:", verifyError);
                Alert.alert(
                    "Verification In Progress",
                    "Payment was completed via Razorpay. We are confirming the transaction."
                );
                fetchDetails(true);
            }
        } catch (err: any) {
            Alert.alert(
                "Error",
                err?.response?.data?.message || err?.message || "Failed to initiate payment."
            );
        } finally {
            setPaying(false);
        }
    };

const handleCall = (phone?: string) => {
        if (phone) Linking.openURL(`tel:${phone}`);
    };

    const handleRecreateOrder = () => {
        if (!delivery) return;
        navigation.navigate("ManualDeliveryCreate", {
            prefillData: {
                customer: {
                    name: delivery.customer?.name || "",
                    mobileNumber: delivery.customer?.mobileNumber || "",
                    countryCode: delivery.customer?.countryCode || "+91",
                },
                dropoff: {
                    addressLine1: delivery.dropoff?.addressLine1 || "",
                    addressLine2: delivery.dropoff?.addressLine2 || "",
                    area: delivery.dropoff?.area || "",
                    city: delivery.dropoff?.city || "",
                    state: delivery.dropoff?.state || "",
                    postalCode: delivery.dropoff?.postalCode || "",
                    landmark: delivery.dropoff?.landmark || "",
                    latitude: delivery.dropoff?.latitude ?? null,
                    longitude: delivery.dropoff?.longitude ?? null,
                    formattedAddress: delivery.dropoff?.formattedAddress || "",
                    mapLink: delivery.dropoff?.mapLink || "",
                },
                customerNotes: delivery.customerNotes || "",
            },
        });
    };

    if (loading && !delivery) {
        return (
            <View style={styles.container}>
                <AppBar title="Delivery Details" onBack={() => navigation.goBack()} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading delivery details...</Text>
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
                    <Text style={styles.errorSub}>
                        This delivery record may have been removed or is inaccessible.
                    </Text>
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

    const isCreated = delivery.status === "CREATED";
    const isTerminal = ["DELIVERED", "CANCELLED", "FAILED"].includes(delivery.status);

    const formattedDropoff =
        delivery.dropoff.formattedAddress ||
        [
            delivery.dropoff.addressLine1,
            delivery.dropoff.addressLine2,
            delivery.dropoff.area,
            delivery.dropoff.landmark ? `Near ${delivery.dropoff.landmark}` : null,
            delivery.dropoff.city,
            delivery.dropoff.state,
            delivery.dropoff.postalCode,
        ]
            .filter(Boolean)
            .join(", ");

    const formattedPickup =
        delivery.pickup.formattedAddress ||
        [
            delivery.pickup.storeName,
            delivery.pickup.addressLine1,
            delivery.pickup.addressLine2,
            delivery.pickup.city,
            delivery.pickup.state,
            delivery.pickup.postalCode,
        ]
            .filter(Boolean)
            .join(", ");

    return (
        <View style={styles.container}>
            <AppBar
                title={delivery.deliveryNumber}
                onBack={() => navigation.goBack()}
                rightElement={
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        {isCreated && (
                            <TouchableOpacity
                                style={styles.editBtn}
                                onPress={() =>
                                    navigation.navigate("ManualDeliveryEdit", {
                                        id: delivery._id,
                                    })
                                }
                                activeOpacity={0.8}
                            >
                                <Ionicons name="pencil" size={14} color={colors.primary} />
                                <Text style={styles.editBtnText}>Edit</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.recreateTopBtn}
                            onPress={handleRecreateOrder}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="repeat" size={14} color="#2563EB" />
                            <Text style={styles.recreateTopBtnText}>Recreate</Text>
                        </TouchableOpacity>
                    </View>
                }
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
                        colors={[colors.primary]}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* ── CARD 1: DELIVERY OVERVIEW ── */}
                <View style={styles.card}>
                    <View style={styles.overviewHeader}>
                        <View>
                            <Text style={styles.deliveryNumberLabel}>DELIVERY REFERENCE</Text>
                            <Text style={styles.deliveryNumberText}>
                                {delivery.deliveryNumber}
                            </Text>
                        </View>
                        <ManualDeliveryStatusBadge status={delivery.status} />
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={14} color="#64748B" />
                            <Text style={styles.metaText}>
                                {formatDate(delivery.createdAt)}
                            </Text>
                        </View>

                        <View style={styles.metaItem}>
                            <Ionicons name="call-outline" size={14} color="#2563EB" />
                            <Text style={[styles.metaText, { color: "#2563EB", fontWeight: "600" }]}>
                                Source: Phone Call
                            </Text>
                        </View>
                    </View>

                    {/* Cancellation / Failure reason banners */}
                    {delivery.cancellationReason && (
                        <View style={styles.reasonBannerRed}>
                            <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                            <View style={{ flex: 1, marginLeft: 6 }}>
                                <Text style={styles.reasonTitleRed}>Cancellation Reason</Text>
                                <Text style={styles.reasonTextRed}>
                                    {delivery.cancellationReason}
                                </Text>
                            </View>
                        </View>
                    )}

                    {delivery.failureReason && (
                        <View style={styles.reasonBannerRed}>
                            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                            <View style={{ flex: 1, marginLeft: 6 }}>
                                <Text style={styles.reasonTitleRed}>Delivery Failed</Text>
                                <Text style={styles.reasonTextRed}>
                                    {delivery.failureReason}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* ── CARD 2: CUSTOMER INFORMATION ── */}
                <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                        <Ionicons name="person" size={16} color="#2563EB" />
                        <Text style={styles.cardTitle}>Customer Information</Text>
                    </View>

                    <View style={styles.customerBox}>
                        <View style={styles.customerHeaderRow}>
                            <View>
                                <Text style={styles.customerName}>
                                    {delivery.customer.name}
                                </Text>
                                <Text style={styles.customerPhone}>
                                    {delivery.customer.countryCode || "+91"}{" "}
                                    {delivery.customer.mobileNumber}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.callActionBtn}
                                onPress={() => handleCall(delivery.customer.mobileNumber)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="call" size={15} color="#fff" />
                                <Text style={styles.callActionText}>Call</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.dropoffAddressBox}>
                            <View style={styles.pointRow}>
                                <Ionicons name="location" size={16} color="#059669" />
                                <Text style={styles.dropoffTitle}>Dropoff Address</Text>
                            </View>
                            <Text style={styles.addressBody}>{formattedDropoff}</Text>

                            {delivery.dropoff.landmark ? (
                                <Text style={styles.landmarkText}>
                                    📍 Landmark: {delivery.dropoff.landmark}
                                </Text>
                            ) : null}

                            {delivery.dropoff.mapLink ? (
                                <TouchableOpacity
                                    style={styles.openMapLinkBtn}
                                    onPress={() => Linking.openURL(delivery.dropoff.mapLink!)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="map" size={14} color="#2563EB" />
                                    <Text style={styles.openMapLinkBtnText} numberOfLines={1}>
                                        Open Customer Map Link
                                    </Text>
                                    <Ionicons name="open-outline" size={13} color="#2563EB" />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {/* Customer Notes */}
                        {delivery.customerNotes ? (
                            <View style={styles.notesBox}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                    <Ionicons name="document-text-outline" size={14} color="#D97706" />
                                    <Text style={styles.notesTitle}>Notes / Requested Items</Text>
                                </View>
                                <Text style={styles.notesBody}>{delivery.customerNotes}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                {/* ── CARD 3: PICKUP LOCATION & DISTANCE ── */}
                <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                        <Ionicons name="storefront" size={16} color="#2563EB" />
                        <Text style={styles.cardTitle}>Pickup From Store</Text>
                    </View>

                    <Text style={styles.storeNameText}>
                        {delivery.pickup.storeName || "Vendor Store"}
                    </Text>
                    <Text style={styles.addressBody}>{formattedPickup}</Text>

                    {delivery.pickup.contactPhone && (
                        <TouchableOpacity
                            style={styles.storePhoneRow}
                            onPress={() => handleCall(delivery.pickup.contactPhone)}
                        >
                            <Ionicons name="call-outline" size={13} color="#2563EB" />
                            <Text style={styles.storePhoneText}>
                                Store Contact: {delivery.pickup.contactPhone}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Distance Metric */}
                    {typeof delivery.distance?.valueKm === "number" ? (
                        <View style={styles.distanceBadgeRow}>
                            <Ionicons name="compass" size={16} color="#6D28D9" />
                            <Text style={styles.distanceMetricText}>
                                {delivery.distance.valueKm.toFixed(1)} km
                            </Text>
                            <Text style={styles.distanceMethodText}>
                                ({delivery.distance.calculationMethod === "ROAD"
                                    ? "Road Distance"
                                    : "Straight-Line"})
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* ── CARD: PRICE & PAYMENT BREAKDOWN ── */}
                {delivery.pricing && (
                    <View style={styles.card}>
                        <View style={styles.cardTitleRowBetween}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Ionicons name="receipt" size={16} color="#059669" />
                                <Text style={styles.cardTitle}>Price Summary</Text>
                            </View>
                            <View
                                style={[
                                    styles.paymentStatusBadge,
                                    delivery.paymentStatus === "PAID" || delivery.status !== "CREATED"
                                        ? styles.paymentStatusPaid
                                        : styles.paymentStatusPending,
                                ]}
                            >
                                <Ionicons
                                    name={
                                        delivery.paymentStatus === "PAID" || delivery.status !== "CREATED"
                                            ? "checkmark-circle"
                                            : "time-outline"
                                    }
                                    size={12}
                                    color={
                                        delivery.paymentStatus === "PAID" || delivery.status !== "CREATED"
                                            ? "#059669"
                                            : "#D97706"
                                    }
                                />
                                <Text
                                    style={[
                                        styles.paymentStatusText,
                                        delivery.paymentStatus === "PAID" || delivery.status !== "CREATED"
                                            ? styles.paymentStatusTextPaid
                                            : styles.paymentStatusTextPending,
                                    ]}
                                >
                                    {delivery.paymentStatus === "PAID" || delivery.status !== "CREATED"
                                        ? "PAID"
                                        : "PAYMENT PENDING"}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.billContainer}>
                            <View style={styles.billRow}>
                                <Text style={styles.billLabel}>
                                    Delivery Charges ({delivery.pricing.distanceKm ? `${delivery.pricing.distanceKm} km` : "Standard"})
                                </Text>
                                <Text style={styles.billValue}>
                                    ₹{delivery.pricing.deliveryFee.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.billRow}>
                                <Text style={styles.billLabel}>Platform Charges</Text>
                                <Text style={styles.billValue}>
                                    ₹{delivery.pricing.platformFee.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.billRow}>
                                <Text style={styles.billLabel}>GST (18%)</Text>
                                <Text style={styles.billValue}>
                                    ₹{delivery.pricing.gstAmount.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.billDivider} />
                            <View style={[styles.billRow, styles.totalRow]}>
                                <Text style={styles.totalLabel}>Total Payable</Text>
                                <Text style={styles.totalValue}>
                                    ₹{delivery.pricing.totalAmount.toFixed(2)}
                                </Text>
                            </View>

                            {/* Pay Now Button if payment is pending */}
                            {isCreated && delivery.paymentStatus !== "PAID" && (
                                <TouchableOpacity
                                    style={[styles.retryPayBtn, paying && styles.retryPayBtnDisabled]}
                                    onPress={handleRetryPayment}
                                    disabled={paying}
                                    activeOpacity={0.8}
                                >
                                    {paying ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="card" size={16} color="#fff" />
                                            <Text style={styles.retryPayBtnText}>
                                                Pay ₹{delivery.pricing.totalAmount.toFixed(2)} with Razorpay
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* ── CARD 4: DRIVER DETAILS ── */}
                {MANUAL_DELIVERY_FEATURES.ENABLE_DRIVER_MODULE && (
                    <View style={styles.card}>
                        <View style={styles.cardTitleRow}>
                            <Ionicons name="bicycle" size={16} color="#7C3AED" />
                            <Text style={styles.cardTitle}>Assigned Driver</Text>
                        </View>

                        {delivery.driverSnapshot ? (
                            <View style={styles.driverBox}>
                                <View style={styles.driverMainRow}>
                                    <View style={styles.driverAvatar}>
                                        <Ionicons name="person" size={20} color="#7C3AED" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.driverName}>
                                            {delivery.driverSnapshot.name}
                                        </Text>
                                        <Text style={styles.driverPhone}>
                                            📞 {delivery.driverSnapshot.phone}
                                        </Text>
                                    </View>

                                    {delivery.driverSnapshot.phone ? (
                                        <TouchableOpacity
                                            style={styles.callDriverBtn}
                                            onPress={() => handleCall(delivery.driverSnapshot?.phone)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="call" size={14} color="#2563EB" />
                                        </TouchableOpacity>
                                    ) : null}
                                </View>

                                <View style={styles.driverMetaRow}>
                                    <View style={styles.vehiclePill}>
                                        <Text style={styles.vehiclePillText}>
                                            {delivery.driverSnapshot.vehicleType?.toUpperCase() || "BIKE"}
                                        </Text>
                                    </View>
                                    <Text style={styles.vehicleNumberText}>
                                        {delivery.driverSnapshot.vehicleNumber}
                                    </Text>
                                </View>

                                {delivery.assignedAt && (
                                    <Text style={styles.assignedAtText}>
                                        Assigned on: {formatDate(delivery.assignedAt)}
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <View style={styles.noDriverBox}>
                                <Ionicons name="bicycle-outline" size={28} color="#94A3B8" />
                                <Text style={styles.noDriverText}>No driver assigned yet</Text>
                                {isCreated && (
                                    <TouchableOpacity
                                        style={styles.assignNowBtn}
                                        onPress={() => setAssignModalVisible(true)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="person-add" size={14} color="#fff" />
                                        <Text style={styles.assignNowBtnText}>Assign Driver Now</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* ── CARD 5: STATUS TIMELINE ── */}
                <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                        <Ionicons name="time" size={16} color="#0F172A" />
                        <Text style={styles.cardTitle}>Delivery Timeline</Text>
                    </View>

                    <ManualDeliveryTimeline history={delivery.statusHistory} />
                </View>
            </ScrollView>

            {/* ── STICKY VENDOR ACTION FOOTER ── */}
            <View style={styles.footerBar}>
                <TouchableOpacity
                    style={styles.actionBtnRecreate}
                    onPress={handleRecreateOrder}
                    activeOpacity={0.8}
                >
                    <Ionicons name="repeat" size={16} color="#2563EB" />
                    <Text style={styles.actionBtnRecreateText}>Recreate Order</Text>
                </TouchableOpacity>

                {MANUAL_DELIVERY_FEATURES.ENABLE_DRIVER_MODULE && isCreated && (
                    <TouchableOpacity
                        style={styles.actionBtnAssign}
                        onPress={() => setAssignModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="person-add" size={16} color="#fff" />
                        <Text style={styles.actionBtnAssignText}>Assign</Text>
                    </TouchableOpacity>
                )}

                {isCreated && (
                    <TouchableOpacity
                        style={styles.actionBtnCancel}
                        onPress={() => setCancelModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                        <Text style={styles.actionBtnCancelText}>Cancel</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Modals */}
            <AssignDriverModal
                visible={assignModalVisible}
                deliveryId={delivery._id}
                deliveryNumber={delivery.deliveryNumber}
                onClose={() => setAssignModalVisible(false)}
                onAssigned={() => fetchDetails(true)}
            />

            <CancelDeliveryModal
                visible={cancelModalVisible}
                deliveryId={delivery._id}
                deliveryNumber={delivery.deliveryNumber}
                onClose={() => setCancelModalVisible(false)}
                onCancelled={() => fetchDetails(true)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.scaffoldBg,
    },
    editBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 3,
    },
    editBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.primary,
    },
    recreateTopBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 3,
    },
    recreateTopBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#2563EB",
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
        fontSize: 17,
        fontWeight: "700",
        color: "#1E293B",
        marginTop: 12,
    },
    errorSub: {
        fontSize: 13,
        color: "#64748B",
        textAlign: "center",
        marginTop: 4,
        marginBottom: 16,
    },
    retryBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 10,
    },
    retryBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
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
    overviewHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },
    deliveryNumberLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#64748B",
        letterSpacing: 0.5,
    },
    deliveryNumberText: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0F172A",
        marginTop: 2,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    metaText: {
        fontSize: 12,
        color: "#64748B",
    },
    reasonBannerRed: {
        flexDirection: "row",
        backgroundColor: "#FEF2F2",
        padding: 10,
        borderRadius: 10,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#FECACA",
    },
    reasonTitleRed: {
        fontSize: 12,
        fontWeight: "700",
        color: "#991B1B",
    },
    reasonTextRed: {
        fontSize: 12,
        color: "#B91C1C",
        marginTop: 1,
    },
    cardTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: "#1E293B",
        letterSpacing: 0.2,
    },
    customerBox: {
        gap: 10,
    },
    customerHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    customerName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
    },
    customerPhone: {
        fontSize: 13,
        color: "#64748B",
        marginTop: 2,
    },
    callActionBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#2563EB",
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        gap: 5,
    },
    callActionText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    dropoffAddressBox: {
        backgroundColor: "#F8FAFC",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    pointRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginBottom: 4,
    },
    dropoffTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: "#059669",
    },
    addressBody: {
        fontSize: 13,
        color: "#334155",
        lineHeight: 18,
    },
    landmarkText: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 4,
    },
    openMapLinkBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
        marginTop: 8,
        alignSelf: "flex-start",
    },
    openMapLinkBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#2563EB",
    },
    notesBox: {
        backgroundColor: "#FFFBEB",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#FDE68A",
    },
    notesTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: "#B45309",
    },
    notesBody: {
        fontSize: 13,
        color: "#78350F",
        marginTop: 4,
        lineHeight: 18,
    },
    storeNameText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 2,
    },
    storePhoneRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 8,
    },
    storePhoneText: {
        fontSize: 12,
        color: "#2563EB",
        fontWeight: "600",
    },
    distanceBadgeRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F3FF",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: "flex-start",
        gap: 6,
        marginTop: 10,
    },
    distanceMetricText: {
        fontSize: 14,
        fontWeight: "800",
        color: "#6D28D9",
    },
    distanceMethodText: {
        fontSize: 11,
        color: "#7C3AED",
    },
    driverBox: {
        backgroundColor: "#FAF5FF",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E9D5FF",
    },
    driverMainRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    driverAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#EDE9FE",
        justifyContent: "center",
        alignItems: "center",
    },
    driverName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1E293B",
    },
    driverPhone: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 1,
    },
    callDriverBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
    },
    driverMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
    },
    vehiclePill: {
        backgroundColor: "#EDE9FE",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
    },
    vehiclePillText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#6D28D9",
    },
    vehicleNumberText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1E293B",
    },
    assignedAtText: {
        fontSize: 11,
        color: "#94A3B8",
        marginTop: 6,
    },
    noDriverBox: {
        alignItems: "center",
        paddingVertical: 18,
        gap: 6,
    },
    noDriverText: {
        fontSize: 13,
        color: "#94A3B8",
    },
    assignNowBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
        marginTop: 6,
    },
    assignNowBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    footerBar: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === "ios" ? 24 : 14,
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
        gap: 10,
    },
    actionBtnRecreate: {
        flex: 1.2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        paddingVertical: 13,
        borderRadius: 12,
        gap: 6,
    },
    actionBtnRecreateText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#2563EB",
    },
    actionBtnAssign: {
        flex: 1.2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary,
        paddingVertical: 13,
        borderRadius: 12,
        gap: 6,
    },
    actionBtnAssignText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    actionBtnCancel: {
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
    actionBtnCancelText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#DC2626",
    },

    cardTitleRowBetween: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    paymentStatusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    paymentStatusPaid: {
        backgroundColor: "#ECFDF5",
        borderColor: "#A7F3D0",
    },
    paymentStatusPending: {
        backgroundColor: "#FEF3C7",
        borderColor: "#FDE68A",
    },
    paymentStatusText: {
        fontSize: 11,
        fontWeight: "700",
    },
    paymentStatusTextPaid: {
        color: "#059669",
    },
    paymentStatusTextPending: {
        color: "#D97706",
    },
    billContainer: {
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    billRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 5,
    },
    billLabel: {
        fontSize: 13,
        color: "#475569",
        fontWeight: "500",
    },
    billValue: {
        fontSize: 13,
        color: "#1E293B",
        fontWeight: "600",
    },
    billDivider: {
        height: 1,
        backgroundColor: "#E2E8F0",
        marginVertical: 8,
    },
    totalRow: {
        paddingTop: 3,
        paddingBottom: 2,
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: "800",
        color: "#0F172A",
    },
    totalValue: {
        fontSize: 16,
        fontWeight: "800",
        color: "#059669",
    },
    retryPayBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingVertical: 11,
        gap: 8,
        marginTop: 12,
    },
    retryPayBtnDisabled: {
        backgroundColor: "#93C5FD",
    },
    retryPayBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#FFFFFF",
    },
});

export default ManualDeliveryDetailsScreen;
