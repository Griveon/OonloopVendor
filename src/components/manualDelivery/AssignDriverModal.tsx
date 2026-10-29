import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    TextInput,
    ActivityIndicator,
    TouchableWithoutFeedback,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { manualDeliveryApi } from "../../services/manualDeliveryApi";
import type { DriverProfileItem } from "../../types/manualDelivery.types";
import { colors } from "../../constants/AppThem";
import Toast from "react-native-toast-message";

interface Props {
    visible: boolean;
    deliveryId: string;
    deliveryNumber: string;
    onClose: () => void;
    onAssigned: () => void;
}

export const AssignDriverModal: React.FC<Props> = ({
    visible,
    deliveryId,
    deliveryNumber,
    onClose,
    onAssigned,
}) => {
    const [drivers, setDrivers] = useState<DriverProfileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const [assigning, setAssigning] = useState(false);

    const fetchDrivers = useCallback(async (query = "") => {
        try {
            setLoading(true);
            const res = await manualDeliveryApi.getAvailableDrivers({
                page: 1,
                limit: 30,
                search: query,
            });
            if (res.success && res.data) {
                // Filter out suspended or rejected drivers
                const eligible = res.data.filter(
                    (d) =>
                        d.profileStatus !== "suspended" &&
                        d.profileStatus !== "rejected"
                );
                setDrivers(eligible);
            }
        } catch (error) {
            console.log("Error fetching drivers:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            setSearch("");
            setSelectedDriverId(null);
            fetchDrivers();
        }
    }, [visible, fetchDrivers]);

    const handleSearch = (text: string) => {
        setSearch(text);
        fetchDrivers(text);
    };

    const handleAssign = async () => {
        if (!selectedDriverId) {
            Toast.show({
                type: "error",
                text1: "Select Driver",
                text2: "Please select a driver to assign to this delivery",
            });
            return;
        }

        try {
            setAssigning(true);
            const res = await manualDeliveryApi.assignDriver(
                deliveryId,
                selectedDriverId
            );
            if (res.success) {
                Toast.show({
                    type: "success",
                    text1: "Driver Assigned",
                    text2: `Driver assigned successfully to #${deliveryNumber}`,
                });
                onAssigned();
                onClose();
            } else {
                Toast.show({
                    type: "error",
                    text1: "Assignment Failed",
                    text2: res.message || "Could not assign driver",
                });
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: error?.message || "Something went wrong",
            });
        } finally {
            setAssigning(false);
        }
    };

    const renderDriverItem = ({ item }: { item: DriverProfileItem }) => {
        const isSelected = selectedDriverId === item._id;

        // Resolve user info if populated
        const userObj = typeof item.user === "object" ? item.user : null;
        const driverName =
            (userObj
                ? `${userObj.firstName || ""} ${userObj.lastName || ""}`.trim()
                : `${item.firstName || ""} ${item.lastName || ""}`.trim()) ||
            "Delivery Driver";

        const phone =
            userObj?.mobileNumber || item.mobileNumber || "Phone not available";

        return (
            <TouchableOpacity
                style={[
                    styles.driverCard,
                    isSelected && styles.driverCardSelected,
                ]}
                onPress={() => setSelectedDriverId(item._id)}
                activeOpacity={0.7}
            >
                <View
                    style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                    ]}
                >
                    {isSelected && <View style={styles.radioDot} />}
                </View>

                <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driverName}</Text>
                    <Text style={styles.driverPhone}>📞 {phone}</Text>
                    <View style={styles.vehicleRow}>
                        <View style={styles.vehicleBadge}>
                            <Ionicons name="bicycle-outline" size={12} color="#475569" />
                            <Text style={styles.vehicleText}>
                                {item.vehicleType?.toUpperCase() || "BIKE"}
                            </Text>
                        </View>
                        {item.vehicleNumber && (
                            <Text style={styles.vehicleNumber}>
                                {item.vehicleNumber}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.driverStatusPill}>
                    <View style={styles.greenDot} />
                    <Text style={styles.driverStatusText}>Available</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay} />
            </TouchableWithoutFeedback>

            <View style={styles.sheetContainer}>
                {/* Handle bar */}
                <View style={styles.handle} />

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Assign Delivery Driver</Text>
                        <Text style={styles.subtitle}>
                            Delivery #{deliveryNumber}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={onClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={18} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* Search bar */}
                <View style={styles.searchBar}>
                    <Ionicons
                        name="search-outline"
                        size={18}
                        color="#94A3B8"
                        style={{ marginRight: 8 }}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search driver by name or vehicle..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={handleSearch}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => handleSearch("")}>
                            <Ionicons name="close-circle" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Drivers list */}
                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Fetching available drivers...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={drivers}
                        keyExtractor={(item) => item._id}
                        renderItem={renderDriverItem}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyWrap}>
                                <Ionicons
                                    name="bicycle-outline"
                                    size={44}
                                    color="#CBD5E1"
                                />
                                <Text style={styles.emptyTitle}>
                                    No Drivers Available
                                </Text>
                                <Text style={styles.emptySubtitle}>
                                    {search
                                        ? "No matching driver found for this search"
                                        : "There are currently no active driver profiles registered"}
                                </Text>
                            </View>
                        }
                    />
                )}

                {/* Bottom sticky action */}
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={[
                            styles.assignBtn,
                            (!selectedDriverId || assigning) &&
                                styles.assignBtnDisabled,
                        ]}
                        onPress={handleAssign}
                        disabled={!selectedDriverId || assigning}
                        activeOpacity={0.8}
                    >
                        {assigning ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons
                                    name="checkmark-circle-outline"
                                    size={18}
                                    color="#fff"
                                />
                                <Text style={styles.assignBtnText}>
                                    Confirm Driver Assignment
                                </Text>
                            </>
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
        backgroundColor: "rgba(15, 23, 42, 0.55)",
    },
    sheetContainer: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "85%",
        minHeight: "55%",
        paddingBottom: 20,
    },
    handle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#E2E8F0",
        alignSelf: "center",
        marginTop: 10,
        marginBottom: 6,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    title: {
        fontSize: 17,
        fontWeight: "700",
        color: "#0F172A",
    },
    subtitle: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        marginHorizontal: 20,
        marginVertical: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: "#1E293B",
        paddingVertical: 4,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    driverCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
    },
    driverCardSelected: {
        borderColor: colors.primary,
        backgroundColor: "#EFF6FF",
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#CBD5E1",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    radioCircleSelected: {
        borderColor: colors.primary,
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    driverInfo: {
        flex: 1,
        gap: 3,
    },
    driverName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1E293B",
    },
    driverPhone: {
        fontSize: 13,
        color: "#64748B",
    },
    vehicleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 2,
    },
    vehicleBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 4,
    },
    vehicleText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#475569",
    },
    vehicleNumber: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1E293B",
    },
    driverStatusPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ECFDF5",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 5,
    },
    greenDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#10B981",
    },
    driverStatusText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#059669",
    },
    loadingWrap: {
        paddingVertical: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingText: {
        marginTop: 10,
        fontSize: 13,
        color: "#64748B",
    },
    emptyWrap: {
        paddingVertical: 36,
        alignItems: "center",
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#475569",
        marginTop: 10,
    },
    emptySubtitle: {
        fontSize: 13,
        color: "#94A3B8",
        textAlign: "center",
        marginTop: 4,
        paddingHorizontal: 20,
    },
    bottomBar: {
        paddingHorizontal: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    assignBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    assignBtnDisabled: {
        backgroundColor: "#93C5FD",
    },
    assignBtnText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#FFFFFF",
    },
});

export default AssignDriverModal;
