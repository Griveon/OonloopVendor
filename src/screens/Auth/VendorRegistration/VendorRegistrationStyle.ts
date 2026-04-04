import { StyleSheet } from "react-native";
import { colors } from "../../../constants/AppThem";
import { inputloginStyles, pinloginStyles } from "../Login/LoginScreenStyle";

export const vendorStyles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: colors.scaffoldBg,
        paddingHorizontal: 28,
        paddingTop: 28,
        paddingBottom: 40,
    },
    card: {
        flex: 1,
    },
    title: {
        fontSize: 26,
        fontWeight: "700",
        color: colors.secondary,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 13,
        color: colors.placeholder,
        marginBottom: 24,
    },
    pinSection: {
        marginVertical: 16,
    },
    registerBtn: {
        backgroundColor: colors.primary,
        borderRadius: 50,
        paddingVertical: 15,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
        elevation: 2,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    registerBtnDisabled: {
        opacity: 0.65,
    },
    registerBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    signInRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 10,
    },
    signInPrompt: {
        fontSize: 13,
        color: colors.placeholder,
    },
    signInLink: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.primary,
    },
    
});

const localStyles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: colors.scaffoldBg,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: colors.scaffoldBg,
        paddingHorizontal: 28,
        paddingTop: 28,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.2,
        color: colors.placeholder,
        textTransform: "uppercase",
        fontFamily: "Roboto",
        marginBottom: 14,
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: colors.formBorder,
        marginVertical: 20,
    },
    pinSection: {
        marginTop: 4,
        marginBottom: 28,
    },
    registerBtn: {
        backgroundColor: colors.primary,
        borderRadius: 50,
        paddingVertical: 15,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
        elevation: 2,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    registerBtnDisabled: {
        opacity: 0.65,
    },
    registerBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.4,
        fontFamily: "Roboto",
    },
    signInRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 4,
    },
    signInPrompt: {
        fontSize: 13,
        color: colors.placeholder,
        fontFamily: "Roboto",
    },
    signInLink: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.primary,
        fontFamily: "Roboto",
    },
    eyeBtn: {
        position: "absolute",
        right: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    pinToggle: {
        flexDirection: "row",
        alignSelf: "flex-end",
        alignItems: "center",
        marginTop: 8,
    },
    pinToggleText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: "600",
        fontFamily: "Roboto",
    },
    iosSheet: {
        backgroundColor: colors.scaffoldBg,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 32,
        elevation: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
    },
    iosSheetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder,
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.label,
        fontFamily: "Roboto",
    },
    cancelBtn: {
        fontSize: 15,
        color: colors.placeholder,
        fontFamily: "Roboto",
    },
    confirmBtn: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.primary,
        fontFamily: "Roboto",
    },
    
});

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

const pickerStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
        backgroundColor: colors.scaffoldBg ?? "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 20,
    },
    sheetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.formBorder ?? "#eee",
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.label ?? "#111",
        fontFamily: "Roboto",
    },
    cancelBtn: {
        fontSize: 15,
        color: colors.placeholder ?? "#888",
        fontFamily: "Roboto",
    },
    confirmBtn: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.primary,
        fontFamily: "Roboto",
    },
    columnsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    column: {
        flex: 1,
        position: "relative",
        height: ITEM_HEIGHT * VISIBLE_ITEMS,
        overflow: "hidden",
    },
    item: {
        height: ITEM_HEIGHT,
        justifyContent: "center",
        alignItems: "center",
    },
    itemSelected: {
        // highlight handled by lines overlay
    },
    itemText: {
        fontSize: 16,
        color: colors.placeholder ?? "#aaa",
        fontFamily: "Roboto",
    },
    itemTextSelected: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.label ?? "#111",
    },
    selectionOverlay: {
        position: "absolute",
        top: ITEM_HEIGHT * 2,
        left: 0,
        right: 0,
        height: ITEM_HEIGHT,
        justifyContent: "space-between",
    },
    selectionLine: {
        height: 1.5,
        backgroundColor: colors.primary,
        opacity: 0.6,
    },
    separator: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.placeholder ?? "#aaa",
        marginHorizontal: 4,
        marginBottom: 2,
    },
});


export { inputloginStyles, pinloginStyles, localStyles, pickerStyles };