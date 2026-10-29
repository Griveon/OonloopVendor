import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { ManualDeliveryStatus } from "../../types/manualDelivery.types";

interface Props {
    status: ManualDeliveryStatus | string;
    size?: "small" | "medium";
}

interface StatusConfig {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
    CREATED: {
        label: "Created",
        icon: "sparkles-outline",
        color: "#2563EB",
        bgColor: "#EFF6FF",
        borderColor: "#BFDBFE",
    },
    ASSIGNED: {
        label: "Assigned",
        icon: "person-add-outline",
        color: "#7C3AED",
        bgColor: "#F5F3FF",
        borderColor: "#DDD6FE",
    },
    ACCEPTED: {
        label: "Accepted",
        icon: "checkmark-done-outline",
        color: "#0891B2",
        bgColor: "#ECFEFF",
        borderColor: "#A5F3FC",
    },
    PICKED_UP: {
        label: "Picked Up",
        icon: "cube-outline",
        color: "#D97706",
        bgColor: "#FFFBEB",
        borderColor: "#FDE68A",
    },
    OUT_FOR_DELIVERY: {
        label: "Out for Delivery",
        icon: "bicycle-outline",
        color: "#EA580C",
        bgColor: "#FFF7ED",
        borderColor: "#FED7AA",
    },
    REACHED: {
        label: "Reached",
        icon: "location-outline",
        color: "#4F46E5",
        bgColor: "#EEF2FF",
        borderColor: "#C7D2FE",
    },
    DELIVERED: {
        label: "Delivered",
        icon: "checkmark-circle",
        color: "#059669",
        bgColor: "#ECFDF5",
        borderColor: "#A7F3D0",
    },
    CANCELLED: {
        label: "Cancelled",
        icon: "close-circle-outline",
        color: "#E11D48",
        bgColor: "#FFF1F2",
        borderColor: "#FECDD3",
    },
    FAILED: {
        label: "Failed",
        icon: "alert-circle-outline",
        color: "#DC2626",
        bgColor: "#FEF2F2",
        borderColor: "#FECACA",
    },
};

export const getStatusConfig = (status: string): StatusConfig => {
    return (
        STATUS_MAP[status] || {
            label: status,
            icon: "help-circle-outline",
            color: "#64748B",
            bgColor: "#F8FAFC",
            borderColor: "#E2E8F0",
        }
    );
};

export const ManualDeliveryStatusBadge: React.FC<Props> = ({
    status,
    size = "medium",
}) => {
    const config = getStatusConfig(status);
    const isSmall = size === "small";

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: config.bgColor,
                    borderColor: config.borderColor,
                    paddingVertical: isSmall ? 2 : 4,
                    paddingHorizontal: isSmall ? 7 : 10,
                },
            ]}
        >
            <Ionicons
                name={config.icon as any}
                size={isSmall ? 11 : 13}
                color={config.color}
                style={{ marginRight: 4 }}
            />
            <Text
                style={[
                    styles.text,
                    {
                        color: config.color,
                        fontSize: isSmall ? 11 : 12,
                    },
                ]}
            >
                {config.label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 20,
        borderWidth: 1,
        alignSelf: "flex-start",
    },
    text: {
        fontWeight: "600",
        letterSpacing: 0.2,
    },
});

export default ManualDeliveryStatusBadge;
