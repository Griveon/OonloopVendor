// screens/Dashboard/DashboardScreen.tsx
import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Modal,
    Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AppBar from "../../../components/utils/AppBar";
import AppDrawer from "../../../components/utils/AppDrawer";
import BottomNavBar from "../../../components/utils/BottomNavBar";
import { colors } from "../../../constants/AppThem";
import { getRequest } from "../../../constants/ApiClient";
import { API_ENDPOINTS } from "../../../constants/ApiEndpoints";
import { getUserData } from "../../../components/AsyncStorage/AsyncStorage";
import { Fonts } from "../../../constants/Fonts";
import { useFocusEffect } from "@react-navigation/native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardCounts {
    products: number;
    brands: number;
    coupons: number;
    // Add future count keys here as the API grows
}

interface KycStatus {
    isKycSubmitted: boolean;
    isKycApproved: boolean;
    profileStatus: string;
    message: string;
}

// ─── Order card config ────────────────────────────────────────────────────────

const ORDER_CARDS = [
    { title: "Placed", color: "#3B82F6", status: "placed", icon: "time-outline", navigateTo: "Orders" },
    { title: "Confirmed", color: "#10B981", status: "confirmed", icon: "checkmark-circle-outline", navigateTo: "Orders" },
    { title: "Shipped", color: "#F59E0B", status: "shipped", icon: "bicycle-outline", navigateTo: "Orders" },
    { title: "Delivered", color: "#14B8A6", status: "delivered", icon: "bag-check-outline", navigateTo: "Orders" },
    { title: "Cancelled", color: "#EF4444", status: "cancelled", icon: "close-circle-outline", navigateTo: "Orders" },
];

// ─── Preorder card config ─────────────────────────────────────────────────────

const PREORDER_CARDS = [
    { title: "New", color: "#3B82F6", status: "placed", icon: "calendar-outline" },
    { title: "Preparing", color: "#F59E0B", status: "preparing", icon: "restaurant-outline" },
    { title: "Ready", color: "#10B981", status: "ready", icon: "bag-check-outline" },
];

// ─── Stat card config ─────────────────────────────────────────────────────────

const STAT_CARD_META: {
    key: keyof DashboardCounts;
    label: string;
    icon: string;
    color: string;
    navigateTo: string;
}[] = [
        { key: "products", label: "Products", icon: "cube-outline", color: "#6366F1", navigateTo: "ProductListing" },
        { key: "brands", label: "Brands", icon: "pricetag-outline", color: "#EC4899", navigateTo: "BrandListing" },
        { key: "coupons", label: "Coupons", icon: "ticket-outline", color: "#F59E0B", navigateTo: "VendorCouponListing" },
    ];

// ─── KYC Pending Modal ────────────────────────────────────────────────────────

const KycPendingModal = ({
    visible,
    onClose,
    onGoToKyc,
}: {
    visible: boolean;
    onClose: () => void;
    onGoToKyc: () => void;
}) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={modalStyles.overlay}>
            <View style={modalStyles.sheet}>
                {/* Illustration area */}
                <View style={[modalStyles.iconCircle, { backgroundColor: "#FEF3C7" }]}>
                    <View style={modalStyles.iconInner}>
                        <Ionicons name="document-text-outline" size={36} color="#D97706" />
                    </View>
                </View>

                {/* Badge */}
                <View style={[modalStyles.badge, { backgroundColor: "#FEF3C7" }]}>
                    <View style={[modalStyles.badgeDot, { backgroundColor: "#F59E0B" }]} />
                    <Text style={[modalStyles.badgeText, { color: "#92400E" }]}>Action Required</Text>
                </View>

                <Text style={modalStyles.title}>Complete Your KYC</Text>
                <Text style={modalStyles.subtitle}>
                    To start selling and receiving payments, you need to verify your business identity. It only takes a few minutes.
                </Text>

                {/* Steps */}
                <View style={modalStyles.stepsWrap}>
                    {["Upload business documents", "Enter your details", "Await quick approval"].map((step, i) => (
                        <View key={i} style={modalStyles.stepRow}>
                            <View style={modalStyles.stepNum}>
                                <Text style={modalStyles.stepNumText}>{i + 1}</Text>
                            </View>
                            <Text style={modalStyles.stepText}>{step}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity style={modalStyles.primaryBtn} activeOpacity={0.85} onPress={onGoToKyc}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={modalStyles.primaryBtnText}>Start KYC Verification</Text>
                </TouchableOpacity>

                <TouchableOpacity style={modalStyles.ghostBtn} onPress={onClose}>
                    <Text style={modalStyles.ghostBtnText}>Remind me later</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

// ─── KYC In-Review Modal ──────────────────────────────────────────────────────

const KycReviewModal = ({
    visible,
    onClose,
}: {
    visible: boolean;
    onClose: () => void;
}) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={modalStyles.overlay}>
            <View style={modalStyles.sheet}>
                {/* Animated pulse ring */}
                <View style={[modalStyles.iconCircle, { backgroundColor: "#EFF6FF" }]}>
                    <View style={[modalStyles.iconInner, { backgroundColor: "#DBEAFE" }]}>
                        <Ionicons name="hourglass-outline" size={36} color="#2563EB" />
                    </View>
                </View>

                {/* Badge */}
                <View style={[modalStyles.badge, { backgroundColor: "#EFF6FF" }]}>
                    <View style={[modalStyles.badgeDot, { backgroundColor: "#3B82F6" }]} />
                    <Text style={[modalStyles.badgeText, { color: "#1E40AF" }]}>Under Review</Text>
                </View>

                <Text style={modalStyles.title}>KYC Under Review</Text>
                <Text style={modalStyles.subtitle}>
                    Your documents have been submitted successfully. Our team is reviewing your information — this usually takes 1–2 business days.
                </Text>

                {/* Progress track */}
                <View style={modalStyles.progressTrack}>
                    {[
                        { label: "Submitted", done: true },
                        { label: "In Review", done: true },
                        { label: "Approved", done: false },
                    ].map((s, i, arr) => (
                        <React.Fragment key={i}>
                            <View style={modalStyles.progressStep}>
                                <View style={[
                                    modalStyles.progressDot,
                                    s.done
                                        ? { backgroundColor: "#3B82F6", borderColor: "#3B82F6" }
                                        : { backgroundColor: "#fff", borderColor: "#CBD5E1" },
                                ]}>
                                    {s.done && <Ionicons name="checkmark" size={10} color="#fff" />}
                                </View>
                                <Text style={[
                                    modalStyles.progressLabel,
                                    { color: s.done ? "#1D4ED8" : "#94A3B8" },
                                ]}>
                                    {s.label}
                                </Text>
                            </View>
                            {i < arr.length - 1 && (
                                <View style={[
                                    modalStyles.progressLine,
                                    { backgroundColor: s.done ? "#3B82F6" : "#E2E8F0" },
                                ]} />
                            )}
                        </React.Fragment>
                    ))}
                </View>

                <TouchableOpacity style={[modalStyles.primaryBtn, { backgroundColor: "#2563EB" }]} activeOpacity={0.85} onPress={onClose}>
                    <Text style={modalStyles.primaryBtnText}>Got it, thanks!</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

// ─── Coupon card renderer ─────────────────────────────────────────────────────

const renderCouponCard = ({ item }: any) => {
    const isPct = item.discountType === "PERCENTAGE";
    const accentColor = isPct ? "#185FA5" : "#3B6D11";
    const valStr = isPct ? `${item.discountValue}%` : `₹${item.discountValue}`;
    const label = isPct ? "off" : "flat off";

    return (
        <View style={couponStyles.card}>
            <View style={[couponStyles.accentBar, { backgroundColor: accentColor }]} />
            <View style={couponStyles.top}>
                <View style={[couponStyles.badge, { backgroundColor: isPct ? "#E6F1FB" : "#EAF3DE" }]}>
                    <Text style={[couponStyles.badgeText, { color: accentColor }]}>{item.couponType}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 6, marginBottom: 8 }}>
                    <Text style={[couponStyles.discountVal, { color: accentColor }]}>{valStr} </Text>
                    <Text style={couponStyles.discountLabel}>{label}</Text>
                </View>
                <View style={couponStyles.codeTag}>
                    <Text style={couponStyles.codeText}>{item.couponCode}</Text>
                </View>
            </View>
            <View style={couponStyles.dividerRow}>
                <View style={couponStyles.notch} />
                <View style={couponStyles.dashedLine} />
                <View style={couponStyles.notch} />
            </View>
            <View style={couponStyles.bottom}>
                <Text style={couponStyles.desc} numberOfLines={2}>{item.description}</Text>
                <View style={couponStyles.metaRow}>
                    <Text style={couponStyles.minOrder}>Min ₹{item.minOrderValue}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <View style={[couponStyles.dot, { backgroundColor: item.isActive ? "#10B981" : "#EF4444" }]} />
                        <Text style={{ fontSize: 11, color: item.isActive ? "#0F6E56" : "#993C1D" }}>
                            {item.isActive ? "Active" : "Inactive"}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const DashboardScreen = ({ navigation }: any) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("Home");

    // Coupon state
    const [vendorCoupons, setVendorCoupons] = useState<any[]>([]);
    const [loadingCoupons, setLoadingCoupons] = useState(true);

    // Dashboard counts state
    const [dashboardCounts, setDashboardCounts] = useState<DashboardCounts | null>(null);
    const [loadingCounts, setLoadingCounts] = useState(true);

    // Preorder counts state (keyed by preorder status)
    const [preorderCounts, setPreorderCounts] = useState<Record<string, number>>({});

    // KYC modal state
    const [showKycPendingModal, setShowKycPendingModal] = useState(false);
    const [showKycReviewModal, setShowKycReviewModal] = useState(false);
    const [kycReviewShownOnce, setKycReviewShownOnce] = useState(false);

    // User / vendor state
    const [userInfo, setUserInfo] = useState<any>(null);
    const [vendor, setVendor] = useState<any | null>(null);

    useFocusEffect(
        useCallback(() => {
            // ✅ Whenever Dashboard screen is focused again,
            // reset bottom nav selected icon to Home.
            setActiveTab("Home");

            const init = async () => {
                const { user } = await getUserData();

                if (user?.user?._id) {
                    await fetchVendorProfile(user);
                }

                await fetchDashboardCounts();
                fetchPreorderCounts();
                await fetchKycStatus();
            };

            init();

            return () => { };
        }, [])
    );

    // ── Fetch vendor profile ───────────────────────────────────────────────────

    const fetchVendorProfile = async (user: any) => {
        try {
            const res: any = await getRequest(`${API_ENDPOINTS.VENDORPROFILEGET}/${user?.user?._id}`,
                undefined,
                undefined,
                false
            );
            if (res?.success && res?.data) {
                const vendorData = res.data.vendor;
                if (!vendorData?._id) return;
                setVendor(vendorData);
                setUserInfo(res.data.user);
                await fetchVendorCoupons(vendorData._id);
            }
        } catch (err: any) {
            console.log("Vendor fetch error:", err);
        }
    };

    // ── Fetch vendor coupons ───────────────────────────────────────────────────

    const fetchVendorCoupons = async (vendorId: string) => {
        try {
            setLoadingCoupons(true);
            const res: any = await getRequest(`${API_ENDPOINTS.VENDORCOUPONGETBYVENDORID}/${vendorId}`);
            if (res.success) setVendorCoupons(res.data);
        } catch (error) {
            console.log("Error fetching coupons:", error);
        } finally {
            setLoadingCoupons(false);
        }
    };

    // ── Fetch dashboard counts ─────────────────────────────────────────────────
    // To add more dashboard APIs in future:
    //   1. Add the endpoint to API_ENDPOINTS
    //   2. Call it here and merge the result into state (or a new state slice)
    //   3. Add a new entry to STAT_CARD_META above

    const fetchDashboardCounts = async () => {
        try {
            setLoadingCounts(true);
            const res: any = await getRequest(API_ENDPOINTS.VENDORDASHBOARDCOUNTSGETALL);
            if (res?.success && res?.data) setDashboardCounts(res.data as DashboardCounts);
        } catch (error) {
            console.log("Error fetching dashboard counts:", error);
        } finally {
            setLoadingCounts(false);
        }
    };

    // ── Fetch preorder counts ──────────────────────────────────────────────────
    // There is no counts API for preorders, so read meta.total from the
    // vendor preorder list with limit=1 for each active status.

    const fetchPreorderCounts = async () => {
        const results = await Promise.all(
            PREORDER_CARDS.map((card) =>
                getRequest(
                    API_ENDPOINTS.PREORDERVENDORORDERS,
                    { status: card.status, page: 1, limit: 1 },
                    true,
                    false
                )
            )
        );

        const counts: Record<string, number> = {};

        results.forEach((res: any, index) => {
            if (res?.success) {
                counts[PREORDER_CARDS[index].status] = res?.meta?.total ?? 0;
            }
        });

        setPreorderCounts(counts);
    };

    // ── Fetch KYC status & trigger modals ─────────────────────────────────────

    const fetchKycStatus = async () => {
        try {
            const { user } = await getUserData();

            if (!user?.user?._id) return;

            const res: any = await getRequest(
                `${API_ENDPOINTS.VENDORPROFILEKYCCHECK}/${user?.user?._id}`
            );

            console.log(res);

            if (res?.success && res?.data) {
                const kyc: KycStatus = res.data;

                if (!kyc.isKycSubmitted) {
                    setShowKycPendingModal(true);
                } else if (kyc.isKycSubmitted && !kyc.isKycApproved) {
                    if (!kycReviewShownOnce) {
                        setShowKycReviewModal(true);
                        setKycReviewShownOnce(true);
                    }
                }
            }
        } catch (error) {
            console.log("Error fetching KYC status:", error);
        }
    };
    // ── Tab handler ────────────────────────────────────────────────────────────

    const handleTabPress = (key: string) => {
        setActiveTab(key);
        if (key === "Orders") navigation.navigate("Orders");
        if (key === "Products") navigation.navigate("Products");
        if (key === "Profile") navigation.navigate("Profile");
    };

    // ── Navigation helpers ─────────────────────────────────────────────────────

    const navigateToOrders = (status: string) => {
        navigation.navigate({
            name: "Orders",
            params: { status },
            merge: false,
        });
    };

    const navigateToScreen = (screenName: string) => {
        navigation.navigate(screenName);
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <View style={styles.container}>
            <AppBar title="Dashboard" onMenu={() => setDrawerOpen(true)} />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Store Overview ── */}
                <Text style={styles.sectionHeading}>Store Overview</Text>

                {loadingCounts ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
                ) : (
                    <View style={styles.statGrid}>
                        {STAT_CARD_META.map((meta) => (
                            <TouchableOpacity
                                key={meta.key}
                                style={styles.statCard}
                                activeOpacity={0.82}
                                onPress={() => navigateToScreen(meta.navigateTo)}
                            >
                                <View style={[styles.statIconWrap, { backgroundColor: meta.color + "18" }]}>
                                    <Ionicons name={meta.icon} size={22} color={meta.color} />
                                </View>
                                <Text style={[styles.statCount, { color: meta.color }]}>
                                    {dashboardCounts ? (dashboardCounts[meta.key] ?? 0) : 0}
                                </Text>
                                <Text style={styles.statLabel}>{meta.label}</Text>
                                <View style={[styles.statAccent, { backgroundColor: meta.color }]} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* ── Active Coupons ── */}
                {!loadingCoupons && vendorCoupons.length > 0 && (
                    <>
                        <Text style={styles.sectionHeading}>Active Coupons</Text>
                        <FlatList
                            data={vendorCoupons}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item: any) => item._id}
                            contentContainerStyle={styles.couponList}
                            ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
                            renderItem={renderCouponCard}
                        />
                    </>
                )}

                {/* ── Preorders Overview ── */}
                <Text style={styles.sectionHeading}>Preorders Overview</Text>

                <View style={styles.statGrid}>
                    {PREORDER_CARDS.map((item) => (
                        <TouchableOpacity
                            key={item.status}
                            style={styles.statCard}
                            activeOpacity={0.82}
                            onPress={() =>
                                navigation.navigate({
                                    name: "PreorderQueue",
                                    params: { status: item.status },
                                    merge: false,
                                })
                            }
                        >
                            <View style={[styles.statIconWrap, { backgroundColor: item.color + "18" }]}>
                                <Ionicons name={item.icon} size={22} color={item.color} />
                            </View>
                            <Text style={[styles.statCount, { color: item.color }]}>
                                {preorderCounts[item.status] ?? 0}
                            </Text>
                            <Text style={styles.statLabel}>{item.title}</Text>
                            <View style={[styles.statAccent, { backgroundColor: item.color }]} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Orders Overview ── */}
                <Text style={[styles.sectionHeading, { marginTop: 4 }]}>Orders Overview</Text>

                <View style={styles.grid}>
                    {ORDER_CARDS.map((item) => (
                        <TouchableOpacity
                            key={item.status}
                            style={styles.card}
                            activeOpacity={0.82}
                            onPress={() => navigateToOrders(item.status)}
                        >
                            <View style={styles.cardTop}>
                                <View style={[styles.cardIconWrap, { backgroundColor: item.color + "18" }]}>
                                    <Ionicons name={item.icon} size={20} color={item.color} />
                                </View>
                                <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                            </View>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <View style={[styles.cardAccent, { backgroundColor: item.color }]} />
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>

            <BottomNavBar activeTab={activeTab} onTabPress={handleTabPress} />

            {drawerOpen && (
                <AppDrawer navigation={navigation} closeDrawer={() => setDrawerOpen(false)} />
            )}

            {/* ── KYC Modals ── */}
            <KycPendingModal
                visible={showKycPendingModal}
                onClose={() => setShowKycPendingModal(false)}
                onGoToKyc={() => {
                    setShowKycPendingModal(false);
                    navigation.navigate("VendorKYC");
                }}
            />

            <KycReviewModal
                visible={showKycReviewModal}
                onClose={() => setShowKycReviewModal(false)}
            />
        </View>
    );
};

export default DashboardScreen;

// ─── Modal Styles ─────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        justifyContent: "flex-end",
        alignItems: "center",
    },
    sheet: {
        width: "100%",
        backgroundColor: "#fff",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    iconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    iconInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#FDE68A",
        alignItems: "center",
        justifyContent: "center",
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginBottom: 12,
    },
    badgeDot: { width: 7, height: 7, borderRadius: 4 },
    badgeText: { fontSize: 12, fontFamily: Fonts.Medium, letterSpacing: 0.3 },
    title: {
        fontSize: 22,
        fontWeight: "800",
        color: "#0F172A",
        fontFamily: "Roboto",
        textAlign: "center",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: "#64748B",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    // KYC Pending steps
    stepsWrap: {
        width: "100%",
        backgroundColor: "#F8FAFC",
        borderRadius: 16,
        padding: 16,
        gap: 12,
        marginBottom: 24,
    },
    stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    stepNum: {
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: "#F59E0B",
        alignItems: "center", justifyContent: "center",
    },
    stepNumText: { fontSize: 12, fontWeight: "700", color: "#fff" },
    stepText: { fontSize: 13, color: "#334155", fontFamily: Fonts.Regular, flex: 1 },
    // Progress track
    progressTrack: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        justifyContent: "center",
        marginBottom: 28,
        paddingHorizontal: 8,
    },
    progressStep: { alignItems: "center", gap: 6 },
    progressDot: {
        width: 28, height: 28, borderRadius: 14,
        borderWidth: 2,
        alignItems: "center", justifyContent: "center",
    },
    progressLabel: { fontSize: 11, fontFamily: Fonts.Medium, textAlign: "center" },
    progressLine: { flex: 1, height: 2, marginBottom: 18, marginHorizontal: 4 },
    // Buttons
    primaryBtn: {
        width: "100%",
        backgroundColor: "#D97706",
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        marginBottom: 12,
    },
    primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#fff", fontFamily: "Roboto" },
    ghostBtn: { paddingVertical: 10 },
    ghostBtnText: { fontSize: 14, color: "#94A3B8", fontFamily: Fonts.Regular },
});

// ─── Coupon Styles ────────────────────────────────────────────────────────────

const couponStyles = StyleSheet.create({
    card: {
        width: 220,
        backgroundColor: colors.formBg,
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: colors.formBorder,
        overflow: "hidden",
    },
    accentBar: {
        position: "absolute",
        left: 0, top: 0, bottom: 0,
        width: 4,
        borderTopLeftRadius: 14,
        borderBottomLeftRadius: 14,
    },
    top: { paddingLeft: 20, paddingRight: 16, paddingTop: 14, paddingBottom: 12 },
    bottom: { paddingLeft: 20, paddingRight: 16, paddingTop: 10, paddingBottom: 14 },
    badge: {
        alignSelf: "flex-start",
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginBottom: 4,
    },
    badgeText: { fontSize: 11, fontFamily: Fonts.Medium },
    discountVal: { fontSize: 28, fontFamily: Fonts.Medium, lineHeight: 32 },
    discountLabel: { fontSize: 15, color: colors.placeholder, fontFamily: Fonts.Regular },
    codeTag: {
        alignSelf: "flex-start",
        backgroundColor: colors.scaffoldBg,
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: colors.formBorder,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginTop: 4,
    },
    codeText: { fontSize: 13, fontFamily: Fonts.Medium, letterSpacing: 0.8 },
    dividerRow: { flexDirection: "row", alignItems: "center", height: 18 },
    notch: {
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: colors.scaffoldBg,
        borderWidth: 0.5, borderColor: colors.formBorder,
        marginHorizontal: -9,
    },
    dashedLine: {
        flex: 1,
        borderTopWidth: 1.5,
        borderColor: colors.formBorder,
        borderStyle: "dashed",
    },
    desc: { fontSize: 12, color: colors.placeholder, lineHeight: 17, marginTop: 4 },
    metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
    minOrder: { fontSize: 11, color: colors.placeholder, fontFamily: Fonts.Regular },
    dot: { width: 6, height: 6, borderRadius: 3 },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.scaffoldBg },
    scroll: { padding: 16, paddingBottom: 32 },
    couponList: { paddingBottom: 4, paddingRight: 4, marginBottom: 20 },

    // ── Greeting banner ───────────────────────────────────────────────────────
    banner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 18,
        marginBottom: 22,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    bannerLeft: { gap: 3 },
    bannerGreet: { fontSize: 13, color: colors.placeholder, fontFamily: Fonts.Regular },
    bannerName: {
        fontSize: 18, fontWeight: "700",
        color: colors.secondary, fontFamily: "Roboto",
        maxWidth: SCREEN_WIDTH * 0.6,
    },
    bannerAvatar: {
        width: 50, height: 50, borderRadius: 15,
        backgroundColor: colors.primary + "12",
        alignItems: "center", justifyContent: "center",
    },

    // ── Section heading ───────────────────────────────────────────────────────
    sectionHeading: {
        fontSize: 15, fontWeight: "700",
        color: colors.secondary, marginBottom: 14,
        fontFamily: "Roboto", letterSpacing: 0.2,
    },

    // ── Stat cards ────────────────────────────────────────────────────────────
    statGrid: {
        flexDirection: "row", flexWrap: "wrap",
        gap: 12, marginBottom: 24,
    },
    statCard: {
        width: "30%", flexGrow: 1,
        backgroundColor: "#fff", borderRadius: 16,
        paddingTop: 14, paddingHorizontal: 12, paddingBottom: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07, shadowRadius: 10,
        elevation: 4, overflow: "hidden", alignItems: "flex-start",
    },
    statIconWrap: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
        marginBottom: 10,
    },
    statCount: {
        fontSize: 26, fontWeight: "800",
        fontFamily: "Roboto", letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 12, color: colors.placeholder,
        fontFamily: "Roboto", fontWeight: "500",
        marginTop: 3, marginBottom: 12,
    },
    statAccent: {
        height: 3, borderRadius: 2,
        alignSelf: "stretch", marginHorizontal: -12, opacity: 0.7,
    },

    // ── Order cards ───────────────────────────────────────────────────────────
    grid: {
        flexDirection: "row", flexWrap: "wrap",
        justifyContent: "space-between", gap: 12,
    },
    card: {
        width: "47.5%", backgroundColor: "#fff",
        borderRadius: 16, paddingTop: 14,
        paddingHorizontal: 14, paddingBottom: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07, shadowRadius: 10,
        elevation: 4, overflow: "hidden",
    },
    cardTop: {
        flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", marginBottom: 8,
    },
    cardIconWrap: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
    cardTitle: {
        fontSize: 13, color: colors.placeholder,
        fontFamily: "Roboto", marginTop: 3,
        marginBottom: 12, fontWeight: "500",
    },
    cardAccent: {
        height: 3, borderRadius: 2,
        marginHorizontal: -14, opacity: 0.7,
    },
});