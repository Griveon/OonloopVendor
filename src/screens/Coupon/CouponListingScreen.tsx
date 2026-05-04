import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
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
import { colors, appTheme, localStyles } from '../../constants/AppThem';
import { Fonts } from '../../constants/Fonts';
import AppBar from '../../components/utils/AppBar';
import { getUserData } from '../../components/AsyncStorage/AsyncStorage';

// --- Helper: Debounce hook ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// --- Coupon Interface ---
interface Coupon {
    _id: string;
    vendorId: string;
    couponType: string;         // e.g. "PRODUCT"
    discountType: string;       // "PERCENTAGE" | "FLAT"
    discountValue: number;
    minOrderValue: number;
    couponCode: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// --- Coupon Card Component ---
const CouponCard = ({
    coupon,
    onView,
    onEdit,
}: {
    coupon: Coupon;
    onView?: (coupon: Coupon) => void;
    onEdit?: (coupon: Coupon) => void;
}) => {
    const isPercentage = coupon.discountType === 'PERCENTAGE';

    return (
        <View style={styles.couponCard}>
            {/* Left accent strip */}
            <View style={[styles.accentStrip, { backgroundColor: coupon.isActive ? colors.primary : '#9CA3AF' }]} />

            <View style={styles.couponBody}>
                {/* Top row: code + status */}
                <View style={styles.couponHeader}>
                    <View style={styles.codeContainer}>
                        <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
                        <Text style={styles.couponCode}>{coupon.couponCode}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: coupon.isActive ? '#DCFCE7' : '#F3F4F6' }]}>
                        <View style={[styles.statusDot, { backgroundColor: coupon.isActive ? '#22C55E' : '#9CA3AF' }]} />
                        <Text style={[styles.statusText, { color: coupon.isActive ? '#22C55E' : '#9CA3AF' }]}>
                            {coupon.isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>

                {/* Discount value */}
                <Text style={styles.discountValue}>
                    {isPercentage ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                </Text>

                {/* Description */}
                <Text style={styles.couponDescription} numberOfLines={2}>
                    {coupon.description}
                </Text>

                {/* Meta row */}
                <View style={styles.couponMeta}>
                    <View style={styles.metaItem}>
                        <Ionicons name="cart-outline" size={13} color={colors.label} />
                        <Text style={styles.metaText}>Min. ₹{coupon.minOrderValue}</Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                        <Ionicons name="layers-outline" size={13} color={colors.label} />
                        <Text style={styles.metaText}>{coupon.couponType}</Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                        <Ionicons
                            name={isPercentage ? 'trending-down-outline' : 'cash-outline'}
                            size={13}
                            color={colors.label}
                        />
                        <Text style={styles.metaText}>{coupon.discountType}</Text>
                    </View>
                </View>

                {/* Action buttons */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.viewButton]}
                        onPress={() => onView?.(coupon)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="eye-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => onEdit?.(coupon)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="create-outline" size={16} color={colors.warning} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

// --- Bottom Sheet Component for Coupon Details ---
const CouponDetailsSheet = ({
    coupon,
    visible,
    onClose,
}: {
    coupon: Coupon | null;
    visible: boolean;
    onClose: () => void;
}) => {
    const translateY = useState(new Animated.Value(500))[0];



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

    if (!coupon) return null;

    const isPercentage = coupon.discountType === 'PERCENTAGE';

    const DetailRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
        <View style={styles.detailRow}>
            <View style={styles.detailIconWrap}>
                <Ionicons name={icon as any} size={18} color={colors.primary} />
            </View>
            <View style={styles.detailTextWrap}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
            </View>
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Animated.View style={[styles.bottomSheet, { transform: [{ translateY }] }]}>
                    {/* Handle + close */}
                    <View style={styles.sheetHeader}>
                        <View style={styles.sheetHandle} />
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.secondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.sheetContent}>
                            {/* Discount hero */}
                            <View style={styles.sheetHero}>
                                <View style={[styles.sheetHeroIcon, { backgroundColor: colors.primary + '15' }]}>
                                    <Ionicons name="pricetag" size={36} color={colors.primary} />
                                </View>
                                <Text style={styles.sheetDiscountBig}>
                                    {isPercentage ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                                </Text>
                                <Text style={styles.sheetDiscountLabel}>
                                    {isPercentage ? 'Percentage Discount' : 'Flat Discount'}
                                </Text>

                                {/* Coupon code pill */}
                                <View style={styles.sheetCodePill}>
                                    <Text style={styles.sheetCodeText}>{coupon.couponCode}</Text>
                                </View>
                            </View>

                            {/* Status */}
                            <View style={styles.sheetStatusRow}>
                                <View style={[styles.sheetStatusBadge, { backgroundColor: coupon.isActive ? '#DCFCE7' : '#F3F4F6' }]}>
                                    <View style={[styles.sheetStatusDot, { backgroundColor: coupon.isActive ? '#22C55E' : '#9CA3AF' }]} />
                                    <Text style={[styles.sheetStatusText, { color: coupon.isActive ? '#22C55E' : '#9CA3AF' }]}>
                                        {coupon.isActive ? 'Active' : 'Inactive'}
                                    </Text>
                                </View>
                            </View>

                            {/* Description */}
                            {coupon.description ? (
                                <View style={styles.sheetSection}>
                                    <Text style={styles.sheetSectionTitle}>Description</Text>
                                    <Text style={styles.sheetDescription}>{coupon.description}</Text>
                                </View>
                            ) : null}

                            {/* Details */}
                            <View style={styles.sheetSection}>
                                <Text style={styles.sheetSectionTitle}>Details</Text>
                                <View style={styles.detailsCard}>
                                    <DetailRow
                                        icon="cart-outline"
                                        label="Minimum Order Value"
                                        value={`₹${coupon.minOrderValue}`}
                                    />
                                    <View style={styles.detailDivider} />
                                    <DetailRow
                                        icon="layers-outline"
                                        label="Coupon Type"
                                        value={coupon.couponType}
                                    />
                                    <View style={styles.detailDivider} />
                                    <DetailRow
                                        icon={isPercentage ? 'trending-down-outline' : 'cash-outline'}
                                        label="Discount Type"
                                        value={coupon.discountType}
                                    />
                                </View>
                            </View>

                            {/* Created / Updated */}
                            <View style={styles.sheetMeta}>
                                <Text style={styles.sheetMetaText}>
                                    Created: {new Date(coupon.createdAt).toLocaleDateString()}
                                </Text>
                                <Text style={styles.sheetMetaText}>
                                    Updated: {new Date(coupon.updatedAt).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

// --- Main Screen ---
const CouponListingScreen = ({ navigation }: any) => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [searchText, setSearchText] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [activeOnly, setActiveOnly] = useState<boolean>(false);
    const [bottomSheetVisible, setBottomSheetVisible] = useState<boolean>(false);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

    const debouncedSearch = useDebounce(searchText, 500);
    const [vendor, setVendor] = useState<any | null>(null);
    // 1. Handle search debounce
    useEffect(() => {
        setPage(1);
        setSearchTerm(debouncedSearch);
    }, [debouncedSearch]);

    useFocusEffect(
        useCallback(() => {
            if (vendor?._id) {
                setPage(1);
                fetchCoupons();
            }
        }, [vendor?._id])
    );
    // 2. Handle active filter
    useEffect(() => {
        setPage(1);
    }, [activeOnly]);

    // 3. Fetch vendor ONCE
    useEffect(() => {
        const init = async () => {
            const { user } = await getUserData();
            if (user?.user?._id) {
                fetchVendorProfile(user.user._id);
            }
        };
        init();
    }, []);

    // 4. Fetch coupons when dependencies change
    useEffect(() => {
        if (vendor?._id) {
            fetchCoupons();
        }
    }, [page, searchTerm, activeOnly, vendor?._id]);

    // 5. Vendor API
    const fetchVendorProfile = async (userId: string) => {
        try {
            const res: any = await getRequest(
                `${API_ENDPOINTS.VENDORPROFILEGET}/${userId}`
            );

            if (res?.success && res?.data?.vendor) {
                setVendor(res.data.vendor);
            }
        } catch (err: any) {
            console.log("Vendor fetch error:", err?.message);
        }
    };

    const fetchCoupons = async () => {
        if (loading && !refreshing) return;
        setLoading(true);
        setError(null);
        try {
            const response = await getRequest(`${API_ENDPOINTS.VENDORCOUPONSGETALL}?vendorId=${vendor._id}`);

            if (response?.success && response?.data) {
                const newCoupons: Coupon[] = response.data;
                const totalPagesFromApi = response.meta?.totalPages || 1;
                setTotalPages(totalPagesFromApi);
                if (page === 1) {
                    setCoupons(newCoupons);
                } else {
                    setCoupons((prev) => [...prev, ...newCoupons]);
                }
            } else {
                setError(response?.message || 'Failed to load coupons');
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
        if (!loading && page < totalPages) {
            setPage((prev) => prev + 1);
        }
    };

    const handleViewCoupon = (coupon: Coupon) => {
        setSelectedCoupon(coupon);
        setBottomSheetVisible(true);
    };

    const handleCloseBottomSheet = () => {
        setBottomSheetVisible(false);
        setSelectedCoupon(null);
    };

    const handleEditCoupon = (coupon: Coupon) => {
        navigation.navigate('EditCoupon', { couponId: coupon._id });
    };

    const handleAddCoupon = () => {
        navigation.navigate('AddCoupon');
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
                    <Text style={styles.footerText}>No more coupons</Text>
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
                <Ionicons name="pricetag-outline" size={48} color={colors.placeholder} />
                <Text style={styles.emptyText}>No coupons found</Text>
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
                <TouchableOpacity style={styles.retryButton} onPress={fetchCoupons}>
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
                    title="Coupons"
                    onBack={() => navigation.goBack()}
                />

                {/* Search & Filter Row */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchWrapper}>
                        <Ionicons name="search" size={18} color={colors.placeholder} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search coupons..."
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
                        style={[styles.filterButton, activeOnly && styles.filterButtonActive]}
                        onPress={() => setActiveOnly((prev) => !prev)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={activeOnly ? 'checkmark-circle' : 'checkmark-circle-outline'}
                            size={16}
                            color={activeOnly ? '#FFFFFF' : colors.secondary}
                        />
                        <Text style={[styles.filterButtonText, activeOnly && styles.filterButtonTextActive]}>
                            {activeOnly ? 'Active' : 'All'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {renderError()}

                <FlatList
                    data={coupons}
                    keyExtractor={(item: Coupon) => item._id}
                    renderItem={({ item }: { item: Coupon }) => (
                        <CouponCard
                            coupon={item}
                            onView={handleViewCoupon}
                            onEdit={handleEditCoupon}
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

                {/* FAB */}
                <TouchableOpacity style={styles.fab} onPress={handleAddCoupon} activeOpacity={0.8}>
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Bottom Sheet */}
                <CouponDetailsSheet
                    coupon={selectedCoupon}
                    visible={bottomSheetVisible}
                    onClose={handleCloseBottomSheet}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = {
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
    // Coupon Card
    couponCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.formBorder,
        overflow: 'hidden',
    },
    accentStrip: {
        width: 5,
    },
    couponBody: {
        flex: 1,
        padding: 14,
    },
    couponHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.primary + '12',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    couponCode: {
        fontSize: 13,
        fontFamily: Fonts.Bold || 'System',
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 5,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontFamily: Fonts.Medium || 'System',
        fontWeight: '600',
    },
    discountValue: {
        fontSize: 20,
        fontFamily: Fonts.Bold || 'System',
        fontWeight: '700',
        color: colors.secondary,
        marginBottom: 4,
    },
    couponDescription: {
        fontSize: 13,
        fontFamily: Fonts.Regular || 'System',
        color: colors.label,
        lineHeight: 18,
        marginBottom: 10,
    },
    couponMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        fontFamily: Fonts.Regular || 'System',
        color: colors.label,
    },
    metaDivider: {
        width: 1,
        height: 12,
        backgroundColor: colors.formBorder,
    },
    // Action Buttons
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
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
    editButton: {
        backgroundColor: colors.warning + '15',
        borderColor: colors.warning + '30',
    },
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
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    // Bottom Sheet
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
    sheetHero: {
        alignItems: 'center',
        marginBottom: 16,
    },
    sheetHeroIcon: {
        width: 80,
        height: 80,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    sheetDiscountBig: {
        fontSize: 36,
        fontFamily: Fonts.Bold || 'System',
        fontWeight: '800',
        color: colors.secondary,
    },
    sheetDiscountLabel: {
        fontSize: 14,
        fontFamily: Fonts.Regular || 'System',
        color: colors.label,
        marginTop: 2,
        marginBottom: 12,
    },
    sheetCodePill: {
        backgroundColor: colors.primary + '15',
        borderWidth: 1.5,
        borderColor: colors.primary + '40',
        borderStyle: 'dashed',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 12,
    },
    sheetCodeText: {
        fontSize: 16,
        fontFamily: Fonts.Bold || 'System',
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 2,
    },
    sheetStatusRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    sheetStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
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
        marginBottom: 10,
    },
    sheetDescription: {
        fontSize: 14,
        fontFamily: Fonts.Regular || 'System',
        color: colors.label,
        lineHeight: 20,
    },
    // Detail rows inside card
    detailsCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.formBorder,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 12,
    },
    detailIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.primary + '12',
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailTextWrap: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        fontFamily: Fonts.Regular || 'System',
        color: colors.placeholder,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 14,
        fontFamily: Fonts.Medium || 'System',
        fontWeight: '600',
        color: colors.secondary,
    },
    detailDivider: {
        height: 1,
        backgroundColor: colors.formBorder,
        marginHorizontal: 14,
    },
    sheetMeta: {
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 16,
        marginTop: 4,
    },
    sheetMetaText: {
        fontSize: 12,
        fontFamily: Fonts.Regular || 'System',
        color: colors.placeholder,
        marginBottom: 4,
    },
    // Footer & Empty & Error
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

export default CouponListingScreen;
