import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../constants/AppThem';
import { getOrderItemDetails, OrderItem } from '../../utils/orderItems';
import { useUnitRegistry } from '../../utils/unitRegistry';

const ProductPhoto = ({ uri, name }: { uri?: string; name: string }) => {
    const [failedUri, setFailedUri] = useState<string>();
    return uri && failedUri !== uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="contain"
            accessibilityLabel={name} onError={() => setFailedUri(uri)} />
    ) : (
        <View style={[styles.image, styles.placeholder]} accessibilityLabel="Image unavailable">
            <Ionicons name="image-outline" size={24} color={colors.placeholder} />
        </View>
    );
};

export default function OrderProductItem({ item, expanded = false }: {
    item: OrderItem;
    expanded?: boolean;
}) {
    useUnitRegistry();
    const details = getOrderItemDetails(item);
    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <ProductPhoto uri={details.images[0]} name={details.name} />
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={expanded ? undefined : 2}>{details.name}</Text>
                    <Text style={styles.quantity}>{details.quantityWithVariant}</Text>
                    {details.variantLabel ? (
                        <View style={styles.variantBadge}>
                            <Ionicons name="pricetag-outline" size={11} color={colors.primary} />
                            <Text style={styles.variantText}>Variant: {details.variantLabel}</Text>
                        </View>
                    ) : null}
                    <Text style={styles.meta}>Price: ₹{Number(item.price || 0).toFixed(2)} each</Text>
                    <Text style={styles.total}>Total: ₹{Number(item.total || 0).toFixed(2)}</Text>
                </View>
            </View>
            {expanded && details.sku ? <Text style={styles.meta}>SKU: {details.sku}</Text> : null}
            {expanded && details.specification ? <Text style={styles.meta}>{details.specification}</Text> : null}
            {expanded && details.images.length > 1 && (
                <ScrollView horizontal contentContainerStyle={styles.photos} showsHorizontalScrollIndicator>
                    {details.images.map(uri => <ProductPhoto key={uri} uri={uri} name={details.name} />)}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: { paddingVertical: 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.formBorder },
    row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    image: { width: 76, height: 76, borderRadius: 10, backgroundColor: colors.scaffoldBg },
    placeholder: { alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1, gap: 4 },
    name: { fontSize: 14, fontWeight: '600', color: colors.secondary },
    quantity: { fontSize: 14, fontWeight: '700', color: colors.primary },
    variantBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
        marginVertical: 1,
    },
    variantText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    meta: { fontSize: 12, color: colors.label },
    total: { fontSize: 13, fontWeight: '600', color: colors.secondary },
    photos: { gap: 8, paddingVertical: 4 },
});

