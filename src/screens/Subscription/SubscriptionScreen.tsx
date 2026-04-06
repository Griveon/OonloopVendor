// screens/Subscription/SubscriptionScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    TouchableWithoutFeedback,
    Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import AppBar from "../../components/utils/AppBar";
import { getRequest, postRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";
import { colors } from "../../constants/AppThem";
import RazorpayCheckout from "react-native-razorpay";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

type Currency = {
    _id: string;
    code: string;
    symbol: string;
    name: string;
};

type Plan = {
    _id: string;
    name: string;
    displayName: string;
    description: string;
    price: number;
    currency: Currency;
    billingCycle: string;
    isActive: boolean;
};

type PaymentCharges = {
    type: "flat" | "percentage";
    value: number;
};

type PaymentRules = {
    minAmount?: number;
    maxAmount?: number;
    allowedPincodes: string[];
    blockedPincodes: string[];
};

type PaymentMethod = {
    _id: string;
    name: string;
    type: "cod" | "online";
    charges: PaymentCharges;
    rules: PaymentRules;
    isActive: boolean;
    priority: number;
    providerConnectionId?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_FEATURES: Record<string, string[]> = {
    default: [
        "Access to all essential features",
        "Priority customer support",
        "Real-time order tracking",
        "Product & brand management",
        "Monthly billing — cancel anytime",
    ],
};

const getPlanFeatures = (planName: string) =>
    PLAN_FEATURES[planName] ?? PLAN_FEATURES.default;

const PLAN_PALETTES = [
    { bg: colors.primary, light: colors.primary + "14", badge: "#E0F2FE" },
    { bg: "#7C3AED", light: "#7C3AED14", badge: "#EDE9FE" },
    { bg: "#0F766E", light: "#0F766E14", badge: "#CCFBF1" },
    { bg: "#B45309", light: "#B4530914", badge: "#FEF3C7" },
];

const palette = (idx: number) => PLAN_PALETTES[idx % PLAN_PALETTES.length];

const calcFinalPrice = (price: number, method: PaymentMethod): number => {
    if (method.type === "cod") return price;
    if (method.charges.type === "flat") return price + method.charges.value;
    if (method.charges.type === "percentage")
        return price + (price * method.charges.value) / 100;
    return price;
};

const formatCharge = (charges: PaymentCharges): string => {
    if (charges.value === 0) return "Free";
    if (charges.type === "flat") return `+₹${charges.value}`;
    return `+${charges.value}%`;
};

// ─── Payment Method Icons ─────────────────────────────────────────────────────

const PM_ICON: Record<string, string> = {
    cod: "cash-outline",
    online: "card-outline",
};

// ─── Payment Bottom Sheet ─────────────────────────────────────────────────────

const PaymentSheet = ({
    plan,
    methods,
    onClose,
    onPay,
    paying,
}: {
    plan: Plan;
    methods: PaymentMethod[];
    onClose: () => void;
    onPay: (plan: Plan, method: PaymentMethod) => void;
    paying: boolean;
}) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [selected, setSelected] = useState<PaymentMethod | null>(
        methods.find((m) => m.priority === 1) ?? methods[0] ?? null
    );

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
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const close = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 220,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    const finalPrice = selected ? calcFinalPrice(plan.price, selected) : plan.price;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={close}>
                <Animated.View style={[sheetStyles.backdrop, { opacity: fadeAnim }]} />
            </TouchableWithoutFeedback>

            {/* Sheet */}
            <Animated.View
                style={[
                    sheetStyles.sheet,
                    {
                        transform: [{ translateY: slideAnim }],
                        paddingBottom: insets.bottom + 16,
                    },
                ]}
            >
                {/* Handle */}
                <View style={sheetStyles.handle} />

                {/* Header */}
                <View style={sheetStyles.header}>
                    <View>
                        <Text style={sheetStyles.headerTitle}>Select Payment Method</Text>
                        <Text style={sheetStyles.headerSub}>for {plan.displayName}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={close}
                        style={sheetStyles.closeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="close" size={18} color={colors.secondary} />
                    </TouchableOpacity>
                </View>

                {/* Plan summary pill */}
                <View style={sheetStyles.planPill}>
                    <Ionicons name="flash" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={sheetStyles.planPillText}>{plan.displayName}</Text>
                    <Text style={sheetStyles.planPillPrice}>
                        {plan.currency.symbol}{plan.price}
                        <Text style={sheetStyles.planPillCycle}>/{plan.billingCycle}</Text>
                    </Text>
                </View>

                {/* Payment Methods */}
                <Text style={sheetStyles.sectionLabel}>Payment Options</Text>

                {methods.map((method) => {
                    const isSelected = selected?._id === method._id;
                    const charge = formatCharge(method.charges);
                    return (
                        <TouchableOpacity
                            key={method._id}
                            style={[
                                sheetStyles.methodRow,
                                isSelected && sheetStyles.methodRowSelected,
                            ]}
                            onPress={() => setSelected(method)}
                            activeOpacity={0.75}
                        >
                            {/* Icon */}
                            <View
                                style={[
                                    sheetStyles.methodIcon,
                                    { backgroundColor: isSelected ? colors.primary + "14" : "#F1F5F9" },
                                ]}
                            >
                                <Ionicons
                                    name={PM_ICON[method.type] ?? "card-outline"}
                                    size={20}
                                    color={isSelected ? colors.primary : colors.placeholder}
                                />
                            </View>

                            {/* Info */}
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[sheetStyles.methodName, isSelected && { color: colors.primary }]}>
                                    {method.name}
                                </Text>
                                {method.rules.minAmount || method.rules.maxAmount ? (
                                    <Text style={sheetStyles.methodMeta}>
                                        {method.rules.minAmount && `Min ₹${method.rules.minAmount}`}
                                        {method.rules.minAmount && method.rules.maxAmount && " · "}
                                        {method.rules.maxAmount && `Max ₹${method.rules.maxAmount}`}
                                    </Text>
                                ) : null}
                            </View>

                            {/* Charge badge */}
                            <View
                                style={[
                                    sheetStyles.chargeBadge,
                                    { backgroundColor: charge === "Free" ? "#D1FAE5" : "#FEF3C7" },
                                ]}
                            >
                                <Text
                                    style={[
                                        sheetStyles.chargeBadgeText,
                                        { color: charge === "Free" ? "#065F46" : "#92400E" },
                                    ]}
                                >
                                    {charge}
                                </Text>
                            </View>

                            {/* Radio */}
                            <View style={[sheetStyles.radio, isSelected && sheetStyles.radioSelected]}>
                                {isSelected && <View style={sheetStyles.radioDot} />}
                            </View>
                        </TouchableOpacity>
                    );
                })}

                {/* Price breakdown */}
                {selected && selected.charges.value > 0 && (
                    <View style={sheetStyles.breakdown}>
                        <View style={sheetStyles.breakdownRow}>
                            <Text style={sheetStyles.breakdownLabel}>Plan price</Text>
                            <Text style={sheetStyles.breakdownValue}>
                                {plan.currency.symbol}{plan.price}
                            </Text>
                        </View>
                        <View style={sheetStyles.breakdownRow}>
                            <Text style={sheetStyles.breakdownLabel}>
                                {selected.name} charge ({formatCharge(selected.charges)})
                            </Text>
                            <Text style={sheetStyles.breakdownValue}>
                                +{plan.currency.symbol}{(finalPrice - plan.price).toFixed(2)}
                            </Text>
                        </View>
                        <View style={[sheetStyles.breakdownRow, sheetStyles.breakdownTotal]}>
                            <Text style={sheetStyles.breakdownTotalLabel}>Total</Text>
                            <Text style={[sheetStyles.breakdownTotalValue, { color: colors.primary }]}>
                                {plan.currency.symbol}{finalPrice.toFixed(2)}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Pay button */}
                <TouchableOpacity
                    style={[
                        sheetStyles.payBtn,
                        { backgroundColor: colors.primary },
                        (!selected || paying) && { opacity: 0.65 },
                    ]}
                    disabled={!selected || paying}
                    onPress={() => selected && onPay(plan, selected)}
                    activeOpacity={0.85}
                >
                    {paying ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="lock-closed-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={sheetStyles.payBtnText}>
                                Pay {plan.currency.symbol}{finalPrice.toFixed(2)} Securely
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Trust line */}
                <View style={sheetStyles.trustRow}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={colors.placeholder} style={{ marginRight: 4 }} />
                    <Text style={sheetStyles.trustText}>256-bit encrypted · Powered by Razorpay</Text>
                </View>
            </Animated.View>
        </View>
    );
};

const CycleBadge = ({ cycle, color }: { cycle: string; color: string }) => (
    <View style={[styles.cycleBadge, { backgroundColor: color }]}>
        <Text style={styles.cycleBadgeText}>
            {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
        </Text>
    </View>
);

const FeatureRow = ({ text, accent }: { text: string; accent: string }) => (
    <View style={styles.featureRow}>
        <View style={[styles.featureCheck, { backgroundColor: accent }]}>
            <Ionicons name="checkmark" size={12} color={accent.replace("14", "")} />
        </View>
        <Text style={styles.featureText}>{text}</Text>
    </View>
);

const PlanCard = ({
    plan,
    index,
    onSubscribePress,
}: {
    plan: Plan;
    index: number;
    onSubscribePress: (plan: Plan) => void;
}) => {
    const pal = palette(index);
    const features = getPlanFeatures(plan.name);
    const isPopular = index === 0;

    return (
        <View style={styles.cardWrapper}>
            {isPopular && (
                <View style={[styles.popularTag, { backgroundColor: pal.bg }]}>
                    <Ionicons name="star" size={11} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.popularTagText}>Most Popular</Text>
                </View>
            )}

            <View style={[styles.card, isPopular && { borderColor: pal.bg, borderWidth: 1.5 }]}>
                <View style={[styles.cardHeader, { backgroundColor: pal.light }]}>
                    <View style={styles.cardHeaderLeft}>
                        <View style={[styles.planIconWrap, { backgroundColor: pal.bg }]}>
                            <Ionicons name="flash" size={18} color="#fff" />
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.planDisplayName}>{plan.displayName}</Text>
                            <CycleBadge cycle={plan.billingCycle} color={pal.badge} />
                        </View>
                    </View>
                    <View style={styles.priceBlock}>
                        <Text style={[styles.priceSymbol, { color: pal.bg }]}>{plan.currency.symbol}</Text>
                        <Text style={[styles.priceAmount, { color: pal.bg }]}>{plan.price}</Text>
                    </View>
                </View>

                <Text style={styles.description}>{plan.description}</Text>
                <View style={styles.divider} />

                <View style={styles.featureList}>
                    {features.map((f, i) => (
                        <FeatureRow key={i} text={f} accent={pal.light} />
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.subscribeBtn, { backgroundColor: pal.bg }]}
                    activeOpacity={0.85}
                    onPress={() => onSubscribePress(plan)}
                >
                    <Text style={styles.subscribeBtnText}>Subscribe Now</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const RAZORPAY_KEY = "rzp_test_XXXXXXXXXXXXXXXX"; // 🔑 replace with your key

const SubscriptionScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [paying, setPaying] = useState(false);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        const [plansRes, methodsRes] = await Promise.all([
            getRequest(API_ENDPOINTS.PLANSGETALL),
            getRequest(API_ENDPOINTS.PAYMENTMETHODSGETALL),
        ]);
        setLoading(false);

        if (plansRes?.success) setPlans(plansRes.data);
        if (methodsRes?.success) {
            // sort by priority, keep only active
            const active = (methodsRes.data as PaymentMethod[])
                .filter((m) => m?.providerConnectionId)
                .sort((a, b) => a.priority - b.priority);
            setPaymentMethods(active);
        }
    };

    const handlePay = async (plan: Plan, method: PaymentMethod) => {
        if (method.type === "cod") {

            setPaying(true);
            const res = await postRequest("/subscriptions/create", {
                planId: plan._id,
                paymentMethodId: method._id,
                paymentType: "cod",
            });
            setPaying(false);

            if (res?.success) {
                setSelectedPlan(null);
                Toast.show({ type: "success", text1: "Subscribed!", text2: `You are now on ${plan.displayName}`, position: "top" });
            } else {
                Toast.show({ type: "error", text1: "Failed", text2: res?.message, position: "top" });
            }
            return;
        }

        // Online → Razorpay
        setPaying(true);

        // Step 1: create order on your backend
        const orderRes = await postRequest("/subscriptions/create-order", {
            planId: plan._id,
            paymentMethodId: method._id,
        });

        if (!orderRes?.success) {
            setPaying(false);
            Toast.show({ type: "error", text1: "Order creation failed", text2: orderRes?.message, position: "top" });
            return;
        }

        const { orderId, amount, currency } = orderRes.data;

        const options: any = {
            description: plan.displayName,
            currency: currency ?? plan.currency.code,
            key: RAZORPAY_KEY,
            amount: String(amount), // in paise
            order_id: orderId,
            name: "Your App Name",
            prefill: {
                email: "vendor@example.com", // TODO: pull from user store
                contact: "9999999999",
                name: "Vendor User",
            },
            theme: { color: colors.primary },
        };

        try {
            const paymentData = await RazorpayCheckout.open(options);

            // Step 2: verify on backend
            const verifyRes = await postRequest("/subscriptions/verify-payment", {
                razorpay_order_id: paymentData.razorpay_order_id,
                razorpay_payment_id: paymentData.razorpay_payment_id,
                razorpay_signature: paymentData.razorpay_signature,
                planId: plan._id,
            });

            setPaying(false);

            if (verifyRes?.success) {
                setSelectedPlan(null);
                Toast.show({ type: "success", text1: "Payment Successful 🎉", text2: `${plan.displayName} is now active!`, position: "top" });
            } else {
                Toast.show({ type: "error", text1: "Verification failed", text2: verifyRes?.message, position: "top" });
            }
        } catch (err: any) {
            setPaying(false);
            // User cancelled → code 0
            if (err?.code !== 0) {
                Toast.show({ type: "error", text1: "Payment failed", text2: err?.description ?? "Please try again.", position: "top" });
            }
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
            <AppBar title="Subscription Plans" onBack={() => navigation.goBack()} />

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Fetching plans...</Text>
                </View>
            ) : plans.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="receipt-outline" size={56} color={colors.placeholder} />
                    <Text style={styles.emptyTitle}>No Plans Available</Text>
                    <Text style={styles.emptySubtitle}>Check back later for subscription options.</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchAll}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.hero}>
                        <View style={styles.heroIconWrap}>
                            <Ionicons name="ribbon-outline" size={32} color={colors.primary} />
                        </View>
                        <Text style={styles.heroTitle}>Choose Your Plan</Text>
                        <Text style={styles.heroSubtitle}>
                            Unlock powerful tools to grow your vendor business
                        </Text>
                    </View>

                    {plans.map((plan, idx) => (
                        <PlanCard
                            key={plan._id}
                            plan={plan}
                            index={idx}
                            onSubscribePress={(p) => setSelectedPlan(p)}
                        />
                    ))}

                    <View style={styles.footerNote}>
                        <Ionicons name="lock-closed-outline" size={13} color={colors.placeholder} style={{ marginRight: 5 }} />
                        <Text style={styles.footerNoteText}>
                            Secure payment · Cancel anytime · No hidden charges
                        </Text>
                    </View>
                </ScrollView>
            )}

            {/* Payment bottom sheet */}
            {selectedPlan && (
                <PaymentSheet
                    plan={selectedPlan}
                    methods={paymentMethods}
                    onClose={() => setSelectedPlan(null)}
                    onPay={handlePay}
                    paying={paying}
                />
            )}
        </SafeAreaView>
    );
};

export default SubscriptionScreen;

const sheetStyles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheet: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 24,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#E2E8F0",
        alignSelf: "center",
        marginBottom: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 14,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: colors.secondary,
        fontFamily: "Roboto",
    },
    headerSub: {
        fontSize: 12.5,
        color: colors.placeholder,
        fontFamily: "Roboto",
        marginTop: 2,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
    },
    planPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.primary + "10",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        marginBottom: 18,
    },
    planPillText: {
        flex: 1,
        fontSize: 13,
        fontWeight: "600",
        color: colors.primary,
        fontFamily: "Roboto",
    },
    planPillPrice: {
        fontSize: 15,
        fontWeight: "800",
        color: colors.primary,
        fontFamily: "Roboto",
    },
    planPillCycle: {
        fontSize: 11,
        fontWeight: "400",
        color: colors.primary,
    },
    sectionLabel: {
        fontSize: 11.5,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
        color: colors.placeholder,
        fontFamily: "Roboto",
        marginBottom: 10,
    },
    methodRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        marginBottom: 10,
        backgroundColor: "#fff",
    },
    methodRowSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + "06",
    },
    methodIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    methodName: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.secondary,
        fontFamily: "Roboto",
    },
    methodMeta: {
        fontSize: 11.5,
        color: colors.placeholder,
        fontFamily: "Roboto",
        marginTop: 2,
    },
    chargeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginRight: 10,
    },
    chargeBadgeText: {
        fontSize: 11.5,
        fontWeight: "700",
        fontFamily: "Roboto",
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#CBD5E1",
        alignItems: "center",
        justifyContent: "center",
    },
    radioSelected: {
        borderColor: colors.primary,
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    breakdown: {
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
        gap: 8,
    },
    breakdownRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    breakdownLabel: {
        fontSize: 13,
        color: colors.placeholder,
        fontFamily: "Roboto",
    },
    breakdownValue: {
        fontSize: 13,
        color: colors.secondary,
        fontWeight: "500",
        fontFamily: "Roboto",
    },
    breakdownTotal: {
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
        paddingTop: 8,
        marginTop: 4,
    },
    breakdownTotalLabel: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.secondary,
        fontFamily: "Roboto",
    },
    breakdownTotalValue: {
        fontSize: 16,
        fontWeight: "800",
        fontFamily: "Roboto",
    },
    payBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 15,
        borderRadius: 14,
        marginBottom: 10,
    },
    payBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
        fontFamily: "Roboto",
    },
    trustRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    trustText: {
        fontSize: 11.5,
        color: colors.placeholder,
        fontFamily: "Roboto",
    },
});

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.scaffoldBg },
    scroll: { padding: 16 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
    loadingText: { marginTop: 12, fontSize: 14, color: colors.placeholder, fontFamily: "Roboto" },
    emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.secondary, fontFamily: "Roboto", marginTop: 8 },
    emptySubtitle: { fontSize: 13, color: colors.placeholder, fontFamily: "Roboto", textAlign: "center" },
    retryBtn: { marginTop: 12, paddingHorizontal: 28, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 24 },
    retryText: { color: "#fff", fontWeight: "700", fontFamily: "Roboto", fontSize: 14 },
    hero: { alignItems: "center", marginBottom: 24, paddingTop: 8, gap: 8 },
    heroIconWrap: { width: 68, height: 68, borderRadius: 22, backgroundColor: colors.primary + "14", alignItems: "center", justifyContent: "center", marginBottom: 4 },
    heroTitle: { fontSize: 22, fontWeight: "800", color: colors.secondary, fontFamily: "Roboto", letterSpacing: 0.2 },
    heroSubtitle: { fontSize: 13.5, color: colors.placeholder, fontFamily: "Roboto", textAlign: "center", lineHeight: 20, paddingHorizontal: 16 },
    cardWrapper: { marginBottom: 20 },
    popularTag: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderTopLeftRadius: 10, borderTopRightRadius: 10, marginLeft: 16 },
    popularTagText: { color: "#fff", fontSize: 11, fontWeight: "700", fontFamily: "Roboto" },
    card: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 5, borderWidth: 1, borderColor: "transparent" },
    cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, paddingHorizontal: 16 },
    cardHeaderLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
    planIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    planDisplayName: { fontSize: 15, fontWeight: "700", color: colors.secondary, fontFamily: "Roboto", marginBottom: 5 },
    cycleBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    cycleBadgeText: { fontSize: 11, fontWeight: "600", color: colors.secondary, fontFamily: "Roboto" },
    priceBlock: { flexDirection: "row", alignItems: "flex-start", marginLeft: 8 },
    priceSymbol: { fontSize: 16, fontWeight: "700", marginTop: 4, fontFamily: "Roboto" },
    priceAmount: { fontSize: 32, fontWeight: "800", fontFamily: "Roboto", letterSpacing: -1, lineHeight: 36 },
    description: { fontSize: 13, color: colors.placeholder, fontFamily: "Roboto", paddingHorizontal: 16, paddingTop: 14, lineHeight: 20 },
    divider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: 16, marginVertical: 14 },
    featureList: { paddingHorizontal: 16, gap: 10, marginBottom: 18 },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    featureCheck: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    featureText: { fontSize: 13, color: colors.secondary, fontFamily: "Roboto", flex: 1, lineHeight: 19 },
    subscribeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginHorizontal: 16, marginBottom: 16, paddingVertical: 14, borderRadius: 12 },
    subscribeBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", fontFamily: "Roboto", letterSpacing: 0.2 },
    footerNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 4, paddingBottom: 8 },
    footerNoteText: { fontSize: 12, color: colors.placeholder, fontFamily: "Roboto" },
});