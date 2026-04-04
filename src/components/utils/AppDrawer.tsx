// components/utils/AppDrawer.tsx
import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Animated,
    TouchableWithoutFeedback,
    Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors } from "../../constants/AppThem";

const DRAWER_WIDTH = Dimensions.get("window").width * 0.82;

// ─── Types ────────────────────────────────────────────────────────────────────

type DrawerItemDef =
    | {
        kind: "item";
        icon: string;
        label: string;
        onPress: () => void;
        badge?: number;
    }
    | {
        kind: "section";
        icon: string;
        label: string;
        key: string;
        children: { icon: string; label: string; onPress: () => void }[];
    }
    | { kind: "divider" };

// ─── Component ────────────────────────────────────────────────────────────────

const AppDrawer = ({ navigation, closeDrawer }: any) => {
    const [openSection, setOpenSection] = useState<string | null>(null);
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 0,
                speed: 18,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -DRAWER_WIDTH,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => closeDrawer());
    };

    const go = (screen: string, params?: any) => {
        handleClose();
        setTimeout(() => navigation.navigate(screen, params), 220);
    };

    const menuItems: DrawerItemDef[] = [
        {
            kind: "item",
            icon: "home-outline",
            label: "Home",
            onPress: () => go("VendorDashboardScreen"),
        },
        {
            kind: "item",
            icon: "shield-checkmark-outline",
            label: "Complete KYC",
            onPress: () => go("KycScreen"),
        },
        { kind: "divider" },
        {
            kind: "section",
            icon: "cube-outline",
            label: "Products",
            key: "products",
            children: [
                { icon: "bookmark-outline", label: "Brands", onPress: () => go("Brands") },
                { icon: "bag-outline", label: "Products", onPress: () => go("Products") },
            ],
        },
        {
            kind: "section",
            icon: "receipt-outline",
            label: "Orders",
            key: "orders",
            children: [
                { icon: "time-outline", label: "Placed", onPress: () => go("Orders", { status: "PLACED" }) },
                { icon: "checkmark-circle-outline", label: "Confirmed", onPress: () => go("Orders", { status: "CONFIRMED" }) },
                { icon: "bicycle-outline", label: "Shipped", onPress: () => go("Orders", { status: "SHIPPED" }) },
                { icon: "bag-check-outline", label: "Delivered", onPress: () => go("Orders", { status: "DELIVERED" }) },
                { icon: "close-circle-outline", label: "Cancelled", onPress: () => go("Orders", { status: "CANCELLED" }) },
            ],
        },
        { kind: "divider" },
        {
            kind: "item",
            icon: "person-outline",
            label: "Profile",
            onPress: () => go("Profile"),
        },
        {
            kind: "item",
            icon: "wallet-outline",
            label: "Wallet",
            onPress: () => go("Wallet"),
        },
        {
            kind: "item",
            icon: "star-outline",
            label: "Subscription Plans",
            onPress: () => go("Subscription"),
        },
    ];

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={handleClose}>
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
            </TouchableWithoutFeedback>

            {/* Drawer */}
            <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>

                {/* ── Header ── */}
                {/* ── Header ── */}
                <View style={styles.header}>
                    {/* Close button */}
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={handleClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={18} color="#fff" />
                    </TouchableOpacity>

                    {/* Avatar LEFT + Info RIGHT */}
                    <View style={styles.profileRow}>
                        <View style={styles.avatarRing}>
                            <Image
                                source={{ uri: "https://i.pravatar.cc/150" }}
                                style={styles.avatar}
                            />
                        </View>

                        <View style={styles.profileInfo}>
                            <Text style={styles.name}>Vendor User</Text>
                            <Text style={styles.phone}>+91 9999999999</Text>
                            <View style={styles.statusPill}>
                                <View style={styles.activeDot} />
                                <Text style={styles.statusText}>Active</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── Menu ── */}
                <ScrollView
                    contentContainerStyle={styles.menuList}
                    showsVerticalScrollIndicator={false}
                >
                    {menuItems.map((item, idx) => {
                        if (item.kind === "divider") {
                            return <View key={`d-${idx}`} style={styles.divider} />;
                        }

                        if (item.kind === "item") {
                            return (
                                <TouchableOpacity
                                    key={item.label}
                                    style={styles.menuRow}
                                    onPress={item.onPress}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.menuIconWrap}>
                                        <Ionicons name={item.icon} size={19} color={colors.primary} />
                                    </View>
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                    {item.badge ? (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>{item.badge}</Text>
                                        </View>
                                    ) : (
                                        <Ionicons name="chevron-forward" size={15} color="#CBD5E1" />
                                    )}
                                </TouchableOpacity>
                            );
                        }

                        if (item.kind === "section") {
                            const isOpen = openSection === item.key;
                            return (
                                <View key={item.key}>
                                    <TouchableOpacity
                                        style={[styles.menuRow, isOpen && styles.menuRowActive]}
                                        onPress={() =>
                                            setOpenSection((p) => (p === item.key ? null : item.key))
                                        }
                                        activeOpacity={0.7}
                                    >
                                        <View
                                            style={[
                                                styles.menuIconWrap,
                                                isOpen && styles.menuIconWrapActive,
                                            ]}
                                        >
                                            <Ionicons
                                                name={item.icon}
                                                size={19}
                                                color={isOpen ? "#fff" : colors.primary}
                                            />
                                        </View>
                                        <Text
                                            style={[
                                                styles.menuLabel,
                                                isOpen && styles.menuLabelActive,
                                            ]}
                                        >
                                            {item.label}
                                        </Text>
                                        <Ionicons
                                            name={isOpen ? "chevron-down" : "chevron-forward"}
                                            size={15}
                                            color={isOpen ? colors.primary : "#CBD5E1"}
                                        />
                                    </TouchableOpacity>

                                    {/* Sub-items */}
                                    {isOpen && (
                                        <View style={styles.subList}>
                                            {item.children.map((child) => (
                                                <TouchableOpacity
                                                    key={child.label}
                                                    style={styles.subRow}
                                                    onPress={child.onPress}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.subDot} />
                                                    <Ionicons
                                                        name={child.icon}
                                                        size={16}
                                                        color={colors.placeholder}
                                                        style={{ marginRight: 10 }}
                                                    />
                                                    <Text style={styles.subLabel}>{child.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            );
                        }

                        return null;
                    })}

                    {/* ── Logout ── */}
                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={() => {
                            handleClose();
                            setTimeout(() => navigation.replace("Login"), 220);
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="log-out-outline" size={19} color="#EF4444" style={{ marginRight: 10 }} />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </ScrollView>
            </Animated.View>
        </View>
    );
};

export default AppDrawer;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    drawer: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        backgroundColor: "#F8FAFC",
        shadowColor: "#000",
        shadowOffset: { width: 8, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 24,
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        backgroundColor: colors.primary,
        paddingTop: 54,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    closeBtn: {
        position: "absolute",
        top: 14,
        right: 14,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.18)",
        alignItems: "center",
        justifyContent: "center",
    },

    // ── New layout styles ──
    profileRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        marginTop: 6,
    },
    avatarRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2.5,
        borderColor: "rgba(255,255,255,0.5)",
        padding: 2,
        flexShrink: 0,
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: 30,
    },
    profileInfo: {
        flex: 1,
        justifyContent: "center",
        gap: 3,
    },
    name: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        fontFamily: "Roboto",
        letterSpacing: 0.2,
    },
    phone: {
        color: "rgba(255,255,255,0.75)",
        fontSize: 12.5,
        fontFamily: "Roboto",
    },
    statusPill: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginTop: 4,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#22C55E",
        marginRight: 5,
    },
    statusText: {
        color: "#fff",
        fontSize: 11.5,
        fontFamily: "Roboto",
        fontWeight: "500",
    },

    menuList: {
        paddingTop: 12,
        paddingHorizontal: 14,
        paddingBottom: 40,
    },
    divider: {
        height: 1,
        backgroundColor: "#E2E8F0",
        marginVertical: 8,
    },
    menuRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 11,
        paddingHorizontal: 10,
        borderRadius: 12,
        marginBottom: 2,
    },
    menuRowActive: {
        backgroundColor: colors.primary + "12",
    },
    menuIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.primary + "14",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    menuIconWrapActive: {
        backgroundColor: colors.primary,
    },
    menuLabel: {
        flex: 1,
        fontSize: 14,
        color: "#1E293B",
        fontWeight: "500",
        fontFamily: "Roboto",
    },
    menuLabelActive: {
        color: colors.primary,
        fontWeight: "700",
    },
    badge: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    badgeText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
    },

    // ── Sub-items ─────────────────────────────────────────────────────────────
    subList: {
        marginLeft: 16,
        marginBottom: 4,
        borderLeftWidth: 1.5,
        borderLeftColor: colors.primary + "30",
        paddingLeft: 12,
    },
    subRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 9,
        paddingHorizontal: 6,
        borderRadius: 8,
    },
    subDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: colors.primary + "60",
        marginRight: 8,
    },
    subLabel: {
        fontSize: 13.5,
        color: "#475569",
        fontFamily: "Roboto",
        fontWeight: "400",
    },

    // ── Logout ────────────────────────────────────────────────────────────────
    logoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 16,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "#FEE2E2",
    },
    logoutText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#EF4444",
        fontFamily: "Roboto",
    },
});