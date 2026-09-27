// screens/Subscription/SubscriptionScreen.tsx

import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import RazorpayCheckout from "react-native-razorpay";

import AppBar from "../../components/utils/AppBar";
import { getUserData } from "../../components/AsyncStorage/AsyncStorage";
import { getRequest, postRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";
import { colors } from "../../constants/AppThem";

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

type UserSubscription = {
    _id: string;
    user: string;
    plan: string;
    status: "active" | "inactive" | "expired" | "cancelled";
    startDate: string;
    endDate: string;
    billingCycle: string;
    autoRenew: boolean;
    features: string[];
    paymentTransactionId: string;
    externalPaymentId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
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

const palette = (idx: number) =>
    PLAN_PALETTES[idx % PLAN_PALETTES.length];

const calcFinalPrice = (
    price: number,
    method: PaymentMethod
): number => {
    if (method.type === "cod") return price;

    if (method.charges.type === "flat") {
        return price + method.charges.value;
    }

    if (method.charges.type === "percentage") {
        return price + (price * method.charges.value) / 100;
    }

    return price;
};

const formatCharge = (charges: PaymentCharges): string => {
    if (charges.value === 0) return "Free";
    if (charges.type === "flat") return `+₹${charges.value}`;

    return `+${charges.value}%`;
};

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const getDaysRemaining = (endDateStr: string): number => {
    const now = new Date();
    const end = new Date(endDateStr);
    const diff = end.getTime() - now.getTime();

    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const getEntityId = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value?._id) return String(value._id);

    return String(value);
};

const sleep = (milliseconds: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const verifySubscriptionPaymentWithRetry = async (payload: any) => {
    const delays = [0, 1200, 2500, 5000];
    let lastResponse: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < delays.length; attempt += 1) {
        if (delays[attempt] > 0) {
            await sleep(delays[attempt]);
        }

        try {
            const response = await postRequest(
                API_ENDPOINTS.PAYMENTTRANSACTIONVERIFY,
                payload
            );

            lastResponse = response;

            if (response?.success) {
                return response;
            }
        } catch (error: any) {
            lastError = error;

            console.log(
                `Subscription verification attempt ${attempt + 1} failed:`,
                error?.message || error
            );
        }
    }

    if (lastResponse) {
        return lastResponse;
    }

    throw lastError || new Error("Unable to verify subscription payment");
};

// ─── Payment Method Icons ─────────────────────────────────────────────────────

const PM_ICON: Record<string, string> = {
    cod: "cash-outline",
    online: "card-outline",
};

// ─── Active Subscription Banner ───────────────────────────────────────────────

const ActiveSubscriptionBanner = ({
    subscription,
    plan,
}: {
    subscription: UserSubscription;
    plan: Plan | undefined;
}) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const daysLeft = getDaysRemaining(subscription.endDate);
    const isExpiringSoon = daysLeft <= 7;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
                    duration: 900,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 900,
                    useNativeDriver: true,
                }),
            ])
        );

        pulse.start();

        return () => pulse.stop();
    }, []);

    return (
        <View style={bannerStyles.wrapper}>
            <View style={bannerStyles.bgLayer1} />
            <View style={bannerStyles.bgLayer2} />

            <View style={bannerStyles.topRow}>
                <View style={bannerStyles.activeDotWrap}>
                    <Animated.View
                        style={[
                            bannerStyles.activeDotPulse,
                            {
                                transform: [
                                    { scale: pulseAnim },
                                ],
                            },
                        ]}
                    />
                    <View style={bannerStyles.activeDot} />
                </View>

                <Text style={bannerStyles.activeLabel}>
                    ACTIVE PLAN
                </Text>

                <View style={bannerStyles.autoRenewBadge}>
                    <Ionicons
                        name="refresh-outline"
                        size={10}
                        color="#fff"
                        style={{ marginRight: 3 }}
                    />
                    <Text style={bannerStyles.autoRenewText}>
                        Auto-Renew
                    </Text>
                </View>
            </View>

            <View style={bannerStyles.mainRow}>
                <View style={{ flex: 1 }}>
                    <Text style={bannerStyles.planName}>
                        {plan?.displayName ?? "Subscription Plan"}
                    </Text>

                    <Text style={bannerStyles.billingCycle}>
                        {subscription.billingCycle.charAt(0).toUpperCase() +
                            subscription.billingCycle.slice(1)}{" "}
                        Billing
                    </Text>
                </View>

                {plan && (
                    <View style={bannerStyles.priceWrap}>
                        <Text style={bannerStyles.priceSymbol}>
                            {plan.currency.symbol}
                        </Text>

                        <Text style={bannerStyles.priceAmount}>
                            {plan.price}
                        </Text>

                        <Text style={bannerStyles.pricePeriod}>
                            /mo
                        </Text>
                    </View>
                )}
            </View>

            <View style={bannerStyles.divider} />

            <View style={bannerStyles.datesRow}>
                <View style={bannerStyles.dateItem}>
                    <Ionicons
                        name="calendar-outline"
                        size={13}
                        color="rgba(255,255,255,0.7)"
                    />

                    <View style={{ marginLeft: 6 }}>
                        <Text style={bannerStyles.dateLabel}>
                            Started
                        </Text>
                        <Text style={bannerStyles.dateValue}>
                            {formatDate(subscription.startDate)}
                        </Text>
                    </View>
                </View>

                <View style={bannerStyles.dateSep} />

                <View style={bannerStyles.dateItem}>
                    <Ionicons
                        name="time-outline"
                        size={13}
                        color="rgba(255,255,255,0.7)"
                    />

                    <View style={{ marginLeft: 6 }}>
                        <Text style={bannerStyles.dateLabel}>
                            Renews
                        </Text>
                        <Text style={bannerStyles.dateValue}>
                            {formatDate(subscription.endDate)}
                        </Text>
                    </View>
                </View>

                <View style={bannerStyles.dateSep} />

                <View style={bannerStyles.dateItem}>
                    <Ionicons
                        name="hourglass-outline"
                        size={13}
                        color={
                            isExpiringSoon
                                ? "#FCD34D"
                                : "rgba(255,255,255,0.7)"
                        }
                    />

                    <View style={{ marginLeft: 6 }}>
                        <Text style={bannerStyles.dateLabel}>
                            Remaining
                        </Text>

                        <Text
                            style={[
                                bannerStyles.dateValue,
                                isExpiringSoon && {
                                    color: "#FCD34D",
                                    fontWeight: "700",
                                },
                            ]}
                        >
                            {daysLeft} days
                        </Text>
                    </View>
                </View>
            </View>

            <View style={bannerStyles.chipRow}>
                <View style={bannerStyles.chip}>
                    <Ionicons
                        name="shield-checkmark"
                        size={12}
                        color={colors.primary}
                        style={{ marginRight: 4 }}
                    />
                    <Text style={bannerStyles.chipText}>
                        Protected & Secure
                    </Text>
                </View>

                <View style={bannerStyles.chip}>
                    <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color="#10B981"
                        style={{ marginRight: 4 }}
                    />
                    <Text
                        style={[
                            bannerStyles.chipText,
                            { color: "#10B981" },
                        ]}
                    >
                        All features unlocked
                    </Text>
                </View>
            </View>
        </View>
    );
};

// ─── Payment Bottom Sheet ─────────────────────────────────────────────────────

const GST_RATE = 0.18;

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
    const slideAnim = useRef(
        new Animated.Value(SCREEN_HEIGHT)
    ).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const [selected, setSelected] =
        useState<PaymentMethod | null>(methods[0] ?? null);

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

    const gstAmount = plan.price * GST_RATE;
    const finalPrice = plan.price + gstAmount;

    return (
        <View
            style={StyleSheet.absoluteFill}
            pointerEvents="box-none"
        >
            <TouchableWithoutFeedback onPress={close}>
                <Animated.View
                    style={[
                        sheetStyles.backdrop,
                        { opacity: fadeAnim },
                    ]}
                />
            </TouchableWithoutFeedback>

            <Animated.View
                style={[
                    sheetStyles.sheet,
                    {
                        transform: [
                            { translateY: slideAnim },
                        ],
                        paddingBottom: insets.bottom + 16,
                    },
                ]}
            >
                <View style={sheetStyles.handle} />

                <View style={sheetStyles.header}>
                    <View>
                        <Text style={sheetStyles.headerTitle}>
                            Select Payment Method
                        </Text>
                        <Text style={sheetStyles.headerSub}>
                            for {plan.displayName}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={close}
                        style={sheetStyles.closeBtn}
                    >
                        <Ionicons
                            name="close"
                            size={18}
                            color={colors.secondary}
                        />
                    </TouchableOpacity>
                </View>

                <View style={sheetStyles.planPill}>
                    <Ionicons
                        name="flash"
                        size={14}
                        color={colors.primary}
                        style={{ marginRight: 6 }}
                    />

                    <Text style={sheetStyles.planPillText}>
                        {plan.displayName}
                    </Text>

                    <Text style={sheetStyles.planPillPrice}>
                        {plan.currency.symbol}
                        {plan.price}
                        <Text style={{ fontSize: 10 }}>
                            {" "}
                            +18% GST
                        </Text>
                    </Text>
                </View>

                <Text style={sheetStyles.sectionLabel}>
                    Payment Options
                </Text>

                {methods.map((method) => {
                    const isSelected =
                        selected?._id === method._id;

                    return (
                        <TouchableOpacity
                            key={method._id}
                            style={[
                                sheetStyles.methodRow,
                                isSelected &&
                                sheetStyles.methodRowSelected,
                            ]}
                            onPress={() =>
                                setSelected(method)
                            }
                            activeOpacity={0.75}
                        >
                            <View
                                style={[
                                    sheetStyles.methodIcon,
                                    {
                                        backgroundColor:
                                            isSelected
                                                ? colors.primary +
                                                "14"
                                                : "#F1F5F9",
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={
                                        PM_ICON[
                                        method.type
                                        ] ?? "card-outline"
                                    }
                                    size={20}
                                    color={
                                        isSelected
                                            ? colors.primary
                                            : colors.placeholder
                                    }
                                />
                            </View>

                            <View
                                style={{
                                    flex: 1,
                                    marginLeft: 12,
                                }}
                            >
                                <Text
                                    style={[
                                        sheetStyles.methodName,
                                        isSelected && {
                                            color: colors.primary,
                                        },
                                    ]}
                                >
                                    {method.name}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}

                <View style={sheetStyles.breakdown}>
                    <View style={sheetStyles.breakdownRow}>
                        <Text
                            style={
                                sheetStyles.breakdownLabel
                            }
                        >
                            Plan price
                        </Text>
                        <Text
                            style={
                                sheetStyles.breakdownValue
                            }
                        >
                            {plan.currency.symbol}
                            {plan.price}
                        </Text>
                    </View>

                    <View style={sheetStyles.breakdownRow}>
                        <Text
                            style={
                                sheetStyles.breakdownLabel
                            }
                        >
                            GST (18%)
                        </Text>
                        <Text
                            style={
                                sheetStyles.breakdownValue
                            }
                        >
                            +{plan.currency.symbol}
                            {gstAmount.toFixed(2)}
                        </Text>
                    </View>

                    <View
                        style={[
                            sheetStyles.breakdownRow,
                            sheetStyles.breakdownTotal,
                        ]}
                    >
                        <Text
                            style={
                                sheetStyles.breakdownTotalLabel
                            }
                        >
                            Total
                        </Text>

                        <Text
                            style={[
                                sheetStyles.breakdownTotalValue,
                                { color: colors.primary },
                            ]}
                        >
                            {plan.currency.symbol}
                            {finalPrice.toFixed(2)}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[
                        sheetStyles.payBtn,
                        {
                            backgroundColor:
                                colors.primary,
                        },
                        (!selected || paying) && {
                            opacity: 0.65,
                        },
                    ]}
                    disabled={!selected || paying}
                    onPress={() =>
                        selected &&
                        onPay(plan, selected)
                    }
                >
                    {paying ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons
                                name="lock-closed-outline"
                                size={16}
                                color="#fff"
                                style={{ marginRight: 8 }}
                            />
                            <Text
                                style={
                                    sheetStyles.payBtnText
                                }
                            >
                                Pay {plan.currency.symbol}
                                {finalPrice.toFixed(2)}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={sheetStyles.trustRow}>
                    <Ionicons
                        name="shield-checkmark-outline"
                        size={13}
                        color={colors.placeholder}
                    />
                    <Text style={sheetStyles.trustText}>
                        {" "}
                        256-bit encrypted · Powered by
                        Razorpay
                    </Text>
                </View>
            </Animated.View>
        </View>
    );
};

// ─── Plan Components ──────────────────────────────────────────────────────────

const CycleBadge = ({
    cycle,
    color,
}: {
    cycle: string;
    color: string;
}) => (
    <View
        style={[
            styles.cycleBadge,
            { backgroundColor: color },
        ]}
    >
        <Text style={styles.cycleBadgeText}>
            {cycle.charAt(0).toUpperCase() +
                cycle.slice(1)}
        </Text>
    </View>
);

const FeatureRow = ({
    text,
    accent,
}: {
    text: string;
    accent: string;
}) => (
    <View style={styles.featureRow}>
        <View
            style={[
                styles.featureCheck,
                { backgroundColor: accent },
            ]}
        >
            <Ionicons
                name="checkmark"
                size={12}
                color={accent.replace("14", "")}
            />
        </View>

        <Text style={styles.featureText}>
            {text}
        </Text>
    </View>
);

const PlanCard = ({
    plan,
    index,
    onSubscribePress,
    isCurrentPlan,
}: {
    plan: Plan;
    index: number;
    onSubscribePress: (plan: Plan) => void;
    isCurrentPlan: boolean;
}) => {
    const pal = palette(index);
    const features = getPlanFeatures(plan.name);
    const isPopular = index === 0;

    return (
        <View style={styles.cardWrapper}>
            {isPopular && !isCurrentPlan && (
                <View
                    style={[
                        styles.popularTag,
                        { backgroundColor: pal.bg },
                    ]}
                >
                    <Ionicons
                        name="star"
                        size={11}
                        color="#fff"
                        style={{ marginRight: 4 }}
                    />
                    <Text style={styles.popularTagText}>
                        Most Popular
                    </Text>
                </View>
            )}

            {isCurrentPlan && (
                <View
                    style={[
                        styles.popularTag,
                        {
                            backgroundColor: "#10B981",
                        },
                    ]}
                >
                    <Ionicons
                        name="checkmark-circle"
                        size={11}
                        color="#fff"
                        style={{ marginRight: 4 }}
                    />
                    <Text style={styles.popularTagText}>
                        Your Current Plan
                    </Text>
                </View>
            )}

            <View
                style={[
                    styles.card,
                    isCurrentPlan
                        ? {
                            borderColor: "#10B981",
                            borderWidth: 2,
                        }
                        : isPopular
                            ? {
                                borderColor: pal.bg,
                                borderWidth: 1.5,
                            }
                            : {},
                ]}
            >
                <View
                    style={[
                        styles.cardHeader,
                        {
                            backgroundColor:
                                isCurrentPlan
                                    ? "#10B98114"
                                    : pal.light,
                        },
                    ]}
                >
                    <View
                        style={
                            styles.cardHeaderLeft
                        }
                    >
                        <View
                            style={[
                                styles.planIconWrap,
                                {
                                    backgroundColor:
                                        isCurrentPlan
                                            ? "#10B981"
                                            : pal.bg,
                                },
                            ]}
                        >
                            <Ionicons
                                name={
                                    isCurrentPlan
                                        ? "checkmark"
                                        : "flash"
                                }
                                size={18}
                                color="#fff"
                            />
                        </View>

                        <View
                            style={{
                                marginLeft: 12,
                                flex: 1,
                            }}
                        >
                            <Text
                                style={
                                    styles.planDisplayName
                                }
                            >
                                {plan.displayName}
                            </Text>

                            <CycleBadge
                                cycle={
                                    plan.billingCycle
                                }
                                color={
                                    isCurrentPlan
                                        ? "#D1FAE5"
                                        : pal.badge
                                }
                            />
                        </View>
                    </View>

                    <View style={styles.priceBlock}>
                        <Text
                            style={[
                                styles.priceSymbol,
                                {
                                    color:
                                        isCurrentPlan
                                            ? "#10B981"
                                            : pal.bg,
                                },
                            ]}
                        >
                            {plan.currency.symbol}
                        </Text>

                        <Text
                            style={[
                                styles.priceAmount,
                                {
                                    color:
                                        isCurrentPlan
                                            ? "#10B981"
                                            : pal.bg,
                                },
                            ]}
                        >
                            {plan.price}
                        </Text>

                        <Text
                            style={{
                                fontSize: 12,
                                marginLeft: 4,
                                alignSelf: "flex-end",
                                color: isCurrentPlan
                                    ? "#10B981"
                                    : pal.bg,
                            }}
                        >
                            +18%
                        </Text>
                    </View>
                </View>

                <Text style={styles.description}>
                    {plan.description}
                </Text>

                <View style={styles.divider} />

                <View style={styles.featureList}>
                    {features.map((feature, index) => (
                        <FeatureRow
                            key={index}
                            text={feature}
                            accent={
                                isCurrentPlan
                                    ? "#10B98114"
                                    : pal.light
                            }
                        />
                    ))}
                </View>

                {isCurrentPlan ? (
                    <View
                        style={[
                            styles.activePlanBtn,
                            {
                                borderColor: "#10B981",
                            },
                        ]}
                    >
                        <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#10B981"
                            style={{ marginRight: 8 }}
                        />

                        <Text
                            style={[
                                styles.activePlanBtnText,
                                {
                                    color: "#10B981",
                                },
                            ]}
                        >
                            Currently Active
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[
                            styles.subscribeBtn,
                            {
                                backgroundColor:
                                    pal.bg,
                            },
                        ]}
                        activeOpacity={0.85}
                        onPress={() =>
                            onSubscribePress(plan)
                        }
                    >
                        <Text
                            style={
                                styles.subscribeBtnText
                            }
                        >
                            Subscribe Now
                        </Text>

                        <Ionicons
                            name="arrow-forward"
                            size={16}
                            color="#fff"
                            style={{ marginLeft: 8 }}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const GST_RATE_CONST = 0.18;

const getFinalAmount = (price: number) => {
    const gst = price * GST_RATE_CONST;

    return price + gst;
};

const SubscriptionScreen = ({
    navigation,
}: any) => {
    const insets = useSafeAreaInsets();

    const [plans, setPlans] =
        useState<Plan[]>([]);
    const [
        userSubscription,
        setUserSubscription,
    ] = useState<UserSubscription | null>(null);
    const [
        paymentMethods,
        setPaymentMethods,
    ] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] =
        useState(true);
    const [
        selectedPlan,
        setSelectedPlan,
    ] = useState<Plan | null>(null);
    const [paying, setPaying] =
        useState(false);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            setLoading(true);

            const { user } =
                await getUserData();
            const sessionUser =
                user?.user || user;
            const userId =
                sessionUser?._id;

            if (!userId) {
                setUserSubscription(null);
                setPlans([]);
                setPaymentMethods([]);

                Toast.show({
                    type: "error",
                    text1: "Session expired",
                    text2: "Please login again.",
                    position: "top",
                });

                return;
            }

            const [
                subscriptionRes,
                plansRes,
                methodsRes,
            ] = await Promise.all([
                getRequest(
                    `${API_ENDPOINTS.VENDORSUBSCRIPTIONGETBYUSER}/${userId}`,
                    undefined,
                    true,
                    false
                ),
                getRequest(
                    API_ENDPOINTS.PLANSGETALL
                ),
                getRequest(
                    API_ENDPOINTS.PAYMENTMETHODSGETALL
                ),
            ]);

            if (
                subscriptionRes?.success &&
                subscriptionRes?.data
            ) {
                const subscriptionData =
                    subscriptionRes.data;

                if (
                    Array.isArray(
                        subscriptionData
                    )
                ) {
                    const activeSubscription =
                        subscriptionData.find(
                            (
                                subscription: UserSubscription
                            ) =>
                                subscription?.isActive &&
                                subscription?.status ===
                                "active"
                        );

                    setUserSubscription(
                        activeSubscription ??
                        null
                    );
                } else {
                    setUserSubscription(
                        subscriptionData?.isActive &&
                            subscriptionData?.status ===
                            "active"
                            ? subscriptionData
                            : null
                    );
                }
            } else {
                setUserSubscription(null);
            }

            if (plansRes?.success) {
                const activePlans = (
                    plansRes?.data ?? []
                ).filter(
                    (plan: Plan) =>
                        plan?.isActive !== false
                );

                setPlans(activePlans);
            } else {
                setPlans([]);
            }

            if (methodsRes?.success) {
                const activeOnlineMethods =
                    (
                        methodsRes.data as PaymentMethod[]
                    )
                        .filter(
                            (method) =>
                                method?.isActive &&
                                method?.type ===
                                "online" &&
                                Boolean(
                                    method?.providerConnectionId
                                )
                        )
                        .sort(
                            (a, b) =>
                                a.priority -
                                b.priority
                        );

                setPaymentMethods(
                    activeOnlineMethods
                );
            } else {
                setPaymentMethods([]);
            }
        } catch (error) {
            console.error(
                "Subscription fetch error:",
                error
            );
        } finally {
            setLoading(false);
        }
    };

    const handlePay = async (
        plan: Plan,
        method: PaymentMethod
    ) => {
        if (paying) return;

        if (
            method.type !== "online" ||
            !method.providerConnectionId
        ) {
            Toast.show({
                type: "error",
                text1: "Payment unavailable",
                text2:
                    "Please select a valid online payment method.",
                position: "top",
            });

            return;
        }

        if (
            userSubscription &&
            getEntityId(
                userSubscription.plan
            ) === String(plan._id)
        ) {
            Toast.show({
                type: "info",
                text1: "Already subscribed",
                text2: `${plan.displayName} is already active.`,
                position: "top",
            });

            return;
        }

        setPaying(true);

        try {
            const { user } =
                await getUserData();
            const sessionUser =
                user?.user || user;
            const userId =
                sessionUser?._id;

            if (!userId) {
                Toast.show({
                    type: "error",
                    text1: "Session expired",
                    text2: "Please login again.",
                    position: "top",
                });

                return;
            }

            // Kept in the request for backward compatibility with your current
            // Zod schema. The backend now recalculates this from the plan and
            // does not trust this client value.
            const finalAmount =
                getFinalAmount(plan.price);
            const amountInPaise =
                Math.round(
                    finalAmount * 100
                );

            const orderRes =
                await postRequest(
                    API_ENDPOINTS.PAYMENTTRANSACTIONCREATE,
                    {
                        paymentMethod:
                            method._id,
                        providerConnection:
                            method.providerConnectionId,
                        amount: amountInPaise,
                        currency:
                            plan.currency
                                ?.code || "INR",
                        userId,
                        planId: plan._id,
                    }
                );

            if (!orderRes?.success) {
                Toast.show({
                    type: "error",
                    text1:
                        "Order creation failed",
                    text2:
                        orderRes?.message ||
                        "Unable to start subscription payment.",
                    position: "top",
                });

                return;
            }

            const {
                orderId,
                amount,
                currency,
                key,
                transactionId,
            } = orderRes?.data || {};

            if (
                !orderId ||
                !amount ||
                !key ||
                !transactionId
            ) {
                Toast.show({
                    type: "error",
                    text1:
                        "Payment unavailable",
                    text2:
                        "Invalid payment order received from server.",
                    position: "top",
                });

                return;
            }

            const fullName =
                sessionUser?.name ||
                [
                    sessionUser?.firstName,
                    sessionUser?.lastName,
                ]
                    .filter(Boolean)
                    .join(" ") ||
                "Vendor User";

            const options: any = {
                description: `${plan.displayName} subscription`,
                currency:
                    currency ?? "INR",
                key,
                amount: String(amount),
                order_id: orderId,
                name: "Oonloop",
                prefill: {
                    email:
                        sessionUser?.email ||
                        "",
                    contact:
                        sessionUser?.mobileNumber ||
                        sessionUser?.phone ||
                        sessionUser?.mobile ||
                        "",
                    name: fullName,
                },
                notes: {
                    planId: String(
                        plan._id
                    ),
                    userId:
                        String(userId),
                },
                theme: {
                    color: colors.primary,
                },
            };

            let paymentData: any;

            try {
                paymentData =
                    await RazorpayCheckout.open(
                        options
                    );
            } catch (error: any) {
                if (error?.code === 0) {
                    Toast.show({
                        type: "info",
                        text1:
                            "Payment cancelled",
                        text2:
                            "No subscription changes were made.",
                        position: "top",
                    });
                } else {
                    Toast.show({
                        type: "error",
                        text1:
                            "Payment failed",
                        text2:
                            error?.description ||
                            error?.message ||
                            "Please try again.",
                        position: "top",
                    });
                }

                return;
            }

            // Razorpay has returned a successful payment callback. From this
            // point onward, a temporary verification/network error must not be
            // shown as a failed payment because that can make users pay twice.
            const verificationPayload = {
                transactionId,
                razorpay_order_id:
                    paymentData.razorpay_order_id,
                razorpay_payment_id:
                    paymentData.razorpay_payment_id,
                razorpay_signature:
                    paymentData.razorpay_signature,
            };

            try {
                const verifyRes =
                    await verifySubscriptionPaymentWithRetry(
                        verificationPayload
                    );

                if (verifyRes?.success) {
                    setSelectedPlan(null);

                    await fetchAll();

                    Toast.show({
                        type: "success",
                        text1:
                            "Payment Successful 🎉",
                        text2: `${plan.displayName} is now active!`,
                        position: "top",
                    });
                } else {
                    setSelectedPlan(null);

                    Toast.show({
                        type: "info",
                        text1:
                            "Payment confirmation pending",
                        text2:
                            verifyRes?.message ||
                            "Your payment may already be successful. Please do not pay again.",
                        position: "top",
                        visibilityTime: 5000,
                    });
                }
            } catch (
            verificationError: any
            ) {
                console.error(
                    "Subscription payment verification error:",
                    verificationError?.message ||
                    verificationError
                );

                setSelectedPlan(null);

                Toast.show({
                    type: "info",
                    text1:
                        "Payment confirmation pending",
                    text2:
                        "Your payment was completed. Please do not pay again. We are confirming it with Razorpay.",
                    position: "top",
                    visibilityTime: 5000,
                });
            }
        } catch (error: any) {
            console.error(
                "Subscription payment error:",
                error?.message || error
            );

            Toast.show({
                type: "error",
                text1:
                    "Unable to start payment",
                text2:
                    error?.message ||
                    "Please try again.",
                position: "top",
            });
        } finally {
            setPaying(false);
        }
    };

    const activePlan =
        userSubscription
            ? plans.find(
                (plan) =>
                    plan._id ===
                    getEntityId(
                        userSubscription.plan
                    )
            )
            : undefined;

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={["bottom"]}
        >
            <AppBar
                title="Subscription Plans"
                onBack={() =>
                    navigation.goBack()
                }
            />

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator
                        size="large"
                        color={colors.primary}
                    />
                    <Text
                        style={
                            styles.loadingText
                        }
                    >
                        Fetching plans...
                    </Text>
                </View>
            ) : plans.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons
                        name="receipt-outline"
                        size={56}
                        color={
                            colors.placeholder
                        }
                    />

                    <Text
                        style={
                            styles.emptyTitle
                        }
                    >
                        No Plans Available
                    </Text>

                    <Text
                        style={
                            styles.emptySubtitle
                        }
                    >
                        Check back later for
                        subscription options.
                    </Text>

                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={fetchAll}
                    >
                        <Text
                            style={
                                styles.retryText
                            }
                        >
                            Retry
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[
                        styles.scroll,
                        {
                            paddingBottom:
                                insets.bottom +
                                32,
                        },
                    ]}
                    showsVerticalScrollIndicator={
                        false
                    }
                >
                    {userSubscription && (
                        <ActiveSubscriptionBanner
                            subscription={
                                userSubscription
                            }
                            plan={activePlan}
                        />
                    )}

                    <View style={styles.hero}>
                        <View
                            style={
                                styles.heroIconWrap
                            }
                        >
                            <Ionicons
                                name="ribbon-outline"
                                size={32}
                                color={
                                    colors.primary
                                }
                            />
                        </View>

                        <Text
                            style={
                                styles.heroTitle
                            }
                        >
                            {userSubscription
                                ? "Manage Your Plan"
                                : "Choose Your Plan"}
                        </Text>

                        <Text
                            style={
                                styles.heroSubtitle
                            }
                        >
                            {userSubscription
                                ? "View your current plan or explore other options"
                                : "Unlock powerful tools to grow your vendor business"}
                        </Text>
                    </View>

                    {plans.map(
                        (plan, idx) => (
                            <PlanCard
                                key={
                                    plan._id
                                }
                                plan={plan}
                                index={idx}
                                onSubscribePress={(
                                    selectedPlan
                                ) =>
                                    setSelectedPlan(
                                        selectedPlan
                                    )
                                }
                                isCurrentPlan={
                                    userSubscription?.isActive ===
                                    true &&
                                    getEntityId(
                                        userSubscription?.plan
                                    ) ===
                                    plan._id
                                }
                            />
                        )
                    )}

                    <View
                        style={
                            styles.footerNote
                        }
                    >
                        <Ionicons
                            name="lock-closed-outline"
                            size={13}
                            color={
                                colors.placeholder
                            }
                            style={{
                                marginRight: 5,
                            }}
                        />

                        <Text
                            style={
                                styles.footerNoteText
                            }
                        >
                            Secure payment ·
                            Cancel anytime · No
                            hidden charges
                        </Text>
                    </View>
                </ScrollView>
            )}

            {selectedPlan && (
                <PaymentSheet
                    plan={selectedPlan}
                    methods={paymentMethods}
                    onClose={() =>
                        setSelectedPlan(null)
                    }
                    onPay={handlePay}
                    paying={paying}
                />
            )}
        </SafeAreaView>
    );
};

export default SubscriptionScreen;

// ─── Banner Styles ────────────────────────────────────────────────────────────

const bannerStyles = StyleSheet.create({
    wrapper: {
        marginBottom: 20,
        borderRadius: 20,
        padding: 18,
        backgroundColor: colors.primary,
        overflow: "hidden",
        shadowColor: colors.primary,
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: 10,
    },

    bgLayer1: {
        position: "absolute",
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor:
            "rgba(255,255,255,0.08)",
    },

    bgLayer2: {
        position: "absolute",
        bottom: -40,
        left: -20,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor:
            "rgba(255,255,255,0.05)",
    },

    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
        gap: 8,
    },

    activeDotWrap: {
        width: 14,
        height: 14,
        alignItems: "center",
        justifyContent: "center",
    },

    activeDotPulse: {
        position: "absolute",
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor:
            "rgba(74, 222, 128, 0.35)",
    },

    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#4ADE80",
    },

    activeLabel: {
        flex: 1,
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 1.5,
        color: "rgba(255,255,255,0.8)",
        fontFamily: "Roboto",
    },

    autoRenewBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor:
            "rgba(255,255,255,0.15)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
    },

    autoRenewText: {
        fontSize: 10,
        color: "#fff",
        fontWeight: "600",
        fontFamily: "Roboto",
    },

    mainRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
    },

    planName: {
        fontSize: 20,
        fontWeight: "800",
        color: "#fff",
        fontFamily: "Roboto",
        letterSpacing: 0.2,
    },

    billingCycle: {
        fontSize: 12,
        color: "rgba(255,255,255,0.65)",
        fontFamily: "Roboto",
        marginTop: 3,
    },

    priceWrap: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor:
            "rgba(255,255,255,0.15)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },

    priceSymbol: {
        fontSize: 14,
        fontWeight: "700",
        color: "#fff",
        marginTop: 4,
        fontFamily: "Roboto",
    },

    priceAmount: {
        fontSize: 28,
        fontWeight: "800",
        color: "#fff",
        fontFamily: "Roboto",
        lineHeight: 32,
    },

    pricePeriod: {
        fontSize: 11,
        color: "rgba(255,255,255,0.7)",
        fontFamily: "Roboto",
        alignSelf: "flex-end",
        marginBottom: 3,
        marginLeft: 2,
    },

    divider: {
        height: 1,
        backgroundColor:
            "rgba(255,255,255,0.15)",
        marginBottom: 14,
    },

    datesRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
    },

    dateItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },

    dateSep: {
        width: 1,
        height: 30,
        backgroundColor:
            "rgba(255,255,255,0.2)",
        marginHorizontal: 8,
    },

    dateLabel: {
        fontSize: 10,
        color: "rgba(255,255,255,0.6)",
        fontFamily: "Roboto",
        marginBottom: 2,
    },

    dateValue: {
        fontSize: 12,
        fontWeight: "700",
        color: "#fff",
        fontFamily: "Roboto",
    },

    chipRow: {
        flexDirection: "row",
        gap: 8,
        flexWrap: "wrap",
    },

    chip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },

    chipText: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.primary,
        fontFamily: "Roboto",
    },
});

// ─── Sheet Styles ─────────────────────────────────────────────────────────────

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
        shadowOffset: {
            width: 0,
            height: -6,
        },
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
        backgroundColor:
            colors.primary + "10",
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
        backgroundColor:
            colors.primary + "06",
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

// ─── Screen Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.scaffoldBg,
    },

    scroll: {
        padding: 16,
    },

    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        gap: 10,
    },

    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.placeholder,
        fontFamily: "Roboto",
    },

    emptyTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: colors.secondary,
        fontFamily: "Roboto",
        marginTop: 8,
    },

    emptySubtitle: {
        fontSize: 13,
        color: colors.placeholder,
        fontFamily: "Roboto",
        textAlign: "center",
    },

    retryBtn: {
        marginTop: 12,
        paddingHorizontal: 28,
        paddingVertical: 10,
        backgroundColor: colors.primary,
        borderRadius: 24,
    },

    retryText: {
        color: "#fff",
        fontWeight: "700",
        fontFamily: "Roboto",
        fontSize: 14,
    },

    hero: {
        alignItems: "center",
        marginBottom: 24,
        paddingTop: 8,
        gap: 8,
    },

    heroIconWrap: {
        width: 68,
        height: 68,
        borderRadius: 22,
        backgroundColor:
            colors.primary + "14",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },

    heroTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: colors.secondary,
        fontFamily: "Roboto",
        letterSpacing: 0.2,
    },

    heroSubtitle: {
        fontSize: 13.5,
        color: colors.placeholder,
        fontFamily: "Roboto",
        textAlign: "center",
        lineHeight: 20,
        paddingHorizontal: 16,
    },

    cardWrapper: {
        marginBottom: 20,
    },

    popularTag: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        marginLeft: 16,
    },

    popularTagText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
        fontFamily: "Roboto",
    },

    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 5,
        borderWidth: 1,
        borderColor: "transparent",
    },

    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 16,
        paddingHorizontal: 16,
    },

    cardHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },

    planIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
    },

    planDisplayName: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.secondary,
        fontFamily: "Roboto",
        marginBottom: 5,
    },

    cycleBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },

    cycleBadgeText: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.secondary,
        fontFamily: "Roboto",
    },

    priceBlock: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginLeft: 8,
    },

    priceSymbol: {
        fontSize: 16,
        fontWeight: "700",
        marginTop: 4,
        fontFamily: "Roboto",
    },

    priceAmount: {
        fontSize: 32,
        fontWeight: "800",
        fontFamily: "Roboto",
        letterSpacing: -1,
        lineHeight: 36,
    },

    description: {
        fontSize: 13,
        color: colors.placeholder,
        fontFamily: "Roboto",
        paddingHorizontal: 16,
        paddingTop: 14,
        lineHeight: 20,
    },

    divider: {
        height: 1,
        backgroundColor: "#F1F5F9",
        marginHorizontal: 16,
        marginVertical: 14,
    },

    featureList: {
        paddingHorizontal: 16,
        gap: 10,
        marginBottom: 18,
    },

    featureRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    featureCheck: {
        width: 22,
        height: 22,
        borderRadius: 7,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },

    featureText: {
        fontSize: 13,
        color: colors.secondary,
        fontFamily: "Roboto",
        flex: 1,
        lineHeight: 19,
    },

    subscribeBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 16,
        marginBottom: 16,
        paddingVertical: 14,
        borderRadius: 12,
    },

    subscribeBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
        fontFamily: "Roboto",
        letterSpacing: 0.2,
    },

    activePlanBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 16,
        marginBottom: 16,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 2,
        backgroundColor: "#F0FDF4",
    },

    activePlanBtnText: {
        fontSize: 15,
        fontWeight: "700",
        fontFamily: "Roboto",
    },

    footerNote: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 4,
        paddingBottom: 8,
    },

    footerNoteText: {
        fontSize: 12,
        color: colors.placeholder,
        fontFamily: "Roboto",
    },
});