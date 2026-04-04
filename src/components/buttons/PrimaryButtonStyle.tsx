import { StyleSheet } from "react-native";
import { colors } from "../../constants/AppThem";

export const buttonStyles = StyleSheet.create({
    primaryContainer: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        alignItems: "center",
    },
    primaryText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },

    successContainer: {
        backgroundColor: colors.success,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        alignItems: "center",
    },
    successText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },

    dangerContainer: {
        backgroundColor: colors.error,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        alignItems: "center",
    },
    dangerText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },

    warningContainer: {
        backgroundColor: colors.warning,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        alignItems: "center",
    },
    warningText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },

    outlinedContainer: {
        borderWidth: 1,
        borderColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        alignItems: "center",
    },
    outlinedText: {
        color: colors.primary,
        fontWeight: "600",
        fontSize: 16,
    },
});