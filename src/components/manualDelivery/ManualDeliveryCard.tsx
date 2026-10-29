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
import { MANUAL_DELIVERY_FEATURES } from "../../constants/manualDeliveryConfig";

interface Props {
    delivery: ManualDelivery;
    onPressDetails: () => void;
    onPressAssignDriver?: () => void;
    onPressCancel?: () => void;
    onPressRecreate?: () => void;
}

const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
        const d = new Date(dateString);
        return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return dateString;
    }
};

export const ManualDeliveryCard: React.FC<Props> = ({
    delivery,
    onPressDetails,
    onPressAssignDriver,
    onPressCancel,
    onPressRecreate,
}) => {
    const handleCallCustomer = () => {
        if (delivery.customer?.mobileNumber) {
            Linking.openURL(`tel:${delivery.customer.mobileNumber}`);
        }
    };

    const isCreated = delivery.status === "CREATED";

    const distanceText =
        typeof delivery.distance?.valueKm === "number"
            ? `${delivery.distance.valueKm.toFixed(1)} km · ${
                  delivery.distance.calculationMethod === "ROAD"
                      ? "Road distance"
                      : "Straight-line"
              }`
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

    return (
        <View style={styles.card}>
            {/* Top row: Delivery number & Status badge + Recreate quick action */}
            <View style={styles.topRow}>
                <View style={styles.deliveryNumberWrap}>
                    <Text style={styles.deliveryHash}>#</Text>
                    <Text style={styles.deliveryNumber}>{delivery.deliveryNumber}</Text>
                </View>
                <View style={styles.topRightActions}>
                    {onPressRecreate && (
                        <TouchableOpacity
                            style={styles.topRecreateBtn}
                            onPress={onPressRecreate}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="repeat" size={13} color="#2563EB" />
                            <Text style={styles.topRecreateBtnText}>Recreate</Text>
                        </TouchableOpacity>
                    )}
                    <ManualDeliveryStatusBadge status={delivery.status} size="small" />
                </View>
            </View>

            {/* Date */}
            <Text style={styles.dateText}>{formatDate(delivery.createdAt)}</Text>

            <View style={styles.divider} />

            {/* Customer Details */}
            <View style={styles.infoSection}>
                <Text style={styles.customerName}>{delivery.customer.name}</Text>

                <TouchableOpacity
                    style={styles.phoneRow}
                    onPress={handleCallCustomer}
                    activeOpacity={0.7}
                >
                    <View style={styles.callIconBox}>
                        <Ionicons name="call" size={13} color="#2563EB" />
                    </View>
                    <Text style={styles.phoneText}>
                        {delivery.customer.countryCode || "+91"}{" "}
                        {delivery.customer.mobileNumber}
                    </Text>
                </TouchableOpacity>

                <View style={styles.addressRow}>
                    <Ionicons
                        name="location-sharp"
                        size={15}
                        color="#64748B"
                        style={styles.addressIcon}
                    />
                    <Text style={styles.addressText} numberOfLines={2}>
                        {formattedDropoff}
                    </Text>
                </View>

                {delivery.dropoff.mapLink ? (
                    <View style={styles.mapLinkBadgeRow}>
                        <Ionicons name="link-outline" size={13} color="#2563EB" />
                        <Text style={styles.mapLinkBadgeRowText} numberOfLines={1}>
                            Customer Map Link attached
                        </Text>
                    </View>
                ) : null}

                {distanceText && (
                    <View style={styles.distanceRow}>
                        <Ionicons
                            name="compass-outline"
                            size={14}
                            color="#059669"
                            style={styles.distanceIcon}
                        />
                        <Text style={styles.distanceText}>{distanceText}</Text>
                    </View>
                )}
            </View>

            {/* Driver section */}
            {MANUAL_DELIVERY_FEATURES.ENABLE_DRIVER_MODULE && (
                <View style={styles.driverSection}>
                    <Ionicons
                        name="bicycle-outline"
                        size={16}
                        color={delivery.driverSnapshot ? "#7C3AED" : "#94A3B8"}
                    />
                    <Text style={styles.driverLabel}>
                        Driver:{" "}
                        <Text
                            style={[
                                styles.driverValue,
                                delivery.driverSnapshot
                                    ? { color: "#1E293B", fontWeight: "700" }
                                    : { color: "#94A3B8" },
                            ]}
                        >
                            {delivery.driverSnapshot
                                ? `${delivery.driverSnapshot.name} (${delivery.driverSnapshot.vehicleNumber})`
                                : "Not assigned"}
                        </Text>
                    </Text>
                </View>
            )}

            {/* Actions */}
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={[styles.btn, styles.btnDetails]}
                    onPress={onPressDetails}
                    activeOpacity={0.8}
                >
                    <Ionicons name="eye-outline" size={15} color={colors.primary} />
                    <Text style={styles.btnDetailsText}>View Details</Text>
                </TouchableOpacity>

                {onPressRecreate && (
                    <TouchableOpacity
                        style={[styles.btn, styles.btnRecreate]}
                        onPress={onPressRecreate}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="repeat-outline" size={15} color="#2563EB" />
                        <Text style={styles.btnRecreateText}>Recreate</Text>
                    </TouchableOpacity>
                )}

                {MANUAL_DELIVERY_FEATURES.ENABLE_DRIVER_MODULE && isCreated && onPressAssignDriver && (
                    <TouchableOpacity
                        style={[styles.btn, styles.btnAssign]}
                        onPress={onPressAssignDriver}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="person-add-outline" size={15} color="#fff" />
                        <Text style={styles.btnAssignText}>Assign</Text>
                    </TouchableOpacity>
                )}

                {isCreated && onPressCancel && (
                    <TouchableOpacity
                        style={[styles.btn, styles.btnCancel]}
                        onPress={onPressCancel}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="close-outline" size={16} color="#DC2626" />
                        <Text style={styles.btnCancelText}>Cancel</Text>
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
    deliveryNumberWrap: {
        flexDirection: "row",
        alignItems: "center",
    },
    deliveryHash: {
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
    infoSection: {
        gap: 6,
    },
    customerName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1E293B",
    },
    phoneRow: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        paddingVertical: 2,
    },
    callIconBox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 6,
    },
    phoneText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#2563EB",
    },
    addressRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginTop: 2,
    },
    addressIcon: {
        marginRight: 6,
        marginTop: 2,
    },
    addressText: {
        flex: 1,
        fontSize: 13,
        color: "#475569",
        lineHeight: 18,
    },
    distanceRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
        backgroundColor: "#ECFDF5",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignSelf: "flex-start",
    },
    distanceIcon: {
        marginRight: 5,
    },
    distanceText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#059669",
    },
    driverSection: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#F8FAFC",
        gap: 6,
    },
    driverLabel: {
        fontSize: 12,
        color: "#64748B",
    },
    driverValue: {
        fontSize: 12,
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 14,
        gap: 8,
    },
    btn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 5,
    },
    btnDetails: {
        flex: 1,
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    btnDetailsText: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.primary,
    },
    btnAssign: {
        flex: 1,
        backgroundColor: colors.primary,
    },
    btnAssignText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    btnCancel: {
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        paddingHorizontal: 12,
    },
    btnCancelText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#DC2626",
    },
    topRightActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    topRecreateBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    topRecreateBtnText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#2563EB",
    },
    mapLinkBadgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
    },
    mapLinkBadgeRowText: {
        fontSize: 11,
        color: "#2563EB",
        fontWeight: "500",
    },
    btnRecreate: {
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    btnRecreateText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#2563EB",
    },
});

export default ManualDeliveryCard;
