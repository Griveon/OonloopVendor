import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    TouchableWithoutFeedback,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { manualDeliveryApi } from "../../services/manualDeliveryApi";
import type { ManualDeliveryStatus } from "../../types/manualDelivery.types";
import { colors } from "../../constants/AppThem";
import Toast from "react-native-toast-message";

interface Props {
    visible: boolean;
    deliveryId: string;
    deliveryNumber: string;
    targetStatus: ManualDeliveryStatus;
    onClose: () => void;
    onUpdated: () => void;
}

const getStatusDetails = (status: ManualDeliveryStatus) => {
    switch (status) {
        case "PICKED_UP":
            return {
                title: "Confirm Pickup",
                subtitle: "Have you collected the parcel from the store?",
                remarkLabel: "Pickup remark (optional):",
                placeholder: "e.g. Parcel collected in good condition",
                buttonText: "Mark Picked Up",
                buttonColor: "#D97706",
                icon: "cube-outline",
            };
        case "OUT_FOR_DELIVERY":
            return {
                title: "Start Delivery Trip",
                subtitle: "Are you on your way to the customer location?",
                remarkLabel: "Trip notes (optional):",
                placeholder: "e.g. Estimated delivery in 20 minutes",
                buttonText: "Mark Out for Delivery",
                buttonColor: "#EA580C",
                icon: "bicycle-outline",
            };
        case "REACHED":
            return {
                title: "Reached Dropoff Location",
                subtitle: "Have you arrived at the customer delivery address?",
                remarkLabel: "Arrival remark (optional):",
                placeholder: "e.g. Waiting at the gate / calling customer",
                buttonText: "Mark Reached",
                buttonColor: "#4F46E5",
                icon: "location-outline",
            };
        case "DELIVERED":
            return {
                title: "Complete Delivery",
                subtitle: "Confirm parcel has been handed over to the customer?",
                remarkLabel: "Delivery remark (optional):",
                placeholder: "e.g. Handed to customer Rahul Sharma directly",
                buttonText: "Confirm Delivery",
                buttonColor: "#059669",
                icon: "checkmark-circle-outline",
            };
        case "FAILED":
            return {
                title: "Mark Delivery Failed",
                subtitle: "Please provide the reason why delivery could not be completed.",
                remarkLabel: "Failure reason (required):",
                placeholder: "e.g. Customer unreachable, incorrect address, refused delivery",
                buttonText: "Mark as Failed",
                buttonColor: "#DC2626",
                icon: "alert-circle-outline",
            };
        default:
            return {
                title: "Update Status",
                subtitle: `Update delivery status to ${status}?`,
                remarkLabel: "Remark (optional):",
                placeholder: "Enter remark...",
                buttonText: "Update Status",
                buttonColor: colors.primary,
                icon: "arrow-forward-circle-outline",
            };
    }
};

export const DriverStatusUpdateModal: React.FC<Props> = ({
    visible,
    deliveryId,
    deliveryNumber,
    targetStatus,
    onClose,
    onUpdated,
}) => {
    const [remark, setRemark] = useState("");
    const [loading, setLoading] = useState(false);

    const config = getStatusDetails(targetStatus);
    const isFailed = targetStatus === "FAILED";

    const handleSubmit = async () => {
        if (isFailed && !remark.trim()) {
            Toast.show({
                type: "error",
                text1: "Reason Required",
                text2: "Please provide a reason why the delivery failed.",
            });
            return;
        }

        try {
            setLoading(true);
            const res = await manualDeliveryApi.driverUpdateStatus(deliveryId, {
                status: targetStatus as any,
                remark: !isFailed && remark.trim() ? remark.trim() : undefined,
                failureReason: isFailed ? remark.trim() : undefined,
            });

            if (res.success) {
                Toast.show({
                    type: "success",
                    text1: "Status Updated",
                    text2: `Delivery #${deliveryNumber} is now ${config.buttonText}`,
                });
                setRemark("");
                onUpdated();
                onClose();
            } else {
                Toast.show({
                    type: "error",
                    text1: "Update Failed",
                    text2: res.message || "Failed to update delivery status",
                });
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: error?.message || "Something went wrong",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay} />
            </TouchableWithoutFeedback>

            <View style={styles.modalContent}>
                <View
                    style={[
                        styles.iconCircle,
                        { backgroundColor: config.buttonColor + "18" },
                    ]}
                >
                    <Ionicons
                        name={config.icon as any}
                        size={32}
                        color={config.buttonColor}
                    />
                </View>

                <Text style={styles.title}>{config.title}</Text>
                <Text style={styles.subtitle}>{config.subtitle}</Text>
                <Text style={styles.deliveryTag}>#{deliveryNumber}</Text>

                <View style={styles.inputWrap}>
                    <Text style={styles.inputLabel}>{config.remarkLabel}</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder={config.placeholder}
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={3}
                        maxLength={500}
                        value={remark}
                        onChangeText={setRemark}
                    />
                    <Text style={styles.charCount}>{remark.length}/500</Text>
                </View>

                <View style={styles.btnRow}>
                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={onClose}
                        disabled={loading}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.cancelBtnText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.confirmBtn,
                            { backgroundColor: config.buttonColor },
                        ]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.confirmBtnText}>
                                {config.buttonText}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
    },
    modalContent: {
        position: "absolute",
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0F172A",
        textAlign: "center",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: "#64748B",
        textAlign: "center",
        lineHeight: 18,
        marginBottom: 6,
    },
    deliveryTag: {
        fontSize: 12,
        fontWeight: "700",
        color: colors.primary,
        marginBottom: 16,
    },
    inputWrap: {
        width: "100%",
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#475569",
        marginBottom: 6,
    },
    textInput: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        padding: 12,
        fontSize: 13,
        color: "#1E293B",
        textAlignVertical: "top",
        height: 72,
    },
    charCount: {
        fontSize: 11,
        color: "#94A3B8",
        textAlign: "right",
        marginTop: 4,
    },
    btnRow: {
        flexDirection: "row",
        width: "100%",
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#475569",
    },
    confirmBtn: {
        flex: 1.5,
        paddingVertical: 13,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    confirmBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
});

export default DriverStatusUpdateModal;
