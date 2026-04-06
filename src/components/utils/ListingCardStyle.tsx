import { StyleSheet } from "react-native";
import { colors } from "../../constants/AppThem";

export const listingStyles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.formBg,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder,
    },
    imageWrapper: {
        width: 58,
        height: 58,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: colors.scaffoldBg,
        borderWidth: 1,
        borderColor: colors.formBorder,
        marginRight: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    imageFallback: {
        justifyContent: "center",
        alignItems: "center",
    },
    info: {
        flex: 1,
        gap: 3,
    },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 2,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 20,
        gap: 4,
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    badgeText: {
        fontSize: 11,
        fontFamily: "Roboto",
        fontWeight: "600",
    },
    featuredBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.warning + "1A",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 20,
        gap: 3,
    },
    featuredText: {
        fontSize: 10,
        color: colors.warning,
        fontFamily: "Roboto",
        fontWeight: "600",
    },
    title: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.secondary,
        fontFamily: "Roboto",
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 2,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.secondary,
        fontFamily: "Roboto",
        marginRight: 4,
    },
    metaChip: {
        flexDirection: "row",
        alignItems: "center",
    },
    colorDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: colors.secondary,
        marginRight: 4,
    },
    metaText: {
        fontSize: 12,
        color: colors.placeholder,
        fontFamily: "Roboto",
    },
    right: {
        marginLeft: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    actions: {
        alignItems: "center",
    },
    actionBtn: {
        padding: 4,
    },
});
