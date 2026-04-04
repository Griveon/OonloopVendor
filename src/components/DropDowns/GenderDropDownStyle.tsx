import { StyleSheet } from "react-native";
import { colors } from "../../constants/AppThem";

export const DropdownStyles = StyleSheet.create({

    trigger: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: colors.formBorder,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 13,
        backgroundColor: colors.formBg,
    },
    triggerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    iconBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.primary + "18", // primary at 10% opacity
        justifyContent: "center",
        alignItems: "center",
    },
    selectedText: {
        fontSize: 15,
        color: colors.secondary,
        fontFamily: "Roboto",
        fontWeight: "500",
    },
    placeholderText: {
        fontSize: 15,
        color: colors.placeholder,
        fontFamily: "Roboto",
    },

    // ── Modal ─────────────────────────────────────────────────────────────────
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
        backgroundColor: colors.scaffoldBg,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 36,
        paddingTop: 12,
        elevation: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.formBorder,
        alignSelf: "center",
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 1.1,
        textTransform: "uppercase",
        color: colors.placeholder,
        fontFamily: "Roboto",
        marginBottom: 16,
    },

    // ── Options ───────────────────────────────────────────────────────────────
    option: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "transparent",
    },
    optionSelected: {
        backgroundColor: colors.primary + "10",
    },
    optionLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    optionIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.formBorder + "60",
        justifyContent: "center",
        alignItems: "center",
    },
    optionIconWrapSelected: {
        backgroundColor: colors.primary + "18",
    },
    optionLabel: {
        fontSize: 16,
        color: colors.secondary,
        fontFamily: "Roboto",
        fontWeight: "400",
    },
    optionLabelSelected: {
        fontWeight: "700",
        color: colors.primary,
    },
    separator: {
        height: 1,
        backgroundColor: colors.formBorder,
        marginHorizontal: 4,
        opacity: 0.5,
    },
});
