import { StyleSheet } from "react-native";
import { colors } from "../../../constants/AppThem";

export const loginStyles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: colors.scaffoldBg,
    },

    // ── Hero ──────────────────────────────────────────
    heroBanner: {
        height: 260,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "flex-end",
    },
    waveShape: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 230,
        backgroundColor: colors.primary,
        borderBottomLeftRadius: 80,
        borderBottomRightRadius: 80,
    },
    illustrationWrapper: {
        marginBottom: 8,
        zIndex: 1,
    },
    illustrationPlaceholder: {
        width: 160,
        height: 160,
        alignItems: "center",
        justifyContent: "center",
    },
    illustrationEmoji: {
        fontSize: 80,
    },
    illustration: {
        width: 200,
        height: 180,
    },

    // ── Card ──────────────────────────────────────────
    card: {
        flex: 1,
        backgroundColor: colors.scaffoldBg,
        paddingHorizontal: 28,
        paddingTop: 28,
        paddingBottom: 40,
    },

    greeting: {
        fontSize: 26,
        fontWeight: "700",
        color: colors.secondary,
        fontFamily: "Roboto",
        marginBottom: 6,
    },
    greetingAccent: {
        color: colors.primary,
    },
    subtitle: {
        fontSize: 13,
        color: colors.placeholder,
        fontFamily: "Roboto",
        marginBottom: 24,
    },

    // ── PIN section ───────────────────────────────────
    pinSection: {
        marginBottom: 22,
    },
    forgotRow: {
        alignItems: "flex-end",
        marginTop: 10,
    },
    forgotText: {
        fontSize: 13,
        color: colors.secondary,
        fontFamily: "Roboto",
    },

    // ── Buttons ───────────────────────────────────────
    signInBtn: {
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
    signInBtnDisabled: {
        opacity: 0.65,
    },
    signInBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.4,
        fontFamily: "Roboto",
    },
    googleBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 50,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        backgroundColor: colors.formBg,
        paddingVertical: 13,
        gap: 10,
        marginBottom: 28,
    },
    googleIcon: {
        fontSize: 18,
        fontWeight: "700",
        color: "#EA4335",
        fontFamily: "Roboto",
    },
    googleBtnText: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.secondary,
        fontFamily: "Roboto",
    },

    // ── Sign Up link ──────────────────────────────────
    signUpRow: {
        flexDirection: "row",
        justifyContent: "center",
    },
    signUpPrompt: {
        fontSize: 13,
        color: colors.placeholder,
        fontFamily: "Roboto",
    },
    signUpLink: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.primary,
        fontFamily: "Roboto",
    },

    vendorBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 50,
        borderWidth: 1.5,
        borderColor: colors.primary,
        backgroundColor: colors.formBg,
        paddingVertical: 13,
        marginBottom: 28,
    },
    vendorBtnText: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.primary,
        fontFamily: "Roboto",
    },
});

export const inputloginStyles = StyleSheet.create({
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

export const pinloginStyles = StyleSheet.create({
    row: {
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
    },
    cell: {
        flex: 1,
        height: 52,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        backgroundColor: colors.formBg,
        alignItems: "center",
        justifyContent: "center",
    },
    cellFilled: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}10`, // 6% tint
    },
    digit: {
        fontSize: 22,
        color: colors.primary,
        lineHeight: 28,
    },
    cursor: {
        width: 2,
        height: 22,
        backgroundColor: colors.primary,
        position: "absolute",
    },
});
