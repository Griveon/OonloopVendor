// screens/Dashboard/DashboardScreen.tsx
import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AppBar from "../../../components/utils/AppBar";
import AppDrawer from "../../../components/utils/AppDrawer";
import BottomNavBar from "../../../components/utils/BottomNavBar";
import { colors } from "../../../constants/AppThem";

// ─── Dummy data ───────────────────────────────────────────────────────────────

const data = {
    orders: {
        placed: 12,
        confirmed: 8,
        shipped: 5,
        delivered: 20,
        cancelled: 2,
    },
};

// ─── Order card config ────────────────────────────────────────────────────────

const ORDER_CARDS = [
    { title: "Placed", count: data.orders.placed, color: "#3B82F6", status: "PLACED", icon: "time-outline" },
    { title: "Confirmed", count: data.orders.confirmed, color: "#10B981", status: "CONFIRMED", icon: "checkmark-circle-outline" },
    { title: "Shipped", count: data.orders.shipped, color: "#F59E0B", status: "SHIPPED", icon: "bicycle-outline" },
    { title: "Delivered", count: data.orders.delivered, color: "#14B8A6", status: "DELIVERED", icon: "bag-check-outline" },
    { title: "Cancelled", count: data.orders.cancelled, color: "#EF4444", status: "CANCELLED", icon: "close-circle-outline" },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

const DashboardScreen = ({ navigation }: any) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("Home");

    const handleTabPress = (key: string) => {
        setActiveTab(key);
        if (key === "Orders") navigation.navigate("Orders");
        if (key === "Products") navigation.navigate("Products");
        if (key === "Profile") navigation.navigate("Profile");
        // "Home" stays on this screen
    };

    return (
        <View style={styles.container}>
            <AppBar
                title="Dashboard"
                onMenu={() => setDrawerOpen(true)}
            />

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Welcome banner ── */}
                <View style={styles.banner}>
                    <View style={styles.bannerText}>
                        <Text style={styles.bannerGreeting}>Good morning 👋</Text>
                        <Text style={styles.bannerName}>Vendor User</Text>
                    </View>
                    <View style={styles.bannerBadge}>
                        <Ionicons name="stats-chart" size={28} color={colors.primary} />
                    </View>
                </View>

                {/* ── Orders Overview ── */}
                <Text style={styles.sectionHeading}>Orders Overview</Text>

                <View style={styles.grid}>
                    {ORDER_CARDS.map((item) => (
                        <TouchableOpacity
                            key={item.status}
                            style={styles.card}
                            activeOpacity={0.82}
                            onPress={() =>
                                navigation.navigate("OrdersScreen", { status: item.status })
                            }
                        >
                            {/* Top row: icon + arrow */}
                            <View style={styles.cardTop}>
                                <View
                                    style={[
                                        styles.cardIconWrap,
                                        { backgroundColor: item.color + "18" },
                                    ]}
                                >
                                    <Ionicons
                                        name={item.icon}
                                        size={20}
                                        color={item.color}
                                    />
                                </View>
                                <Ionicons
                                    name="chevron-forward"
                                    size={14}
                                    color="#CBD5E1"
                                />
                            </View>

                            {/* Count */}
                            <Text style={[styles.cardCount, { color: item.color }]}>
                                {item.count}
                            </Text>

                            {/* Label */}
                            <Text style={styles.cardTitle}>{item.title}</Text>

                            {/* Bottom accent bar */}
                            <View
                                style={[
                                    styles.cardAccent,
                                    { backgroundColor: item.color },
                                ]}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* ── Bottom Nav ── */}
            <BottomNavBar
                activeTab={activeTab}
                onTabPress={handleTabPress}
            />

            {/* ── Drawer overlay ── */}
            {drawerOpen && (
                <AppDrawer
                    navigation={navigation}
                    closeDrawer={() => setDrawerOpen(false)}
                />
            )}
        </View>
    );
};

export default DashboardScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.scaffoldBg,
    },
    scroll: {
        padding: 16,
        paddingBottom: 24,
    },

    // ── Banner ────────────────────────────────────────────────────────────────
    banner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 18,
        marginBottom: 22,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    bannerText: {
        gap: 3,
    },
    bannerGreeting: {
        fontSize: 13,
        color: colors.placeholder,
        fontFamily: "Roboto",
    },
    bannerName: {
        fontSize: 17,
        fontWeight: "700",
        color: colors.secondary,
        fontFamily: "Roboto",
    },
    bannerBadge: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: colors.primary + "12",
        alignItems: "center",
        justifyContent: "center",
    },

    // ── Section heading ───────────────────────────────────────────────────────
    sectionHeading: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.secondary,
        marginBottom: 14,
        fontFamily: "Roboto",
        letterSpacing: 0.2,
    },

    // ── Grid ─────────────────────────────────────────────────────────────────
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 12,
    },

    // ── Card ─────────────────────────────────────────────────────────────────
    card: {
        width: "47.5%",
        backgroundColor: "#fff",
        borderRadius: 16,
        paddingTop: 14,
        paddingHorizontal: 14,
        paddingBottom: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 4,
        overflow: "hidden",
    },
    cardTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    cardIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    cardCount: {
        fontSize: 26,
        fontWeight: "800",
        fontFamily: "Roboto",
        letterSpacing: -0.5,
    },
    cardTitle: {
        fontSize: 12.5,
        color: colors.placeholder,
        fontFamily: "Roboto",
        marginTop: 3,
        marginBottom: 12,
        fontWeight: "500",
    },
    cardAccent: {
        height: 3,
        borderRadius: 2,
        marginHorizontal: -14,
        opacity: 0.7,
    },
});