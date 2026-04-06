// screens/brands/EditBrandScreen.tsx
import React, { useState, useEffect } from "react";
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
import { postRequest, getRequest, putRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";
import { colors } from "../../constants/AppThem";
import AppBar from "../../components/utils/AppBar";
import FloatingInput from "../../components/inputs/FloatingInput";
import { getUserData } from "../../components/AsyncStorage/AsyncStorage";

// ─── Types ───────────────────────────────────────────────────────────────────

type FormState = {
    name: string;
    slug: string;
    description: string;
};

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
            <Text style={headerStyles.eyebrow}>Brand Management</Text>
        </View>
        <Text style={headerStyles.title}>Edit Brand</Text>
        <Text style={headerStyles.subtitle}>
            Update your brand details below.
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

// ─── Local Card Styles ───────────────────────────────
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
        marginBottom: 12,
        marginTop: 8,
    },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const EditBrandScreen = ({ navigation, route }: any) => {
    const insets = useSafeAreaInsets();
    const { brandId } = route.params || {};

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [form, setForm] = useState<FormState>({
        name: "",
        slug: "",
        description: "",
    });

    // Fetch brand details on mount
    useEffect(() => {
        fetchBrandDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [brandId]);

    const fetchBrandDetails = async () => {
        if (!brandId) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Brand ID not provided",
            });
            navigation.goBack();
            return;
        }

        setFetching(true);
        try {
            const res: any = await getRequest(`${API_ENDPOINTS.BRANDSGETBYID}/${brandId}`);
            
            if (res?.success && res?.data) {
                const brand = res.data;
                setForm({
                    name: brand.name || "",
                    slug: brand.slug || "",
                    description: brand.description || "",
                });
            } else {
                Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: res?.message || "Failed to load brand details",
                });
            }
        } catch (err: any) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: err?.message || "Something went wrong",
            });
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (field: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    // Auto-generate slug from name
    const handleNameChange = (name: string) => {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        setForm((prev) => ({ ...prev, name, slug }));
    };

    const validateForm = () => {
        if (!form.name?.trim()) {
            Toast.show({
                type: "error",
                text1: "Validation Error",
                text2: "Brand name is required",
            });
            return false;
        }
        if (!form.slug?.trim()) {
            Toast.show({
                type: "error",
                text1: "Validation Error",
                text2: "Brand slug is required",
            });
            return false;
        }
        if (!form.description?.trim()) {
            Toast.show({
                type: "error",
                text1: "Validation Error",
                text2: "Brand description is required",
            });
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        const payload = {
            name: form.name,
            slug: form.slug,
            description: form.description,
        };

        console.log("UPDATE BRAND PAYLOAD:", payload);

        setLoading(true);
        try {
            const res: any = await putRequest(
                `${API_ENDPOINTS.BRANDUPDATE}/${brandId}`,
                payload
            );

            setLoading(false);

            if (res?.success) {
                Toast.show({
                    type: "success",
                    text1: "Success",
                    text2: "Brand updated successfully!",
                });
                navigation.goBack();
            } else {
                Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: res?.message || "Failed to update brand",
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

    const isFormValid = form.name && form.slug && form.description;

    if (fetching) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.scaffoldBg }}>
                <AppBar title="Edit Brand" onBack={() => navigation.goBack()} />
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color={colors.primary} />
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
                <AppBar
                    title="Edit Brand"
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
                        <Text style={localStyles.sectionLabel}>Brand Information</Text>

                        <FloatingInput
                            label="Brand Name *"
                            placeholder="e.g. Nike"
                            value={form.name}
                            onChangeText={handleNameChange}
                            autoCapitalize="words"
                        />

                        <FloatingInput
                            label="Slug *"
                            placeholder="nike"
                            value={form.slug}
                            onChangeText={(t: string) => handleChange("slug", t.toLowerCase())}
                            autoCapitalize="none"
                            rightIcon={
                                <Ionicons name="link-outline" size={18} color={colors.placeholder} />
                            }
                        />

                        <FloatingInput
                            label="Description *"
                            placeholder="Brief description of your brand"
                            value={form.description}
                            onChangeText={(t: string) => handleChange("description", t)}
                            multiline
                            numberOfLines={3}
                            style={{ height: 80, textAlignVertical: "top" }}
                        />

                        <TouchableOpacity
                            style={[screenStyles.primaryBtn, (!isFormValid || loading) && screenStyles.primaryBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={!isFormValid || loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={screenStyles.primaryBtnText}>Update Brand</Text>
                                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginLeft: 6 }} />
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

export default EditBrandScreen;
