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
import Toast from "react-native-toast-message";

interface Props {
    visible: boolean;
    deliveryId: string;
    deliveryNumber: string;
    onClose: () => void;
    onCancelled: () => void;
}

export const CancelDeliveryModal: React.FC<Props> = ({
    visible,
    deliveryId,
    deliveryNumber,
    onClose,
    onCancelled,
}) => {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleConfirmCancel = async () => {
        try {
            setLoading(true);
            const res = await manualDeliveryApi.cancelManualDelivery(
                deliveryId,
                reason.trim() || "Customer requested cancellation"
            );

            if (res.success) {
                Toast.show({
                    type: "success",
                    text1: "Delivery Cancelled",
                    text2: `Delivery #${deliveryNumber} was marked as Cancelled`,
                });
                setReason("");
                onCancelled();
                onClose();
            } else {
                Toast.show({
                    type: "error",
                    text1: "Cancellation Failed",
                    text2: res.message || "Could not cancel delivery",
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
                <View style={styles.iconCircle}>
                    <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
                </View>

                <Text style={styles.title}>Cancel Manual Delivery?</Text>
                <Text style={styles.subtitle}>
                    Are you sure you want to cancel delivery #{deliveryNumber}? This action cannot be undone.
                </Text>

                <View style={styles.inputWrap}>
                    <Text style={styles.inputLabel}>Reason for cancellation (optional):</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Customer cancelled order on call, out of stock, etc."
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={3}
                        maxLength={300}
                        value={reason}
                        onChangeText={setReason}
                    />
                    <Text style={styles.charCount}>{reason.length}/300</Text>
                </View>

                <View style={styles.btnRow}>
                    <TouchableOpacity
                        style={styles.keepBtn}
                        onPress={onClose}
                        disabled={loading}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.keepBtnText}>Keep Delivery</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={handleConfirmCancel}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.cancelBtnText}>Yes, Cancel</Text>
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
        backgroundColor: "#FEE2E2",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 14,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0F172A",
        textAlign: "center",
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 13,
        color: "#64748B",
        textAlign: "center",
        lineHeight: 18,
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
    keepBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
    },
    keepBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#475569",
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: "#DC2626",
        alignItems: "center",
        justifyContent: "center",
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
});

export default CancelDeliveryModal;
