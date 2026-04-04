import { TextStyle, ViewStyle, StyleSheet } from "react-native";
import { Fonts } from "./Fonts";

export const colors = {
    primary: "#3B82F6",
    secondary: "#1F2937",
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
    formBg: "#FFFFFF",
    formBorder: "#D1D5DB",
    placeholder: "#9CA3AF",
    label: "#374151",
    scaffoldBg: "#F5F5F5",
};

export const textStyles: { [key: string]: TextStyle } = {
    bodyLarge: { color: colors.secondary, fontSize: 16, fontFamily: Fonts.Regular },
    bodyMedium: { color: colors.secondary, fontSize: 14, fontFamily: Fonts.Regular },
    titleLarge: { color: colors.secondary, fontFamily: Fonts.Medium },
    titleMedium: { color: colors.label, fontFamily: Fonts.Medium },
    titleSmall: { color: colors.label, fontFamily: Fonts.Regular },
};

// export const inputStyles = StyleSheet.create({
//     container: {
//         backgroundColor: colors.formBg,
//         borderRadius: 8,
//         borderWidth: 1,
//         borderColor: colors.formBorder,
//         paddingVertical: 12,
//         paddingHorizontal: 16,
//         fontSize: 16,
//         color: colors.secondary,
//         fontFamily: Fonts.Regular,
//     },
//     focused: { borderColor: colors.primary },
//     error: { borderColor: colors.error },
//     label: {
//         color: colors.label,
//         fontFamily: Fonts.Medium,
//         marginBottom: 4,
//     },
//     placeholder: { color: colors.placeholder, fontFamily: Fonts.Regular },
//     errorText: { color: colors.error, marginTop: 4, fontSize: 12, fontFamily: Fonts.Regular },
// });

export const buttonStyles: { [key: string]: ViewStyle & { fontFamily?: string } } = {
    default: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        alignItems: "center",
        fontFamily: Fonts.Medium,
    },
    outlined: {
        borderWidth: 1,
        borderColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        alignItems: "center",
        fontFamily: Fonts.Medium,
    },
    danger: {
        backgroundColor: colors.error,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        fontFamily: Fonts.Medium,
    },
    success: {
        backgroundColor: colors.success,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        fontFamily: Fonts.Medium,
    },
    warning: {
        backgroundColor: colors.warning,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        fontFamily: Fonts.Medium,
    },
};
export const appTheme = StyleSheet.create({
    scaffold: {
        flex: 1,
        backgroundColor: colors.scaffoldBg,
    },
});

export const inputStyles = StyleSheet.create({
    wrapper: { marginBottom: 14 },
    label: {
        fontSize: 13,
        fontWeight: "500",
        color: colors.label,
        marginBottom: 6,
        fontFamily: "Roboto",
    },
    input: {
        backgroundColor: colors.formBg,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        paddingVertical: 13,
        paddingHorizontal: 16,
        fontSize: 15,
        color: colors.secondary,
        fontFamily: "Roboto",
    },
    inputFocused: {
        borderColor: colors.primary,
    },
});



export const localStyles = StyleSheet.create({
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
    eyeBtn: {
        position: "absolute",
        right: 12,
        justifyContent: "center",
        alignItems: "center",
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
