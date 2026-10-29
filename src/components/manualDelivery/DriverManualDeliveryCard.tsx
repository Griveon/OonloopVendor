import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { ManualDelivery } from "../../types/manualDelivery.types";
import ManualDeliveryStatusBadge from "./ManualDeliveryStatusBadge";
import { colors } from "../../constants/AppThem";

interface Props {
    delivery: ManualDelivery;
    onPressDetails: () => void;
    onAccept?: () => void;
    onReject?: () => void;
}

const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
        const d = new Date(dateString);
        return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return dateString;
    }
};

export const DriverManualDeliveryCard: React.FC<Props> = ({
    delivery,
    onPressDetails,
    onAccept,
    onReject,
}) => {
    const isAssigned = delivery.status === "ASSIGNED";
    const isInProgress = [
        "ACCEPTED",
        "PICKED_UP",
        "OUT_FOR_DELIVERY",
        "REACHED",
    ].includes(delivery.status);

    const handleCallCustomer = () => {
        if (delivery.customer?.mobileNumber) {
            Linking.openURL(`tel:${delivery.customer.mobileNumber}`);
        }
    };

    const handleCallStore = () => {
        if (delivery.pickup?.contactPhone) {
            Linking.openURL(`tel:${delivery.pickup.contactPhone}`);
        }
    };

    const distanceText =
        typeof delivery.distance?.valueKm === "number"
            ? `${delivery.distance.valueKm.toFixed(1)} km`
            : null;

    const formattedDropoff =
        delivery.dropoff.formattedAddress ||
        [
            delivery.dropoff.addressLine1,
            delivery.dropoff.landmark ? `Near ${delivery.dropoff.landmark}` : null,
            delivery.dropoff.city,
        ]
            .filter(Boolean)
            .join(", ");

    const formattedPickup =
        delivery.pickup.formattedAddress ||
        [
            delivery.pickup.storeName,
            delivery.pickup.addressLine1,
            delivery.pickup.city,
        ]
            .filter(Boolean)
            .join(", ");

    return (
        <View style={styles.card}>
            {/* Header: Delivery # & Status badge */}
            <View style={styles.topRow}>
                <View style={styles.numWrap}>
                    <Text style={styles.hash}>#</Text>
                    <Text style={styles.deliveryNumber}>{delivery.deliveryNumber}</Text>
                </View>
                <ManualDeliveryStatusBadge status={delivery.status} size="small" />
            </View>

            {/* Assignment Time */}
            <Text style={styles.dateText}>
                Assigned: {formatDate(delivery.assignedAt || delivery.createdAt)}
            </Text>

            <View style={styles.divider} />

            {/* Route Points */}
            <View style={styles.routeContainer}>
                {/* Pickup point */}
                <View style={styles.routePoint}>
                    <View style={styles.storeDot}>
                        <Ionicons name="storefront" size={12} color="#2563EB" />
                    </View>
                    <View style={styles.routeDetails}>
                        <View style={styles.pointHeaderRow}>
                            <Text style={styles.pointTitle}>
                                {delivery.pickup.storeName || "Store Pickup"}
                            </Text>
                            {delivery.pickup.contactPhone ? (
                                <TouchableOpacity
                                    onPress={handleCallStore}
                                    style={styles.miniCallBtn}
                                >
                                    <Ionicons name="call" size={11} color="#2563EB" />
                                    <Text style={styles.miniCallText}>Call</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                        <Text style={styles.pointAddress} numberOfLines={1}>
                            {formattedPickup}
                        </Text>
                    </View>
                </View>

                {/* Connecting road dashed line */}
                <View style={styles.dashedLineCol}>
                    <View style={styles.dashedLine} />
                    {distanceText && (
                        <View style={styles.distanceBadge}>
                            <Text style={styles.distanceText}>{distanceText}</Text>
                        </View>
                    )}
                </View>

                {/* Dropoff point */}
                <View style={styles.routePoint}>
                    <View style={styles.customerDot}>
                        <Ionicons name="location" size={13} color="#059669" />
                    </View>
                    <View style={styles.routeDetails}>
                        <View style={styles.pointHeaderRow}>
                            <Text style={styles.pointTitle}>
                                {delivery.customer.name}
                            </Text>
                            <TouchableOpacity
                                onPress={handleCallCustomer}
                                style={styles.miniCallBtn}
                            >
                                <Ionicons name="call" size={11} color="#059669" />
                                <Text
                                    style={[
                                        styles.miniCallText,
                                        { color: "#059669" },
                                    ]}
                                >
                                    Call
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.pointAddress} numberOfLines={2}>
                            {formattedDropoff}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Actions Row */}
            <View style={styles.actionsRow}>
                {isAssigned ? (
                    <>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={onReject}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                            <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.acceptBtn]}
                            onPress={onAccept}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                            <Text style={styles.acceptBtnText}>Accept</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.detailsBtn]}
                            onPress={onPressDetails}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.detailsBtnText}>Details</Text>
                        </TouchableOpacity>
                    </>
                ) : isInProgress ? (
                    <>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.continueBtn]}
                            onPress={onPressDetails}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="navigate-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.continueBtnText}>Continue Delivery</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.historyBtn]}
                        onPress={onPressDetails}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="document-text-outline" size={15} color={colors.primary} />
                        <Text style={styles.historyBtnText}>View Details</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    numWrap: {
        flexDirection: "row",
        alignItems: "center",
    },
    hash: {
        fontSize: 14,
        fontWeight: "800",
        color: colors.primary,
        marginRight: 2,
    },
    deliveryNumber: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0F172A",
    },
    dateText: {
        fontSize: 11,
        color: "#94A3B8",
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: "#F1F5F9",
        marginVertical: 12,
    },
    routeContainer: {
        gap: 2,
    },
    routePoint: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    storeDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
        marginTop: 2,
    },
    customerDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#ECFDF5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
        marginTop: 2,
    },
    routeDetails: {
        flex: 1,
    },
    pointHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    pointTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1E293B",
    },
    pointAddress: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 1,
        lineHeight: 16,
    },
    miniCallBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 3,
    },
    miniCallText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#2563EB",
    },
    dashedLineCol: {
        marginLeft: 11,
        marginVertical: 2,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    dashedLine: {
        width: 2,
        height: 20,
        backgroundColor: "#CBD5E1",
    },
    distanceBadge: {
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    distanceText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#475569",
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 14,
        gap: 8,
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 5,
    },
    acceptBtn: {
        flex: 1.2,
        backgroundColor: "#059669",
    },
    acceptBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    rejectBtn: {
        flex: 1,
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
    },
    rejectBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#DC2626",
    },
    detailsBtn: {
        paddingHorizontal: 14,
        backgroundColor: "#F1F5F9",
    },
    detailsBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#475569",
    },
    continueBtn: {
        flex: 1,
        backgroundColor: colors.primary,
    },
    continueBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    historyBtn: {
        flex: 1,
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    historyBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.primary,
    },
});

export default DriverManualDeliveryCard;
