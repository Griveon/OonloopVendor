// screens/brands/AddBrandScreen.tsx
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
    Image,
    Switch,
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

type ImageData = {
    url: string;
    name: string;
    alt: string;
    isPrimary: boolean;
    position: number;
};

type FormState = {
    name: string;
    slug: string;
    description: string;
    logo: ImageData | null;
    banners: ImageData[];
    website: string;
    metaTitle: string;
    metaDescription: string;
    tags: string[];
    isFeatured: boolean;
};

// ─── Page Header ──────────────────────────────────────────────────────────────

const PageHeader = () => (
    <View style={headerStyles.container}>
        <View style={headerStyles.badge}>
            <Ionicons
                name="business-outline"
                size={14}
                color={colors.primary}
                style={{ marginRight: 5 }}
            />
            <Text style={headerStyles.eyebrow}>Brand Registration</Text>
        </View>
        <Text style={headerStyles.title}>Add New Brand</Text>
        <Text style={headerStyles.subtitle}>
            Create a brand profile to showcase your products. Fill in the details below to get started.
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

// ─── Local Input Styles (replacing inputloginStyles) ─────────────────────────
const inputStyles = StyleSheet.create({
    wrapper: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.secondary,
        marginBottom: 8,
    },
});

// ─── Local Card Styles (replacing localStyles) ──────────────────────────────
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
    divider: {
        height: 1,
        backgroundColor: colors.formBorder,
        marginVertical: 20,
    },
});

// ─── Image Upload Component ───────────────────────────────────────────────────

const ImageUploadField = ({
    label,
    image,
    onImageChange,
    placeholder = "Upload Image",
}: {
    label: string;
    image: ImageData | null;
    onImageChange: (image: ImageData) => void;
    placeholder?: string;
}) => {
    // Mock image picker - replace with actual image picker implementation
    const handlePickImage = () => {
        // TODO: Implement actual image picker
        // For now, we'll use a mock image
        const mockImage: ImageData = {
            url: "https://via.placeholder.com/200x200?text=Brand+Logo",
            name: `brand-image-${Date.now()}`,
            alt: label,
            isPrimary: true,
            position: 0,
        };
        onImageChange(mockImage);
        Toast.show({
            type: "info",
            text1: "Note",
            text2: "Please implement actual image picker",
        });
    };

    return (
        <View style={inputStyles.wrapper}>
            <Text style={inputStyles.label}>{label}</Text>
            <TouchableOpacity
                style={imageUploadStyles.container}
                onPress={handlePickImage}
                activeOpacity={0.8}
            >
                {image?.url ? (
                    <Image source={{ uri: image.url }} style={imageUploadStyles.image} />
                ) : (
                    <View style={imageUploadStyles.placeholder}>
                        <Ionicons name="cloud-upload-outline" size={32} color={colors.placeholder} />
                        <Text style={imageUploadStyles.placeholderText}>{placeholder}</Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};

const imageUploadStyles = StyleSheet.create({
    container: {
        width: "100%",
        height: 180,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.formBorder,
        borderStyle: "dashed",
        backgroundColor: colors.formBg,
        overflow: "hidden",
    },
    image: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    placeholder: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    placeholderText: {
        marginTop: 8,
        fontSize: 13,
        color: colors.placeholder,
        fontWeight: "500",
    },
});

// ─── Tags Input ───────────────────────────────────────────────────────────────

const TagsInput = ({
    tags,
    onChange,
}: {
    tags: string[];
    onChange: (tags: string[]) => void;
}) => {
    const [input, setInput] = useState("");

    const addTag = () => {
        if (input.trim() && !tags.includes(input.trim())) {
            onChange([...tags, input.trim()]);
            setInput("");
        }
    };

    const removeTag = (tag: string) => {
        onChange(tags.filter((t) => t !== tag));
    };

    return (
        <View style={inputStyles.wrapper}>
            <Text style={inputStyles.label}>Tags</Text>
            <View style={tagsStyles.container}>
                <View style={tagsStyles.inputRow}>
                    <FloatingInput
                        placeholder="Add tag and press enter"
                        value={input}
                        onChangeText={setInput}
                        onSubmitEditing={addTag}
                        returnKeyType="done"
                        style={{ flex: 1 }}
                    />
                    <TouchableOpacity
                        style={tagsStyles.addButton}
                        onPress={addTag}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
                <View style={tagsStyles.tagsRow}>
                    {tags.map((tag, index) => (
                        <View key={index} style={tagsStyles.tag}>
                            <Text style={tagsStyles.tagText}>{tag}</Text>
                            <TouchableOpacity
                                onPress={() => removeTag(tag)}
                                style={tagsStyles.removeButton}
                            >
                                <Ionicons name="close" size={14} color={colors.placeholder} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

const tagsStyles = StyleSheet.create({
    container: {
        gap: 10,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    tagsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tag: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    tagText: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: "500",
    },
    removeButton: {
        padding: 2,
    },
});

// ─── Banners List ─────────────────────────────────────────────────────────────

const BannersList = ({
    banners,
    onChange,
}: {
    banners: ImageData[];
    onChange: (banners: ImageData[]) => void;
}) => {
    const addBanner = () => {
        // TODO: Implement actual image picker
        const newBanner: ImageData = {
            url: `https://via.placeholder.com/300x150?text=Banner+${banners.length + 1}`,
            name: `banner-${Date.now()}`,
            alt: `Banner ${banners.length + 1}`,
            isPrimary: banners.length === 0,
            position: banners.length,
        };
        onChange([...banners, newBanner]);
    };

    const removeBanner = (index: number) => {
        onChange(banners.filter((_, i) => i !== index));
    };

    return (
        <View style={inputStyles.wrapper}>
            <Text style={inputStyles.label}>Banners</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={bannersStyles.scrollContainer}
            >
                {banners.map((banner, index) => (
                    <View key={index} style={bannersStyles.bannerContainer}>
                        <Image source={{ uri: banner.url }} style={bannersStyles.banner} />
                        <TouchableOpacity
                            style={bannersStyles.removeButton}
                            onPress={() => removeBanner(index)}
                        >
                            <Ionicons name="close-circle" size={24} color={colors.error} />
                        </TouchableOpacity>
                        {banner.isPrimary && (
                            <View style={bannersStyles.primaryBadge}>
                                <Text style={bannersStyles.primaryText}>Primary</Text>
                            </View>
                        )}
                    </View>
                ))}
                <TouchableOpacity
                    style={bannersStyles.addBanner}
                    onPress={addBanner}
                    activeOpacity={0.7}
                >
                    <Ionicons name="add" size={32} color={colors.placeholder} />
                    <Text style={bannersStyles.addText}>Add Banner</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const bannersStyles = StyleSheet.create({
    scrollContainer: {
        gap: 12,
        paddingVertical: 4,
    },
    bannerContainer: {
        position: "relative",
    },
    banner: {
        width: 200,
        height: 120,
        borderRadius: 12,
        resizeMode: "cover",
    },
    removeButton: {
        position: "absolute",
        top: -8,
        right: -8,
        backgroundColor: "#fff",
        borderRadius: 12,
    },
    primaryBadge: {
        position: "absolute",
        bottom: 8,
        left: 8,
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    primaryText: {
        fontSize: 11,
        color: "#fff",
        fontWeight: "600",
    },
    addBanner: {
        width: 120,
        height: 120,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.formBorder,
        borderStyle: "dashed",
        backgroundColor: colors.formBg,
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
    },
    addText: {
        fontSize: 12,
        color: colors.placeholder,
        fontWeight: "500",
    },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AddBrandScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<FormState>({
        name: "",
        slug: "",
        description: "",
        logo: null,
        banners: [],
        website: "",
        metaTitle: "",
        metaDescription: "",
        tags: [],
        isFeatured: false,
    });

    const handleChange = (field: keyof FormState, value: any) => {
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

        const { user } = await getUserData();

        const payload = {
            name: form.name,
            vendorId: user?.user?._id,
            slug: form.slug,
            description: form.description,
        };

        console.log("CREATE BRAND PAYLOAD:", payload);

        setLoading(true);
        try {
            const res: any = await postRequest(API_ENDPOINTS.BRANDCREATE, payload);

            setLoading(false);

            if (res?.success) {
                Toast.show({
                    type: "success",
                    text1: "Success",
                    text2: "Brand created successfully!",
                });
                navigation.goBack();
            } else {
                Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: res?.message || "Failed to create brand",
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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.scaffoldBg }} edges={["bottom"]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <AppBar
                    title="Add Brand"
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

                        {/*
                        <FloatingInput
                            label="Website"
                            placeholder="https://yourbrand.com"
                            value={form.website}
                            onChangeText={(t: string) => handleChange("website", t)}
                            autoCapitalize="none"
                            keyboardType="url"
                            rightIcon={
                                <Ionicons name="globe-outline" size={18} color={colors.placeholder} />
                            }
                        />

                        <View style={localStyles.divider} />
                        <Text style={localStyles.sectionLabel}>Brand Media</Text>

                        <ImageUploadField
                            label="Brand Logo *"
                            image={form.logo}
                            onImageChange={(logo) => handleChange("logo", logo)}
                            placeholder="Upload Logo"
                        />

                        <BannersList
                            banners={form.banners}
                            onChange={(banners) => handleChange("banners", banners)}
                        />

                        <View style={localStyles.divider} />
                        <Text style={localStyles.sectionLabel}>SEO & Organization</Text>

                        <FloatingInput
                            label="Meta Title"
                            placeholder="SEO title for search engines"
                            value={form.metaTitle}
                            onChangeText={(t: string) => handleChange("metaTitle", t)}
                        />

                        <FloatingInput
                            label="Meta Description"
                            placeholder="SEO description for search engines"
                            value={form.metaDescription}
                            onChangeText={(t: string) => handleChange("metaDescription", t)}
                            multiline
                            numberOfLines={2}
                            style={{ height: 60, textAlignVertical: "top" }}
                        />

                        <TagsInput
                            tags={form.tags}
                            onChange={(tags) => handleChange("tags", tags)}
                        />

                        <View style={screenStyles.switchRow}>
                            <View style={screenStyles.switchLabel}>
                                <Text style={screenStyles.switchTitle}>Featured Brand</Text>
                                <Text style={screenStyles.switchSubtitle}>
                                    Show this brand in featured section
                                </Text>
                            </View>
                            <Switch
                                value={form.isFeatured}
                                onValueChange={(v) => handleChange("isFeatured", v)}
                                trackColor={{ false: colors.formBorder, true: colors.primary + "80" }}
                                thumbColor={form.isFeatured ? colors.primary : "#f4f3f4"}
                            />
                        </View>
                        */}

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
                                    <Text style={screenStyles.primaryBtnText}>Create Brand</Text>
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
    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 16,
        paddingVertical: 12,
    },
    switchLabel: {
        flex: 1,
    },
    switchTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.secondary,
    },
    switchSubtitle: {
        fontSize: 12,
        color: colors.placeholder,
        marginTop: 2,
    },
});

export default AddBrandScreen;
