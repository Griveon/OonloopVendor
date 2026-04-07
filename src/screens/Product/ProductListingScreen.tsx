import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getRequest } from '../../constants/ApiClient';
import { API_ENDPOINTS } from '../../constants/ApiEndpoints';
import { colors, appTheme, localStyles } from '../../constants/AppThem';
import { Fonts } from '../../constants/Fonts';
import AppBar from '../../components/utils/AppBar';

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

const getMinMaxPrice = (variants: ProductVariant[]): { min: number; max: number } => {
    if (!variants || variants.length === 0) return { min: 0, max: 0 };
    const prices = variants.map((v) => v.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
};

const formatPrice = (price: number): string => `₹${price.toLocaleString('en-IN')}`;

// --- Product Card ---
const ProductCard = ({
    product,
    onView,
    onEdit,
}: {
    product: Product;
    onView?: (product: Product) => void;
    onEdit?: (product: Product) => void;
}) => {
    const imageUrl = getPrimaryImage(product.images);
    const { min, max } = getMinMaxPrice(product.variants);
    const priceLabel = min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`;
    const totalStock = product.stock ?? product.variants?.reduce((sum, v) => sum + v.stock, 0) ?? 0;
    const variantCount = product.variants?.length ?? 0;
    const uniqueColors = [...new Set(product.variants?.map((v) => v.attributes?.color).filter(Boolean))];

    return (
        <View style={styles.productCard}>
            {/* Product Image */}
            <View style={styles.imageContainer}>
                <Image source={{ uri: imageUrl }} style={styles.productImage} />
                {product.isFeatured && (
                    <View style={styles.featuredOverlay}>
                        <Ionicons name="star" size={9} color="#FFFFFF" />
                    </View>
                )}
                {product.isTrending && (
                    <View style={styles.trendingOverlay}>
                        <Ionicons name="trending-up" size={9} color="#FFFFFF" />
                    </View>
                )}
            </View>

            {/* Product Info */}
            <View style={styles.productInfo}>
                {/* Status Row */}
                <View style={styles.statusRow}>
                    <View style={[styles.statusBadge, { backgroundColor: product.isActive ? '#DCFCE7' : '#FEE2E2' }]}>
                        <View style={[styles.statusDot, { backgroundColor: product.isActive ? '#22C55E' : '#EF4444' }]} />
                        <Text style={[styles.statusText, { color: product.isActive ? '#16A34A' : '#DC2626' }]}>
                            {product.isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                    {product.returnable && (
                        <View style={styles.returnableBadge}>
                            <Ionicons name="return-down-back-outline" size={10} color="#6366F1" />
                            <Text style={styles.returnableText}>Returnable</Text>
                        </View>
                    )}
                </View>

                {/* Name */}
                <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                </Text>

                {/* Price */}
                <Text style={styles.priceText}>{priceLabel}</Text>

                {/* Variant colors */}
                {uniqueColors.length > 0 && (
                    <View style={styles.colorsRow}>
                        {uniqueColors.slice(0, 4).map((color, i) => (
                            <View key={i} style={[styles.colorDot, getColorStyle(color as string)]} />
                        ))}
                        {uniqueColors.length > 4 && (
                            <Text style={styles.moreColors}>+{uniqueColors.length - 4}</Text>
                        )}
                    </View>
                )}

                {/* Meta Row */}
                <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                        <Ionicons name="layers-outline" size={11} color={colors.placeholder} />
                        <Text style={styles.metaChipText}>{variantCount} variant{variantCount !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={styles.metaChip}>
                        <Ionicons name="cube-outline" size={11} color={colors.placeholder} />
                        <Text style={styles.metaChipText}>{totalStock} stock</Text>
                    </View>
                    {product.gst?.gstPercent != null && (
                        <View style={styles.metaChip}>
                            <Text style={styles.metaChipText}>GST {product.gst.gstPercent}%</Text>
                        </View>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.viewBtn]}
                        onPress={() => onView?.(product)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="eye-outline" size={15} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
                        onPress={() => onEdit?.(product)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="create-outline" size={15} color={colors.warning} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

// Map color name to background color
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

// --- Product Detail Bottom Sheet ---
const ProductDetailsSheet = ({
    product,
    visible,
    onClose,
}: {
    product: Product | null;
    visible: boolean;
    onClose: () => void;
}) => {
    const translateY = useState(new Animated.Value(600))[0];
    const [activeVariant, setActiveVariant] = useState<ProductVariant | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        if (visible && product) {
            setActiveVariant(product.variants?.[0] ?? null);
            setActiveImageIndex(0);
            translateY.setValue(600);
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                friction: 8,
                tension: 40,
            }).start();
        }
    }, [visible, product]);

    if (!product) return null;

    const displayImages =
        activeVariant?.images?.length ? activeVariant.images : product.images;
    const currentImage = getPrimaryImage(displayImages);
    const { min, max } = getMinMaxPrice(product.variants);
    const priceLabel = min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`;

    const uniqueSizes = [...new Set(product.variants?.map((v) => v.attributes?.size).filter(Boolean))];
    const uniqueColors = [...new Set(product.variants?.map((v) => v.attributes?.color).filter(Boolean))];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Animated.View style={[styles.bottomSheet, { transform: [{ translateY }] }]}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        {/* Handle */}
                        <View style={styles.sheetHandleRow}>
                            <View style={styles.sheetHandle} />
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={22} color={colors.secondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Hero Image */}
                            <View style={styles.sheetHero}>
                                <Image source={{ uri: currentImage }} style={styles.sheetHeroImage} />
                                <View style={styles.sheetBadgeRow}>
                                    {product.isActive && (
                                        <View style={[styles.sheetBadge, { backgroundColor: '#22C55E' }]}>
                                            <Text style={styles.sheetBadgeText}>Active</Text>
                                        </View>
                                    )}
                                    {product.isFeatured && (
                                        <View style={[styles.sheetBadge, { backgroundColor: colors.warning }]}>
                                            <Ionicons name="star" size={10} color="#FFF" />
                                            <Text style={styles.sheetBadgeText}>Featured</Text>
                                        </View>
                                    )}
                                    {product.isTrending && (
                                        <View style={[styles.sheetBadge, { backgroundColor: '#6366F1' }]}>
                                            <Ionicons name="trending-up" size={10} color="#FFF" />
                                            <Text style={styles.sheetBadgeText}>Trending</Text>
                                        </View>
                                    )}
                                </View>
                                {/* Image dots */}
                                {displayImages.length > 1 && (
                                    <View style={styles.imageDots}>
                                        {displayImages.map((_, i) => (
                                            <View
                                                key={i}
                                                style={[styles.imageDot, i === activeImageIndex && styles.imageDotActive]}
                                            />
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={styles.sheetBody}>
                                <Text style={styles.sheetName}>{product.name}</Text>
                                <Text style={styles.sheetPrice}>{priceLabel}</Text>

                                {product.description && (
                                    <Text style={styles.sheetDesc} numberOfLines={3}>
                                        {product.description}
                                    </Text>
                                )}

                                {/* Stats */}
                                <View style={styles.statsRow}>
                                    <View style={styles.statBox}>
                                        <Ionicons name="cube-outline" size={20} color={colors.primary} />
                                        <Text style={styles.statVal}>{product.stock}</Text>
                                        <Text style={styles.statLabel}>In Stock</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statBox}>
                                        <Ionicons name="layers-outline" size={20} color="#6366F1" />
                                        <Text style={styles.statVal}>{product.variants?.length ?? 0}</Text>
                                        <Text style={styles.statLabel}>Variants</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statBox}>
                                        <Ionicons name="pricetag-outline" size={20} color={colors.warning} />
                                        <Text style={styles.statVal}>{product.gst?.gstPercent ?? 0}%</Text>
                                        <Text style={styles.statLabel}>GST</Text>
                                    </View>
                                </View>

                                {/* Sizes */}
                                {uniqueSizes.length > 0 && (
                                    <View style={styles.sheetSection}>
                                        <Text style={styles.sheetSectionTitle}>Available Sizes</Text>
                                        <View style={styles.sizeRow}>
                                            {uniqueSizes.map((size, i) => (
                                                <View key={i} style={styles.sizeChip}>
                                                    <Text style={styles.sizeChipText}>{size}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Colors */}
                                {uniqueColors.length > 0 && (
                                    <View style={styles.sheetSection}>
                                        <Text style={styles.sheetSectionTitle}>Available Colors</Text>
                                        <View style={styles.colorRow}>
                                            {uniqueColors.map((color, i) => (
                                                <View key={i} style={styles.colorItem}>
                                                    <View style={[styles.colorCircle, getColorStyle(color as string)]} />
                                                    <Text style={styles.colorLabel}>{color}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Variants */}
                                {product.variants?.length > 0 && (
                                    <View style={styles.sheetSection}>
                                        <Text style={styles.sheetSectionTitle}>Variants</Text>
                                        {product.variants.map((variant, i) => (
                                            <TouchableOpacity
                                                key={variant._id}
                                                style={[
                                                    styles.variantRow,
                                                    activeVariant?._id === variant._id && styles.variantRowActive,
                                                ]}
                                                onPress={() => setActiveVariant(variant)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.variantLeft}>
                                                    {variant.images?.[0]?.url ? (
                                                        <Image
                                                            source={{ uri: variant.images[0].url }}
                                                            style={styles.variantThumb}
                                                        />
                                                    ) : (
                                                        <View style={[styles.variantThumb, { backgroundColor: '#F3F4F6' }]} />
                                                    )}
                                                    <View>
                                                        <Text style={styles.variantSku}>{variant.sku}</Text>
                                                        <Text style={styles.variantAttrs}>
                                                            {Object.entries(variant.attributes)
                                                                .map(([k, v]) => `${k}: ${v}`)
                                                                .join('  •  ')}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={styles.variantRight}>
                                                    <Text style={styles.variantPrice}>{formatPrice(variant.price)}</Text>
                                                    <Text style={styles.variantStock}>{variant.stock} pcs</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {/* Product Attributes */}
                                {product.attributes && Object.keys(product.attributes).length > 0 && (
                                    <View style={styles.sheetSection}>
                                        <Text style={styles.sheetSectionTitle}>Product Details</Text>
                                        <View style={styles.attributesGrid}>
                                            {Object.entries(product.attributes)
                                                .filter(([k]) => k !== 'brand')
                                                .map(([key, value], i) => (
                                                    <View key={i} style={styles.attrItem}>
                                                        <Text style={styles.attrKey}>
                                                            {key.charAt(0).toUpperCase() + key.slice(1)}
                                                        </Text>
                                                        <Text style={styles.attrValue}>{String(value)}</Text>
                                                    </View>
                                                ))}
                                        </View>
                                    </View>
                                )}

                                {/* GST Info */}
                                {product.gst && (
                                    <View style={styles.gstBox}>
                                        <View style={styles.gstRow}>
                                            <Text style={styles.gstLabel}>HSN Code</Text>
                                            <Text style={styles.gstValue}>{product.gst.hsnCode ?? '—'}</Text>
                                        </View>
                                        <View style={styles.gstRow}>
                                            <Text style={styles.gstLabel}>GST %</Text>
                                            <Text style={styles.gstValue}>{product.gst.gstPercent ?? 0}%</Text>
                                        </View>
                                        <View style={styles.gstRow}>
                                            <Text style={styles.gstLabel}>Price incl. GST</Text>
                                            <Text style={[styles.gstValue, { color: colors.primary, fontWeight: '700' }]}>
                                                {formatPrice(product.gst.priceIncludingGST ?? 0)}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Meta */}
                                <View style={styles.metaFooter}>
                                    <Text style={styles.metaFooterText}>
                                        Created: {new Date(product.createdAt).toLocaleDateString('en-IN')}
                                    </Text>
                                    <Text style={styles.metaFooterText}>
                                        Updated: {new Date(product.updatedAt).toLocaleDateString('en-IN')}
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

// --- Filter Chip ---
type FilterKey = 'all' | 'active' | 'featured' | 'trending';
const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'apps-outline' },
    { key: 'active', label: 'Active', icon: 'checkmark-circle-outline' },
    { key: 'featured', label: 'Featured', icon: 'star-outline' },
    { key: 'trending', label: 'Trending', icon: 'trending-up-outline' },
];

// --- Main Screen ---
const ProductListingScreen = ({ navigation }: any) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
    const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const debouncedSearch = useDebounce(searchText, 500);

    useEffect(() => {
        setSearchTerm(debouncedSearch);
        setPage(1);
    }, [debouncedSearch]);

    useEffect(() => {
        setPage(1);
    }, [activeFilter]);

    useEffect(() => {
        fetchProducts();
    }, [page, searchTerm, activeFilter]);

    useFocusEffect(
        useCallback(() => {
            setPage(1);
            fetchProducts();
        }, [])
    );

    const fetchProducts = async () => {
        if (loading && !refreshing) return;
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, any> = {
                page,
                limit: 10,
                search: searchTerm || undefined,
            };
            if (activeFilter === 'active') params.isActive = true;
            if (activeFilter === 'featured') params.isFeatured = true;
            if (activeFilter === 'trending') params.isTrending = true;

            const response = await getRequest(API_ENDPOINTS.GETALLPRODUCTS, params);

            if (response?.success && response?.data) {
                const items: Product[] = response.data?.items ?? response.data ?? [];
                const totalPagesFromApi = response.data?.meta?.totalPages || response.meta?.totalPages || 1;
                setTotalPages(totalPagesFromApi);
                if (page === 1) {
                    setProducts(items);
                } else {
                    setProducts((prev) => [...prev, ...items]);
                }
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

    const loadMore = () => {
        if (!loading && page < totalPages) setPage((p) => p + 1);
    };

    const handleViewProduct = (product: Product) => {
        setSelectedProduct(product);
        setBottomSheetVisible(true);
    };

    const renderFooter = () => {
        if (!loading || refreshing) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
        );
    };

    const renderEmpty = () => {
        if (loading && !refreshing) return null;
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={52} color={colors.placeholder} />
                <Text style={styles.emptyText}>No products found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
            </View>
        );
    };

    const renderError = () => {
        if (!error) return null;
        return (
            <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={28} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchProducts}>
                    <Ionicons name="refresh" size={15} color="#FFF" />
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            <View style={appTheme.scaffold}>
                <AppBar title="Products" onBack={() => navigation.goBack()} />

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchWrapper}>
                        <Ionicons name="search" size={17} color={colors.placeholder} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search products..."
                            placeholderTextColor={colors.placeholder}
                            value={searchText}
                            onChangeText={setSearchText}
                            returnKeyType="search"
                            onSubmitEditing={() => {
                                setSearchTerm(searchText);
                                setPage(1);
                            }}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity
                                onPress={() => { setSearchText(''); Keyboard.dismiss(); }}
                                style={styles.clearButton}
                            >
                                <Ionicons name="close-circle" size={17} color={colors.placeholder} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Filter Chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterScroll}
                    contentContainerStyle={styles.filterScrollContent}
                >
                    {FILTERS.map((filter) => (
                        <TouchableOpacity
                            key={filter.key}
                            style={[styles.filterChip, activeFilter === filter.key && styles.filterChipActive]}
                            onPress={() => setActiveFilter(filter.key)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={filter.icon as any}
                                size={13}
                                color={activeFilter === filter.key ? '#FFFFFF' : colors.secondary}
                            />
                            <Text style={[styles.filterChipText, activeFilter === filter.key && styles.filterChipTextActive]}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {renderError()}

                <FlatList
                    data={products}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <ProductCard
                            product={item}
                            onView={handleViewProduct}
                            onEdit={(p) => navigation.navigate('EditProduct', { productId: p._id })}
                        />
                    )}
                    contentContainerStyle={[localStyles.container, { paddingBottom: 100 }]}
                    showsVerticalScrollIndicator={false}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    initialNumToRender={8}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                />

                {/* FAB */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('AddProduct')}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                </TouchableOpacity>

                <ProductDetailsSheet
                    product={selectedProduct}
                    visible={bottomSheetVisible}
                    onClose={() => { setBottomSheetVisible(false); setSelectedProduct(null); }}
                />
            </View>
        </SafeAreaView>
    );
};

// --- Styles ---
const styles = {
    safeArea: { flex: 1, backgroundColor: colors.scaffoldBg },

    // Search
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
    searchIcon: { marginRight: 8 },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: Fonts.Regular || 'System',
        color: colors.secondary,
        paddingVertical: 0,
    },
    clearButton: { padding: 4 },

    // Filter chips
    filterScroll: { maxHeight: 48 },
    filterScrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 10,
        gap: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: colors.formBg,
        borderWidth: 1,
        borderColor: colors.formBorder,
        gap: 5,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterChipText: {
        fontSize: 13,
        fontFamily: Fonts.Medium || 'System',
        color: colors.secondary,
        fontWeight: '500',
    },
    filterChipTextActive: { color: '#FFFFFF' },

    // Product Card
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
    imageContainer: {
        width: 90,
        height: 110,
        position: 'relative',
    },
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
    productInfo: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 5,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 4,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontFamily: Fonts.Medium || 'System', fontWeight: '600' },
    returnableBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 3,
    },
    returnableText: {
        fontSize: 10,
        color: '#6366F1',
        fontFamily: Fonts.Medium || 'System',
        fontWeight: '600',
    },
    productName: {
        fontSize: 14,
        fontFamily: Fonts.Medium || 'System',
        fontWeight: '600',
        color: colors.secondary,
        marginBottom: 3,
        lineHeight: 20,
    },
    priceText: {
        fontSize: 14,
        fontFamily: Fonts.Bold || 'System',
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 5,
    },
    colorsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
    },
    colorDot: { width: 12, height: 12, borderRadius: 6 },
    moreColors: { fontSize: 10, color: colors.placeholder, fontFamily: Fonts.Regular || 'System' },
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
    metaChipText: { fontSize: 10, color: colors.placeholder, fontFamily: Fonts.Regular || 'System' },
    actionRow: { flexDirection: 'row', gap: 8 },
    actionBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    viewBtn: { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' },
    editBtn: { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' },

    // FAB
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

    // Footer / Empty / Error
    footerLoader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    loadingMoreText: { fontSize: 13, color: colors.placeholder, fontFamily: Fonts.Regular || 'System' },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 24,
        gap: 12,
    },
    emptyText: { fontSize: 18, fontFamily: Fonts.Medium || 'System', color: colors.secondary },
    emptySubtext: {
        fontSize: 14,
        fontFamily: Fonts.Regular || 'System',
        color: colors.placeholder,
        textAlign: 'center',
    },
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
    errorText: { color: colors.error, fontSize: 13, fontFamily: Fonts.Regular || 'System', textAlign: 'center' },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error,
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 5,
    },
    retryText: { color: '#FFF', fontSize: 13, fontFamily: Fonts.Medium || 'System', fontWeight: '500' },

    // Bottom Sheet
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    sheetHandleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 12,
        paddingBottom: 8,
        paddingHorizontal: 16,
        position: 'relative',
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' },
    closeBtn: { position: 'absolute', right: 12, top: 4, padding: 8 },

    sheetHero: { position: 'relative' },
    sheetHeroImage: {
        width: '100%',
        height: 220,
        resizeMode: 'cover',
        backgroundColor: '#F3F4F6',
    },
    sheetBadgeRow: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        gap: 6,
    },
    sheetBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    sheetBadgeText: { color: '#FFF', fontSize: 11, fontFamily: Fonts.Medium || 'System', fontWeight: '600' },
    imageDots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 5, left: 0, right: 0, justifyContent: 'center' },
    imageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
    imageDotActive: { backgroundColor: '#FFFFFF', width: 16 },

    sheetBody: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },
    sheetName: { fontSize: 20, fontFamily: Fonts.Bold || 'System', fontWeight: '700', color: colors.secondary, marginBottom: 4 },
    sheetPrice: { fontSize: 18, fontFamily: Fonts.Bold || 'System', fontWeight: '700', color: colors.primary, marginBottom: 8 },
    sheetDesc: { fontSize: 14, fontFamily: Fonts.Regular || 'System', color: colors.label, lineHeight: 20, marginBottom: 16 },

    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 8,
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statBox: { flex: 1, alignItems: 'center', gap: 2 },
    statDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },
    statVal: { fontSize: 18, fontFamily: Fonts.Bold || 'System', fontWeight: '700', color: colors.secondary },
    statLabel: { fontSize: 11, fontFamily: Fonts.Regular || 'System', color: colors.placeholder },

    sheetSection: { marginBottom: 18 },
    sheetSectionTitle: {
        fontSize: 13,
        fontFamily: Fonts.Medium || 'System',
        fontWeight: '600',
        color: colors.secondary,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
    sizeChipText: { fontSize: 13, fontFamily: Fonts.Medium || 'System', color: colors.secondary, fontWeight: '600' },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    colorItem: { alignItems: 'center', gap: 4 },
    colorCircle: { width: 28, height: 28, borderRadius: 14 },
    colorLabel: { fontSize: 10, fontFamily: Fonts.Regular || 'System', color: colors.placeholder, textTransform: 'capitalize' },

    variantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    variantRowActive: { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
    variantLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    variantThumb: { width: 40, height: 40, borderRadius: 8, resizeMode: 'cover' },
    variantSku: { fontSize: 12, fontFamily: Fonts.Medium || 'System', fontWeight: '600', color: colors.secondary },
    variantAttrs: { fontSize: 11, fontFamily: Fonts.Regular || 'System', color: colors.placeholder, marginTop: 2 },
    variantRight: { alignItems: 'flex-end' },
    variantPrice: { fontSize: 14, fontFamily: Fonts.Bold || 'System', fontWeight: '700', color: colors.primary },
    variantStock: { fontSize: 11, fontFamily: Fonts.Regular || 'System', color: colors.placeholder, marginTop: 2 },

    attributesGrid: { gap: 8 },
    attrItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    attrKey: { fontSize: 13, fontFamily: Fonts.Regular || 'System', color: colors.placeholder },
    attrValue: { fontSize: 13, fontFamily: Fonts.Medium || 'System', fontWeight: '600', color: colors.secondary },

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
    gstLabel: { fontSize: 13, fontFamily: Fonts.Regular || 'System', color: '#16A34A' },
    gstValue: { fontSize: 13, fontFamily: Fonts.Medium || 'System', fontWeight: '600', color: '#166534' },

    metaFooter: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 14,
        marginTop: 4,
        gap: 4,
    },
    metaFooterText: { fontSize: 11, fontFamily: Fonts.Regular || 'System', color: colors.placeholder },
} as const;

export default ProductListingScreen;
