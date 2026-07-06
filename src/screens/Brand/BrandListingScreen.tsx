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
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getRequest } from '../../constants/ApiClient';
import { API_ENDPOINTS } from '../../constants/ApiEndpoints';
import { colors, appTheme, localStyles } from '../../constants/AppThem';
import { Fonts } from '../../constants/Fonts';
import AppBar from '../../components/utils/AppBar';
import Pagination from '../../components/utils/Pagination';

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
interface Brand {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    logo?: { url: string; name?: string; alt?: string; isPrimary?: boolean; position?: number };
    banners?: Array<any>;
    website?: string;
    vendorId: string;
    metaTitle?: string;
    metaDescription?: string;
    tags?: string[];
    ratings?: number;
    totalProducts?: number;
    isFeatured: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// --- Brand Card (product layout) ---
const BrandCard = ({
    brand,
    onView,
    onEdit,
}: {
    brand: Brand;
    onView?: (brand: Brand) => void;
    onEdit?: (brand: Brand) => void;
}) => {
    const logoUrl = brand.logo?.url || 'https://via.placeholder.com/90x110?text=No+Logo';

    return (
        <View style={styles.brandCard}>
            {/* Logo — same dimensions as product image */}
            <View style={styles.imageContainer}>
                <Image source={{ uri: logoUrl }} style={styles.brandLogo} resizeMode="contain" />
                {brand.isFeatured && (
                    <View style={styles.featuredOverlay}>
                        <Ionicons name="star" size={9} color="#FFFFFF" />
                    </View>
                )}
            </View>

            {/* Brand Info */}
            <View style={styles.brandInfo}>
                {/* Status Row */}
                <View style={styles.statusRow}>
                    <View style={[styles.statusBadge, { backgroundColor: brand.isActive ? '#DCFCE7' : '#FEE2E2' }]}>
                        <View style={[styles.statusDot, { backgroundColor: brand.isActive ? '#22C55E' : '#EF4444' }]} />
                        <Text style={[styles.statusText, { color: brand.isActive ? '#16A34A' : '#DC2626' }]}>
                            {brand.isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                    {brand.isFeatured && (
                        <View style={styles.featuredBadge}>
                            <Ionicons name="star" size={10} color={colors.warning} />
                            <Text style={styles.featuredText}>Featured</Text>
                        </View>
                    )}
                </View>

                {/* Name */}
                <Text style={styles.brandName} numberOfLines={2}>
                    {brand.name}
                </Text>

                {/* Description */}
                {brand.description ? (
                    <Text style={styles.brandDesc} numberOfLines={1}>
                        {brand.description}
                    </Text>
                ) : null}

                {/* Meta Row */}
                <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                        <Ionicons name="cube-outline" size={11} color={colors.placeholder} />
                        <Text style={styles.metaChipText}>{brand.totalProducts ?? 0} products</Text>
                    </View>
                    <View style={styles.metaChip}>
                        <Ionicons name="star-outline" size={11} color={colors.placeholder} />
                        <Text style={styles.metaChipText}>{brand.ratings?.toFixed(1) ?? '0.0'} rating</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.viewBtn]}
                        onPress={() => onView?.(brand)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="eye-outline" size={15} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
                        onPress={() => onEdit?.(brand)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="create-outline" size={15} color={colors.warning} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

// --- Brand Details Bottom Sheet ---
const BrandDetailsSheet = ({
    brand,
    visible,
    onClose,
}: {
    brand: Brand | null;
    visible: boolean;
    onClose: () => void;
}) => {
    const translateY = useState(new Animated.Value(600))[0];

    useEffect(() => {
        if (visible && brand) {
            translateY.setValue(600);
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                friction: 8,
                tension: 40,
            }).start();
        }
    }, [visible, brand]);

    if (!brand) return null;

    const logoUrl = brand.logo?.url || 'https://via.placeholder.com/100x100?text=No+Logo';

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
                            {/* Hero Logo */}
                            <View style={styles.sheetHero}>
                                <Image source={{ uri: logoUrl }} style={styles.sheetHeroImage} resizeMode="contain" />
                                <View style={styles.sheetBadgeRow}>
                                    {brand.isActive && (
                                        <View style={[styles.sheetBadge, { backgroundColor: '#22C55E' }]}>
                                            <Text style={styles.sheetBadgeText}>Active</Text>
                                        </View>
                                    )}
                                    {brand.isFeatured && (
                                        <View style={[styles.sheetBadge, { backgroundColor: colors.warning }]}>
                                            <Ionicons name="star" size={10} color="#FFF" />
                                            <Text style={styles.sheetBadgeText}>Featured</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={styles.sheetBody}>
                                <Text style={styles.sheetName}>{brand.name}</Text>

                                {/* Stats */}
                                <View style={styles.statsRow}>
                                    <View style={styles.statBox}>
                                        <Ionicons name="cube-outline" size={20} color={colors.primary} />
                                        <Text style={styles.statVal}>{brand.totalProducts ?? 0}</Text>
                                        <Text style={styles.statLabel}>Products</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statBox}>
                                        <Ionicons name="star-outline" size={20} color={colors.warning} />
                                        <Text style={styles.statVal}>{brand.ratings?.toFixed(1) ?? '0.0'}</Text>
                                        <Text style={styles.statLabel}>Rating</Text>
                                    </View>
                                </View>

                                {/* Description */}
                                {brand.description ? (
                                    <View style={styles.sheetSection}>
                                        <Text style={styles.sheetSectionTitle}>Description</Text>
                                        <Text style={styles.sheetDesc}>{brand.description}</Text>
                                    </View>
                                ) : null}

                                {/* Website */}
                                {brand.website ? (
                                    <View style={styles.sheetSection}>
                                        <Text style={styles.sheetSectionTitle}>Website</Text>
                                        <View style={styles.websiteRow}>
                                            <Ionicons name="link-outline" size={14} color={colors.primary} />
                                            <Text style={styles.websiteText} numberOfLines={1}>{brand.website}</Text>
                                        </View>
                                    </View>
                                ) : null}

                                {/* Tags */}
                                {brand.tags && brand.tags.length > 0 && (
                                    <View style={styles.sheetSection}>
                                        <Text style={styles.sheetSectionTitle}>Tags</Text>
                                        <View style={styles.tagsRow}>
                                            {brand.tags.map((tag, i) => (
                                                <View key={i} style={styles.tagChip}>
                                                    <Text style={styles.tagChipText}>{tag}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Meta */}
                                <View style={styles.metaFooter}>
                                    <Text style={styles.metaFooterText}>
                                        Created: {new Date(brand.createdAt).toLocaleDateString('en-IN')}
                                    </Text>
                                    <Text style={styles.metaFooterText}>
                                        Updated: {new Date(brand.updatedAt).toLocaleDateString('en-IN')}
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

// --- Main Screen ---
const BrandListingScreen = ({ navigation }: any) => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [featuredOnly, setFeaturedOnly] = useState(false);
    const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

    const flatListRef = React.useRef<FlatList>(null);
    const debouncedSearch = useDebounce(searchText, 500);

    // Auto-search on debounce (any non-empty term)
    useEffect(() => {
        const trimmed = debouncedSearch.trim();
        setSearchTerm(trimmed);
        setPage(1);
    }, [debouncedSearch]);

    // Reset page when featuredOnly toggles
    useEffect(() => {
        setPage(1);
    }, [featuredOnly]);

    // Fetch when page / searchTerm / featuredOnly changes
    useEffect(() => {
        fetchBrands(searchTerm, page);
    }, [page, searchTerm, featuredOnly]);

    useFocusEffect(
        useCallback(() => {
            setPage(1);
            fetchBrands(searchTerm, 1);
        }, [searchTerm, featuredOnly])
    );

    const fetchBrands = async (term: string = searchTerm, pageNum: number = page) => {
        setLoading(true);
        setError(null);
        try {
            const response = await getRequest(API_ENDPOINTS.BRANDSGETALL, {
                page: pageNum,
                limit: 10,
                search: term || undefined,
                featuredOnly: featuredOnly || undefined,
            });
            if (response?.success && response?.data) {
                const items: Brand[] = response.data?.items ?? response.data ?? [];
                const totalPagesFromApi =
                    response.data?.meta?.totalPages || response.meta?.totalPages || 1;
                setTotalPages(totalPagesFromApi);
                setBrands(items);
            } else {
                setError(response?.message || 'Failed to load brands');
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
        fetchBrands(searchTerm, 1);
    }, [searchTerm, featuredOnly]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    const handleViewBrand = (brand: Brand) => {
        setSelectedBrand(brand);
        setBottomSheetVisible(true);
    };

    const renderEmpty = () => {
        if (loading && !refreshing) return null;
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={52} color={colors.placeholder} />
                <Text style={styles.emptyText}>No brands found</Text>
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
                <TouchableOpacity style={styles.retryBtn} onPress={() => fetchBrands(searchTerm, page)}>
                    <Ionicons name="refresh" size={15} color="#FFF" />
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            <View style={appTheme.scaffold}>
                <AppBar title="Brands" onBack={() => navigation.goBack()} />

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchWrapper}>
                        <Ionicons name="search" size={17} color={colors.placeholder} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search brands..."
                            placeholderTextColor={colors.placeholder}
                            value={searchText}
                            onChangeText={setSearchText}
                            returnKeyType="search"
                            onSubmitEditing={() => {
                                const trimmed = searchText.trim();
                                setSearchTerm(trimmed);
                                setPage(1);
                                fetchBrands(trimmed, 1);
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
                                style={styles.clearButton}
                            >
                                <Ionicons name="close-circle" size={17} color={colors.placeholder} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.searchIconBtn}
                            onPress={() => {
                                if (searchText.trim().length > 0) {
                                    setSearchTerm(searchText.trim());
                                    setPage(1);
                                    fetchBrands(searchText.trim(), 1);
                                    Keyboard.dismiss();
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-forward-circle" size={28} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Featured Filter Pill */}
                    <TouchableOpacity
                        style={[styles.filterBtn, featuredOnly && styles.filterBtnActive]}
                        onPress={() => setFeaturedOnly((prev) => !prev)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={featuredOnly ? 'star' : 'star-outline'}
                            size={15}
                            color={featuredOnly ? '#fff' : colors.secondary}
                        />
                        <Text style={[styles.filterBtnText, featuredOnly && styles.filterBtnTextActive]}>
                            {featuredOnly ? 'Featured' : 'All'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {renderError()}

                {loading && !refreshing && brands.length === 0 && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                )}

                <FlatList
                    ref={flatListRef}
                    data={brands}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <BrandCard
                            brand={item}
                            onView={handleViewBrand}
                            onEdit={(b) => navigation.navigate('EditBrand', { brandId: b._id })}
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
                    style={styles.fab}
                    onPress={() => navigation.navigate('AddBrand')}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                </TouchableOpacity>

                <BrandDetailsSheet
                    brand={selectedBrand}
                    visible={bottomSheetVisible}
                    onClose={() => { setBottomSheetVisible(false); setSelectedBrand(null); }}
                />
            </View>
        </SafeAreaView>
    );
};

// --- Styles (mirrored from ProductListingScreen) ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.scaffoldBg },

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: colors.scaffoldBg,
        gap: 8,
    },
    searchWrapper: {
        flex: 1,
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
    searchIconBtn: {
        marginLeft: 6,
        paddingLeft: 8,
        borderLeftWidth: 1,
        borderLeftColor: colors.formBorder,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.formBg,
        borderWidth: 1,
        borderColor: colors.formBorder,
        gap: 5,
    },
    filterBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterBtnText: {
        fontSize: 13,
        fontFamily: Fonts.Medium || 'System',
        color: colors.secondary,
        fontWeight: '500',
    },
    filterBtnTextActive: { color: '#fff' },

    // Loading overlay
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

    // Brand Card (product card layout)
    brandCard: {
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
    brandLogo: {
        width: 90,
        height: 110,
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
    brandInfo: {
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
    featuredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warning + '20',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 3,
    },
    featuredText: {
        fontSize: 10,
        color: colors.warning,
        fontFamily: Fonts.Medium || 'System',
        fontWeight: '600',
    },
    brandName: {
        fontSize: 14,
        fontFamily: Fonts.Medium || 'System',
        fontWeight: '600',
        color: colors.secondary,
        marginBottom: 3,
        lineHeight: 20,
    },
    brandDesc: {
        fontSize: 12,
        fontFamily: Fonts.Regular || 'System',
        color: colors.placeholder,
        marginBottom: 6,
        lineHeight: 16,
    },
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

    // Empty / Error
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
        height: 200,
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

    sheetBody: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },
    sheetName: {
        fontSize: 20,
        fontFamily: Fonts.Bold || 'System',
        fontWeight: '700',
        color: colors.secondary,
        marginBottom: 12,
    },

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
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sheetDesc: {
        fontSize: 14,
        fontFamily: Fonts.Regular || 'System',
        color: colors.label,
        lineHeight: 20,
    },
    websiteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.primary + '10',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    websiteText: {
        fontSize: 13,
        fontFamily: Fonts.Regular || 'System',
        color: colors.primary,
    },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagChip: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tagChipText: { fontSize: 12, fontFamily: Fonts.Regular || 'System', color: colors.secondary },

    metaFooter: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 14,
        marginTop: 4,
        gap: 4,
    },
    metaFooterText: { fontSize: 11, fontFamily: Fonts.Regular || 'System', color: colors.placeholder },
});

export default BrandListingScreen;