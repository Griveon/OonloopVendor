import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../constants/AppThem';
import { Fonts } from '../../constants/Fonts';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    loading?: boolean;
    /** Max visible page number buttons (default: 5) */
    maxVisible?: number;
    /** Show first/last jump buttons (default: true) */
    showEdges?: boolean;
}

/**
 * Reusable Pagination Component
 *
 * Usage:
 * <Pagination
 *   currentPage={page}
 *   totalPages={totalPages}
 *   onPageChange={(p) => setPage(p)}
 *   loading={loading}
 * />
 */
const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    loading = false,
    maxVisible = 5,
    showEdges = true,
}) => {
    if (totalPages <= 1) return null;

    // Build page number array with ellipsis markers (-1)
    const buildPages = (): (number | -1)[] => {
        if (totalPages <= maxVisible) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const half = Math.floor(maxVisible / 2);
        let start = Math.max(2, currentPage - half);
        let end = Math.min(totalPages - 1, currentPage + half);

        // Adjust window if near edges
        if (currentPage - half < 2) {
            end = Math.min(totalPages - 1, maxVisible - 1);
        }
        if (currentPage + half > totalPages - 1) {
            start = Math.max(2, totalPages - maxVisible + 2);
        }

        const pages: (number | -1)[] = [1];
        if (start > 2) pages.push(-1); // left ellipsis
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push(-1); // right ellipsis
        pages.push(totalPages);
        return pages;
    };

    const pages = buildPages();
    const isFirst = currentPage === 1;
    const isLast = currentPage === totalPages;

    const NavButton = ({
        icon,
        onPress,
        disabled,
    }: {
        icon: string;
        onPress: () => void;
        disabled: boolean;
    }) => (
        <TouchableOpacity
            style={[styles.navBtn, disabled && styles.navBtnDisabled]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            <Ionicons
                name={icon as any}
                size={16}
                color={disabled ? colors.placeholder : colors.primary}
            />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Page info */}
            <Text style={styles.pageInfo}>
                Page <Text style={styles.pageInfoBold}>{currentPage}</Text> of{' '}
                <Text style={styles.pageInfoBold}>{totalPages}</Text>
            </Text>

            <View style={styles.controls}>
                {/* First */}
                {showEdges && (
                    <NavButton
                        icon="play-skip-back-outline"
                        onPress={() => onPageChange(1)}
                        disabled={isFirst}
                    />
                )}

                {/* Prev */}
                <NavButton
                    icon="chevron-back-outline"
                    onPress={() => onPageChange(currentPage - 1)}
                    disabled={isFirst}
                />

                {/* Page Numbers */}
                <View style={styles.pagesRow}>
                    {pages.map((p, i) =>
                        p === -1 ? (
                            <View key={`ellipsis-${i}`} style={styles.ellipsis}>
                                <Text style={styles.ellipsisText}>…</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                key={p}
                                style={[
                                    styles.pageBtn,
                                    p === currentPage && styles.pageBtnActive,
                                ]}
                                onPress={() => p !== currentPage && onPageChange(p)}
                                disabled={p === currentPage || loading}
                                activeOpacity={0.7}
                            >
                                {loading && p === currentPage ? (
                                    <ActivityIndicator size={12} color="#FFFFFF" />
                                ) : (
                                    <Text
                                        style={[
                                            styles.pageBtnText,
                                            p === currentPage && styles.pageBtnTextActive,
                                        ]}
                                    >
                                        {p}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )
                    )}
                </View>

                {/* Next */}
                <NavButton
                    icon="chevron-forward-outline"
                    onPress={() => onPageChange(currentPage + 1)}
                    disabled={isLast}
                />

                {/* Last */}
                {showEdges && (
                    <NavButton
                        icon="play-skip-forward-outline"
                        onPress={() => onPageChange(totalPages)}
                        disabled={isLast}
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        gap: 10,
        backgroundColor: colors.scaffoldBg,
    },
    pageInfo: {
        fontSize: 12,
        fontFamily: Fonts.Regular || 'System',
        color: colors.placeholder,
    },
    pageInfoBold: {
        fontFamily: Fonts.Medium || 'System',
        color: colors.secondary,
        fontWeight: '600',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    navBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.formBg,
        borderWidth: 1,
        borderColor: colors.formBorder,
    },
    navBtnDisabled: {
        backgroundColor: '#F9FAFB',
        borderColor: '#E5E7EB',
    },
    pagesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pageBtn: {
        minWidth: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        backgroundColor: colors.formBg,
        borderWidth: 1,
        borderColor: colors.formBorder,
    },
    pageBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    pageBtnText: {
        fontSize: 13,
        fontFamily: Fonts.Medium || 'System',
        fontWeight: '600',
        color: colors.secondary,
    },
    pageBtnTextActive: {
        color: '#FFFFFF',
    },
    ellipsis: {
        width: 24,
        height: 34,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ellipsisText: {
        fontSize: 14,
        color: colors.placeholder,
        fontFamily: Fonts.Regular || 'System',
    },
});

export default Pagination;