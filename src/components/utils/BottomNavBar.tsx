// components/utils/BottomNavBar.tsx
import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors } from "../../constants/AppThem";

const { width } = Dimensions.get("window");

// ─── Tab config ───────────────────────────────────────────────────────────────

type Tab = {
    key: string;
    label: string;
    icon: string;
    iconActive: string;
};

const TABS: Tab[] = [
    {
        key: "Home",
        label: "Home",
        icon: "home-outline",
        iconActive: "home",
    },
    {
        key: "Orders",
        label: "Orders",
        icon: "receipt-outline",
        iconActive: "receipt",
    },
    {
        key: "Products",
        label: "Products",
        icon: "cube-outline",
        iconActive: "cube",
    },
    {
        key: "Profile",
        label: "Profile",
        icon: "person-outline",
        iconActive: "person",
    },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface BottomNavBarProps {
    activeTab: string;
    onTabPress: (key: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const BottomNavBar = ({ activeTab, onTabPress }: BottomNavBarProps) => {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.container,
                { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 },
            ]}
        >
            {/* Top accent line */}
            <View style={styles.topBorder} />

            <View style={styles.row}>
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.tab}
                            onPress={() => onTabPress(tab.key)}
                            activeOpacity={0.7}
                        >
                            {/* Active pill background */}
                            {isActive && <View style={styles.activePill} />}

                            <Ionicons
                                name={isActive ? tab.iconActive : tab.icon}
                                size={22}
                                color={isActive ? colors.primary : "#94A3B8"}
                            />
                            <Text
                                style={[
                                    styles.label,
                                    isActive && styles.labelActive,
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

export default BottomNavBar;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 16,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    topBorder: {
        height: 3,
        width: 40,
        backgroundColor: colors.primary,
        borderRadius: 2,
        alignSelf: "center",
        marginTop: 8,
        marginBottom: 4,
        opacity: 0.25,
    },
    row: {
        flexDirection: "row",
        paddingHorizontal: 8,
        paddingTop: 6,
    },
    tab: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        position: "relative",
    },
    activePill: {
        position: "absolute",
        top: 2,
        width: 48,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + "14",
    },
    label: {
        fontSize: 11,
        marginTop: 4,
        color: "#94A3B8",
        fontFamily: "Roboto",
        fontWeight: "500",
    },
    labelActive: {
        color: colors.primary,
        fontWeight: "700",
    },
});