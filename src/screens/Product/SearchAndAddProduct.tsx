/**
 * SearchAndAddProduct.tsx
 *
 * Two-mode screen:
 *  - "search"  → Search & Add Product  (isMainCatalogProduct: false)
 *  - "new"     → Add New Product       (isMainCatalogProduct: true)
 *
 * Fixes applied:
 *  - Uses AppBar component for header
 *  - Empty string query also triggers search (browse all)
 *  - Uses Pagination component instead of "Load More" button
 *  - Proper layout spacing and card styling
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ScrollView,
    Platform,
    ActivityIndicator,
    StyleSheet,
    Modal,
    Image,
    Alert,
    Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    buttonStyles,
    colors,
    localStyles,
    textStyles,
} from "../../constants/AppThem";
import { getRequest, postRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";
import { getUserData } from "../../components/AsyncStorage/AsyncStorage";
import AppBar from "../../components/utils/AppBar";
import Pagination from "../../components/utils/Pagination";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ProductImage {
    url: string;
    name: string;
    alt: string;
    isPrimary: boolean;
    position: number;
}

interface ProductVariant {
    _id: string;
    attributes: Record<string, string>;
    unit: string;
    unitValue: number;
    stock: number;
    sku: string;
    price: number;
    mrp: number;
    images: ProductImage[];
}

interface Brand {
    _id: string;
    name: string;
}

interface CatalogProduct {
    _id: string;
    name: string;
    description: string;
    slug: string;
    images: ProductImage[];
    variants: ProductVariant[];
    brand?: Brand;
    isMainCatalogProduct: boolean;
    productCategory: string;
    category: string | { _id?: string;[key: string]: any };
    vendorId: string;
    stock: number;
    mrp: number;
    isActive: boolean;
    isFeatured: boolean;
    isTrending: boolean;
    returnable: boolean;
    minQty: number;
    gst: {
        gstRuleId?: string;
        hsnCode: string;
        gstPercent: number | null;
        gstAmount: number;
        priceIncludingGST: number;
    };
    attributes: {
        brand?: string;
        material?: string;
        pattern?: string;
        sleeveLength?: string;
        fit?: string;
    };
}

interface ApiMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface VariantPricingState {
    variantId: string;
    label: string;
    mrp: string;
    price: string;
    stock: string;
    productHandling?: string;
    productHandlingCharges?: string;
    customerSellingPrice?: string;
    additionalHandling?: any;
    pricingError?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const getPrimaryImage = (images: ProductImage[]): string | undefined => {
    if (!images || images.length === 0) return undefined;
    return (images.find((i) => i.isPrimary) ?? images[0]).url;
};

const buildVariantLabel = (variant: ProductVariant, index: number): string => {
    const attrs = variant.attributes ?? {};
    const parts = Object.entries(attrs)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}: ${v}`);
    return parts.length > 0 ? parts.join(" · ") : `Variant ${index + 1}`;
};

const toFiniteNumber = (value: any): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const getPriceOverMrpError = (price: any, mrp: any): string | undefined => {
    const priceNum = toFiniteNumber(price);
    const mrpNum = toFiniteNumber(mrp);

    if (priceNum != null && mrpNum != null && priceNum > 0 && mrpNum > 0 && priceNum > mrpNum) {
        return "Price cannot exceed MRP.";
    }

    return undefined;
};

const getCustomerPriceOverMrpError = (customerSellingPrice: any, mrp: any): string | undefined => {
    const customerSellingPriceNum = toFiniteNumber(customerSellingPrice);
    const mrpNum = toFiniteNumber(mrp);

    if (
        customerSellingPriceNum != null &&
        mrpNum != null &&
        customerSellingPriceNum > mrpNum
    ) {
        return "Calculated customer price exceeds MRP. Please try again.";
    }

    return undefined;
};

const allVariantsValid = (variants: VariantPricingState[]): boolean =>
    variants.length > 0 &&
    variants.every(
        (v) => {
            const mrpNum = toFiniteNumber(v.mrp);
            const priceNum = toFiniteNumber(v.price);
            const stockNum = toFiniteNumber(v.stock);

            return (
                v.mrp.trim() !== "" &&
                v.price.trim() !== "" &&
                v.stock.trim() !== "" &&
                mrpNum != null &&
                mrpNum > 0 &&
                priceNum != null &&
                priceNum > 0 &&
                stockNum != null &&
                stockNum >= 0 &&
                priceNum <= mrpNum &&
                !v.pricingError
            );
        }
    );

const getCategoryId = (category: CatalogProduct["category"]): string =>
    typeof category === "string" ? category : category?._id ?? "";

// ─── ModeTabs ──────────────────────────────────────────────────────────────────

const ModeTabs: React.FC<{
    mode: "search" | "new";
    onChange: (m: "search" | "new") => void;
}> = ({ mode, onChange }) => (
    <View style={styles.tabRow}>
        {(["search", "new"] as const).map((m) => (
            <TouchableOpacity
                key={m}
                style={[styles.tab, mode === m && styles.tabActive]}
                onPress={() => onChange(m)}
                activeOpacity={0.8}
            >
                <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                    {m === "search" ? "Search & Add" : "Add New Product"}
                </Text>
            </TouchableOpacity>
        ))}
    </View>
);

// ─── ProductRow ────────────────────────────────────────────────────────────────

const ProductRow: React.FC<{
    item: CatalogProduct;
    added: boolean;
    onAdd: (item: CatalogProduct) => void;
}> = ({ item, added, onAdd }) => {
    const imageUri = getPrimaryImage(item.images);
    const lowestPrice =
        item.variants.length > 0
            ? Math.min(...item.variants.map((v) => v.price))
            : 0;
    const highestMrp =
        item.variants.length > 0
            ? Math.max(...item.variants.map((v) => v.mrp))
            : item.mrp;

    return (
        <View style={[styles.productRow, added && { opacity: 0.55 }]}>
            {imageUri ? (
                <Image
                    source={{ uri: imageUri }}
                    style={styles.thumb}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.thumb, styles.thumbFallback]}>
                    <Text style={styles.thumbFallbackText}>{item.name[0]}</Text>
                </View>
            )}

            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.productRowName} numberOfLines={1}>
                    {item.name}
                </Text>
                {item.brand && (
                    <Text style={styles.productRowBrand}>{item.brand.name}</Text>
                )}
                <Text style={styles.productRowMeta}>
                    {item.variants.length > 1
                        ? `${item.variants.length} variants · from ₹${lowestPrice}`
                        : `MRP ₹${highestMrp} · Price ₹${lowestPrice}`}
                </Text>
            </View>

            {added ? (
                <View style={[styles.addBtn, { backgroundColor: "#DCFCE7" }]}>
                    <Text style={[styles.addBtnText, { color: colors.success }]}>
                        Added ✓
                    </Text>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => onAdd(item)}
                    activeOpacity={0.8}
                    disabled={added}
                >
                    <Text style={styles.addBtnText}>Add +</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

// ─── VariantPricingRow ─────────────────────────────────────────────────────────

const VariantPricingRow: React.FC<{
    variant: VariantPricingState;
    onChange: (field: "mrp" | "price" | "stock", value: string) => void;
}> = ({ variant, onChange }) => {
    const mrpNum = parseFloat(variant.mrp) || 0;
    const priceNum = parseFloat(variant.price) || 0;
    const priceError = getPriceOverMrpError(variant.price, variant.mrp);
    const pricingError = variant.pricingError || priceError;
    const marginPct =
        mrpNum > 0 && priceNum > 0
            ? Math.max(0, Math.round(((mrpNum - priceNum) / mrpNum) * 100))
            : null;

    return (
        <View style={styles.variantPricingCard}>
            <View style={styles.variantPricingHeader}>
                <Text style={styles.variantPricingLabel} numberOfLines={1}>
                    {variant.label}
                </Text>
                {marginPct !== null && (
                    <View style={styles.marginPill}>
                        <Text style={styles.marginPillText}>{marginPct}% margin</Text>
                    </View>
                )}
            </View>
            <View style={styles.variantFieldsRow}>
                {(["mrp", "price", "stock"] as const).map((field) => (
                    <View key={field} style={styles.variantField}>
                        <Text style={styles.variantFieldLabel}>
                            {field === "mrp"
                                ? "MRP (₹)"
                                : field === "price"
                                    ? "Price (₹)"
                                    : "Stock"}
                        </Text>
                        <TextInput
                            style={[
                                styles.variantFieldInput,
                                field === "price" &&
                                !!pricingError && { borderColor: colors.error },
                            ]}
                            value={variant[field]}
                            onChangeText={(v) => onChange(field, v)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.placeholder}
                            returnKeyType="done"
                        />
                    </View>
                ))}
            </View>
            {!!pricingError && (
                <Text style={styles.variantPricingErrorText}>
                    {pricingError}
                </Text>
            )}
        </View>
    );
};

// ─── PricingModal ──────────────────────────────────────────────────────────────

const PricingModal: React.FC<{
    visible: boolean;
    product: CatalogProduct | null;
    submitting: boolean;
    onClose: () => void;
    onConfirm: (
        product: CatalogProduct,
        pricings: VariantPricingState[]
    ) => Promise<Record<string, string> | undefined>;
}> = ({ visible, product, submitting, onClose, onConfirm }) => {
    const insets = useSafeAreaInsets();
    const [variantPricings, setVariantPricings] = useState<VariantPricingState[]>([]);

    useEffect(() => {
        if (product) {
            setVariantPricings(
                product.variants.map((v, i) => ({
                    variantId: v._id,
                    label: buildVariantLabel(v, i),
                    mrp: v.mrp > 0 ? String(v.mrp) : "",
                    price: v.price > 0 ? String(v.price) : "",
                    stock: v.stock > 0 ? String(v.stock) : "",
                }))
            );
        }
    }, [product?._id]);

    if (!product) return null;

    const handleFieldChange = (
        index: number,
        field: "mrp" | "price" | "stock",
        value: string
    ) =>
        setVariantPricings((prev) =>
            prev.map((vp, i) => {
                if (i !== index) return vp;

                const next = {
                    ...vp,
                    [field]: value,
                    pricingError: undefined,
                };

                if (field === "price" || field === "mrp") {
                    next.productHandling = undefined;
                    next.productHandlingCharges = undefined;
                    next.customerSellingPrice = undefined;
                    next.additionalHandling = undefined;
                }

                return next;
            })
        );

    const handleConfirmPress = async () => {
        const errors = await onConfirm(product, variantPricings);
        if (!errors || Object.keys(errors).length === 0) return;

        setVariantPricings((prev) =>
            prev.map((vp) => ({
                ...vp,
                pricingError: errors[vp.variantId] || vp.pricingError,
            }))
        );
    };

    const valid = allVariantsValid(variantPricings) && !submitting;
    const imageUri = getPrimaryImage(product.images);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            {/*
             * Same pattern as VendorAddProductScreen DropdownPicker:
             * - TouchableOpacity backdrop closes on tap outside
             * - Sheet sits at the bottom with height: SCREEN_HEIGHT * 0.75
             * - paddingBottom uses real safe area insets — no gap, no transparency
             */}
            <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={onClose}
            >
                <View
                    style={[
                        styles.modalSheet,
                        { paddingBottom: insets.bottom + 12 },
                    ]}
                >
                    {/* Drag handle */}
                    <View style={styles.dragHandle} />

                    {/* Header — NOT tappable through to backdrop */}
                    <TouchableOpacity activeOpacity={1} style={styles.modalHeader}>
                        {imageUri ? (
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.modalThumb}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={[styles.modalThumb, styles.thumbFallback]}>
                                <Text style={styles.thumbFallbackText}>
                                    {product.name[0]}
                                </Text>
                            </View>
                        )}
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.modalTitle} numberOfLines={2}>
                                {product.name}
                            </Text>
                            {product.brand && (
                                <Text style={styles.modalBrand}>{product.brand.name}</Text>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.modalCloseBtn}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Text style={styles.modalCloseText}>✕</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>

                    <View style={styles.modalDivider} />

                    <Text style={styles.modalSubtitle}>
                        {variantPricings.length > 1
                            ? `Set pricing & stock for each of the ${variantPricings.length} variants`
                            : "Set your selling price, MRP & stock"}
                    </Text>

                    {/* Variant rows — wrapped in TouchableOpacity to stop backdrop firing */}
                    <ScrollView
                        style={styles.modalScrollArea}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {variantPricings.map((vp, i) => (
                            <VariantPricingRow
                                key={vp.variantId}
                                variant={vp}
                                onChange={(field, value) => handleFieldChange(i, field, value)}
                            />
                        ))}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={[styles.confirmBtn, !valid && styles.confirmBtnDisabled]}
                            onPress={() => valid && handleConfirmPress()}
                            activeOpacity={0.85}
                            disabled={!valid}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.confirmBtnText}>Add to My Store</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

// ─── SearchAddMode ─────────────────────────────────────────────────────────────

const SearchAddMode: React.FC = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<CatalogProduct[]>([]);
    const [meta, setMeta] = useState<ApiMeta | null>(null);
    const [page, setPage] = useState(1);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState<CatalogProduct | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentQuery = useRef<string>("");

    // ── API call ───────────────────────────────────────────────────────────────
    const fetchCatalog = useCallback(
        async (searchQuery: string, pageNum: number = 1) => {
            // Allow empty string — browse all products (do NOT trim to empty guard)
            const q = searchQuery.trim();
            currentQuery.current = q;
            // Note: empty string is valid — fetches all products

            setSearching(true);
            setError(null);

            try {
                const json = await getRequest(
                    API_ENDPOINTS.VENDORMAINCATALOGPRODUCTS,
                    { search: q, page: pageNum, limit: 10 },
                    true,
                    false
                );

                if (currentQuery.current !== q) return;

                if (json?.success) {
                    const incoming: CatalogProduct[] = json.data ?? [];
                    setResults(incoming);
                    setMeta(json.meta ?? null);
                    setPage(pageNum);
                } else {
                    setError(json?.message || "Failed to fetch products.");
                }
            } catch (err: any) {
                if (currentQuery.current === q) {
                    setError("Network error. Please try again.");
                }
            } finally {
                setSearching(false);
            }
        },
        []
    );

    // Initial load — empty string fetches all
    useEffect(() => {
        fetchCatalog("", 1);
    }, []);

    // Debounced search
    const handleSearch = useCallback(
        (text: string) => {
            setQuery(text);
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
            searchTimeout.current = setTimeout(
                () => fetchCatalog(text, 1),
                350
            );
        },
        [fetchCatalog]
    );

    const handleClear = () => {
        setQuery("");
        fetchCatalog("", 1);
    };

    const handlePageChange = (newPage: number) => {
        fetchCatalog(query, newPage);
    };

    const openModal = (item: CatalogProduct) => {
        setSelected(item);
        setModalOpen(true);
    };
    const closeModal = () => {
        setModalOpen(false);
        setSelected(null);
    };

    const handleConfirm = async (
        product: CatalogProduct,
        variantPricings: VariantPricingState[]
    ): Promise<Record<string, string> | undefined> => {
        setSubmitting(true);

        try {
            const { user } = await getUserData();
            const userId = user?.user?._id;

            if (!userId) {
                Alert.alert("Error", "User ID not found. Please re-login.");
                return;
            }

            const gstPct = parseFloat(product.gst.gstPercent?.toString() ?? "0");
            const categoryId = getCategoryId(product.category);

            if (!categoryId) {
                Alert.alert("Error", "Product category not found. Please try another product.");
                return;
            }

            const pricingErrors: Record<string, string> = {};
            const calculatedPricings = await Promise.all(
                variantPricings.map(async (pricing) => {
                    const priceNum = toFiniteNumber(pricing.price);
                    const mrpNum = toFiniteNumber(pricing.mrp);
                    const priceError = getPriceOverMrpError(priceNum, mrpNum);

                    if (priceError || priceNum == null || priceNum <= 0 || mrpNum == null || mrpNum <= 0) {
                        pricingErrors[pricing.variantId] = priceError || "Enter valid price and MRP.";
                        return pricing;
                    }

                    const handlingRes: any = await postRequest(API_ENDPOINTS.CALCULATEPRODUCTHANDLING, {
                        price: priceNum,
                        mrp: mrpNum,
                        sellingPrice: priceNum,
                        categoryId,
                    });

                    if (!handlingRes?.success || !handlingRes.data) {
                        pricingErrors[pricing.variantId] =
                            handlingRes?.message || "Could not calculate pricing.";
                        return pricing;
                    }

                    const productHandling =
                        handlingRes.data.productHandling ?? handlingRes.data.productHandlingCharges ?? 0;
                    const customerSellingPrice =
                        handlingRes.data.customerSellingPrice ?? handlingRes.data.finalSellingPrice ?? 0;
                    const customerPriceError = getCustomerPriceOverMrpError(customerSellingPrice, mrpNum);

                    if (customerPriceError) {
                        pricingErrors[pricing.variantId] = customerPriceError;
                    }

                    return {
                        ...pricing,
                        productHandling: String(productHandling),
                        productHandlingCharges: String(productHandling),
                        customerSellingPrice: String(customerSellingPrice),
                        additionalHandling: handlingRes.data.additionalHandling,
                        pricingError: customerPriceError,
                    };
                })
            );

            if (Object.keys(pricingErrors).length > 0) {
                return pricingErrors;
            }

            // =========================================================
            // 1️⃣ BUILD FINAL PAYLOAD ONLY (NO POST UPLOAD AFTER)
            // =========================================================

            const payload = {
                vendorId: userId,
                productCategory: product.productCategory,
                category: categoryId,
                name: product.name,
                description: product.description,
                slug: `${product.slug}-${Date.now()}`,

                stock: calculatedPricings.reduce(
                    (s, v) => s + Number(v.stock || 0),
                    0
                ),

                isActive: product.isActive,
                isFeatured: product.isFeatured,
                isTrending: product.isTrending,
                returnable: product.returnable,
                minQty: product.minQty,

                attributes: product.attributes,
                gst: product.gst,

                isMainCatalogProduct: false,
                catalogRef: product._id,

                // ❌ MUST BE FINAL URLs ONLY (no uri, no file://)
                images: product.images
                    .filter((img: any) => img.url)
                    .map((img: any) => ({
                        url: img.url,
                        name: img.name || "",
                        alt: img.alt || "",
                        isPrimary: !!img.isPrimary,
                        position: img.position ?? 0,
                    })),

                variants: product.variants.map((v, i) => {
                    const pricing = calculatedPricings[i];

                    const priceNum = Number(pricing.price || 0);
                    const mrpNum = Number(pricing.mrp || 0);

                    return {
                        _id: v._id, // IMPORTANT for consistency
                        attributes: v.attributes,
                        unit: v.unit,
                        unitValue: v.unitValue,
                        stock: Number(pricing.stock || 0),
                        sku: v.sku,
                        price: priceNum,

                        mrp:
                            product.gst.gstRuleId && gstPct > 0
                                ? priceNum + (priceNum * gstPct) / 100
                                : mrpNum,
                        productHandling: Number(pricing.productHandling || pricing.productHandlingCharges || 0),
                        productHandlingCharges: Number(pricing.productHandlingCharges || pricing.productHandling || 0),
                        customerSellingPrice: Number(pricing.customerSellingPrice || priceNum),
                        additionalHandling: pricing.additionalHandling,

                        images: (v.images || [])
                            .filter((img: any) => img.url)
                            .map((img: any) => ({
                                url: img.url,
                                name: img.name || "",
                                alt: img.alt || "",
                                isPrimary: !!img.isPrimary,
                                position: img.position ?? 0,
                            })),
                    };
                }),
            };

            // =========================================================
            // 2️⃣ SINGLE API CALL ONLY
            // =========================================================

            const res: any = await postRequest(
                API_ENDPOINTS.CREATEPRODUCT,
                payload
            );

            if (!res?.success) {
                Alert.alert("Error", res?.message || "Could not add product.");
                return;
            }

            setAddedIds((prev) => new Set(prev).add(product._id));
            closeModal();

            Alert.alert("Success 🎉", `${product.name} added successfully`);
            return undefined;
        } catch (err: any) {
            Alert.alert("Error", err?.message || "Something went wrong");
            return undefined;
        } finally {
            setSubmitting(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <>
            {/* Search bar */}
            <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    value={query}
                    onChangeText={handleSearch}
                    placeholder="Search product, brand or SKU"
                    placeholderTextColor={colors.placeholder}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                />
                {query.length > 0 && (
                    <TouchableOpacity
                        onPress={handleClear}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Text
                            style={{
                                color: colors.placeholder,
                                fontSize: 17,
                                lineHeight: 22,
                            }}
                        >
                            ✕
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Result count label */}
            {meta && !searching && (
                <Text style={localStyles.sectionLabel}>
                    {meta.total === 0
                        ? "No products found"
                        : query
                            ? `${meta.total} result${meta.total !== 1 ? "s" : ""} for "${query}"`
                            : `All products (${meta.total})`}
                </Text>
            )}
            {!meta && !searching && results.length === 0 && !error && (
                <Text style={localStyles.sectionLabel}>Browse catalogue</Text>
            )}

            {/* Body: loading / error / list */}
            {searching ? (
                <View style={styles.centeredState}>
                    <ActivityIndicator color={colors.primary} size="large" />
                    <Text style={styles.stateText}>
                        {query ? `Searching for "${query}"…` : "Loading catalogue…"}
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        onPress={() => fetchCatalog(query, page)}
                        style={styles.retryBtn}
                    >
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : results.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🔍</Text>
                    <Text style={styles.emptyTitle}>No products found</Text>
                    <Text style={styles.emptySubtitle}>
                        {query
                            ? `No results for "${query}". Try a different search term or clear the search.`
                            : "The catalogue appears to be empty. Try adding a new product."}
                    </Text>
                    {query.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearSearchBtn}
                            onPress={handleClear}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.clearSearchBtnText}>Clear Search</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <>
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item._id}
                        scrollEnabled={false}
                        renderItem={({ item }) => (
                            <ProductRow
                                item={item}
                                added={addedIds.has(item._id)}
                                onAdd={openModal}
                            />
                        )}
                        ItemSeparatorComponent={() => (
                            <View style={localStyles.divider} />
                        )}
                    />

                    {/* Pagination */}
                    {meta && meta.totalPages > 1 && (
                        <View style={styles.paginationWrapper}>
                            <Pagination
                                currentPage={page}
                                totalPages={meta.totalPages}
                                onPageChange={handlePageChange}
                                loading={searching}
                            />
                        </View>
                    )}
                </>
            )}

            {/* Pricing bottom sheet modal */}
            <PricingModal
                visible={modalOpen}
                product={selected}
                submitting={submitting}
                onClose={closeModal}
                onConfirm={handleConfirm}
            />
        </>
    );
};

// ─── AddNewProductMode ─────────────────────────────────────────────────────────

const AddNewProductMode: React.FC<{
    onStart?: () => void;
    loading?: boolean;
}> = ({ onStart, loading }) => (
    <View style={styles.newProductWrap}>
        <View style={styles.newProductIcon}>
            <Text style={{ fontSize: 38 }}>📦</Text>
        </View>

        <Text
            style={[
                textStyles.titleLarge,
                { fontSize: 19, textAlign: "center", marginBottom: 8 },
            ]}
        >
            Add to Main Catalogue
        </Text>
        <Text
            style={[
                textStyles.bodyMedium,
                {
                    textAlign: "center",
                    color: colors.placeholder,
                    marginBottom: 28,
                },
            ]}
        >
            Fill in product details, images and variants. Your product will be
            submitted for review before going live.
        </Text>

        {[
            "Product Details",
            "Variants & Pricing",
            "GST Details",
            "Images & Videos",
        ].map((step, i) => (
            <View key={step} style={styles.stepRow}>
                <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={[textStyles.bodyMedium, { flex: 1 }]}>{step}</Text>
            </View>
        ))}

        <TouchableOpacity
            style={[buttonStyles.default, { width: "100%", marginTop: 28 }]}
            onPress={onStart}
            disabled={loading}
            activeOpacity={0.85}
        >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                    Start Adding Product →
                </Text>
            )}
        </TouchableOpacity>

        <View style={styles.noteBadge}>
            <Text style={styles.noteText}>
                ℹ️ After submission, only Quantity, Selling Price & MRP can be
                edited.
            </Text>
        </View>
    </View>
);

// ─── Root Screen ───────────────────────────────────────────────────────────────

interface SearchAndAddProductProps {
    navigation: any;
    route?: { params?: { mode?: "search" | "new" } };
    handleNewProductSubmit?: () => Promise<void>;
    newProductLoading?: boolean;
}

const SearchAndAddProduct: React.FC<SearchAndAddProductProps> = ({
    navigation,
    route,
    handleNewProductSubmit,
    newProductLoading,
}) => {
    const [mode, setMode] = useState<"search" | "new">(
        route?.params?.mode ?? "search"
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.scaffoldBg }}>
            {/* AppBar */}
            <AppBar title="Add Product" onBack={() => navigation.goBack()} />

            <Text style={styles.headerSubtitle}>
                Search existing products or request a new product to add to your
                store.
            </Text>

            <ModeTabs mode={mode} onChange={setMode} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[
                    localStyles.container,
                    { paddingTop: 0 },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={localStyles.card}>
                    {mode === "search" ? (
                        <SearchAddMode />
                    ) : (
                        <AddNewProductMode
                            onStart={() => navigation.navigate("AddProduct")}
                            loading={newProductLoading}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    // Header subtitle (below AppBar)
    headerSubtitle: {
        textAlign: "center",
        fontSize: 12,
        color: colors.placeholder,
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: colors.formBg,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder,
    },

    // Tabs
    tabRow: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginVertical: 10,
        backgroundColor: colors.formBorder,
        borderRadius: 10,
        padding: 3,
        gap: 3,
    },
    tab: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 8,
        alignItems: "center",
    },
    tabActive: {
        backgroundColor: colors.formBg,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
    },
    tabText: { fontSize: 12, color: colors.placeholder, fontWeight: "500" },
    tabTextActive: { color: colors.primary, fontWeight: "700" },

    // Search bar
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.formBg,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === "ios" ? 12 : 9,
        marginBottom: 16,
        gap: 8,
    },
    searchIcon: { fontSize: 15 },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.secondary,
        padding: 0,
        fontFamily: "Roboto",
    },

    // Product row
    productRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
        paddingVertical: 10,
    },
    thumb: {
        width: 52,
        height: 52,
        borderRadius: 10,
        backgroundColor: "#EFF6FF",
        flexShrink: 0,
    },
    thumbFallback: { alignItems: "center", justifyContent: "center" },
    thumbFallbackText: {
        fontSize: 20,
        color: colors.primary,
        fontWeight: "700",
    },
    productRowName: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.secondary,
        marginBottom: 2,
    },
    productRowBrand: {
        fontSize: 11,
        color: colors.primary,
        marginBottom: 2,
        fontWeight: "500",
    },
    productRowMeta: { fontSize: 11, color: colors.placeholder },
    addBtn: {
        backgroundColor: "#EFF6FF",
        borderRadius: 8,
        paddingVertical: 7,
        paddingHorizontal: 13,
        flexShrink: 0,
    },
    addBtnText: { color: colors.primary, fontWeight: "700", fontSize: 12 },

    // States
    centeredState: {
        alignItems: "center",
        paddingVertical: 48,
        gap: 12,
    },
    stateText: {
        color: colors.placeholder,
        fontSize: 13,
        textAlign: "center",
        lineHeight: 20,
    },

    // Empty state
    emptyState: {
        alignItems: "center",
        paddingVertical: 48,
        paddingHorizontal: 24,
        gap: 8,
    },
    emptyEmoji: { fontSize: 40, marginBottom: 4 },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.secondary,
        textAlign: "center",
    },
    emptySubtitle: {
        fontSize: 13,
        color: colors.placeholder,
        textAlign: "center",
        lineHeight: 20,
        marginTop: 4,
    },
    clearSearchBtn: {
        marginTop: 16,
        backgroundColor: "#EFF6FF",
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 24,
    },
    clearSearchBtnText: {
        color: colors.primary,
        fontWeight: "700",
        fontSize: 13,
    },

    // Error
    errorBox: {
        backgroundColor: "#FEF2F2",
        borderRadius: 10,
        padding: 16,
        alignItems: "center",
        gap: 12,
        marginTop: 8,
    },
    errorText: { color: colors.error, fontSize: 13, textAlign: "center" },
    retryBtn: {
        backgroundColor: colors.error,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    // Pagination wrapper
    paginationWrapper: {
        marginTop: 8,
        marginBottom: 4,
    },

    // Modal — same pattern as VendorAddProductScreen DropdownPicker
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        // Fixed height = 75% of screen, same as DropdownPicker sheet
        height: SCREEN_HEIGHT * 0.75,
        backgroundColor: colors.scaffoldBg,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        elevation: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        // paddingBottom is set inline via insets.bottom + 12
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.formBorder,
        alignSelf: "center",
        marginTop: 10,
        marginBottom: 6,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder,
    },
    modalThumb: {
        width: 48,
        height: 48,
        borderRadius: 10,
        flexShrink: 0,
    },
    modalTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.label,
        lineHeight: 20,
    },
    modalBrand: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: "500",
        marginTop: 2,
    },
    modalCloseBtn: { padding: 4 },
    modalCloseText: { fontSize: 20, color: colors.secondary },
    modalDivider: {
        height: 1,
        backgroundColor: colors.formBorder,
        marginHorizontal: 20,
    },
    modalSubtitle: {
        fontSize: 12,
        color: colors.placeholder,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 4,
    },
    modalScrollArea: {
        flex: 1, // fills between subtitle and footer — no cut-off, no hard maxHeight
    },
    modalFooter: {
        paddingHorizontal: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.formBorder,
        backgroundColor: colors.scaffoldBg,
    },
    confirmBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 4,
        marginBottom: 4,
    },
    confirmBtnDisabled: {
        // Darker disabled state — clearly not active but readable
        backgroundColor: "#9CA3AF",
    },
    confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    // Variant pricing card
    variantPricingCard: {
        backgroundColor: colors.formBg,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        padding: 14,
        marginTop: 12,
    },
    variantPricingHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    variantPricingLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.label,
        flex: 1,
        marginRight: 8,
    },
    marginPill: {
        backgroundColor: "#ECFDF5",
        borderRadius: 20,
        paddingVertical: 3,
        paddingHorizontal: 10,
    },
    marginPillText: { color: colors.success, fontSize: 11, fontWeight: "700" },
    variantFieldsRow: { flexDirection: "row", gap: 10 },
    variantField: { flex: 1 },
    variantFieldLabel: {
        fontSize: 10,
        fontWeight: "700",
        color: colors.placeholder,
        letterSpacing: 0.6,
        marginBottom: 5,
        textTransform: "uppercase",
    },
    variantFieldInput: {
        backgroundColor: colors.scaffoldBg,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        paddingVertical: 9,
        paddingHorizontal: 8,
        fontSize: 14,
        color: colors.secondary,
        textAlign: "center",
        fontFamily: "Roboto",
    },
    variantPricingErrorText: {
        color: colors.error,
        fontSize: 12,
        fontWeight: "600",
        marginTop: 8,
    },

    // Add New Product
    newProductWrap: {
        alignItems: "center",
        paddingVertical: 32,
        paddingHorizontal: 4,
    },
    newProductIcon: {
        width: 76,
        height: 76,
        borderRadius: 20,
        backgroundColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
    },
    stepRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        width: "100%",
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder,
    },
    stepNum: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
    },
    stepNumText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
    noteBadge: {
        marginTop: 20,
        backgroundColor: "#FFF9EB",
        borderRadius: 10,
        padding: 14,
        width: "100%",
    },
    noteText: { fontSize: 12, color: "#92400E", lineHeight: 18 },
});

export default SearchAndAddProduct;
