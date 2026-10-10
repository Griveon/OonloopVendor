import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    FlatList,
    Image,
    Switch,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "@react-navigation/native";

import AppBar from "../../components/utils/AppBar";
import { appTheme, colors, textStyles } from "../../constants/AppThem";
import { Fonts } from "../../constants/Fonts";
import { getRequest, putRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";
import {
    PreorderConfig,
    formatCurrency,
    getConfigProductId,
    getRulesSummary,
} from "./preorderUtils";

const PreorderProductsScreen = ({ navigation }: any) => {
    const [configs, setConfigs] = useState<PreorderConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const fetchConfigs = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        const res: any = await getRequest(API_ENDPOINTS.PREORDERCONFIGMINE);

        if (res?.success && Array.isArray(res?.data)) {
            setConfigs(res.data);
        }

        setLoading(false);
        setRefreshing(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchConfigs();
        }, [fetchConfigs])
    );

    const handleToggle = async (config: PreorderConfig, isActive: boolean) => {
        const productId = getConfigProductId(config);
        if (!productId || togglingId) return;

        setTogglingId(config._id);
        setConfigs((prev) =>
            prev.map((c) => (c._id === config._id ? { ...c, isActive } : c))
        );

        const res: any = await putRequest(
            `${API_ENDPOINTS.PREORDERCONFIG}/${productId}/active`,
            { isActive }
        );

        if (res?.success) {
            Toast.show({
                type: "success",
                text1: isActive ? "Preorder turned on" : "Preorder turned off",
            });
        } else {
            // ApiClient already showed the error — just revert the switch.
            setConfigs((prev) =>
                prev.map((c) =>
                    c._id === config._id ? { ...c, isActive: !isActive } : c
                )
            );
        }

        setTogglingId(null);
    };

    const openRules = (config: PreorderConfig) => {
        const productId = getConfigProductId(config);
        if (!productId) return;

        navigation.navigate("PreorderRules", {
            productId,
            productName:
                typeof config.product === "string" ? "" : config.product?.name,
        });
    };

    const renderItem = ({ item }: { item: PreorderConfig }) => {
        const product = typeof item.product === "string" ? null : item.product;
        const imageUrl = product?.images?.[0]?.url;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => openRules(item)}
            >
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.image} />
                ) : (
                    <View style={[styles.image, styles.imagePlaceholder]}>
                        <Ionicons
                            name="cube-outline"
                            size={22}
                            color={colors.placeholder}
                        />
                    </View>
                )}

                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={2}>
                        {product?.name || "Product"}
                    </Text>

                    {product?.mrp ? (
                        <Text style={styles.price}>
                            {formatCurrency(product.mrp)}
                        </Text>
                    ) : null}

                    <Text style={styles.summary} numberOfLines={1}>
                        {getRulesSummary(item)}
                    </Text>

                    {product?.isActive === false && (
                        <Text style={styles.warningText}>
                            Product is inactive
                        </Text>
                    )}
                </View>

                <View style={styles.right}>
                    <Switch
                        value={item.isActive}
                        onValueChange={(value) => handleToggle(item, value)}
                        disabled={togglingId === item._id}
                        trackColor={{ false: colors.formBorder, true: colors.primary + "80" }}
                        thumbColor={item.isActive ? colors.primary : "#F4F4F5"}
                    />
                    <Text style={styles.editText}>Edit rules</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={appTheme.scaffold}>
            <AppBar
                title="Preorder Products"
                onBack={() => navigation.goBack()}
            />

            <FlatList
                data={configs}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchConfigs(true)}
                        colors={[colors.primary]}
                    />
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.emptyBox}>
                            <ActivityIndicator
                                size="small"
                                color={colors.primary}
                            />
                        </View>
                    ) : (
                        <View style={styles.emptyBox}>
                            <Ionicons
                                name="calendar-outline"
                                size={48}
                                color={colors.placeholder}
                            />
                            <Text style={styles.emptyText}>
                                No preorder products yet
                            </Text>
                            <Text style={styles.emptyHint}>
                                Open a product and tap the calendar icon to
                                set up preorder for it.
                            </Text>
                        </View>
                    )
                }
            />

            <TouchableOpacity
                style={styles.addBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("ProductListing")}
            >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Choose a product</Text>
            </TouchableOpacity>
        </View>
    );
};

export default PreorderProductsScreen;

const styles = StyleSheet.create({
    listContent: {
        padding: 14,
        paddingBottom: 90,
        flexGrow: 1,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.formBg,
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.formBorder,
    },
    image: {
        width: 56,
        height: 56,
        borderRadius: 10,
        backgroundColor: colors.scaffoldBg,
    },
    imagePlaceholder: {
        alignItems: "center",
        justifyContent: "center",
    },
    info: {
        flex: 1,
        marginHorizontal: 12,
    },
    name: {
        ...textStyles.titleLarge,
        fontSize: 14,
    },
    price: {
        fontSize: 13,
        color: colors.label,
        fontFamily: Fonts.Medium,
        marginTop: 2,
    },
    summary: {
        fontSize: 12,
        color: colors.placeholder,
        fontFamily: Fonts.Regular,
        marginTop: 4,
    },
    warningText: {
        fontSize: 11,
        color: colors.error,
        fontFamily: Fonts.Regular,
        marginTop: 2,
    },
    right: {
        alignItems: "center",
    },
    editText: {
        fontSize: 11,
        color: colors.primary,
        fontFamily: Fonts.Medium,
        marginTop: 2,
    },
    emptyBox: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        paddingHorizontal: 30,
    },
    emptyText: {
        ...textStyles.titleLarge,
        fontSize: 15,
        marginTop: 12,
    },
    emptyHint: {
        ...textStyles.bodyMedium,
        fontSize: 13,
        color: colors.placeholder,
        textAlign: "center",
        marginTop: 6,
        lineHeight: 19,
    },
    addBtn: {
        position: "absolute",
        left: 14,
        right: 14,
        bottom: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
    },
    addBtnText: {
        color: "#fff",
        fontSize: 14,
        fontFamily: Fonts.Medium,
    },
});
