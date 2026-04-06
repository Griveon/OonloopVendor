// screens/brands/AddCouponScreen.tsx
import React, { useState } from "react";
import {
    View,
    ScrollView,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import { postRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";
import { colors } from "../../constants/AppThem";
import AppBar from "../../components/utils/AppBar";
import FloatingInput from "../../components/inputs/FloatingInput";
import { getUserData } from "../../components/AsyncStorage/AsyncStorage";

// ─── Types ───────────────────────────────────────────────────────────────────

type FormState = {
    discountType: string;
    discountValue: string;
    minOrderValue: string;
    couponCode: string;
    description: string;
};

// ─── Page Header ──────────────────────────────────────────────────────────────

const PageHeader = () => (
    <View style={headerStyles.container}>
        <View style={headerStyles.badge}>
            <Ionicons
                name="pricetag-outline"
                size={14}
                color={colors.primary}
                style={{ marginRight: 5 }}
            />
            <Text style={headerStyles.eyebrow}>Coupon Management</Text>
        </View>
        <Text style={headerStyles.title}>Add New Coupon</Text>
        <Text style={headerStyles.subtitle}>
            Create a coupon to offer discounts to your customers. Fill in the details below to get started.
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
    wrapper: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.secondary,
        marginBottom: 10,
    },
    row: {
        flexDirection: "row",
        gap: 12,
    },
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
    optionTextSelected: {
        color: "#fff",
    },
});

// ─── Local Card Styles ──────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
    card: {
        backgroundColor: colors.scaffoldBg,
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 20,
        marginBottom: 20,
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

const AddCouponScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<FormState>({
        discountType: "PERCENTAGE",
        discountValue: "",
        minOrderValue: "",
        couponCode: "",
        description: "",
    });

    const handleChange = (field: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    // Auto-uppercase coupon code
    const handleCouponCodeChange = (value: string) => {
        handleChange("couponCode", value.toUpperCase().replace(/\s/g, ""));
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
        if (!form.description.trim()) {
            Toast.show({ type: "error", text1: "Validation Error", text2: "Description is required" });
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        const { user } = await getUserData();

        const payload = {
            vendorId: user?.user?._id,
            discountType: form.discountType,
            discountValue: Number(form.discountValue),
            minOrderValue: Number(form.minOrderValue),
            couponCode: form.couponCode.trim(),
            description: form.description.trim(),
        };

        console.log("CREATE COUPON PAYLOAD:", payload);

        setLoading(true);
        try {
            const res: any = await postRequest(API_ENDPOINTS.VENDORCOUPONCREATE, payload);
            setLoading(false);

            if (res?.success) {
                Toast.show({
                    type: "success",
                    text1: "Success",
                    text2: "Coupon created successfully!",
                });
                navigation.goBack();
            } else {
                Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: res?.message || "Failed to create coupon",
                });
            }
        } catch (err: any) {
            setLoading(false);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: err?.message || "Something went wrong. Please try again.",
            });
        }
    };

    const isFormValid =
        form.discountType &&
        form.discountValue &&
        form.minOrderValue &&
        form.couponCode &&
        form.description;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.scaffoldBg }} edges={["bottom"]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <AppBar
                    title="Add Coupon"
                    onBack={() => navigation.goBack()}
                />

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

                        <FloatingInput
                            label="Coupon Code *"
                            placeholder="e.g. SPRING20"
                            value={form.couponCode}
                            onChangeText={handleCouponCodeChange}
                            autoCapitalize="characters"
                            rightIcon={
                                <Ionicons name="copy-outline" size={18} color={colors.placeholder} />
                            }
                        />

                        <FloatingInput
                            label="Description *"
                            placeholder="e.g. 20% off on all products for orders above ₹500"
                            value={form.description}
                            onChangeText={(t: string) => handleChange("description", t)}
                            multiline
                            numberOfLines={3}
                            style={{ height: 80, textAlignVertical: "top" }}
                        />

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
                                    <Text style={screenStyles.primaryBtnText}>Create Coupon</Text>
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

export default AddCouponScreen;