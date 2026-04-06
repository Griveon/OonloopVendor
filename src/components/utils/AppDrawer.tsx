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
    StatusBar,
    Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors } from "../../constants/AppThem";
import { clearUserData, getUserData } from "../AsyncStorage/AsyncStorage";

const { width: W, height: H } = Dimensions.get("window");
const DRAWER_WIDTH = W * 0.78;
const STATUS_BAR_HEIGHT =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 44;

// ─── Types ────────────────────────────────────────────────────────────────────

type NavChild = { icon: string; label: string; onPress: () => void };
type DrawerItemDef =
    | { kind: "item"; icon: string; label: string; onPress: () => void; badge?: number }
    | { kind: "section"; icon: string; label: string; key: string; children: NavChild[] }
    | { kind: "divider"; label?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const logout = async (navigation?: any) => {
    await clearUserData();
    if (navigation) navigation.replace("Login");
};

// ─── Quick-stat pill shown in header ─────────────────────────────────────────

const StatPill = ({ icon, value, label }: { icon: string; value: string; label: string }) => (
    <View style={styles.statPill}>
        <Ionicons name={icon as any} size={13} color="rgba(255,255,255,0.9)" />
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

// ─── Single menu row ──────────────────────────────────────────────────────────

const MenuRow = ({
    icon,
    label,
    badge,
    active,
    hasChevron = true,
    onPress,
    chevronDown,
}: {
    icon: string;
    label: string;
    badge?: number;
    active?: boolean;
    hasChevron?: boolean;
    onPress: () => void;
    chevronDown?: boolean;
}) => (
    <TouchableOpacity
        style={[styles.menuRow, active && styles.menuRowActive]}
        onPress={onPress}
        activeOpacity={0.65}
    >
        <View style={[styles.menuIconWrap, active && styles.menuIconWrapActive]}>
            <Ionicons name={icon as any} size={18} color={active ? "#fff" : colors.primary} />
        </View>
        <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{label}</Text>
        {badge ? (
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
            </View>
        ) : hasChevron ? (
            <Ionicons
                name={chevronDown ? "chevron-down" : "chevron-forward"}
                size={14}
                color={active ? colors.primary : "#C8D0DC"}
            />
        ) : null}
    </TouchableOpacity>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AppDrawer = ({ navigation, closeDrawer }: any) => {
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // stagger animations for menu rows
    const rowAnims = useRef(
        Array.from({ length: 16 }, () => new Animated.Value(0))
    ).current;

    useEffect(() => {
        loadUser();
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 0,
                speed: 20,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // stagger menu rows in after drawer opens
            Animated.stagger(
                38,
                rowAnims.map((a) =>
                    Animated.spring(a, {
                        toValue: 1,
                        useNativeDriver: true,
                        bounciness: 4,
                        speed: 18,
                    })
                )
            ).start();
        });
    }, []);

    const loadUser = async () => {
        try {
            const { user } = await getUserData();
            setUser(user);
        } catch { }
    };

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -DRAWER_WIDTH,
                duration: 210,
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
        setTimeout(() => navigation.navigate(screen, params), 230);
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
            onPress: () => go("VendorKYC"),
        },
        { kind: "divider", label: "STORE" },
        {
            kind: "section",
            icon: "cube-outline",
            label: "Products",
            key: "products",
            children: [
                { icon: "bookmark-outline", label: "Brands", onPress: () => go("BrandListing") },
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
        { kind: "divider", label: "ACCOUNT" },
        {
            kind: "item",
            icon: "person-outline",
            label: "Profile",
            onPress: () => go("VendorProfile"),
        },
        {
            kind: "item",
            icon: "star-outline",
            label: "Subscription Plans",
            onPress: () => go("Subscription"),
        },
        {
            kind: "item",
            icon: "pricetag-outline",
            label: "Vendor Coupons",
            onPress: () => go("VendorCouponListing"),
        },
        { kind: "divider", label: "MORE" },
        {
            kind: "section",
            icon: "document-text-outline",
            label: "Legal",
            key: "legal",
            children: [
                { icon: "shield-outline", label: "Privacy Policy", onPress: () => go("PrivacyPolicy") },
                { icon: "document-outline", label: "Terms & Permissions", onPress: () => go("TermsAndCondition") },
            ],
        },
    ];

    // flatten to assign stagger index
    let rowIndex = 0;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={handleClose}>
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
            </TouchableWithoutFeedback>

            {/* Drawer panel */}
            <Animated.View
                style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    {/* decorative circles */}
                    <View style={styles.decCircle1} />
                    <View style={styles.decCircle2} />

                    {/* close */}
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={handleClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>

                    {/* Avatar + info */}
                    <View style={styles.profileRow}>
                        <View style={styles.avatarRing}>
                            <Image
                                source={{ uri: "https://i.pravatar.cc/150" }}
                                style={styles.avatar}
                            />
                            <View style={styles.onlineDot} />
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.name} numberOfLines={1}>
                                {user?.user?.name || "Vendor User"}
                            </Text>
                            <Text style={styles.mobile} numberOfLines={1}>
                                {user?.user?.mobile ? `+91 ${user.user.mobile}` : "vendor@store.in"}
                            </Text>
                            <View style={styles.verifiedRow}>
                                <Ionicons name="checkmark-circle" size={12} color="#4ADE80" />
                                <Text style={styles.verifiedText}>Verified Vendor</Text>
                            </View>
                        </View>
                    </View>

                    {/* Quick stats */}
                    <View style={styles.statsRow}>
                        <StatPill icon="bag-outline" value="24" label="Orders" />
                        <View style={styles.statSep} />
                        <StatPill icon="cube-outline" value="138" label="Products" />
                        <View style={styles.statSep} />
                        <StatPill icon="star-outline" value="4.8" label="Rating" />
                    </View>
                </View>

                {/* ── Menu list ── */}
                <ScrollView
                    contentContainerStyle={styles.menuList}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {menuItems.map((item, idx) => {
                        if (item.kind === "divider") {
                            return (
                                <View key={`d-${idx}`} style={styles.dividerRow}>
                                    {item.label ? (
                                        <Text style={styles.dividerLabel}>{item.label}</Text>
                                    ) : (
                                        <View style={styles.dividerLine} />
                                    )}
                                </View>
                            );
                        }

                        const animStyle = {
                            opacity: rowAnims[rowIndex],
                            transform: [
                                {
                                    translateX: rowAnims[rowIndex].interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-18, 0],
                                    }),
                                },
                            ],
                        };
                        rowIndex++;

                        if (item.kind === "item") {
                            return (
                                <Animated.View key={item.label} style={animStyle}>
                                    <MenuRow
                                        icon={item.icon}
                                        label={item.label}
                                        badge={item.badge}
                                        onPress={item.onPress}
                                    />
                                </Animated.View>
                            );
                        }

                        if (item.kind === "section") {
                            const isOpen = openSection === item.key;
                            return (
                                <Animated.View key={item.key} style={animStyle}>
                                    <MenuRow
                                        icon={item.icon}
                                        label={item.label}
                                        active={isOpen}
                                        chevronDown={isOpen}
                                        onPress={() =>
                                            setOpenSection((p) => (p === item.key ? null : item.key))
                                        }
                                    />
                                    {isOpen && (
                                        <View style={styles.subList}>
                                            {item.children.map((child) => (
                                                <TouchableOpacity
                                                    key={child.label}
                                                    style={styles.subRow}
                                                    onPress={child.onPress}
                                                    activeOpacity={0.65}
                                                >
                                                    <View style={styles.subTrack}>
                                                        <View style={styles.subDot} />
                                                    </View>
                                                    <View style={styles.subIconWrap}>
                                                        <Ionicons
                                                            name={child.icon as any}
                                                            size={15}
                                                            color={colors.primary}
                                                        />
                                                    </View>
                                                    <Text style={styles.subLabel}>{child.label}</Text>
                                                    <Ionicons
                                                        name="chevron-forward"
                                                        size={12}
                                                        color="#C8D0DC"
                                                    />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </Animated.View>
                            );
                        }

                        return null;
                    })}

                    {/* ── Logout ── */}
                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={async () => {
                            handleClose();
                            await logout();
                            setTimeout(() => navigation.replace("Login"), 230);
                        }}
                        activeOpacity={0.75}
                    >
                        <View style={styles.logoutIconWrap}>
                            <Ionicons name="log-out-outline" size={17} color="#EF4444" />
                        </View>
                        <Text style={styles.logoutText}>Log Out</Text>
                        <Ionicons name="chevron-forward" size={14} color="#EF4444" style={{ opacity: 0.5 }} />
                    </TouchableOpacity>

                    <Text style={styles.version}>Vendor App v1.0.0</Text>
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
        backgroundColor: "rgba(0,0,0,0.45)",
    },

    drawer: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        backgroundColor: "#F4F6FA",
        shadowColor: "#000",
        shadowOffset: { width: 10, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 28,
        elevation: 28,
        overflow: "hidden",
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        backgroundColor: colors.primary,
        paddingTop: STATUS_BAR_HEIGHT + 12,
        paddingBottom: 18,
        paddingHorizontal: 18,
        overflow: "hidden",
    },
    decCircle1: {
        position: "absolute",
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: "rgba(255,255,255,0.07)",
        top: -30,
        right: -30,
    },
    decCircle2: {
        position: "absolute",
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(255,255,255,0.06)",
        bottom: 10,
        right: 60,
    },

    closeBtn: {
        alignSelf: "flex-end",
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.18)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },

    profileRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        marginBottom: 16,
    },
    avatarRing: {
        width: 58,
        height: 58,
        borderRadius: 29,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.45)",
        padding: 2,
        flexShrink: 0,
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: 26,
    },
    onlineDot: {
        position: "absolute",
        bottom: 1,
        right: 1,
        width: 11,
        height: 11,
        borderRadius: 6,
        backgroundColor: "#22C55E",
        borderWidth: 2,
        borderColor: colors.primary,
    },
    profileInfo: {
        flex: 1,
        gap: 2,
    },
    name: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: 0.1,
    },
    mobile: {
        color: "rgba(255,255,255,0.72)",
        fontSize: 12,
        fontWeight: "400",
    },
    verifiedRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
    },
    verifiedText: {
        color: "#4ADE80",
        fontSize: 11,
        fontWeight: "600",
    },

    // stats
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.14)",
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    statPill: {
        flex: 1,
        alignItems: "center",
        gap: 2,
    },
    statValue: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "800",
    },
    statLabel: {
        color: "rgba(255,255,255,0.65)",
        fontSize: 10,
        fontWeight: "500",
    },
    statSep: {
        width: 1,
        height: 28,
        backgroundColor: "rgba(255,255,255,0.18)",
    },

    // ── Menu ──────────────────────────────────────────────────────────────────
    menuList: {
        paddingTop: 10,
        paddingHorizontal: 12,
        paddingBottom: 30,
    },

    dividerRow: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    dividerLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: "#9BABBF",
        letterSpacing: 1,
    },
    dividerLine: {
        height: 1,
        backgroundColor: "#E4E9F0",
    },

    menuRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 9,
        paddingHorizontal: 10,
        borderRadius: 11,
        marginBottom: 1,
        backgroundColor: "transparent",
    },
    menuRowActive: {
        backgroundColor: colors.primary + "10",
    },
    menuIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 9,
        backgroundColor: colors.primary + "12",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 11,
    },
    menuIconWrapActive: {
        backgroundColor: colors.primary,
    },
    menuLabel: {
        flex: 1,
        fontSize: 13.5,
        color: "#1E293B",
        fontWeight: "500",
    },
    menuLabelActive: {
        color: colors.primary,
        fontWeight: "700",
    },
    badge: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 6,
    },
    badgeText: {
        color: "#fff",
        fontSize: 10.5,
        fontWeight: "700",
    },

    // ── Sub items ─────────────────────────────────────────────────────────────
    subList: {
        marginLeft: 22,
        marginBottom: 4,
    },
    subRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: 9,
        gap: 0,
    },
    subTrack: {
        width: 20,
        alignItems: "center",
        marginRight: 6,
    },
    subDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: colors.primary + "50",
    },
    subIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 7,
        backgroundColor: colors.primary + "0D",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 9,
    },
    subLabel: {
        flex: 1,
        fontSize: 13,
        color: "#475569",
        fontWeight: "400",
    },

    // ── Logout ────────────────────────────────────────────────────────────────
    logoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 12,
        marginBottom: 4,
        paddingVertical: 11,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: "#FEE2E2",
        gap: 10,
    },
    logoutIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#FECACA",
        alignItems: "center",
        justifyContent: "center",
    },
    logoutText: {
        flex: 1,
        fontSize: 13.5,
        fontWeight: "700",
        color: "#EF4444",
    },

    version: {
        textAlign: "center",
        fontSize: 10.5,
        color: "#B0BECE",
        marginTop: 14,
        fontWeight: "400",
    },
});
