// components/AppBar.tsx
import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    StatusBar,
} from "react-native";
import { colors } from "../../constants/AppThem";

interface AppBarProps {
    title: string;
    onBack?: () => void;
    onMenu?: () => void;
    rightElement?: React.ReactNode;
}

const AppBar = ({ title, onBack, onMenu, rightElement }: AppBarProps) => {
    const STATUS_BAR_HEIGHT =
        Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 0;

    return (
        <View style={[styles.container, { paddingTop: STATUS_BAR_HEIGHT + 0 }]}>
            <View style={styles.row}>
                {onBack ? (
                    <TouchableOpacity
                        onPress={onBack}
                        style={styles.backBtn}
                        activeOpacity={0.75}
                    >
                        <View style={styles.arrowWrapper}>
                            <View style={styles.arrowStem} />
                            <View style={styles.arrowHead} />
                        </View>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={onMenu}
                        style={styles.backBtn}
                        activeOpacity={0.75}
                    >
                        {/* 🔥 Hamburger Icon */}
                        <View style={styles.menuWrapper}>
                            <View style={styles.menuLine} />
                            <View style={styles.menuLine} />
                            <View style={styles.menuLine} />
                        </View>
                    </TouchableOpacity>
                )}

                <Text style={styles.title} numberOfLines={1}>
                    {title}
                </Text>

                <View style={styles.rightSlot}>
                    {rightElement ?? null}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        paddingBottom: 18,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        // Gradient simulation via shadow tint on Android / shadow on iOS
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    backBtn: {
        padding: 6,
        backgroundColor: "rgba(255,255,255,0.22)",
        borderRadius: 10,
        width: 34,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
    },
    backBtnPlaceholder: {
        width: 34,
        height: 34,
    },

    arrowWrapper: {
        width: 16,
        height: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    arrowStem: {
        position: "absolute",
        width: 10,
        height: 2,
        backgroundColor: "#fff",
        borderRadius: 1,
        left: 3,
    },
    arrowHead: {
        position: "absolute",
        width: 8,
        height: 8,
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        borderColor: "#fff",
        transform: [{ rotate: "45deg" }],
        left: 3,
    },
    title: {
        flex: 1,
        marginLeft: 12,
        color: "#fff",
        fontSize: 18,
        fontWeight: "600",
        fontFamily: "Roboto",
        letterSpacing: 0.2,
    },
    rightSlot: {
        minWidth: 34,
        alignItems: "flex-end",
    },

    menuWrapper: {
        width: 18,
        justifyContent: "center",
    },
    menuLine: {
        height: 2,
        backgroundColor: "#fff",
        marginVertical: 2,
        borderRadius: 2,
    },
});

export default AppBar;
