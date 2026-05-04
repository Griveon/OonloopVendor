// screens/coupons/EditCouponScreen.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    ScrollView,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Switch,
    StyleSheet,
    Modal,
    FlatList,
    TextInput,
    Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import { getRequest, putRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";
import { colors } from "../../constants/AppThem";
import AppBar from "../../components/utils/AppBar";
import FloatingInput from "../../components/inputs/FloatingInput";

const { height } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
    discountType: string;
    discountValue: string;
    minOrderValue: string;
    couponCode: string;
    description: string;
    isActive: boolean;
};

// ─── Coupon Types (same as Add) ───────────────────────────────────────────────

export const COUPON_TYPES = [
    { label: "Flat Discount", value: "FLAT_DISCOUNT", code: "FLAT" },
    { label: "Percentage Offer", value: "PERCENTAGE", code: "SAVE" },
    { label: "Special Offer", value: "SPECIAL", code: "SPECIAL" },
    { label: "Limited Time Deal", value: "LIMITED_TIME", code: "LIMIT" },
    { label: "Exclusive Deal", value: "EXCLUSIVE", code: "EXCL" },
    { label: "Summer Sale", value: "SUMMER", code: "SUMMER" },
    { label: "Winter Sale", value: "WINTER", code: "WINTER" },
    { label: "Festival Offer", value: "FESTIVAL", code: "FEST" },
    { label: "Diwali Offer", value: "DIWALI", code: "DIWALI" },
    { label: "Pongal Offer", value: "PONGAL", code: "PONGAL" },
    { label: "Christmas Sale", value: "CHRISTMAS", code: "XMAS" },
    { label: "New Year Sale", value: "NEW_YEAR", code: "NY" },
    { label: "Independence Day Offer", value: "INDEPENDENCE", code: "IND" },
    { label: "Republic Day Offer", value: "REPUBLIC", code: "REP" },
    { label: "Weekend Sale", value: "WEEKEND", code: "WKND" },
    { label: "Month-End Sale", value: "MONTH_END", code: "MEND" },
    { label: "Flash Sale", value: "FLASH", code: "FLASH" },
    { label: "Happy Hours Deal", value: "HAPPY_HOURS", code: "HAPPY" },
    { label: "Today Only Offer", value: "TODAY_ONLY", code: "TODAY" },
    { label: "First Order Discount", value: "FIRST_ORDER", code: "FIRST" },
    { label: "New User Offer", value: "NEW_USER", code: "NEW" },
    { label: "Loyalty Reward", value: "LOYALTY", code: "LOYAL" },
    { label: "VIP Exclusive Offer", value: "VIP", code: "VIP" },
    { label: "Referral Discount", value: "REFERRAL", code: "REFER" },
    { label: "Minimum Order Discount", value: "MIN_ORDER", code: "MIN" },
    { label: "Bulk Purchase Offer", value: "BULK", code: "BULK" },
    { label: "Buy More Save More", value: "BUY_MORE", code: "SAVE" },
    { label: "Combo Offer", value: "COMBO", code: "COMBO" },
    { label: "Bundle Deal", value: "BUNDLE", code: "BUNDLE" },
    { label: "Free Delivery", value: "FREE_DELIVERY", code: "FREEDEL" },
    { label: "Shipping Discount", value: "SHIPPING", code: "SHIP" },
    { label: "Platform Sponsored Offer", value: "PLATFORM", code: "PLAT" },
    { label: "Seller Sponsored Offer", value: "SELLER", code: "SELL" },
    { label: "Clearance Sale", value: "CLEARANCE", code: "CLEAR" },
    { label: "Stock Clearance", value: "STOCK_CLEAR", code: "STOCK" },
    { label: "Last Chance Deal", value: "LAST_CHANCE", code: "LAST" },
    { label: "Mega Sale", value: "MEGA", code: "MEGA" },
    { label: "Super Saver Deal", value: "SUPER_SAVER", code: "SAVE" },
];

// ─── Page Header ──────────────────────────────────────────────────────────────

const PageHeader = () => (
    <View style={headerStyles.container}>
        <View style={headerStyles.badge}>
            <Ionicons
                name="create-outline"
                size={14}
                color={colors.primary}
                style={{ marginRight: 5 }}
            />
            <Text style={headerStyles.eyebrow}>Coupon Management</Text>
        </View>
        <Text style={headerStyles.title}>Edit Coupon</Text>
        <Text style={headerStyles.subtitle}>
            Update your coupon details below to modify the discount offer.
        </Text>
    </View>
);

const headerStyles = StyleSheet.create({
    container: {
        paddingHorizontal: 28,
        paddingTop: 24,
        paddingBottom: 20,
        backgroundColor: colors.scaffoldBg,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        marginBottom: 12,
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.primary,
        letterSpacing: 0.3,
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
        color: colors.secondary,
        lineHeight: 36,
        marginBottom: 10,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: colors.placeholder,
        lineHeight: 21,
        marginBottom: 20,
        fontWeight: "400",
    },
});

// ─── Discount Type Selector ───────────────────────────────────────────────────

const DISCOUNT_TYPES = [
    { label: "Percentage", value: "PERCENTAGE", icon: "percent-outline" },
    { label: "Fixed Amount", value: "FIXED", icon: "cash-outline" },
];

const DiscountTypeSelector = ({
    value,
    onChange,
}: {
    value: string;
    onChange: (val: string) => void;
}) => (
    <View style={selectorStyles.wrapper}>
        <Text style={selectorStyles.label}>Discount Type *</Text>
        <View style={selectorStyles.row}>
            {DISCOUNT_TYPES.map((type) => {
                const isSelected = value === type.value;
                return (
                    <TouchableOpacity
                        key={type.value}
                        style={[
                            selectorStyles.option,
                            isSelected && selectorStyles.optionSelected,
                        ]}
                        onPress={() => onChange(type.value)}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={type.icon as any}
                            size={18}
                            color={isSelected ? "#fff" : colors.placeholder}
                        />
                        <Text
                            style={[
                                selectorStyles.optionText,
                                isSelected && selectorStyles.optionTextSelected,
                            ]}
                        >
                            {type.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    </View>
);

const selectorStyles = StyleSheet.create({
    wrapper: { marginBottom: 16 },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.secondary,
        marginBottom: 10,
    },
    row: { flexDirection: "row", gap: 12 },
    option: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        backgroundColor: colors.formBg,
    },
    optionSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    optionText: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.placeholder,
    },
    optionTextSelected: { color: "#fff" },
});

// ─── Dropdown Picker ──────────────────────────────────────────────────────────

const DropdownPicker = ({
    label,
    value,
    placeholder,
    options,
    onSelect,
    loading,
}: {
    label: string;
    value: string;
    placeholder: string;
    options: any[];
    onSelect: (opt: any) => void;
    loading?: boolean;
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const selected = options.find((o) => o._id === value);

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        return options.filter((o) =>
            o.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [search, options]);

    return (
        <View style={ddStyles.wrapper}>
            <Text style={ddStyles.label}>{label}</Text>

            <TouchableOpacity
                style={ddStyles.trigger}
                onPress={() => setOpen(true)}
                activeOpacity={0.8}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <>
                        <Text
                            style={[ddStyles.triggerText, !selected && ddStyles.placeholder]}
                            numberOfLines={1}
                        >
                            {selected ? selected.name : placeholder}
                        </Text>
                        <Ionicons name="chevron-down-outline" size={16} color={colors.placeholder} />
                    </>
                )}
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="fade">
                <TouchableOpacity
                    style={ddStyles.backdrop}
                    activeOpacity={1}
                    onPress={() => setOpen(false)}
                >
                    <View style={[ddStyles.sheet, { height: height * 0.75 }]}>
                        <View style={ddStyles.sheetHeader}>
                            <Text style={ddStyles.sheetTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setOpen(false)}>
                                <Ionicons name="close-outline" size={22} color={colors.secondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={ddStyles.searchContainer}>
                            <Ionicons name="search-outline" size={16} color={colors.placeholder} />
                            <TextInput
                                placeholder="Search..."
                                value={search}
                                onChangeText={setSearch}
                                style={ddStyles.searchInput}
                                placeholderTextColor={colors.placeholder}
                            />
                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch("")}>
                                    <Ionicons name="close-circle" size={16} color={colors.placeholder} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <FlatList
                            data={filteredOptions}
                            keyExtractor={(item) => item._id}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        ddStyles.option,
                                        item._id === value && ddStyles.optionSelected,
                                    ]}
                                    onPress={() => {
                                        onSelect(item);
                                        setOpen(false);
                                        setSearch("");
                                    }}
                                >
                                    <Text
                                        style={[
                                            ddStyles.optionText,
                                            item._id === value && ddStyles.optionTextSelected,
                                        ]}
                                    >
                                        {item.name}
                                    </Text>
                                    {item._id === value && (
                                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={ddStyles.empty}>No results found</Text>
                            }
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const ddStyles = StyleSheet.create({
    wrapper: { marginBottom: 14 },
    label: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.secondary,
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    trigger: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.formBg,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 13,
        minHeight: 48,
    },
    triggerText: { fontSize: 14, fontWeight: "500", color: colors.secondary, flex: 1 },
    placeholder: { color: colors.placeholder },
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: colors.scaffoldBg,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "60%",
        paddingBottom: 30,
    },
    sheetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder,
    },
    sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.secondary },
    option: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder,
    },
    optionSelected: { backgroundColor: "#EFF6FF" },
    optionText: { fontSize: 14, color: colors.secondary },
    optionTextSelected: { color: colors.primary, fontWeight: "600" },
    empty: {
        textAlign: "center",
        color: colors.placeholder,
        padding: 24,
        fontSize: 13,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 10,
        gap: 6,
        marginHorizontal: 20,
        marginTop: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: "#000",
    },
});

// ─── Local Card Styles ────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
    card: {
        backgroundColor: colors.scaffoldBg,
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 20,
        marginBottom: 20,
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.formBg,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 16,
    },
    toggleLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
    },
    toggleTextWrapper: { flex: 1 },
    toggleTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.secondary,
    },
    toggleSubtitle: {
        fontSize: 12,
        color: colors.placeholder,
        marginTop: 2,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.primary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 16,
        marginTop: 8,
    },
    divider: {
        height: 1,
        backgroundColor: colors.formBorder,
        marginVertical: 20,
    },
    infoBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#EFF6FF",
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: colors.primary,
        lineHeight: 18,
        fontWeight: "500",
    },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const EditCouponScreen = ({ navigation, route }: any) => {
    const insets = useSafeAreaInsets();
    const { couponId } = route.params || {};

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [selectedType, setSelectedType] = useState<string>("");  // ← NEW
    const [form, setForm] = useState<FormState>({
        discountType: "PERCENTAGE",
        discountValue: "",
        minOrderValue: "",
        couponCode: "",
        description: "",
        isActive: true,
    });

    useEffect(() => {
        fetchCouponDetails();
    }, [couponId]);

    const fetchCouponDetails = async () => {
        if (!couponId) {
            Toast.show({ type: "error", text1: "Error", text2: "Coupon ID not provided" });
            navigation.goBack();
            return;
        }

        setFetching(true);
        try {
            const res: any = await getRequest(
                `${API_ENDPOINTS.VENDORCOUPONGETBYID}/${couponId}`
            );

            if (res?.success && res?.data) {
                const coupon = res.data;

                // ── Restore selectedType from saved couponCode ──────────────
                // Try to match the saved couponCode prefix back to a COUPON_TYPE
                const matchedType = COUPON_TYPES.find((t) =>
                    coupon.couponCode?.startsWith(t.code)
                );
                if (matchedType) setSelectedType(matchedType.value);
                // ────────────────────────────────────────────────────────────

                setForm({
                    discountType: coupon.discountType || "PERCENTAGE",
                    discountValue: String(coupon.discountValue ?? ""),
                    minOrderValue: String(coupon.minOrderValue ?? ""),
                    couponCode: coupon.couponCode || "",
                    description: coupon.description || "",
                    isActive: coupon.isActive ?? true,
                });
            } else {
                Toast.show({ type: "error", text1: "Error", text2: res?.message || "Failed to load coupon details" });
            }
        } catch (err: any) {
            Toast.show({ type: "error", text1: "Error", text2: err?.message || "Something went wrong" });
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (field: keyof FormState, value: string | boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const generateCouponCode = (type: string, discountValue: string) => {
        const selected = COUPON_TYPES.find((t) => t.value === type);
        if (!selected) return "";
        return `${selected.code}${discountValue || ""}`.toUpperCase();
    };

    // ── Re-generates coupon code when type changes (same as Add) ──
    const handleCouponTypeChange = (type: string) => {
        setSelectedType(type);
        const code = generateCouponCode(type, form.discountValue);
        setForm((prev) => ({ ...prev, couponCode: code }));
    };

    const validateForm = (): boolean => {
        if (!form.discountType.trim()) {
            Toast.show({ type: "error", text1: "Validation Error", text2: "Discount type is required" });
            return false;
        }
        if (!form.discountValue.trim() || isNaN(Number(form.discountValue)) || Number(form.discountValue) <= 0) {
            Toast.show({ type: "error", text1: "Validation Error", text2: "Enter a valid discount value" });
            return false;
        }
        if (form.discountType === "PERCENTAGE" && Number(form.discountValue) > 100) {
            Toast.show({ type: "error", text1: "Validation Error", text2: "Percentage discount cannot exceed 100%" });
            return false;
        }
        if (!form.minOrderValue.trim() || isNaN(Number(form.minOrderValue)) || Number(form.minOrderValue) < 0) {
            Toast.show({ type: "error", text1: "Validation Error", text2: "Enter a valid minimum order value" });
            return false;
        }
        if (!form.couponCode.trim()) {
            Toast.show({ type: "error", text1: "Validation Error", text2: "Coupon code is required" });
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        const payload = {
            discountType: form.discountType,
            discountValue: Number(form.discountValue),
            minOrderValue: Number(form.minOrderValue),
            couponCode: form.couponCode.trim(),
            description: form.description.trim(),
            isActive: form.isActive,
        };

        setLoading(true);
        try {
            const res: any = await putRequest(
                `${API_ENDPOINTS.VENDORCOUPONUPDATE}/${couponId}`,
                payload
            );
            setLoading(false);

            if (res?.success) {
                Toast.show({ type: "success", text1: "Success", text2: "Coupon updated successfully!" });
                navigation.goBack();
            } else {
                Toast.show({ type: "error", text1: "Error", text2: res?.message || "Failed to update coupon" });
            }
        } catch (err: any) {
            setLoading(false);
            Toast.show({ type: "error", text1: "Error", text2: err?.message || "Something went wrong. Please try again." });
        }
    };

    const isFormValid =
        form.discountType &&
        form.discountValue &&
        form.minOrderValue &&
        form.couponCode;

    if (fetching) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.scaffoldBg }}>
                <AppBar title="Edit Coupon" onBack={() => navigation.goBack()} />
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={fetchingStyles.text}>Loading coupon details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.scaffoldBg }} edges={["bottom"]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <AppBar title="Edit Coupon" onBack={() => navigation.goBack()} />

                <ScrollView
                    style={{ flex: 1, backgroundColor: colors.scaffoldBg }}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    automaticallyAdjustKeyboardInsets={true}
                >
                    <PageHeader />

                    <View style={localStyles.card}>

                        {/* ── Discount Config ── */}
                        <Text style={localStyles.sectionLabel}>Discount Configuration</Text>

                        <DiscountTypeSelector
                            value={form.discountType}
                            onChange={(val) => handleChange("discountType", val)}
                        />

                        <FloatingInput
                            label={`Discount Value * ${form.discountType === "PERCENTAGE" ? "(%)" : "(₹)"}`}
                            placeholder={form.discountType === "PERCENTAGE" ? "e.g. 20" : "e.g. 100"}
                            value={form.discountValue}
                            onChangeText={(t: string) => handleChange("discountValue", t)}
                            keyboardType="numeric"
                            rightIcon={
                                <Ionicons
                                    name={form.discountType === "PERCENTAGE" ? "percent-outline" : "cash-outline"}
                                    size={18}
                                    color={colors.placeholder}
                                />
                            }
                        />

                        <FloatingInput
                            label="Minimum Order Value (₹) *"
                            placeholder="e.g. 500"
                            value={form.minOrderValue}
                            onChangeText={(t: string) => handleChange("minOrderValue", t)}
                            keyboardType="numeric"
                            rightIcon={
                                <Ionicons name="bag-outline" size={18} color={colors.placeholder} />
                            }
                        />

                        <View style={localStyles.divider} />

                        {/* ── Coupon Details ── */}
                        <Text style={localStyles.sectionLabel}>Coupon Details</Text>

                        <View style={localStyles.infoBox}>
                            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                            <Text style={localStyles.infoText}>
                                Coupon codes are auto-uppercased and spaces are removed. Use only letters and numbers.
                            </Text>
                        </View>

                        {/* ── Coupon Type Dropdown (same as Add) ── */}
                        <DropdownPicker
                            label="Coupon Type"
                            value={selectedType}
                            placeholder="Select Coupon Type"
                            options={COUPON_TYPES.map((o) => ({
                                _id: o.value,
                                name: o.label,
                            }))}
                            onSelect={(opt) => handleCouponTypeChange(opt._id)}
                        />

                        {/* ── Coupon Code (read-only, auto-generated) ── */}
                        <FloatingInput
                            label="Coupon Code *"
                            placeholder="e.g. SPRING20"
                            editable={false}
                            value={form.couponCode}
                            onChangeText={(t: string) =>
                                handleChange("couponCode", t.toUpperCase().replace(/\s/g, ""))
                            }
                            autoCapitalize="characters"
                            rightIcon={
                                <Ionicons name="copy-outline" size={18} color={colors.placeholder} />
                            }
                        />

                        {/* ── isActive Toggle ── */}
                        <View style={[
                            localStyles.toggleRow,
                            form.isActive && { borderColor: colors.primary, backgroundColor: "#EFF6FF" },
                        ]}>
                            <View style={localStyles.toggleLeft}>
                                <Ionicons
                                    name={form.isActive ? "checkmark-circle" : "close-circle-outline"}
                                    size={22}
                                    color={form.isActive ? colors.primary : colors.placeholder}
                                />
                                <View style={localStyles.toggleTextWrapper}>
                                    <Text style={localStyles.toggleTitle}>Activate Coupon</Text>
                                    <Text style={localStyles.toggleSubtitle}>
                                        {form.isActive ? "Coupon will be live immediately" : "Coupon will be saved as inactive"}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={form.isActive}
                                onValueChange={(val) => handleChange("isActive", val)}
                                trackColor={{ false: colors.formBorder, true: colors.primary + "55" }}
                                thumbColor={form.isActive ? colors.primary : "#fff"}
                                ios_backgroundColor={colors.formBorder}
                            />
                        </View>

                        {/* ── Submit ── */}
                        <TouchableOpacity
                            style={[
                                screenStyles.primaryBtn,
                                (!isFormValid || loading) && screenStyles.primaryBtnDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={!isFormValid || loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={screenStyles.primaryBtnText}>Update Coupon</Text>
                                    <Ionicons
                                        name="checkmark-circle-outline"
                                        size={18}
                                        color="#fff"
                                        style={{ marginLeft: 6 }}
                                    />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const fetchingStyles = StyleSheet.create({
    text: {
        marginTop: 12,
        fontSize: 14,
        color: colors.placeholder,
        fontWeight: "500",
    },
});

const screenStyles = StyleSheet.create({
    primaryBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 15,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 24,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryBtnDisabled: { opacity: 0.55, shadowOpacity: 0 },
    primaryBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
});

export default EditCouponScreen;