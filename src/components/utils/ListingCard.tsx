import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { colors, textStyles } from "../../constants/AppThem";

export interface ListingCardData {
    id: string;
    name: string;
    logo?: string;
    description?: string;
    isFeatured?: boolean;
}

interface Props {
    item: ListingCardData;
    onPress?: () => void;
}

const BrandCard: React.FC<Props> = ({ item, onPress }) => {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.row}>
                <Image
                    source={{
                        uri: item.logo || "https://via.placeholder.com/100",
                    }}
                    style={styles.logo}
                />

                <View style={styles.content}>
                    <Text style={[textStyles.titleMedium, styles.title]}>
                        {item.name}
                    </Text>

                    {item.description ? (
                        <Text style={[textStyles.bodyMedium, styles.desc]} numberOfLines={2}>
                            {item.description}
                        </Text>
                    ) : null}

                    {item.isFeatured && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Featured</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default BrandCard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 14,
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        elevation: 2,
    },
    row: {
        flexDirection: "row",
    },
    logo: {
        width: 60,
        height: 60,
        borderRadius: 10,
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        marginBottom: 4,
    },
    desc: {
        color: colors.placeholder,
        fontSize: 13,
    },
    badge: {
        marginTop: 6,
        alignSelf: "flex-start",
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "600",
    },
});