// screens/vendor/VendorEditProductScreen.tsx
import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
    View,
    ScrollView,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Alert,
    Image,
    Switch,
    FlatList,
    Modal,
    TextInput,
    Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import {
    launchImageLibrary,
    launchCamera,
    ImagePickerResponse,
    Asset,
} from "react-native-image-picker";
import { colors } from "../../constants/AppThem";
import AppBar from "../../components/utils/AppBar";
import FloatingInput from "../../components/inputs/FloatingInput";
import { getUserData } from "../../components/AsyncStorage/AsyncStorage";
import { getRequest, postRequest, putRequest, uploadRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";
import ColorPicker from "react-native-wheel-color-picker";

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadedImage = {
    uri: string;
    name: string;
    type: string;
    isExisting?: boolean; // true = already uploaded, just a URL
};

type Variant = {
    id: string;           // local key (may be server _id for existing)
    variantId: string;
    size: string;
    color: string;
    unit: string;
    unitValue: string;
    stock: string;
    sku: string;
    price: string;
    images: UploadedImage[];
    attributes: Record<string, any>;
    _serverId?: string;   // server _id for existing variants
};

type GstDetails = {
    gstRuleId: string;
    hsnCode: string;
    gstPercent: string;
    gstAmount: string;
    priceIncludingGST: string;
};

type ProductForm = {
    name: string;
    description: string;
    slug: string;
    mrp: string;
    stock: string;
    minQty: string;
    isActive: boolean;
    isFeatured: boolean;
    isTrending: boolean;
    returnable: boolean;
    material: string;
    pattern: string;
    sleeveLength: string;
    fit: string;
    vendorId: string;
    productCategoryId: string;
    categoryId: string;
    brandId: string;
    unitId: string;
    gst: GstDetails;
};

type DropdownOption = { _id: string; name: string;[key: string]: any };

// ─── Steps Config ─────────────────────────────────────────────────────────────

const STEPS = [
    { id: 1, label: "Basic Info", icon: "information-circle-outline" },
    { id: 2, label: "Attributes", icon: "list-outline" },
    { id: 3, label: "Variants", icon: "layers-outline" },
    { id: 4, label: "GST & Tax", icon: "receipt-outline" },
    { id: 5, label: "Images", icon: "images-outline" },
];

// ─── Step Indicator ───────────────────────────────────────────────────────────

const StepIndicator = ({
    currentStep,
    onStepPress,
    completedSteps,
}: {
    currentStep: number;
    onStepPress: (step: number) => void;
    completedSteps: Set<number>;
}) => (
    <View style={stepStyles.wrapper}>
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={stepStyles.container}
        >
            {STEPS.map((step, idx) => {
                const isActive = currentStep === step.id;
                const isDone = completedSteps.has(step.id);
                return (
                    <React.Fragment key={step.id}>
                        <TouchableOpacity
                            style={stepStyles.stepItem}
                            onPress={() => onStepPress(step.id)}
                            activeOpacity={0.75}
                        >
                            <View
                                style={[
                                    stepStyles.circle,
                                    isActive && stepStyles.circleActive,
                                    isDone && !isActive && stepStyles.circleDone,
                                ]}
                            >
                                {isDone && !isActive ? (
                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                ) : (
                                    <Ionicons
                                        name={step.icon as any}
                                        size={14}
                                        color={isActive ? "#fff" : colors.placeholder}
                                    />
                                )}
                            </View>
                            <Text
                                style={[
                                    stepStyles.label,
                                    isActive && stepStyles.labelActive,
                                    isDone && !isActive && stepStyles.labelDone,
                                ]}
                            >
                                {step.label}
                            </Text>
                        </TouchableOpacity>
                        {idx < STEPS.length - 1 && (
                            <View
                                style={[
                                    stepStyles.connector,
                                    (isDone || completedSteps.has(step.id)) &&
                                    stepStyles.connectorDone,
                                ]}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </ScrollView>
    </View>
);

const stepStyles = StyleSheet.create({
    wrapper: {
        backgroundColor: colors.scaffoldBg,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder,
        paddingVertical: 14,
    },
    container: { paddingHorizontal: 20, alignItems: "center", gap: 0 },
    stepItem: { alignItems: "center", width: 64 },
    circle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.formBorder,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 5,
    },
    circleActive: { backgroundColor: colors.primary },
    circleDone: { backgroundColor: "#22C55E" },
    label: { fontSize: 10, color: colors.placeholder, fontWeight: "600", textAlign: "center" },
    labelActive: { color: colors.primary },
    labelDone: { color: "#16A34A" },
    connector: {
        width: 24,
        height: 2,
        backgroundColor: colors.formBorder,
        marginBottom: 18,
        marginHorizontal: -2,
    },
    connectorDone: { backgroundColor: "#22C55E" },
});

// ─── Page Header ──────────────────────────────────────────────────────────────

const PageHeader = ({ title, subtitle, icon }: { title: string; subtitle: string; icon: string }) => (
    <View style={headerStyles.container}>
        <View style={headerStyles.badge}>
            <Ionicons name={icon as any} size={14} color={colors.primary} style={{ marginRight: 5 }} />
            <Text style={headerStyles.eyebrow}>Edit</Text>
        </View>
        <Text style={headerStyles.title}>{title}</Text>
        <Text style={headerStyles.subtitle}>{subtitle}</Text>
    </View>
);

const headerStyles = StyleSheet.create({
    container: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF7ED",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        marginBottom: 10,
    },
    eyebrow: { fontSize: 12, fontWeight: "600", color: "#EA580C", letterSpacing: 0.3 },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: colors.secondary,
        lineHeight: 32,
        marginBottom: 8,
        letterSpacing: -0.4,
    },
    subtitle: { fontSize: 13, color: colors.placeholder, lineHeight: 20 },
});

const { height } = Dimensions.get("window");

// ─── Dropdown Picker ──────────────────────────────────────────────────────────

const DropdownPicker = ({
    label, value, placeholder, options, onSelect, loading,
}: {
    label: string;
    value: string;
    placeholder: string;
    options: DropdownOption[];
    onSelect: (opt: DropdownOption) => void;
    loading?: boolean;
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const selected = options.find((o) => o._id === value);
    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        return options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()));
    }, [search, options]);

    return (
        <View style={ddStyles.wrapper}>
            <Text style={ddStyles.label}>{label}</Text>
            <TouchableOpacity style={ddStyles.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
                {loading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <>
                        <Text style={[ddStyles.triggerText, !selected && ddStyles.placeholder]} numberOfLines={1}>
                            {selected ? selected.name : placeholder}
                        </Text>
                        <Ionicons name="chevron-down-outline" size={16} color={colors.placeholder} />
                    </>
                )}
            </TouchableOpacity>
            <Modal visible={open} transparent animationType="fade">
                <TouchableOpacity style={ddStyles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
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
                                    style={[ddStyles.option, item._id === value && ddStyles.optionSelected]}
                                    onPress={() => { onSelect(item); setOpen(false); setSearch(""); }}
                                >
                                    <Text style={[ddStyles.optionText, item._id === value && ddStyles.optionTextSelected]}>
                                        {item.name}
                                    </Text>
                                    {item._id === value && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={ddStyles.empty}>No results found</Text>}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const ddStyles = StyleSheet.create({
    wrapper: { marginBottom: 14 },
    label: { fontSize: 12, fontWeight: "600", color: colors.secondary, marginBottom: 6, letterSpacing: 0.2 },
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
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
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
    empty: { textAlign: "center", color: colors.placeholder, padding: 24, fontSize: 13 },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 10,
        gap: 6,
        marginHorizontal: 16,
        marginTop: 12,
    },
    searchInput: { flex: 1, fontSize: 14, color: "#000" },
});

// ─── Toggle Row ───────────────────────────────────────────────────────────────

const ToggleRow = ({ label, hint, value, onToggle }: {
    label: string; hint: string; value: boolean; onToggle: (v: boolean) => void;
}) => (
    <View style={toggleStyles.row}>
        <View style={{ flex: 1 }}>
            <Text style={toggleStyles.label}>{label}</Text>
            <Text style={toggleStyles.hint}>{hint}</Text>
        </View>
        <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{ false: colors.formBorder, true: colors.primary + "88" }}
            thumbColor={value ? colors.primary : "#9CA3AF"}
        />
    </View>
);

const toggleStyles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.formBg,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 10,
        gap: 12,
    },
    label: { fontSize: 14, fontWeight: "600", color: colors.secondary },
    hint: { fontSize: 12, color: colors.placeholder, marginTop: 2 },
});

// ─── Variant Types ────────────────────────────────────────────────────────────

type VariantOptionValue = { label: string; value: string };
type VariantOptionModel = {
    _id: string;
    name: string;
    label: string;
    inputType: "text" | "color" | "select" | "number";
    options: VariantOptionValue[];
};

// ─── Variant Card ─────────────────────────────────────────────────────────────
const AttributeInput = ({ option, value, onChangeValue }: {
    option: VariantOptionModel; value: any; onChangeValue: (val: any) => void;
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [tempColor, setTempColor] = useState(value || "#000000");

    if (option.inputType === "color") {
        return (
            <>
                <TouchableOpacity onPress={() => setShowColorPicker(true)}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: value || "#000", marginRight: 10 }} />
                        <Text>{value || "Select Color"}</Text>
                    </View>
                </TouchableOpacity>
                <Modal visible={showColorPicker} transparent animationType="slide">
                    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
                        <View style={{ backgroundColor: "#fff", padding: 16, borderRadius: 10 }}>
                            <ColorPicker color={tempColor} onColorChange={setTempColor} />
                            <TouchableOpacity onPress={() => { onChangeValue(tempColor); setShowColorPicker(false); }}>
                                <Text>Select</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </>
        );
    }
    if (option.inputType === "number") {
        return (
            <FloatingInput
                label={option.label}
                value={value || ""}
                keyboardType="numeric"
                onChangeText={(t: string) => onChangeValue(t.replace(/\D/g, ""))}
            />
        );
    }
    if (option.inputType === "text") {
        return <FloatingInput label={option.label} value={value || ""} onChangeText={(t: string) => onChangeValue(t)} />;
    }
    return (
        <DropdownPicker
            label={option.label}
            value={value}
            placeholder={`Select ${option.label}`}
            options={option.options.map((o) => ({ _id: o.value, name: o.label }))}
            onSelect={(opt) => onChangeValue(opt?._id)}
        />
    );
};

const VariantCard = ({
    variant, index, variantOptions, unitOptions,
    onChange, onRemove, onPickImages, onRemoveImage,
}: {
    variant: Variant;
    index: number;
    variantOptions: VariantOptionModel[];
    unitOptions: DropdownOption[];
    onChange: (id: string, field: keyof Variant, value: any) => void;
    onRemove: (id: string) => void;
    onPickImages: (id: string) => void;
    onRemoveImage: (variantId: string, imageIndex: number) => void;
}) => {
    const [expanded, setExpanded] = useState(true);
    const selectedVariant = variantOptions.find((v) => v._id === variant.variantId);


    const attributeText = Object.values(variant.attributes || {}).filter(Boolean).join(" · ");

    return (
        <View style={variantStyles.card}>
            <TouchableOpacity style={variantStyles.cardHeader} onPress={() => setExpanded((p) => !p)} activeOpacity={0.8}>
                <View style={variantStyles.cardHeaderLeft}>
                    <View style={variantStyles.indexBadge}>
                        <Text style={variantStyles.indexText}>{index + 1}</Text>
                    </View>
                    <View>
                        <Text style={variantStyles.variantTitle}>{attributeText || `Variant ${index + 1}`}</Text>
                        <Text style={variantStyles.variantSub}>{variant.sku ? `SKU: ${variant.sku}` : "Set variant & SKU"}</Text>
                    </View>
                </View>
                <View style={variantStyles.cardHeaderRight}>
                    <TouchableOpacity onPress={() => onRemove(variant.id)} style={{ marginRight: 8 }}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                    <Ionicons name={expanded ? "chevron-up-outline" : "chevron-down-outline"} size={18} color={colors.placeholder} />
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={variantStyles.body}>
                    <DropdownPicker
                        label="Variant Type"
                        value={variant.variantId}
                        placeholder="Select variant type"
                        options={variantOptions.map((v) => ({ _id: v._id, name: v.label }))}
                        onSelect={(opt) => {
                            onChange(variant.id, "variantId", opt._id);
                            onChange(variant.id, "attributes", {});
                        }}
                    />
                    {selectedVariant && (
                        <View style={{ marginTop: 12 }}>
                            <AttributeInput
                                option={selectedVariant}
                                value={variant.attributes?.[selectedVariant.name]}
                                onChangeValue={(val) => {
                                    onChange(variant.id, "attributes", {
                                        ...variant.attributes,
                                        [selectedVariant.name]: val,
                                    });
                                }}
                            />
                        </View>
                    )}
                    <View style={variantStyles.row2}>
                        <View style={{ flex: 1 }}>
                            <FloatingInput
                                label="Price (₹) *"
                                placeholder="0"
                                value={variant.price}
                                onChangeText={(t: string) => onChange(variant.id, "price", t.replace(/\D/g, ""))}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <FloatingInput
                                label="Stock *"
                                placeholder="0"
                                value={variant.stock}
                                onChangeText={(t: string) => onChange(variant.id, "stock", t.replace(/\D/g, ""))}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    <View style={variantStyles.row2}>
                        <View style={{ flex: 1 }}>
                            <DropdownPicker
                                label="Unit"
                                value={variant.unit}
                                placeholder="Select unit"
                                options={unitOptions}
                                onSelect={(opt) => onChange(variant.id, "unit", opt._id)}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <FloatingInput
                                label="Unit Value"
                                placeholder="1"
                                value={variant.unitValue}
                                onChangeText={(t: string) => onChange(variant.id, "unitValue", t.replace(/\D/g, ""))}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <Text style={variantStyles.imagesLabel}>Variant Images ({variant.images.length})</Text>
                    <View style={variantStyles.imagesRow}>
                        {variant.images.map((img, i) => (
                            <View key={i} style={{ position: "relative" }}>
                                <Image source={{ uri: img.uri }} style={variantStyles.thumb} />
                                {img.isExisting && (
                                    <View style={variantStyles.existingBadge}>
                                        <Ionicons name="cloud-done-outline" size={10} color="#fff" />
                                    </View>
                                )}
                                <TouchableOpacity
                                    onPress={() => onRemoveImage(variant.id, i)}
                                    style={variantStyles.removeImgBtn}
                                >
                                    <Ionicons name="close" size={12} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity style={variantStyles.addImageBtn} onPress={() => onPickImages(variant.id)}>
                            <Ionicons name="add" size={22} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

const variantStyles = StyleSheet.create({
    card: {
        backgroundColor: colors.formBg,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        marginBottom: 12,
        overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 14,
        backgroundColor: colors.scaffoldBg,
    },
    cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    cardHeaderRight: { flexDirection: "row", alignItems: "center" },
    indexBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
    indexText: { fontSize: 13, fontWeight: "700", color: "#EA580C" },
    variantTitle: { fontSize: 14, fontWeight: "700", color: colors.secondary },
    variantSub: { fontSize: 12, color: colors.placeholder, marginTop: 1 },
    body: { padding: 14, paddingTop: 4 },
    row2: { flexDirection: "row", gap: 10 },
    imagesLabel: { fontSize: 12, fontWeight: "600", color: colors.secondary, marginBottom: 8, marginTop: 4 },
    imagesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    thumb: { width: 56, height: 56, borderRadius: 8 },
    existingBadge: {
        position: "absolute",
        bottom: 2,
        left: 2,
        backgroundColor: "#22C55E",
        borderRadius: 8,
        padding: 2,
    },
    removeImgBtn: {
        position: "absolute",
        top: -6,
        right: -6,
        backgroundColor: "#EF4444",
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    addImageBtn: {
        width: 56,
        height: 56,
        borderRadius: 8,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.primary,
        backgroundColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
    },
});

// ─── Image Upload Grid ────────────────────────────────────────────────────────

const ImageUploadGrid = ({ images, onAdd, onRemove, label, max }: {
    images: UploadedImage[]; onAdd: () => void; onRemove: (i: number) => void; label: string; max?: number;
}) => {
    const canAdd = !max || images.length < max;
    return (
        <View style={imgGridStyles.wrapper}>
            <Text style={imgGridStyles.label}>{label} ({images.length}{max ? `/${max}` : ""})</Text>
            <View style={imgGridStyles.grid}>
                {images.map((img, i) => (
                    <View key={i} style={imgGridStyles.item}>
                        <Image source={{ uri: img.uri }} style={imgGridStyles.img} resizeMode="cover" />
                        {i === 0 && (
                            <View style={imgGridStyles.primaryBadge}>
                                <Text style={imgGridStyles.primaryText}>Primary</Text>
                            </View>
                        )}
                        {img.isExisting && (
                            <View style={imgGridStyles.existingBadge}>
                                <Ionicons name="cloud-done-outline" size={10} color="#fff" />
                            </View>
                        )}
                        <TouchableOpacity
                            style={imgGridStyles.removeBtn}
                            onPress={() => onRemove(i)}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                            <Ionicons name="close-circle" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                ))}
                {canAdd && (
                    <TouchableOpacity style={imgGridStyles.addBtn} onPress={onAdd} activeOpacity={0.7}>
                        <Ionicons name="camera-outline" size={22} color={colors.primary} />
                        <Text style={imgGridStyles.addText}>Add</Text>
                    </TouchableOpacity>
                )}
            </View>
            {images.length === 0 && (
                <View style={imgGridStyles.emptyBox}>
                    <Ionicons name="image-outline" size={32} color={colors.placeholder} />
                    <Text style={imgGridStyles.emptyText}>No images added yet</Text>
                </View>
            )}
        </View>
    );
};

const VideoUploadGrid = ({ videos, onAdd, onRemove, label, max }: {
    videos: UploadedImage[]; onAdd: () => void; onRemove: (i: number) => void; label: string; max?: number;
}) => {
    const canAdd = !max || videos.length < max;
    return (
        <View style={imgGridStyles.wrapper}>
            <Text style={imgGridStyles.label}>{label} ({videos.length}{max ? `/${max}` : ""})</Text>
            <View style={imgGridStyles.grid}>
                {videos.map((vid, i) => (
                    <View key={i} style={imgGridStyles.item}>
                        <View style={[imgGridStyles.img, { justifyContent: "center", alignItems: "center", backgroundColor: "#f0f0f0" }]}>
                            <Ionicons name="videocam" size={28} color={colors.primary} />
                            <Text numberOfLines={1} style={{ fontSize: 10 }}>Video {i + 1}</Text>
                        </View>
                        {i === 0 && (
                            <View style={imgGridStyles.primaryBadge}>
                                <Text style={imgGridStyles.primaryText}>Primary</Text>
                            </View>
                        )}
                        <TouchableOpacity style={imgGridStyles.removeBtn} onPress={() => onRemove(i)}>
                            <Ionicons name="close-circle" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                ))}
                {canAdd && (
                    <TouchableOpacity style={imgGridStyles.addBtn} onPress={onAdd}>
                        <Ionicons name="videocam-outline" size={22} color={colors.primary} />
                        <Text style={imgGridStyles.addText}>Add</Text>
                    </TouchableOpacity>
                )}
            </View>
            {videos.length === 0 && (
                <View style={imgGridStyles.emptyBox}>
                    <Ionicons name="videocam-outline" size={32} color={colors.placeholder} />
                    <Text style={imgGridStyles.emptyText}>No videos added yet</Text>
                </View>
            )}
        </View>
    );
};

const imgGridStyles = StyleSheet.create({
    wrapper: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: "700", color: colors.secondary, marginBottom: 10 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    item: { position: "relative" },
    img: { width: 80, height: 80, borderRadius: 10 },
    primaryBadge: {
        position: "absolute",
        bottom: 4,
        left: 4,
        backgroundColor: colors.primary,
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    primaryText: { fontSize: 9, color: "#fff", fontWeight: "700" },
    existingBadge: {
        position: "absolute",
        bottom: 4,
        right: 4,
        backgroundColor: "#22C55E",
        borderRadius: 8,
        padding: 2,
    },
    removeBtn: { position: "absolute", top: -6, right: -6 },
    addBtn: {
        width: 80,
        height: 80,
        borderRadius: 10,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.primary,
        backgroundColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    addText: { fontSize: 11, color: colors.primary, fontWeight: "600" },
    emptyBox: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.formBorder,
        borderRadius: 12,
        paddingVertical: 28,
        gap: 8,
        backgroundColor: colors.formBg,
    },
    emptyText: { fontSize: 13, color: colors.placeholder },
});

// ─── Nav Buttons ──────────────────────────────────────────────────────────────

const NavButtons = ({
    currentStep, totalSteps, onPrev, onNext, onSubmit, loading, isNextEnabled,
}: {
    currentStep: number; totalSteps: number; onPrev: () => void; onNext: () => void;
    onSubmit: () => void; loading: boolean; isNextEnabled: boolean;
}) => {
    const isLast = currentStep === totalSteps;
    return (
        <View style={navStyles.row}>
            {currentStep > 1 ? (
                <TouchableOpacity style={navStyles.backBtn} onPress={onPrev} activeOpacity={0.8}>
                    <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
                    <Text style={navStyles.backText}>Back</Text>
                </TouchableOpacity>
            ) : (
                <View style={{ flex: 1 }} />
            )}
            <TouchableOpacity
                style={[navStyles.nextBtn, !isNextEnabled && navStyles.nextBtnDisabled, isLast && navStyles.submitBtn]}
                onPress={isLast ? onSubmit : onNext}
                disabled={!isNextEnabled || loading}
                activeOpacity={0.85}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <>
                        <Text style={navStyles.nextText}>{isLast ? "Save Changes" : "Continue"}</Text>
                        <Ionicons
                            name={isLast ? "checkmark-circle-outline" : "arrow-forward-outline"}
                            size={18}
                            color="#fff"
                        />
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
};

const navStyles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 6,
        borderTopWidth: 1,
        borderTopColor: colors.formBorder,
        backgroundColor: colors.scaffoldBg,
    },
    backBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderWidth: 1.5,
        borderColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 13,
    },
    backText: { fontSize: 15, fontWeight: "600", color: colors.primary },
    nextBtn: {
        flex: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 13,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    nextBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
    submitBtn: { backgroundColor: "#EA580C" },
    nextText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});

// ─── Shared helpers ───────────────────────────────────────────────────────────

const Card = ({ children }: { children: React.ReactNode }) => (
    <View style={sharedStyles.card}>{children}</View>
);

const InfoBox = ({ text, warning }: { text: string; warning?: boolean }) => (
    <View style={[sharedStyles.infoBox, warning && sharedStyles.infoBoxWarn]}>
        <Ionicons
            name={warning ? "warning-outline" : "information-circle-outline"}
            size={16}
            color={warning ? "#D97706" : colors.primary}
        />
        <Text style={[sharedStyles.infoText, warning && sharedStyles.infoTextWarn]}>{text}</Text>
    </View>
);

const SectionTitle = ({ title }: { title: string }) => (
    <Text style={sharedStyles.sectionTitle}>{title}</Text>
);

const sharedStyles = StyleSheet.create({
    card: { paddingHorizontal: 20, paddingBottom: 8 },
    infoBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#EFF6FF",
        borderRadius: 10,
        padding: 12,
        marginBottom: 14,
        gap: 8,
    },
    infoBoxWarn: { backgroundColor: "#FFFBEB" },
    infoText: { flex: 1, fontSize: 12, color: colors.primary, lineHeight: 18, fontWeight: "500" },
    infoTextWarn: { color: "#92400E" },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.primary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 14,
    },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const VendorEditProductScreen = ({ navigation, route }: any) => {
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView>(null);

    const productId: string = route?.params?.productId ?? "";
    const vendorId: string = route?.params?.vendorId ?? "";

    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // ── Dropdown options ───────────────────────────────────────────────────────
    const [productCategories, setProductCategories] = useState<DropdownOption[]>([]);
    const [categories, setCategories] = useState<DropdownOption[]>([]);
    const [brands, setBrands] = useState<DropdownOption[]>([]);
    const [units, setUnits] = useState<DropdownOption[]>([]);
    const [gstRules, setGstRules] = useState<DropdownOption[]>([]);
    const [variantTypes, setVariantTypes] = useState<VariantOptionModel[]>([]);
    const [ddLoading, setDdLoading] = useState(false);

    // ── Form state ─────────────────────────────────────────────────────────────
    const [form, setForm] = useState<ProductForm>({
        name: "",
        description: "",
        slug: "",
        mrp: "",
        stock: "",
        minQty: "1",
        isActive: true,
        isFeatured: false,
        isTrending: false,
        returnable: true,
        material: "",
        pattern: "",
        sleeveLength: "",
        fit: "",
        vendorId,
        productCategoryId: "",
        categoryId: "",
        brandId: "",
        unitId: "",
        gst: { gstRuleId: "", hsnCode: "", gstPercent: "", gstAmount: "", priceIncludingGST: "" },
    });

    const [variants, setVariants] = useState<Variant[]>([]);
    const [productImages, setProductImages] = useState<UploadedImage[]>([]);
    const [productVideos, setProductVideos] = useState<UploadedImage[]>([]);

    // ── Formatted categories ───────────────────────────────────────────────────
    const formattedCategories: DropdownOption[] = productCategories.map((item) => ({
        _id: item._id,
        name: `${item.l1Category?.name ?? ""} > ${item.l2Category?.name ?? ""} > ${item.l3Category?.name ?? ""} > ${item.l4Category?.name ?? ""}`,
    }));

    const updateForm = (field: keyof ProductForm, value: any) =>
        setForm((p) => ({ ...p, [field]: value }));

    const updateGst = (field: keyof GstDetails, value: string) =>
        setForm((p) => ({ ...p, gst: { ...p.gst, [field]: value } }));

    const handleNameChange = (text: string) => {
        const slug = text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
        setForm((p) => ({ ...p, name: text, slug }));
    };

    // ── Load dropdowns ─────────────────────────────────────────────────────────
    const loadDropdowns = useCallback(async () => {
        setDdLoading(true);
        try {
            const [pcRes, catRes, brandRes, unitRes, gstRes, pcVariants] = await Promise.allSettled([
                getRequest(API_ENDPOINTS.GETALLPRODUCTCATEGORIES),
                getRequest(API_ENDPOINTS.GETALLVENDORCATEGORIES),
                getRequest(API_ENDPOINTS.BRANDSGETALL),
                getRequest(API_ENDPOINTS.GETALLUNITS),
                getRequest(API_ENDPOINTS.GETALLGSTRULES),
                getRequest(API_ENDPOINTS.GETALLVARIANTS),
            ]);
            if (pcRes.status === "fulfilled") setProductCategories((pcRes.value as any)?.data ?? []);
            if (catRes.status === "fulfilled") setCategories((catRes.value as any)?.data ?? []);
            if (brandRes.status === "fulfilled") setBrands((brandRes.value as any)?.data ?? []);
            if (unitRes.status === "fulfilled") setUnits((unitRes.value as any)?.data ?? []);
            if (gstRes.status === "fulfilled") setGstRules((gstRes.value as any)?.data ?? []);
            if (pcVariants.status === "fulfilled") setVariantTypes((pcVariants.value as any)?.data ?? []);
        } catch (e) {
            /* silent */
        } finally {
            setDdLoading(false);
        }
    }, []);

    // ── Load existing product data ─────────────────────────────────────────────
    const loadProduct = useCallback(async () => {
        if (!productId) {
            setInitialLoading(false);
            return;
        }
        try {
            const res: any = await getRequest(`/product/get/${productId}`);
            const p = res?.data;
            if (!p) throw new Error("Product not found");

            // ── Patch form ───────────────────────────────────────────────────
            setForm({
                name: p.name ?? "",
                description: p.description ?? "",
                slug: p.slug ?? "",
                mrp: p.mrp != null ? String(p.mrp) : "",
                stock: p.stock != null ? String(p.stock) : "",
                minQty: p.minQty != null ? String(p.minQty) : "1",
                isActive: p.isActive ?? true,
                isFeatured: p.isFeatured ?? false,
                isTrending: p.isTrending ?? false,
                returnable: p.returnable ?? true,
                material: p.attributes?.material ?? "",
                pattern: p.attributes?.pattern ?? "",
                sleeveLength: p.attributes?.sleeveLength ?? "",
                fit: p.attributes?.fit ?? "",
                vendorId: p.vendorId?._id ?? p.vendorId ?? vendorId,
                productCategoryId: p.productCategory?._id ?? p.productCategory ?? "",
                categoryId: p.category?._id ?? p.category ?? "",
                brandId: p.attributes?.brand?._id ?? p.attributes?.brand ?? "",
                unitId: "",
                gst: {
                    gstRuleId: p.gst?.gstRuleId?._id ?? p.gst?.gstRuleId ?? "",
                    hsnCode: p.gst?.hsnCode ?? "",
                    gstPercent: p.gst?.gstPercent != null ? String(p.gst.gstPercent) : "",
                    gstAmount: p.gst?.gstAmount != null ? String(p.gst.gstAmount) : "",
                    priceIncludingGST: p.gst?.priceIncludingGST != null ? String(p.gst.priceIncludingGST) : "",
                },
            });

            // ── Patch variants ───────────────────────────────────────────────
            if (Array.isArray(p.variants)) {
                const mapped: Variant[] = p.variants.map((v: any) => ({
                    id: v._id ?? Date.now().toString(),
                    _serverId: v._id,
                    variantId: v.variantId?._id ?? v.variantId ?? "",
                    size: v.attributes?.size ?? "",
                    color: v.attributes?.color ?? "",
                    unit: v.unit?._id ?? v.unit ?? "",
                    unitValue: v.unitValue != null ? String(v.unitValue) : "1",
                    stock: v.stock != null ? String(v.stock) : "",
                    sku: v.sku ?? "",
                    price: v.price != null ? String(v.price) : "",
                    attributes: v.attributes ?? {},
                    images: Array.isArray(v.images)
                        ? v.images.map((img: any) => ({
                            uri: typeof img === "string" ? img : img?.url ?? img?.uri ?? "",
                            name: typeof img === "string" ? img.split("/").pop() ?? "image.jpg" : img?.name ?? "image.jpg",
                            type: "image/jpeg",
                            isExisting: true,
                        }))
                        : [],
                }));
                setVariants(mapped);
            }

            // ── Patch product images ─────────────────────────────────────────
            if (Array.isArray(p.images)) {
                setProductImages(
                    p.images.map((img: any) => ({
                        uri: typeof img === "string" ? img : img?.url ?? img?.uri ?? "",
                        name: typeof img === "string" ? img.split("/").pop() ?? "image.jpg" : img?.name ?? "image.jpg",
                        type: "image/jpeg",
                        isExisting: true,
                    }))
                );
            }

            // ── Patch product videos ─────────────────────────────────────────
            if (Array.isArray(p.videos)) {
                setProductVideos(
                    p.videos.map((vid: any) => ({
                        uri: typeof vid === "string" ? vid : vid?.url ?? vid?.uri ?? "",
                        name: typeof vid === "string" ? vid.split("/").pop() ?? "video.mp4" : vid?.name ?? "video.mp4",
                        type: "video/mp4",
                        isExisting: true,
                    }))
                );
            }

            // Mark all steps as visited since data is pre-filled
            setCompletedSteps(new Set([1, 2, 3, 4]));
        } catch (err: any) {
            Toast.show({ type: "error", text1: "Load Failed", text2: err?.message ?? "Could not load product" });
        } finally {
            setInitialLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        loadDropdowns();
        loadProduct();
    }, []);

    // ── Variant helpers ────────────────────────────────────────────────────────
    const addVariant = () => {
        setVariants((prev) => [
            ...prev,
            { id: Date.now().toString(), variantId: "", size: "", color: "", unit: "", unitValue: "1", stock: "", sku: "", price: "", images: [], attributes: {} },
        ]);
    };

    const updateVariant = (id: string, field: keyof Variant, value: any) =>
        setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));

    const removeVariant = (id: string) =>
        setVariants((prev) => prev.filter((v) => v.id !== id));

    const pickVariantImages = useCallback((variantId: string) => {
        Alert.alert("Select Image", "Choose source", [
            { text: "Camera", onPress: () => launchCamera({ mediaType: "photo", quality: 0.8 }, (res) => applyVariantImage(res, variantId)) },
            { text: "Gallery", onPress: () => launchImageLibrary({ mediaType: "photo", quality: 0.8, selectionLimit: 5 }, (res) => applyVariantImage(res, variantId)) },
            { text: "Cancel", style: "cancel" },
        ]);
    }, []);

    const applyVariantImage = (res: ImagePickerResponse, vId: string) => {
        if (res.didCancel || res.errorCode) return;
        const newImages: UploadedImage[] = (res.assets ?? []).map((a) => ({
            uri: a.uri!,
            name: a.fileName ?? `variant_${vId}_${Date.now()}.jpg`,
            type: a.type ?? "image/jpeg",
        }));
        setVariants((prev) => prev.map((v) => v.id === vId ? { ...v, images: [...v.images, ...newImages] } : v));
    };

    const handleRemoveVariantImage = (variantId: string, imageIndex: number) => {
        setVariants((prev) =>
            prev.map((v) => v.id === variantId ? { ...v, images: v.images.filter((_, i) => i !== imageIndex) } : v)
        );
    };

    const pickProductImages = useCallback(() => {
        Alert.alert("Select Images", "Choose source", [
            { text: "Camera", onPress: () => launchCamera({ mediaType: "photo" }, applyProductImages) },
            { text: "Gallery", onPress: () => launchImageLibrary({ mediaType: "photo", selectionLimit: 8 }, applyProductImages) },
            { text: "Cancel", style: "cancel" },
        ]);
    }, []);

    const applyProductImages = (res: ImagePickerResponse) => {
        if (res.didCancel || res.errorCode) return;
        const newImgs: UploadedImage[] = (res.assets ?? []).map((a) => ({
            uri: a.uri!,
            name: a.fileName ?? `product_${Date.now()}.jpg`,
            type: a.type ?? "image/jpeg",
        }));
        setProductImages((p) => [...p, ...newImgs]);
    };

    const pickProductVideos = async () => {
        const result = await launchImageLibrary({ mediaType: "video", selectionLimit: 1 });
        if (result.assets) {
            const newVideos = result.assets.map((file) => ({
                uri: file.uri!,
                name: file.fileName || `video-${Date.now()}.mp4`,
                type: file.type || "video/mp4",
            }));
            setProductVideos((prev) => [...prev, ...newVideos]);
        }
    };

    // ── Step validations ───────────────────────────────────────────────────────
    const isStep1Valid = form.name.trim().length > 2 && form.mrp.trim().length > 0 && !!form.productCategoryId && !!form.categoryId;
    const isStep2Valid = true;
    const isStep3Valid = variants.length > 0 && variants.every((v) => v.price.trim() && v.stock.trim() && v.variantId);
    const isStep4Valid = form.gst.hsnCode.trim().length > 0 && form.gst.gstPercent.trim().length > 0;
    const isStep5Valid = productImages.length > 0;

    const stepValidity: Record<number, boolean> = {
        1: !!isStep1Valid,
        2: !!isStep2Valid,
        3: !!isStep3Valid,
        4: !!isStep4Valid,
        5: !!isStep5Valid,
    };

    const goToStep = (step: number) => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        setCurrentStep(step);
    };

    const handleNext = () => {
        if (!stepValidity[currentStep]) return;
        setCompletedSteps((prev) => new Set([...prev, currentStep]));
        goToStep(currentStep + 1);
    };

    const handleBack = () => goToStep(currentStep - 1);

    // ── Submit (PATCH) ─────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!isStep5Valid) {
            Toast.show({ type: "error", text1: "Images Required", text2: "Add at least one product image" });
            return;
        }

        let vid = form.vendorId;
        if (!vid) {
            const { user } = await getUserData();
            vid = user?.user?._id ?? "";
        }
        if (!vid) {
            Toast.show({ type: "error", text1: "Error", text2: "Vendor ID not found. Please re-login." });
            return;
        }

        setLoading(true);

        try {
            const { token } = await getUserData();

            const payload = {
                vendorId: vid,
                productCategory: form.productCategoryId,
                category: form.categoryId,
                name: form.name.trim(),
                description: form.description.trim(),
                slug: form.slug,
                mrp: parseFloat(form.mrp),
                stock: parseInt(form.stock || "0"),
                isActive: form.isActive,
                isFeatured: form.isFeatured,
                isTrending: form.isTrending,
                returnable: form.returnable,
                minQty: parseInt(form.minQty || "1"),
                attributes: {
                    brand: form.brandId || undefined,
                    material: form.material || undefined,
                    pattern: form.pattern || undefined,
                    sleeveLength: form.sleeveLength || undefined,
                    fit: form.fit || undefined,
                },
                variants: variants.map((v) => ({
                    ...(v._serverId ? { _id: v._serverId } : {}),
                    variantId: v.variantId,
                    attributes: v.attributes || {},
                    unit: v.unit,
                    unitValue: parseInt(v.unitValue || "1"),
                    stock: parseInt(v.stock || "0"),
                    sku: v.sku,
                    price: parseFloat(v.price),
                })),
                gst: {
                    gstRuleId: form.gst.gstRuleId || undefined,
                    hsnCode: form.gst.hsnCode,
                    gstPercent: parseFloat(form.gst.gstPercent),
                    gstAmount: parseFloat(form.gst.gstAmount || "0"),
                    priceIncludingGST: parseFloat(form.gst.priceIncludingGST || "0"),
                },
            };

            // ── PATCH the product ────────────────────────────────────────────
            const updateRes: any = await putRequest(`/product/update/${productId}`, payload);
            if (!updateRes?.success) {
                Toast.show({ type: "error", text1: "Update Failed", text2: updateRes?.message || "Could not update product" });
                setLoading(false);
                return;
            }

            // ── Upload NEW images (skip existing ones) ───────────────────────
            const newProductImages = productImages.filter((img) => !img.isExisting);
            if (newProductImages.length > 0) {
                try {
                    const imgForm = new FormData();
                    imgForm.append("productId", productId);
                    newProductImages.forEach((img) => {
                        imgForm.append("productImages", {
                            uri: img.uri,
                            name: img.name || `image_${Date.now()}.jpg`,
                            type: img.type || "image/jpeg",
                        } as any);
                    });
                    const uploadRes = await uploadRequest(API_ENDPOINTS.UPLOADPRODUCTIMAGE, imgForm);
                    if (!uploadRes?.success) {
                        Toast.show({ type: "error", text1: "Image Upload Failed", text2: "Product updated but new images failed to upload" });
                    }
                } catch (err) {
                    Toast.show({ type: "error", text1: "Image Upload Failed", text2: "Product updated but new images failed to upload" });
                }
            }

            // ── Upload NEW videos (skip existing ones) ───────────────────────
            const newProductVideos = productVideos.filter((vid) => !vid.isExisting);
            if (newProductVideos.length > 0) {
                try {
                    const videoForm = new FormData();
                    videoForm.append("productId", productId);
                    newProductVideos.forEach((v) => {
                        videoForm.append("productVideos", {
                            uri: v.uri,
                            name: v.name || `video_${Date.now()}.mp4`,
                            type: v.type || "video/mp4",
                        } as any);
                    });
                    const videoUploadRes = await uploadRequest(API_ENDPOINTS.UPLOADPRODUCTVIDEO, videoForm);
                    if (!videoUploadRes?.success) {
                        Toast.show({ type: "error", text1: "Video Upload Failed", text2: "Product updated but videos failed to upload" });
                    }
                } catch (err) {
                    Toast.show({ type: "error", text1: "Video Upload Failed", text2: "Product updated but videos failed to upload" });
                }
            }

            // ── Upload NEW variant images ─────────────────────────────────────
            const savedVariants: any[] = updateRes?.data?.variants ?? [];
            const variantsWithNewImages = variants.filter((v) => v.images.some((img) => !img.isExisting));

            await Promise.allSettled(
                variantsWithNewImages.map(async (v, i) => {
                    const variantDoc = v._serverId
                        ? savedVariants.find((sv) => sv._id === v._serverId)
                        : savedVariants[i];
                    if (!variantDoc?._id) return;

                    const newVarImages = v.images.filter((img) => !img.isExisting);
                    if (newVarImages.length === 0) return;

                    const vForm = new FormData();
                    vForm.append("productId", productId);
                    vForm.append("variantId", variantDoc._id);
                    newVarImages.forEach((img) => {
                        vForm.append("variantImages", { uri: img.uri, name: img.name, type: img.type } as any);
                    });
                    await fetch(`${API_ENDPOINTS.UPLOADPRODUCTVARIANTIMAGE}`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
                        body: vForm,
                    });
                })
            );

            setLoading(false);
            Toast.show({ type: "success", text1: "Product Updated!", text2: "Your changes have been saved." });
            navigation.goBack();
        } catch (err: any) {
            setLoading(false);
            Toast.show({ type: "error", text1: "Error", text2: err?.message || "Something went wrong. Please try again." });
        }
    };

    // ── Step renderers ─────────────────────────────────────────────────────────

    const renderStep1 = () => (
        <>
            <PageHeader title="Basic Info" subtitle="Update the core product details." icon="information-circle-outline" />
            <Card>
                <InfoBox text="Changes to name, MRP, or category will be reflected immediately after saving." />
                <FloatingInput
                    label="Product Name *"
                    placeholder="e.g. Men Regular Fit Cotton Shirt"
                    value={form.name}
                    onChangeText={handleNameChange}
                    rightIcon={<Ionicons name="pricetag-outline" size={18} color={colors.placeholder} />}
                />
                <FloatingInput
                    label="Description"
                    placeholder="Brief description of the product"
                    value={form.description}
                    onChangeText={(t: string) => updateForm("description", t)}
                    multiline
                    numberOfLines={3}
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <FloatingInput
                            label="MRP (₹) *"
                            placeholder="0"
                            value={form.mrp}
                            onChangeText={(t: string) => updateForm("mrp", t.replace(/\D/g, ""))}
                            keyboardType="numeric"
                            rightIcon={<Ionicons name="cash-outline" size={18} color={colors.placeholder} />}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <FloatingInput
                            label="Total Stock"
                            placeholder="0"
                            value={form.stock}
                            onChangeText={(t: string) => updateForm("stock", t.replace(/\D/g, ""))}
                            keyboardType="numeric"
                        />
                    </View>
                </View>
                <FloatingInput
                    label="Min Order Qty"
                    placeholder="1"
                    value={form.minQty}
                    onChangeText={(t: string) => updateForm("minQty", t.replace(/\D/g, ""))}
                    keyboardType="numeric"
                />
                <DropdownPicker
                    label="Product Category *"
                    value={form.productCategoryId}
                    placeholder="Select product category"
                    options={formattedCategories}
                    onSelect={(opt) => updateForm("productCategoryId", opt._id)}
                    loading={ddLoading}
                />
                <DropdownPicker
                    label="Category *"
                    value={form.categoryId}
                    placeholder="Select category"
                    options={categories}
                    onSelect={(opt) => updateForm("categoryId", opt._id)}
                    loading={ddLoading}
                />
                <SectionTitle title="Listing Options" />
                <ToggleRow label="Active Listing" hint="Product will be visible to customers" value={form.isActive} onToggle={(v) => updateForm("isActive", v)} />
                <ToggleRow label="Featured Product" hint="Show in featured sections" value={form.isFeatured} onToggle={(v) => updateForm("isFeatured", v)} />
                <ToggleRow label="Trending" hint="Mark as a trending product" value={form.isTrending} onToggle={(v) => updateForm("isTrending", v)} />
                <ToggleRow label="Returnable" hint="Allow return requests for this product" value={form.returnable} onToggle={(v) => updateForm("returnable", v)} />
            </Card>
        </>
    );

    const renderStep2 = () => (
        <>
            <PageHeader title="Attributes" subtitle="Update product attributes and brand." icon="list-outline" />
            <Card>
                <InfoBox text="Attributes like material, fit, and pattern help customers filter and find your product." />
                <DropdownPicker
                    label="Brand"
                    value={form.brandId}
                    placeholder="Select brand (optional)"
                    options={brands}
                    onSelect={(opt) => updateForm("brandId", opt._id)}
                    loading={ddLoading}
                />
                <FloatingInput label="Material" placeholder="e.g. Cotton, Polyester" value={form.material} onChangeText={(t: string) => updateForm("material", t)} />
                <FloatingInput label="Pattern" placeholder="e.g. Solid, Striped, Printed" value={form.pattern} onChangeText={(t: string) => updateForm("pattern", t)} />
                <FloatingInput label="Sleeve Length" placeholder="e.g. Full Sleeve, Half Sleeve" value={form.sleeveLength} onChangeText={(t: string) => updateForm("sleeveLength", t)} />
                <FloatingInput label="Fit" placeholder="e.g. Regular, Slim, Relaxed" value={form.fit} onChangeText={(t: string) => updateForm("fit", t)} />
            </Card>
        </>
    );

    const renderStep3 = () => (
        <>
            <PageHeader title="Variants" subtitle="Update variants with pricing, stock and images." icon="layers-outline" />
            <Card>
                <InfoBox text="You can add new variants or update existing ones. Existing variant images are preserved unless removed." />
                {variants.length === 0 ? (
                    <View style={step3Styles.emptyState}>
                        <Ionicons name="layers-outline" size={40} color={colors.placeholder} />
                        <Text style={step3Styles.emptyTitle}>No Variants Yet</Text>
                        <Text style={step3Styles.emptyHint}>Add at least one variant</Text>
                    </View>
                ) : (
                    variants.map((v, i) => (
                        <VariantCard
                            key={v.id}
                            variant={v}
                            index={i}
                            variantOptions={variantTypes}
                            unitOptions={units}
                            onChange={updateVariant}
                            onRemove={removeVariant}
                            onPickImages={pickVariantImages}
                            onRemoveImage={handleRemoveVariantImage}
                        />
                    ))
                )}
                <TouchableOpacity style={step3Styles.addBtn} onPress={addVariant} activeOpacity={0.8}>
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                    <Text style={step3Styles.addBtnText}>Add Variant</Text>
                </TouchableOpacity>
            </Card>
        </>
    );

    const renderStep4 = () => {
        const isGstLocked = !!form.gst.gstRuleId;
        return (
            <>
                <PageHeader title="GST & Tax" subtitle="Update HSN code and GST percentage." icon="receipt-outline" />
                <Card>
                    <InfoBox text="GST details are used for invoicing and tax compliance." />
                    <DropdownPicker
                        label="GST Rule"
                        value={form.gst.gstRuleId}
                        placeholder="Select GST rule (optional)"
                        options={gstRules.map((r) => ({ ...r, name: `${r.hsnCode} (${r.igst}%)` }))}
                        onSelect={(opt: any) => {
                            updateGst("gstRuleId", opt._id);
                            updateGst("hsnCode", opt.hsnCode || "");
                            updateGst("gstPercent", String(opt.igst || ""));
                            if (form.mrp && opt.igst) {
                                const gstAmt = (parseFloat(form.mrp) * parseFloat(opt.igst)) / 100;
                                updateGst("gstAmount", gstAmt.toFixed(2));
                                updateGst("priceIncludingGST", (parseFloat(form.mrp) + gstAmt).toFixed(2));
                            }
                        }}
                        loading={ddLoading}
                    />
                    <FloatingInput
                        label="HSN Code *"
                        placeholder="e.g. 6205"
                        value={form.gst.hsnCode}
                        onChangeText={(t: string) => updateGst("hsnCode", t)}
                        keyboardType="numeric"
                        editable={!isGstLocked}
                        rightIcon={<Ionicons name="barcode-outline" size={18} color={colors.placeholder} />}
                    />
                    <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                            <FloatingInput label="GST % *" placeholder="e.g. 5" value={form.gst.gstPercent} onChangeText={(t: string) => updateGst("gstPercent", t)} keyboardType="numeric" editable={!isGstLocked} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <FloatingInput label="GST Amount (₹)" placeholder="Auto calc" value={form.gst.gstAmount} onChangeText={(t: string) => updateGst("gstAmount", t)} keyboardType="numeric" editable={!isGstLocked} />
                        </View>
                    </View>
                    <FloatingInput
                        label="Price Incl. GST (₹)"
                        placeholder="Auto calc"
                        value={form.gst.priceIncludingGST}
                        onChangeText={(t: string) => updateGst("priceIncludingGST", t)}
                        keyboardType="numeric"
                        editable={!isGstLocked}
                        rightIcon={<Ionicons name="calculator-outline" size={18} color={colors.placeholder} />}
                    />
                    {form.mrp && form.gst.gstPercent ? (
                        <View style={step4Styles.calcBox}>
                            <Ionicons name="information-circle-outline" size={15} color="#92400E" />
                            <Text style={step4Styles.calcText}>
                                Quick calc: ₹{form.mrp} × {form.gst.gstPercent}% ≈ ₹
                                {((parseFloat(form.mrp) * parseFloat(form.gst.gstPercent)) / 100).toFixed(2)} GST
                            </Text>
                        </View>
                    ) : null}
                    {isGstLocked && (
                        <TouchableOpacity
                            onPress={() => {
                                updateGst("gstRuleId", "");
                                updateGst("hsnCode", "");
                                updateGst("gstPercent", "");
                                updateGst("gstAmount", "");
                                updateGst("priceIncludingGST", "");
                            }}
                        >
                            <Text style={{ color: "red", marginTop: 10 }}>Clear GST Rule</Text>
                        </TouchableOpacity>
                    )}
                </Card>
            </>
        );
    };

    const renderStep5 = () => (
        <>
            <PageHeader title="Product Media" subtitle="Update product images and videos." icon="images-outline" />
            <Card>
                <InfoBox
                    text="Existing images are shown with a green cloud icon. Add new ones or remove existing ones."
                    warning
                />
                <ImageUploadGrid
                    images={productImages}
                    onAdd={pickProductImages}
                    onRemove={(i) => setProductImages((p) => p.filter((_, idx) => idx !== i))}
                    label="Product Images"
                    max={5}
                />
                <Text style={step5Styles.hint}>Supported: JPG, PNG · Max 5 images</Text>

                <View style={{ marginTop: 20 }}>
                    <VideoUploadGrid
                        videos={productVideos}
                        onAdd={pickProductVideos}
                        onRemove={(i) => setProductVideos((p) => p.filter((_, idx) => idx !== i))}
                        label="Product Videos"
                        max={1}
                    />
                    <Text style={step5Styles.hint}>Supported: MP4 · Max 1 video · Keep under 30 seconds</Text>
                </View>
            </Card>
        </>
    );

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            case 5: return renderStep5();
            default: return null;
        }
    };

    // ── Loading skeleton ───────────────────────────────────────────────────────
    if (initialLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.scaffoldBg }} edges={["bottom"]}>
                <AppBar title="Edit Product" onBack={() => navigation.goBack()} />
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ color: colors.placeholder, fontSize: 14 }}>Loading product…</Text>
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
                <AppBar title="Edit Product" onBack={() => navigation.goBack()} />

                <StepIndicator
                    currentStep={currentStep}
                    onStepPress={(s) => {
                        if (s <= currentStep || completedSteps.has(s - 1) || completedSteps.has(s)) {
                            goToStep(s);
                        }
                    }}
                    completedSteps={completedSteps}
                />

                <ScrollView
                    ref={scrollRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    automaticallyAdjustKeyboardInsets
                >
                    {renderCurrentStep()}
                </ScrollView>

                <NavButtons
                    currentStep={currentStep}
                    totalSteps={STEPS.length}
                    onPrev={handleBack}
                    onNext={handleNext}
                    onSubmit={handleSubmit}
                    loading={loading}
                    isNextEnabled={stepValidity[currentStep]}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// ─── Step-specific styles ─────────────────────────────────────────────────────

const step3Styles = StyleSheet.create({
    emptyState: {
        alignItems: "center",
        paddingVertical: 32,
        gap: 8,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.formBorder,
        borderRadius: 14,
        marginBottom: 14,
    },
    emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.secondary },
    emptyHint: { fontSize: 13, color: colors.placeholder },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderWidth: 1.5,
        borderColor: colors.primary,
        borderStyle: "dashed",
        borderRadius: 12,
        paddingVertical: 14,
        backgroundColor: "#EFF6FF",
        marginTop: 4,
    },
    addBtnText: { fontSize: 14, fontWeight: "600", color: colors.primary },
});

const step4Styles = StyleSheet.create({
    calcBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#FFFBEB",
        borderRadius: 10,
        padding: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: "#FDE68A",
        marginTop: 4,
    },
    calcText: { flex: 1, fontSize: 12, color: "#92400E", fontWeight: "500", lineHeight: 18 },
});

const step5Styles = StyleSheet.create({
    hint: { fontSize: 11, color: colors.placeholder, textAlign: "center", marginTop: 4, lineHeight: 16 },
});

export default VendorEditProductScreen;
