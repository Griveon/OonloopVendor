import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Keyboard,
    Modal,
    Animated,
    Pressable,
    ScrollView,
    Dimensions,
    StyleSheet,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getRequest, postRequest, putRequest } from '../../constants/ApiClient';
import { API_ENDPOINTS } from '../../constants/ApiEndpoints';
import { colors, appTheme, localStyles } from '../../constants/AppThem';
import { Fonts } from '../../constants/Fonts';
import AppBar from '../../components/utils/AppBar';
import { getUserData } from '../../components/AsyncStorage/AsyncStorage';
import Pagination from '../../components/utils/Pagination';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- Helper: Debounce hook ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// --- Types ---
interface ProductImage {
    url: string;
    name?: string;
    alt?: string;
    isPrimary?: boolean;
    position?: number;
}

interface ProductVariant {
    _id: string;
    attributes: { size?: string; color?: string;[key: string]: any };
    unit: string;
    unitValue: number;
    stock: number;
    sku: string;
    price: number;
    mrp: number;
    images: ProductImage[];
}

interface ProductGST {
    gstRuleId?: string;
    hsnCode?: string;
    gstPercent?: number;
    gstAmount?: number;
    priceIncludingGST?: number;
}

interface Product {
    _id: string;
    vendorId: string;
    name: string;
    description?: string;
    slug: string;
    variants: ProductVariant[];
    images: ProductImage[];
    attributes?: { brand?: string; material?: string;[key: string]: any };
    mrp?: number;
    stock: number;
    isActive: boolean;
    isFeatured: boolean;
    isTrending: boolean;
    returnable?: boolean;
    minQty?: number;
    gst?: ProductGST;
    createdAt: string;
    updatedAt: string;
}

// --- Helpers ---
const getPrimaryImage = (images: ProductImage[]): string => {
    const primary = images?.find((img) => img.isPrimary);
    return primary?.url || images?.[0]?.url || 'https://via.placeholder.com/80x80?text=No+Image';
};

const getMinMaxPrice = (
    variants: ProductVariant[]
): { minPrice: number; maxPrice: number; minMrp: number; maxMrp: number } => {
    if (!variants || variants.length === 0)
        return { minPrice: 0, maxPrice: 0, minMrp: 0, maxMrp: 0 };
    const prices = variants.map((v) => v.price ?? 0);
    const mrps = variants.map((v) => (v as any).mrp ?? v.price ?? 0);
    return {
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        minMrp: Math.min(...mrps),
        maxMrp: Math.max(...mrps),
    };
};

const formatPrice = (price: number): string => `₹${price.toLocaleString('en-IN')}`;

// ---------------------------------------------------------------------------
// Status Toggle Modal
// ---------------------------------------------------------------------------
const StatusToggleModal = ({
    visible,
    product,
    onClose,
    onConfirm,
    loading,
}: {
    visible: boolean;
    product: Product | null;
    onClose: () => void;
    onConfirm: (isActive: boolean) => void;
    loading: boolean;
}) => {
    if (!product) return null;
    const willActivate = !product.isActive;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={modalStyles.overlay} onPress={onClose}>
                <Pressable style={modalStyles.box} onPress={(e) => e.stopPropagation()}>
                    <View
                        style={[
                            modalStyles.iconCircle,
                            { backgroundColor: willActivate ? '#DCFCE7' : '#FEE2E2' },
                        ]}
                    >
                        <Ionicons
                            name={willActivate ? 'checkmark-circle-outline' : 'close-circle-outline'}
                            size={32}
                            color={willActivate ? '#16A34A' : '#DC2626'}
                        />
                    </View>
                    <Text style={modalStyles.title}>
                        {willActivate ? 'Activate Product?' : 'Deactivate Product?'}
                    </Text>
                    <Text style={modalStyles.subtitle}>
                        {willActivate
                            ? 'This product will be visible to customers.'
                            : 'This product will be hidden from customers.'}
                    </Text>
                    <View style={modalStyles.btnRow}>
                        <TouchableOpacity
                            style={modalStyles.cancelBtn}
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
                            <Text style={modalStyles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                modalStyles.confirmBtn,
                                { backgroundColor: willActivate ? '#16A34A' : '#EF4444' },
                            ]}
                            onPress={() => onConfirm(willActivate)}
                            activeOpacity={0.8}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={modalStyles.confirmText}>
                                    {willActivate ? 'Activate' : 'Deactivate'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

// ---------------------------------------------------------------------------
// Quantity Modal
// ---------------------------------------------------------------------------
const QuantityModal = ({
    visible,
    product,
    onClose,
    onConfirm,
    loading,
}: {
    visible: boolean;
    product: Product | null;
    onClose: () => void;
    onConfirm: (type: 'increase' | 'decrease', qty: number) => void;
    loading: boolean;
}) => {
    const [type, setType] = useState<'increase' | 'decrease'>('increase');
    const [qty, setQty] = useState('');

    useEffect(() => {
        if (visible) {
            setType('increase');
            setQty('');
        }
    }, [visible]);

    if (!product) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={modalStyles.overlay} onPress={onClose}>
                <Pressable style={modalStyles.box} onPress={(e) => e.stopPropagation()}>
                    <View style={[modalStyles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
                        <Ionicons name="cube-outline" size={32} color={colors.primary} />
                    </View>
                    <Text style={modalStyles.title}>Update Stock</Text>
                    <Text style={modalStyles.subtitle}>
                        Current stock:{' '}
                        <Text style={{ fontWeight: '700', color: colors.secondary }}>
                            {product.stock}
                        </Text>
                    </Text>

                    {/* Toggle */}
                    <View style={modalStyles.toggleRow}>
                        <TouchableOpacity
                            style={[
                                modalStyles.toggleBtn,
                                type === 'increase' && modalStyles.toggleBtnActive,
                            ]}
                            onPress={() => setType('increase')}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name="add-circle-outline"
                                size={16}
                                color={type === 'increase' ? '#fff' : colors.placeholder}
                            />
                            <Text
                                style={[
                                    modalStyles.toggleText,
                                    type === 'increase' && modalStyles.toggleTextActive,
                                ]}
                            >
                                Increase
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                modalStyles.toggleBtn,
                                type === 'decrease' && {
                                    ...modalStyles.toggleBtnActive,
                                    backgroundColor: '#EF4444',
                                },
                            ]}
                            onPress={() => setType('decrease')}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name="remove-circle-outline"
                                size={16}
                                color={type === 'decrease' ? '#fff' : colors.placeholder}
                            />
                            <Text
                                style={[
                                    modalStyles.toggleText,
                                    type === 'decrease' && modalStyles.toggleTextActive,
                                ]}
                            >
                                Decrease
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Qty Input */}
                    <View style={modalStyles.qtyInputWrapper}>
                        <TouchableOpacity
                            style={modalStyles.qtyStepBtn}
                            onPress={() =>
                                setQty((prev) => String(Math.max(1, parseInt(prev || '1') - 1)))
                            }
                        >
                            <Ionicons name="remove" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <TextInput
                            style={modalStyles.qtyInput}
                            value={qty}
                            onChangeText={(t) => setQty(t.replace(/\D/g, ''))}
                            keyboardType="numeric"
                            placeholder="Qty"
                            placeholderTextColor={colors.placeholder}
                        />
                        <TouchableOpacity
                            style={modalStyles.qtyStepBtn}
                            onPress={() => setQty((prev) => String(parseInt(prev || '0') + 1))}
                        >
                            <Ionicons name="add" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    <View style={modalStyles.btnRow}>
                        <TouchableOpacity
                            style={modalStyles.cancelBtn}
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
                            <Text style={modalStyles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                modalStyles.confirmBtn,
                                { backgroundColor: type === 'increase' ? colors.primary : '#EF4444' },
                                (!qty || parseInt(qty) < 1) && { opacity: 0.5 },
                            ]}
                            onPress={() => {
                                const n = parseInt(qty);
                                if (!n || n < 1) return;
                                onConfirm(type, n);
                            }}
                            activeOpacity={0.8}
                            disabled={loading || !qty || parseInt(qty) < 1}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={modalStyles.confirmText}>Confirm</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    box: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    title: { fontSize: 18, fontWeight: '700', color: colors.secondary, textAlign: 'center' },
    subtitle: { fontSize: 13, color: colors.placeholder, textAlign: 'center', lineHeight: 20 },
    btnRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
    cancelBtn: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: 'center',
    },
    cancelText: { fontSize: 14, fontWeight: '600', color: colors.secondary },
    confirmBtn: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    toggleRow: { flexDirection: 'row', gap: 10, width: '100%' },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        borderRadius: 10,
        paddingVertical: 10,
        backgroundColor: colors.formBg,
    },
    toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    toggleText: { fontSize: 13, fontWeight: '600', color: colors.placeholder },
    toggleTextActive: { color: '#fff' },
    qtyInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        borderRadius: 12,
        overflow: 'hidden',
    },
    qtyStepBtn: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.formBg,
    },
    qtyInput: {
        flex: 1,
        height: 48,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '700',
        color: colors.secondary,
    },
});

// ---------------------------------------------------------------------------
// Product Card
// ---------------------------------------------------------------------------
const ProductCard = ({
    product,
    onView,
    onEdit,
    onToggleStatus,
    onUpdateQty,
}: {
    product: Product;
    onView?: (product: Product) => void;
    onEdit?: (product: Product) => void;
    onToggleStatus?: (product: Product) => void;
    onUpdateQty?: (product: Product) => void;
}) => {
    const imageUrl = getPrimaryImage(product.images);
    const { minPrice, maxPrice, minMrp, maxMrp } = getMinMaxPrice(product.variants);
    const priceLabel =
        minPrice === maxPrice
            ? formatPrice(minPrice)
            : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`;
    const mrpLabel =
        minMrp === maxMrp
            ? formatPrice(minMrp)
            : `${formatPrice(minMrp)} – ${formatPrice(maxMrp)}`;
    const gstPercent = product.gst?.gstPercent;
    const totalStock =
        product.stock ?? product.variants?.reduce((sum, v) => sum + v.stock, 0) ?? 0;
    const variantCount = product.variants?.length ?? 0;
    const uniqueColors = [
        ...new Set(product.variants?.map((v) => v.attributes?.color).filter(Boolean)),
    ];

    return (
        <View style={cardStyles.productCard}>
            {/* Product Image */}
            <View style={cardStyles.imageContainer}>
                <Image source={{ uri: imageUrl }} style={cardStyles.productImage} />
                {product.isFeatured && (
                    <View style={cardStyles.featuredOverlay}>
                        <Ionicons name="star" size={9} color="#FFFFFF" />
                    </View>
                )}
                {product.isTrending && (
                    <View style={cardStyles.trendingOverlay}>
                        <Ionicons name="trending-up" size={9} color="#FFFFFF" />
                    </View>
                )}
            </View>

            {/* Product Info */}
            <View style={cardStyles.productInfo}>
                <View style={cardStyles.statusRow}>
                    <View
                        style={[
                            cardStyles.statusBadge,
                            { backgroundColor: product.isActive ? '#DCFCE7' : '#FEE2E2' },
                        ]}
                    >
                        <View
                            style={[
                                cardStyles.statusDot,
                                { backgroundColor: product.isActive ? '#22C55E' : '#EF4444' },
                            ]}
                        />
                        <Text
                            style={[
                                cardStyles.statusText,
                                { color: product.isActive ? '#16A34A' : '#DC2626' },
                            ]}
                        >
                            {product.isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                    {product.returnable && (
                        <View style={cardStyles.returnableBadge}>
                            <Ionicons name="return-down-back-outline" size={10} color="#6366F1" />
                            <Text style={cardStyles.returnableText}>Returnable</Text>
                        </View>
                    )}
                </View>

                <Text style={cardStyles.productName} numberOfLines={2}>
                    {product.name}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <Text style={cardStyles.priceText}>{priceLabel}</Text>
                    {minMrp > 0 && minMrp !== minPrice && (
                        <Text style={cardStyles.mrpText}>MRP {mrpLabel}</Text>
                    )}
                </View>

                {uniqueColors.length > 0 && (
                    <View style={cardStyles.colorsRow}>
                        {uniqueColors.slice(0, 4).map((color, i) => (
                            <View key={i} style={[cardStyles.colorDot, getColorStyle(color as string)]} />
                        ))}
                        {uniqueColors.length > 4 && (
                            <Text style={cardStyles.moreColors}>+{uniqueColors.length - 4}</Text>
                        )}
                    </View>
                )}

                <View style={cardStyles.metaRow}>
                    <View style={cardStyles.metaChip}>
                        <Ionicons name="layers-outline" size={11} color={colors.placeholder} />
                        <Text style={cardStyles.metaChipText}>
                            {variantCount} variant{variantCount !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    <View style={cardStyles.metaChip}>
                        <Ionicons name="cube-outline" size={11} color={colors.placeholder} />
                        <Text style={cardStyles.metaChipText}>{totalStock} stock</Text>
                    </View>
                    {gstPercent != null && gstPercent > 0 && (
                        <View style={cardStyles.metaChip}>
                            <Text style={cardStyles.metaChipText}>GST {gstPercent}%</Text>
                        </View>
                    )}
                </View>

                <View style={cardStyles.actionRow}>
                    <TouchableOpacity
                        style={[cardStyles.actionBtn, cardStyles.viewBtn]}
                        onPress={() => onView?.(product)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="eye-outline" size={15} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[cardStyles.actionBtn, cardStyles.editBtn]}
                        onPress={() => onEdit?.(product)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="create-outline" size={15} color={colors.warning} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Right icon buttons */}
            <View style={cardStyles.rightActions}>
                <TouchableOpacity
                    style={[
                        cardStyles.rightIconBtn,
                        { backgroundColor: product.isActive ? '#DCFCE7' : '#FEE2E2' },
                    ]}
                    onPress={() => onToggleStatus?.(product)}
                    activeOpacity={0.75}
                >
                    <Ionicons
                        name={product.isActive ? 'toggle' : 'toggle-outline'}
                        size={18}
                        color={product.isActive ? '#16A34A' : '#DC2626'}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[cardStyles.rightIconBtn, { backgroundColor: '#EFF6FF' }]}
                    onPress={() => onUpdateQty?.(product)}
                    activeOpacity={0.75}
                >
                    <Ionicons name="layers-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const COLOR_MAP: Record<string, string> = {
    red: '#EF4444', blue: '#3B82F6', green: '#22C55E', black: '#1F2937',
    white: '#F9FAFB', yellow: '#EAB308', pink: '#EC4899', purple: '#A855F7',
    orange: '#F97316', grey: '#9CA3AF', gray: '#9CA3AF', navy: '#1E3A5F',
    brown: '#92400E',
};

const getColorStyle = (colorName: string): object => ({
    backgroundColor: COLOR_MAP[colorName?.toLowerCase()] ?? '#D1D5DB',
    borderColor: colorName?.toLowerCase() === 'white' ? '#E5E7EB' : 'transparent',
    borderWidth: colorName?.toLowerCase() === 'white' ? 1 : 0,
});

// ---------------------------------------------------------------------------
// Image Gallery — standalone component (no nested ScrollView conflict)
// ---------------------------------------------------------------------------
const GALLERY_HEIGHT = 270;
const THUMB_SIZE = 56;
const THUMB_GAP = 6;

const ImageGallery = ({
    images,
    badges,
}: {
    images: ProductImage[];
    badges?: React.ReactNode;
}) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        setSelectedIndex(0);
    }, [images]);

    if (!images?.length) return null;

    return (
        <View style={galleryStyles.container}>
            <View style={galleryStyles.imageWrapper}>
                <Image
                    source={{ uri: images[selectedIndex]?.url }}
                    style={galleryStyles.mainImage}
                />

                <View style={galleryStyles.badges}>
                    {badges}
                </View>
            </View>

            <FlatList
                horizontal
                data={images}
                keyExtractor={(_, i) => i.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={galleryStyles.thumbContainer}
                renderItem={({ item, index }) => (
                    <TouchableOpacity
                        onPress={() => setSelectedIndex(index)}
                    >
                        <Image
                            source={{ uri: item.url }}
                            style={[
                                galleryStyles.thumb,
                                selectedIndex === index &&
                                galleryStyles.thumbActive,
                            ]}
                        />
                    </TouchableOpacity>
                )}
            />
        </View>
    );
};

const galleryStyles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        paddingBottom: 12,
    },

    imageWrapper: {
        position: 'relative',
    },

    mainImage: {
        width: '100%',
        height: 260,
        resizeMode: 'cover',
    },

    badges: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        gap: 8,
    },

    thumbContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 10,
    },

    thumb: {
        width: 64,
        height: 64,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },

    thumbActive: {
        borderColor: colors.primary,
    },
});
// ---------------------------------------------------------------------------
// Product Details Bottom Sheet
// Follows DropdownPicker pattern:
//   • TouchableOpacity backdrop (activeOpacity=1) dismisses on tap-outside
//   • animationType="slide" — native, reliable, no Animated.Value needed
//   • Fixed height: SCREEN_HEIGHT * 0.85 so ScrollView always has a bound
//   • Gallery stays ABOVE the ScrollView — zero conflict
// ---------------------------------------------------------------------------
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ProductDetailsSheet = ({
    product,
    visible,
    onClose,
}: {
    product: Product | null;
    visible: boolean;
    onClose: () => void;
}) => {
    const [activeVariant, setActiveVariant] = useState<ProductVariant | null>(null);
    const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);

    // Reset state each time a new product is shown
    useEffect(() => {
        if (visible && product) {
            const firstVariant = product.variants?.[0] ?? null;
            setActiveVariant(firstVariant);
            const imgs =
                firstVariant?.images?.length ? firstVariant.images : product.images ?? [];
            setGalleryImages(imgs);
        }
    }, [visible, product]);

    if (!product) return null;

    const { minPrice, maxPrice, minMrp, maxMrp } = getMinMaxPrice(product.variants);
    const priceLabel =
        minPrice === maxPrice
            ? formatPrice(minPrice)
            : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`;
    const mrpLabel =
        minMrp === maxMrp
            ? formatPrice(minMrp)
            : `${formatPrice(minMrp)} – ${formatPrice(maxMrp)}`;

    const uniqueSizes = [
        ...new Set(product.variants?.map((v) => v.attributes?.size).filter(Boolean)),
    ];
    const uniqueColors = [
        ...new Set(product.variants?.map((v) => v.attributes?.color).filter(Boolean)),
    ];

    const handleVariantPress = (variant: ProductVariant) => {
        setActiveVariant(variant);
        const imgs = variant.images?.length ? variant.images : product.images ?? [];
        setGalleryImages(imgs);
    };

    const badges = (
        <>
            {product.isActive && (
                <View style={sheetStyles.badge}>
                    <Text style={sheetStyles.badgeText}>Active</Text>
                </View>
            )}
            {product.isFeatured && (
                <View style={[sheetStyles.badge, { backgroundColor: colors.warning }]}>
                    <Ionicons name="star" size={10} color="#FFF" />
                    <Text style={sheetStyles.badgeText}>Featured</Text>
                </View>
            )}
            {product.isTrending && (
                <View style={[sheetStyles.badge, { backgroundColor: '#6366F1' }]}>
                    <Ionicons name="trending-up" size={10} color="#FFF" />
                    <Text style={sheetStyles.badgeText}>Trending</Text>
                </View>
            )}
        </>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"          // ← same as DropdownPicker: native slide, no JS animation
            onRequestClose={onClose}
        >
            {/* ── Backdrop: tap outside → close ── */}
            <View style={sheetStyles.backdrop}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                />
                <View
                    style={[
                        sheetStyles.sheet,
                        { height: SCREEN_HEIGHT * 0.85 }
                    ]}
                >
                    {/* ── Sheet: stops tap propagation to backdrop ── */}
                    <TouchableOpacity
                        activeOpacity={1}
                        style={[sheetStyles.sheet, { height: SCREEN_HEIGHT * 0.85 }]}
                        onPress={() => { }} // absorb taps so they don't hit backdrop
                    >
                        {/* ── Header ── */}
                        <View style={sheetStyles.header}>
                            <View style={sheetStyles.handle} />
                            <Text style={sheetStyles.headerTitle} numberOfLines={1}>
                                {product.name}
                            </Text>
                            <TouchableOpacity onPress={onClose} style={sheetStyles.closeBtn}>
                                <Ionicons name="close-outline" size={24} color={colors.secondary} />
                            </TouchableOpacity>
                        </View>

                        {/* ── Gallery: fixed block, ABOVE ScrollView ── */}
                        <ImageGallery images={galleryImages} badges={badges} />

                        {/* ── Scrollable body ── */}
                        <ScrollView
                            style={sheetStyles.scrollArea}
                            contentContainerStyle={sheetStyles.body}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                            bounces={false}
                        >
                            {/* Name + price */}
                            <Text style={sheetStyles.name}>{product.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                                <Text style={sheetStyles.price}>{priceLabel}</Text>
                                {minMrp > 0 && minMrp !== minPrice && (
                                    <Text style={sheetStyles.mrp}>MRP {mrpLabel}</Text>
                                )}
                            </View>

                            {product.description ? (
                                <Text style={sheetStyles.desc} numberOfLines={4}>
                                    {product.description}
                                </Text>
                            ) : null}

                            {/* Stats */}
                            <View style={sheetStyles.statsRow}>
                                <View style={sheetStyles.statBox}>
                                    <Ionicons name="cube-outline" size={20} color={colors.primary} />
                                    <Text style={sheetStyles.statVal}>{product.stock}</Text>
                                    <Text style={sheetStyles.statLabel}>In Stock</Text>
                                </View>
                                <View style={sheetStyles.statDivider} />
                                <View style={sheetStyles.statBox}>
                                    <Ionicons name="layers-outline" size={20} color="#6366F1" />
                                    <Text style={sheetStyles.statVal}>{product.variants?.length ?? 0}</Text>
                                    <Text style={sheetStyles.statLabel}>Variants</Text>
                                </View>
                                <View style={sheetStyles.statDivider} />
                                <View style={sheetStyles.statBox}>
                                    <Ionicons name="pricetag-outline" size={20} color={colors.warning} />
                                    <Text style={sheetStyles.statVal}>
                                        {product.gst?.gstPercent ? `${product.gst.gstPercent}%` : '—'}
                                    </Text>
                                    <Text style={sheetStyles.statLabel}>GST</Text>
                                </View>
                            </View>

                            {/* Sizes */}
                            {uniqueSizes.length > 0 && (
                                <View style={sheetStyles.section}>
                                    <Text style={sheetStyles.sectionTitle}>Available Sizes</Text>
                                    <View style={sheetStyles.sizeRow}>
                                        {uniqueSizes.map((size, i) => (
                                            <View key={i} style={sheetStyles.sizeChip}>
                                                <Text style={sheetStyles.sizeChipText}>{size}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Colors */}
                            {uniqueColors.length > 0 && (
                                <View style={sheetStyles.section}>
                                    <Text style={sheetStyles.sectionTitle}>Available Colors</Text>
                                    <View style={sheetStyles.colorRow}>
                                        {uniqueColors.map((color, i) => (
                                            <View key={i} style={sheetStyles.colorItem}>
                                                <View style={[sheetStyles.colorCircle, getColorStyle(color as string)]} />
                                                <Text style={sheetStyles.colorLabel}>{color}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Variants */}
                            {product.variants?.length > 0 && (
                                <View style={sheetStyles.section}>
                                    <Text style={sheetStyles.sectionTitle}>Variants</Text>
                                    {product.variants.map((variant) => (
                                        <TouchableOpacity
                                            key={variant._id}
                                            style={[
                                                sheetStyles.variantRow,
                                                activeVariant?._id === variant._id && sheetStyles.variantRowActive,
                                            ]}
                                            onPress={() => handleVariantPress(variant)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={sheetStyles.variantLeft}>
                                                {variant.images?.[0]?.url ? (
                                                    <Image
                                                        source={{ uri: variant.images[0].url }}
                                                        style={sheetStyles.variantThumb}
                                                    />
                                                ) : (
                                                    <View style={[sheetStyles.variantThumb, { backgroundColor: '#F3F4F6' }]} />
                                                )}
                                                <View style={{ flex: 1 }}>
                                                    <Text style={sheetStyles.variantSku}>{variant.sku}</Text>
                                                    <Text style={sheetStyles.variantAttrs} numberOfLines={1}>
                                                        {Object.entries(variant.attributes)
                                                            .map(([k, v]) => `${k}: ${v}`)
                                                            .join('  •  ')}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={sheetStyles.variantRight}>
                                                <Text style={sheetStyles.variantPrice}>{formatPrice(variant.price)}</Text>
                                                {variant.mrp > 0 && variant.mrp !== variant.price && (
                                                    <Text style={sheetStyles.variantMrp}>MRP {formatPrice(variant.mrp)}</Text>
                                                )}
                                                <Text style={sheetStyles.variantStock}>{variant.stock} pcs</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Product Attributes */}
                            {product.attributes && Object.keys(product.attributes).length > 0 && (
                                <View style={sheetStyles.section}>
                                    <Text style={sheetStyles.sectionTitle}>Product Details</Text>
                                    <View style={sheetStyles.attributesGrid}>
                                        {Object.entries(product.attributes)
                                            .filter(([k]) => k !== 'brand')
                                            .map(([key, value], i) => (
                                                <View key={i} style={sheetStyles.attrItem}>
                                                    <Text style={sheetStyles.attrKey}>
                                                        {key.charAt(0).toUpperCase() + key.slice(1)}
                                                    </Text>
                                                    <Text style={sheetStyles.attrValue}>{String(value)}</Text>
                                                </View>
                                            ))}
                                    </View>
                                </View>
                            )}

                            {/* GST */}
                            {product.gst && (product.gst.hsnCode || product.gst.gstPercent) && (
                                <View style={sheetStyles.gstBox}>
                                    <View style={sheetStyles.gstRow}>
                                        <Text style={sheetStyles.gstLabel}>HSN Code</Text>
                                        <Text style={sheetStyles.gstValue}>{product.gst.hsnCode ?? '—'}</Text>
                                    </View>
                                    <View style={sheetStyles.gstRow}>
                                        <Text style={sheetStyles.gstLabel}>GST %</Text>
                                        <Text style={sheetStyles.gstValue}>{product.gst.gstPercent ?? 0}%</Text>
                                    </View>
                                    <View style={sheetStyles.gstRow}>
                                        <Text style={sheetStyles.gstLabel}>Price incl. GST</Text>
                                        <Text style={[sheetStyles.gstValue, { color: colors.primary, fontWeight: '700' }]}>
                                            {formatPrice(product.gst.priceIncludingGST ?? 0)}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Meta footer */}
                            <View style={sheetStyles.metaFooter}>
                                <Text style={sheetStyles.metaText}>
                                    Created: {new Date(product.createdAt).toLocaleDateString('en-IN')}
                                </Text>
                                <Text style={sheetStyles.metaText}>
                                    Updated: {new Date(product.updatedAt).toLocaleDateString('en-IN')}
                                </Text>
                            </View>
                        </ScrollView>
                    </TouchableOpacity>

                </View>
            </View>
        </Modal>
    );
};

const sheetStyles = StyleSheet.create({
    // ── Same backdrop pattern as DropdownPicker ──
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.scaffoldBg,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        paddingBottom: 0,
    },
    // ── Header: same pattern as DropdownPicker sheetHeader ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder,
        gap: 10,
    },
    handle: {
        // Centered drag indicator above the header row
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
        position: 'absolute',
        top: 6,
        alignSelf: 'center',
        left: '50%',
        marginLeft: -18,
    },
    headerTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: colors.secondary,
        marginTop: 6,
    },
    closeBtn: { padding: 4, marginTop: 6 },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#22C55E',
    },
    badgeText: { color: '#FFF', fontSize: 11, fontWeight: '600' },

    // ── ScrollView fills remaining space ──
    scrollArea: {
        flex: 1,
    },

    body: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 80,
        flexGrow: 1,
    },
    name: { fontSize: 18, fontWeight: '700', color: colors.secondary, marginBottom: 4 },
    price: { fontSize: 17, fontWeight: '700', color: colors.primary },
    mrp: { fontSize: 13, color: colors.placeholder, textDecorationLine: 'line-through' },
    desc: { fontSize: 14, color: colors.label, lineHeight: 20, marginBottom: 14 },

    // Stats
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 8,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.formBorder,
    },
    statBox: { flex: 1, alignItems: 'center', gap: 2 },
    statDivider: { width: 1, height: 36, backgroundColor: '#E5E7EB' },
    statVal: { fontSize: 17, fontWeight: '700', color: colors.secondary },
    statLabel: { fontSize: 11, color: colors.placeholder },

    // Sections
    section: { marginBottom: 18 },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.secondary,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sizeChip: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sizeChipText: { fontSize: 13, fontWeight: '600', color: colors.secondary },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    colorItem: { alignItems: 'center', gap: 4 },
    colorCircle: { width: 28, height: 28, borderRadius: 14 },
    colorLabel: { fontSize: 10, color: colors.placeholder, textTransform: 'capitalize' },

    // Variants — same row style as DropdownPicker option
    variantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder,
        backgroundColor: '#fff',
    },
    variantRowActive: { backgroundColor: '#EFF6FF' },
    variantLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    variantThumb: { width: 40, height: 40, borderRadius: 8, resizeMode: 'cover' },
    variantSku: { fontSize: 12, fontWeight: '600', color: colors.secondary },
    variantAttrs: { fontSize: 11, color: colors.placeholder, marginTop: 2 },
    variantRight: { alignItems: 'flex-end' },
    variantPrice: { fontSize: 14, fontWeight: '700', color: colors.primary },
    variantMrp: { fontSize: 10, color: colors.placeholder, textDecorationLine: 'line-through', marginTop: 1 },
    variantStock: { fontSize: 11, color: colors.placeholder, marginTop: 2 },

    // Attributes
    attributesGrid: { gap: 0 },
    attrItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    attrKey: { fontSize: 13, color: colors.placeholder },
    attrValue: { fontSize: 13, fontWeight: '600', color: colors.secondary },

    // GST
    gstBox: {
        backgroundColor: '#F0FDF4',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#DCFCE7',
        gap: 8,
    },
    gstRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    gstLabel: { fontSize: 13, color: '#16A34A' },
    gstValue: { fontSize: 13, fontWeight: '600', color: '#166534' },

    // Meta footer
    metaFooter: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 14,
        marginTop: 4,
        gap: 4,
    },
    metaText: { fontSize: 11, color: colors.placeholder },
});

// ---------------------------------------------------------------------------
// Card styles
// ---------------------------------------------------------------------------
const cardStyles = StyleSheet.create({
    productCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.formBorder,
    },
    imageContainer: { width: 90, height: 110, position: 'relative' },
    productImage: {
        width: 90,
        height: 110,
        resizeMode: 'cover',
        backgroundColor: '#F3F4F6',
    },
    featuredOverlay: {
        position: 'absolute',
        top: 6,
        left: 6,
        backgroundColor: colors.warning,
        borderRadius: 4,
        padding: 3,
    },
    trendingOverlay: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: '#6366F1',
        borderRadius: 4,
        padding: 3,
    },
    productInfo: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 4,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '600' },
    returnableBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 3,
    },
    returnableText: { fontSize: 10, color: '#6366F1', fontWeight: '600' },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.secondary,
        marginBottom: 3,
        lineHeight: 20,
    },
    priceText: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 5 },
    mrpText: {
        fontSize: 11,
        color: colors.placeholder,
        textDecorationLine: 'line-through',
    },
    colorsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    colorDot: { width: 12, height: 12, borderRadius: 6 },
    moreColors: { fontSize: 10, color: colors.placeholder },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    metaChipText: { fontSize: 10, color: colors.placeholder },
    actionRow: { flexDirection: 'row', gap: 8 },
    actionBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    viewBtn: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary + '30',
    },
    editBtn: {
        backgroundColor: colors.warning + '15',
        borderColor: colors.warning + '30',
    },
    rightActions: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 8,
        borderLeftWidth: 1,
        borderLeftColor: colors.formBorder,
    },
    rightIconBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
const ProductListingScreen = ({ navigation }: any) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [statusProduct, setStatusProduct] = useState<Product | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);

    const [qtyModalVisible, setQtyModalVisible] = useState(false);
    const [qtyProduct, setQtyProduct] = useState<Product | null>(null);
    const [qtyLoading, setQtyLoading] = useState(false);

    const flatListRef = useRef<FlatList>(null);
    const debouncedSearch = useDebounce(searchText, 500);

    useEffect(() => {
        const trimmed = debouncedSearch.trim();
        const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
        if (wordCount >= 3 || trimmed === '') {
            setSearchTerm(trimmed);
            setPage(1);
        }
    }, [debouncedSearch]);

    const isMounted = useRef(false);
    useEffect(() => {
        if (!isMounted.current) { isMounted.current = true; return; }
        fetchProducts(searchTerm, page);
    }, [page, searchTerm]);

    const isFirstFocus = useRef(true);
    useFocusEffect(
        useCallback(() => {
            if (isFirstFocus.current) {
                isFirstFocus.current = false;
                setPage(1);
                fetchProducts(searchTerm, 1);
            } else {
                fetchProducts(searchTerm, page);
            }
        }, [searchTerm, page])
    );

    const fetchProducts = async (term: string = searchTerm, pageNum: number = page) => {
        setLoading(true);
        setError(null);
        try {
            const { user } = await getUserData();
            const params: Record<string, any> = {
                page: pageNum,
                limit: 10,
                search: term || undefined,
                vendorId: user?.user?._id || user?._id,
            };
            const response = await getRequest(API_ENDPOINTS.GETALLPRODUCTSBYVENDOR, params);
            if (response?.success && response?.data) {
                const items: Product[] = response.data?.items ?? response.data ?? [];
                const totalPagesFromApi =
                    response.data?.meta?.totalPages || response.meta?.totalPages || 1;
                setTotalPages(totalPagesFromApi);
                setProducts(items);
            } else {
                setError(response?.message || 'Failed to load products');
            }
        } catch (err: any) {
            setError(err?.message || 'Network error. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setPage(1);
    }, []);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    const handleViewProduct = (product: Product) => {
        setSelectedProduct(product);
        setBottomSheetVisible(true);
    };

    const handleToggleStatus = (product: Product) => {
        setStatusProduct(product);
        setStatusModalVisible(true);
    };

    const handleConfirmStatus = async (isActive: boolean) => {
        if (!statusProduct) return;
        setStatusLoading(true);
        try {
            const url = `${API_ENDPOINTS.UPDATEPRODUCTSTATUS}/${statusProduct._id}`;
            const res: any = await putRequest(url, { isActive });
            if (res?.success) {
                setProducts((prev) =>
                    prev.map((p) => (p._id === statusProduct._id ? { ...p, isActive } : p))
                );
                setStatusModalVisible(false);
                setStatusProduct(null);
            }
        } catch (e) {
        } finally {
            setStatusLoading(false);
        }
    };

    const handleUpdateQty = (product: Product) => {
        setQtyProduct(product);
        setQtyModalVisible(true);
    };

    const handleConfirmQty = async (type: 'increase' | 'decrease', qty: number) => {
        if (!qtyProduct) return;
        setQtyLoading(true);
        try {
            const res: any = await putRequest(
                `${API_ENDPOINTS.UPDATEPRODUCTQUANTITY}/${qtyProduct._id}`,
                { type, qty }
            );
            if (res?.success) {
                setProducts((prev) =>
                    prev.map((p) =>
                        p._id === qtyProduct._id
                            ? {
                                ...p,
                                stock:
                                    type === 'increase'
                                        ? p.stock + qty
                                        : Math.max(0, p.stock - qty),
                            }
                            : p
                    )
                );
                setQtyModalVisible(false);
                setQtyProduct(null);
            }
        } catch (e) {
        } finally {
            setQtyLoading(false);
        }
    };

    const renderEmpty = () => {
        if (loading && !refreshing) return null;
        return (
            <View style={screenStyles.emptyContainer}>
                <Ionicons name="cube-outline" size={52} color={colors.placeholder} />
                <Text style={screenStyles.emptyText}>No products found</Text>
                <Text style={screenStyles.emptySubtext}>Try adjusting your search or filters</Text>
            </View>
        );
    };

    const renderError = () => {
        if (!error) return null;
        return (
            <View style={screenStyles.errorBox}>
                <Ionicons name="alert-circle-outline" size={28} color={colors.error} />
                <Text style={screenStyles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={screenStyles.retryBtn}
                    onPress={() => fetchProducts(searchTerm, page)}
                >
                    <Ionicons name="refresh" size={15} color="#FFF" />
                    <Text style={screenStyles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={screenStyles.safeArea} edges={['bottom']}>
            <View style={appTheme.scaffold}>
                <AppBar title="Products" onBack={() => navigation.goBack()} />

                {/* Search Bar */}
                <View style={screenStyles.searchContainer}>
                    <View style={screenStyles.searchWrapper}>
                        <Ionicons
                            name="search"
                            size={17}
                            color={colors.placeholder}
                            style={{ marginRight: 8 }}
                        />
                        <TextInput
                            style={screenStyles.searchInput}
                            placeholder="Type 3 words to auto-search..."
                            placeholderTextColor={colors.placeholder}
                            value={searchText}
                            onChangeText={setSearchText}
                            returnKeyType="search"
                            onSubmitEditing={() => {
                                const trimmed = searchText.trim();
                                setSearchTerm(trimmed);
                                setPage(1);
                                fetchProducts(trimmed, 1);
                                Keyboard.dismiss();
                            }}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity
                                onPress={() => {
                                    setSearchText('');
                                    setSearchTerm('');
                                    setPage(1);
                                    Keyboard.dismiss();
                                }}
                                style={{ padding: 4 }}
                            >
                                <Ionicons name="close-circle" size={17} color={colors.placeholder} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={screenStyles.searchIconBtn}
                            onPress={() => {
                                if (searchText.trim().length > 0) {
                                    setSearchTerm(searchText);
                                    setPage(1);
                                    Keyboard.dismiss();
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-forward-circle" size={28} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {renderError()}

                {loading && !refreshing && products.length === 0 && (
                    <View style={screenStyles.loadingOverlay}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                )}

                <FlatList
                    ref={flatListRef}
                    data={products}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <ProductCard
                            product={item}
                            onView={handleViewProduct}
                            onEdit={(p) =>
                                navigation.navigate('EditProduct', { productId: p._id })
                            }
                            onToggleStatus={handleToggleStatus}
                            onUpdateQty={handleUpdateQty}
                        />
                    )}
                    contentContainerStyle={[localStyles.container, { paddingBottom: 100 }]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            loading={loading && !refreshing}
                        />
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                />

                {/* FAB */}
                <TouchableOpacity
                    style={screenStyles.fab}
                    onPress={() => navigation.navigate('SearchAndAddProduct')}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                </TouchableOpacity>

                <ProductDetailsSheet
                    product={selectedProduct}
                    visible={bottomSheetVisible}
                    onClose={() => {
                        setBottomSheetVisible(false);
                        setSelectedProduct(null);
                    }}
                />

                <StatusToggleModal
                    visible={statusModalVisible}
                    product={statusProduct}
                    onClose={() => {
                        setStatusModalVisible(false);
                        setStatusProduct(null);
                    }}
                    onConfirm={handleConfirmStatus}
                    loading={statusLoading}
                />

                <QuantityModal
                    visible={qtyModalVisible}
                    product={qtyProduct}
                    onClose={() => {
                        setQtyModalVisible(false);
                        setQtyProduct(null);
                    }}
                    onConfirm={handleConfirmQty}
                    loading={qtyLoading}
                />
            </View>
        </SafeAreaView>
    );
};

// ---------------------------------------------------------------------------
// Screen-level styles
// ---------------------------------------------------------------------------
const screenStyles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.scaffoldBg },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: colors.scaffoldBg,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.formBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.formBorder,
        paddingHorizontal: 12,
        height: 44,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: colors.secondary,
        paddingVertical: 0,
    },
    searchIconBtn: {
        marginLeft: 6,
        paddingLeft: 8,
        borderLeftWidth: 1,
        borderLeftColor: colors.formBorder,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 120,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 24,
        gap: 12,
    },
    emptyText: { fontSize: 18, color: colors.secondary },
    emptySubtext: { fontSize: 14, color: colors.placeholder, textAlign: 'center' },
    errorBox: {
        marginHorizontal: 16,
        marginTop: 12,
        padding: 16,
        backgroundColor: '#FEF2F2',
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.error + '40',
        gap: 10,
    },
    errorText: { color: colors.error, fontSize: 13, textAlign: 'center' },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error,
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 5,
    },
    retryText: { color: '#FFF', fontSize: 13, fontWeight: '500' },
});

export default ProductListingScreen;