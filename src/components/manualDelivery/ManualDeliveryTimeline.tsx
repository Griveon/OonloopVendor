import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { ManualDeliveryStatusHistory } from "../../types/manualDelivery.types";
import { getStatusConfig } from "./ManualDeliveryStatusBadge";

interface Props {
    history: ManualDeliveryStatusHistory[];
}

const formatDateTime = (dateString?: string) => {
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

export const ManualDeliveryTimeline: React.FC<Props> = ({ history }) => {
    if (!history || history.length === 0) {
        return (
            <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No status updates recorded yet</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {history.map((item, index) => {
                const config = getStatusConfig(item.status);
                const isLast = index === history.length - 1;

                return (
                    <View key={`${item.status}-${index}`} style={styles.row}>
                        {/* Dot & Connecting line */}
                        <View style={styles.leftCol}>
                            <View
                                style={[
                                    styles.iconCircle,
                                    {
                                        backgroundColor: config.bgColor,
                                        borderColor: config.color,
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={config.icon as any}
                                    size={14}
                                    color={config.color}
                                />
                            </View>
                            {!isLast && <View style={styles.line} />}
                        </View>

                        {/* Content */}
                        <View style={[styles.rightCol, !isLast && { paddingBottom: 22 }]}>
                            <View style={styles.headerRow}>
                                <Text style={[styles.statusTitle, { color: config.color }]}>
                                    {item.title || config.label}
                                </Text>
                                {item.updatedByRole && (
                                    <View style={styles.roleTag}>
                                        <Text style={styles.roleText}>
                                            {item.updatedByRole.toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.timeText}>
                                {formatDateTime(item.updatedAt)}
                            </Text>

                            {item.remark ? (
                                <Text style={styles.remarkText}>{item.remark}</Text>
                            ) : null}
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 8,
    },
    emptyWrap: {
        paddingVertical: 16,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 13,
        color: "#94A3B8",
        fontStyle: "italic",
    },
    row: {
        flexDirection: "row",
    },
    leftCol: {
        width: 32,
        alignItems: "center",
    },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1.5,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2,
    },
    line: {
        width: 2,
        flex: 1,
        backgroundColor: "#E2E8F0",
        marginVertical: 4,
    },
    rightCol: {
        flex: 1,
        paddingLeft: 12,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    statusTitle: {
        fontSize: 14,
        fontWeight: "700",
    },
    roleTag: {
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    roleText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#64748B",
    },
    timeText: {
        fontSize: 11,
        color: "#94A3B8",
        marginTop: 2,
    },
    remarkText: {
        fontSize: 13,
        color: "#475569",
        marginTop: 4,
        backgroundColor: "#F8FAFC",
        padding: 8,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#CBD5E1",
    },
});

export default ManualDeliveryTimeline;
