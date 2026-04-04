import { StyleSheet } from "react-native";
import { colors } from "../../constants/AppThem";

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
