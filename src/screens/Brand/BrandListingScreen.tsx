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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getRequest } from '../../constants/ApiClient';
import { API_ENDPOINTS } from '../../constants/ApiEndpoints';
import { colors, appTheme, inputStyles, localStyles } from '../../constants/AppThem';
import { Fonts } from '../../constants/Fonts';
import AppBar from '../../components/utils/AppBar';

// --- Helper: Debounce hook ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

// --- Brand Item Component ---
interface Brand {
    _id: string;
    name: string;
    slug: string;
    description: string;
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

const BrandCard = ({
    brand,
    onView,
    onEdit
}: {
    brand: Brand;
    onView?: (brand: Brand) => void;
    onEdit?: (brand: Brand) => void;
}) => {
    const logoUrl = brand.logo?.url || 'https://via.placeholder.com/60x60?text=No+Logo';

    return (
        <View style={styles.brandCard}>
            <Image source={{ uri: logoUrl }} style={styles.brandLogo} />
            <View style={styles.brandInfo}>
                <View style={styles.brandHeader}>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Active</Text>
                    </View>
                </View>
                <Text style={styles.brandName} numberOfLines={1}>
                    {brand.name}
                </Text>
                {brand.isFeatured && (
                    <View style={styles.featuredBadge}>
                        <Ionicons name="star" size={10} color={colors.warning} />
                        <Text style={styles.featuredText}>Featured</Text>
                    </View>
                )}
                <View style={styles.brandMeta}>
                    <View style={styles.metaItem}>
                        <View style={[styles.colorDot, { backgroundColor: '#6B7280' }]} />
                        <Text style={styles.metaText}>{brand.totalProducts ?? 0} stocks</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Ionicons name="star" size={12} color={colors.warning} />
                        <Text style={styles.metaText}>{brand.ratings?.toFixed(1) ?? '0.0'}</Text>
                    </View>
                </View>

                {/* Action Buttons - View & Edit only */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.viewButton]}
                        onPress={() => onView?.(brand)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="eye-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => onEdit?.(brand)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="create-outline" size={16} color={colors.warning} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

// --- Bottom Sheet Component for Brand Details ---
const BrandDetailsSheet = ({
    brand,
    visible,
    onClose
}: {
    brand: Brand | null;
    visible: boolean;
    onClose: () => void;
}) => {
    const translateY = useState(new Animated.Value(0))[0];

    useEffect(() => {
        if (visible) {
            translateY.setValue(500);
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                friction: 8,
                tension: 40,
            }).start();
        }
    }, [visible]);

    if (!brand) return null;

    const logoUrl = brand.logo?.url || 'https://via.placeholder.com/100x100?text=No+Logo';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Animated.View
                    style={[
                        styles.bottomSheet,
                        { transform: [{ translateY }] }
                    ]}
                >
                    <View style={styles.sheetHeader}>
                        <View style={styles.sheetHandle} />
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.secondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.sheetContent}>
                            <Image source={{ uri: logoUrl }} style={styles.sheetLogo} />

                            <Text style={styles.sheetBrandName}>{brand.name}</Text>

                            {brand.isFeatured && (
                                <View style={styles.sheetFeaturedBadge}>
                                    <Ionicons name="star" size={12} color={colors.warning} />
                                    <Text style={styles.sheetFeaturedText}>Featured Brand</Text>
                                </View>
                            )}

                            <View style={styles.sheetStatusRow}>
                                <View style={styles.sheetStatusBadge}>
                                    <View style={[styles.sheetStatusDot, { backgroundColor: brand.isActive ? '#22C55E' : '#EF4444' }]} />
                                    <Text style={styles.sheetStatusText}>
                                        {brand.isActive ? 'Active' : 'Inactive'}
                                    </Text>
                                </View>
                            </View>

                            {brand.description && (
                                <View style={styles.sheetSection}>
                                    <Text style={styles.sheetSectionTitle}>Description</Text>
                                    <Text style={styles.sheetDescription}>{brand.description}</Text>
                                </View>
                            )}

                            <View style={styles.sheetStatsRow}>
                                <View style={styles.sheetStat}>
                                    <Ionicons name="cube-outline" size={24} color={colors.primary} />
                                    <Text style={styles.sheetStatValue}>{brand.totalProducts ?? 0}</Text>
                                    <Text style={styles.sheetStatLabel}>Products</Text>
                                </View>
                                <View style={styles.sheetStatDivider} />
                                <View style={styles.sheetStat}>
                                    <Ionicons name="star" size={24} color={colors.warning} />
                                    <Text style={styles.sheetStatValue}>{brand.ratings?.toFixed(1) ?? '0.0'}</Text>
                                    <Text style={styles.sheetStatLabel}>Rating</Text>
                                </View>
                            </View>

                            {brand.website && (
                                <View style={styles.sheetSection}>
                                    <Text style={styles.sheetSectionTitle}>Website</Text>
                                    <TouchableOpacity style={styles.sheetLink}>
                                        <Ionicons name="link-outline" size={16} color={colors.primary} />
                                        <Text style={styles.sheetLinkText}>{brand.website}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {brand.tags && brand.tags.length > 0 && (
                                <View style={styles.sheetSection}>
                                    <Text style={styles.sheetSectionTitle}>Tags</Text>
                                    <View style={styles.sheetTags}>
                                        {brand.tags.map((tag, index) => (
                                            <View key={index} style={styles.sheetTag}>
                                                <Text style={styles.sheetTagText}>{tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            <View style={styles.sheetMeta}>
                                <Text style={styles.sheetMetaText}>
                                    Created: {new Date(brand.createdAt).toLocaleDateString()}
                                </Text>
                                <Text style={styles.sheetMetaText}>
                                    Updated: {new Date(brand.updatedAt).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};
const BrandListingScreen = ({ navigation }: any) => {
    // State
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [searchText, setSearchText] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [featuredOnly, setFeaturedOnly] = useState<boolean>(false);
    const [bottomSheetVisible, setBottomSheetVisible] = useState<boolean>(false);
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

    // Debounce search input
    const debouncedSearch = useDebounce(searchText, 500);

    // Update searchTerm when debounced value changes
    useEffect(() => {
        setSearchTerm(debouncedSearch);
        setPage(1);
    }, [debouncedSearch]);

    // Reset page when featuredOnly toggles
    useEffect(() => {
        setPage(1);
    }, [featuredOnly]);

    // Fetch brands when page, searchTerm, or featuredOnly changes
    useEffect(() => {
        fetchBrands();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, searchTerm, featuredOnly]);

    // Refresh brands when screen regains focus (e.g., after adding a brand)
    useFocusEffect(
        useCallback(() => {
            setPage(1);
            fetchBrands();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [])
    );

    const fetchBrands = async () => {
        if (loading && !refreshing) return;
        setLoading(true);
        setError(null);
        try {
            const response = await getRequest(API_ENDPOINTS.BRANDSGETALL, {
                page,
                limit: 10,
                search: searchTerm || undefined,
                featuredOnly: featuredOnly || undefined,
            });

            if (response?.success && response?.data) {
                const newBrands = response.data;
                const totalPagesFromApi = response.meta?.totalPages || 1;

                setTotalPages(totalPagesFromApi);
                if (page === 1) {
                    setBrands(newBrands);
                } else {
                    setBrands((prev) => [...prev, ...newBrands]);
                }
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

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        setPage(1);
        // Wait for the useEffect to trigger fetchBrands, then manually ensure refreshing stops
        // The fetchBrands will be triggered by the page change in useEffect
    }, []);

    // Effect to handle refresh completion when page resets to 1
    useEffect(() => {
        if (page === 1 && refreshing && !loading) {
            // Refresh completed
        }
    }, [page, refreshing, loading]);

    const loadMore = () => {
        if (!loading && page < totalPages) {
            setPage((prev) => prev + 1);
        }
    };

    const toggleFeaturedFilter = () => {
        setFeaturedOnly((prev) => !prev);
    };

    const handleViewBrand = (brand: Brand) => {
        setSelectedBrand(brand);
        setBottomSheetVisible(true);
    };

    const handleCloseBottomSheet = () => {
        setBottomSheetVisible(false);
        setSelectedBrand(null);
    };

    const handleAddBrand = () => {
        navigation.navigate('AddBrand');
    };

    const handleEditBrand = (brand: Brand) => {
        navigation.navigate('EditBrand', { brandId: brand._id });
    };

    const clearSearch = () => {
        setSearchText('');
        Keyboard.dismiss();
    };

    const renderFooter = () => {
        if (!loading || refreshing) return null;
        if (page >= totalPages) {
            return (
                <View style={styles.footerTextContainer}>
                    <Text style={styles.footerText}>No more brands</Text>
                </View>
            );
        }
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
        );
    };

    const renderEmptyComponent = () => {
        if (loading && !refreshing) return null;
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={48} color={colors.placeholder} />
                <Text style={styles.emptyText}>No brands found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
            </View>
        );
    };

    const renderError = () => {
        if (!error) return null;
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchBrands}>
                    <Ionicons name="refresh" size={16} color="#FFFFFF" />
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
            <View style={appTheme.scaffold}>
                <AppBar
                    title="Brands Listing"
                    onBack={() => navigation.goBack()}
                />

                {/* Search & Filter Row */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchWrapper}>
                        <Ionicons name="search" size={18} color={colors.placeholder} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search brands..."
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
                            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                                <Ionicons name="close-circle" size={18} color={colors.placeholder} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.filterButton, featuredOnly && styles.filterButtonActive]}
                        onPress={toggleFeaturedFilter}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={featuredOnly ? 'star' : 'star-outline'}
                            size={16}
                            color={featuredOnly ? '#FFFFFF' : colors.secondary}
                        />
                        <Text style={[styles.filterButtonText, featuredOnly && styles.filterButtonTextActive]}>
                            {featuredOnly ? 'Featured' : 'All'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Main List */}
                {renderError()}
                <FlatList
                    data={brands}
                    keyExtractor={(item: Brand) => item._id}
                    renderItem={({ item }: { item: Brand }) => (
                        <BrandCard
                            brand={item}
                            onView={handleViewBrand}
                            onEdit={(brand: Brand) => navigation.navigate('EditBrand', { brandId: brand._id })}
                        />
                    )}
                    contentContainerStyle={[localStyles.container, { paddingBottom: 100 }]}
                    showsVerticalScrollIndicator={false}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={renderEmptyComponent}
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

                {/* Floating Action Button */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={handleAddBrand}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Brand Details Bottom Sheet */}
                <BrandDetailsSheet
                    brand={selectedBrand}
                    visible={bottomSheetVisible}
                    onClose={handleCloseBottomSheet}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = {
    // Safe Area
    safeArea: {
        flex: 1,
        backgroundColor: colors.scaffoldBg,
    },
    // Search & Filter
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.scaffoldBg,
        gap: 10,
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
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: Fonts.Regular || 'System',
        color: colors.secondary,
        paddingVertical: 0,
    },
    clearButton: {
        padding: 4,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors.formBg,
        borderWidth: 1,
        borderColor: colors.formBorder,
        gap: 6,
        height: 44,
    },
    filterButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterButtonText: {
        fontSize: 13,
        fontFamily: Fonts.Medium || 'System',
        color: colors.secondary,
        fontWeight: '500',
    },
    filterButtonTextActive: {
        color: '#FFFFFF',
    },
    // Brand Card - Modern Product Style
    brandCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.formBorder,
    },
    brandLogo: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        resizeMode: 'contain',
        marginRight: 14,
    },
    brandInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    brandHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22C55E',
    },
    statusText: {
        fontSize: 12,
        fontFamily: Fonts.Medium || 'System',
        color: '#22C55E',
        fontWeight: '600',
    },
    brandName: {
        fontSize: 16,
        fontFamily: Fonts.Medium || 'System',
        fontWeight: '600',
        color: colors.secondary,
        marginBottom: 6,
    },
    featuredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: colors.warning + '15',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
        marginBottom: 8,
    },
    featuredText: {
        fontSize: 11,
        fontFamily: Fonts.Medium || 'System',
        color: colors.warning,
        fontWeight: '600',
    },
    brandMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    colorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    metaText: {
        fontSize: 13,
        fontFamily: Fonts.Regular || 'System',
        color: colors.label,
    },
    // Action Buttons
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 8,
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    viewButton: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary + '30',
    },
    addButton: {
        backgroundColor: '#22C55E' + '15',
        borderColor: '#22C55E' + '30',
    },
    editButton: {
        backgroundColor: colors.warning + '15',
        borderColor: colors.warning + '30',
    },
    // Floating Action Button
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
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    // Bottom Sheet Styles
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        minHeight: '50%',
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
        position: 'relative',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
    },
    closeButton: {
        position: 'absolute',
        right: 16,
        top: 8,
        padding: 8,
    },
    sheetContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        alignItems: 'center',
    },
    sheetLogo: {
        width: 100,
        height: 100,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        resizeMode: 'contain',
        marginBottom: 16,
    },
    sheetBrandName: {
        fontSize: 22,
        fontFamily: Fonts.Bold || 'System',
        fontWeight: '700',
        color: colors.secondary,
        textAlign: 'center',
        marginBottom: 8,
    },
    sheetFeaturedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warning + '15',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
        marginBottom: 12,
    },
    sheetFeaturedText: {
        fontSize: 13,
        fontFamily: Fonts.Medium || 'System',
        color: colors.warning,
        fontWeight: '600',
    },
    sheetStatusRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    sheetStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    sheetStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    sheetStatusText: {
        fontSize: 13,
        fontFamily: Fonts.Medium || 'System',
        fontWeight: '600',
    },
    sheetSection: {
        width: '100%',
        marginBottom: 20,
    },
    sheetSectionTitle: {
        fontSize: 14,
        fontFamily: Fonts.Medium || 'System',
        fontWeight: '600',
        color: colors.secondary,
        marginBottom: 8,
    },
    sheetDescription: {
        fontSize: 14,
        fontFamily: Fonts.Regular || 'System',
        color: colors.label,
        lineHeight: 20,
    },
    sheetStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        marginBottom: 20,
        width: '100%',
    },
    sheetStat: {
        alignItems: 'center',
        flex: 1,
    },
    sheetStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E5E7EB',
    },
    sheetStatValue: {
        fontSize: 20,
        fontFamily: Fonts.Bold || 'System',
        fontWeight: '700',
        color: colors.secondary,
        marginTop: 4,
    },
    sheetStatLabel: {
        fontSize: 12,
        fontFamily: Fonts.Regular || 'System',
        color: colors.placeholder,
        marginTop: 2,
    },
    sheetLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.primary + '10',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    sheetLinkText: {
        fontSize: 14,
        fontFamily: Fonts.Regular || 'System',
        color: colors.primary,
    },
    sheetTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    sheetTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    sheetTagText: {
        fontSize: 12,
        fontFamily: Fonts.Regular || 'System',
        color: colors.label,
    },
    sheetMeta: {
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 16,
        marginTop: 8,
    },
    sheetMetaText: {
        fontSize: 12,
        fontFamily: Fonts.Regular || 'System',
        color: colors.placeholder,
        marginBottom: 4,
    },
    // Footer & Empty
    footerLoader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    loadingMoreText: {
        fontSize: 13,
        color: colors.placeholder,
        fontFamily: Fonts.Regular || 'System',
    },
    footerTextContainer: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 13,
        color: colors.placeholder,
        fontFamily: Fonts.Regular || 'System',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 24,
        gap: 12,
    },
    emptyText: {
        fontSize: 18,
        fontFamily: Fonts.Medium || 'System',
        color: colors.secondary,
    },
    emptySubtext: {
        fontSize: 14,
        fontFamily: Fonts.Regular || 'System',
        color: colors.placeholder,
        textAlign: 'center',
    },
    errorContainer: {
        marginHorizontal: 20,
        marginTop: 20,
        padding: 20,
        backgroundColor: '#FEF2F2',
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.error + '40',
        gap: 12,
    },
    errorText: {
        color: colors.error,
        fontSize: 14,
        fontFamily: Fonts.Regular || 'System',
        textAlign: 'center',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: Fonts.Medium || 'System',
        fontWeight: '500',
    },
} as const;

export default BrandListingScreen;
