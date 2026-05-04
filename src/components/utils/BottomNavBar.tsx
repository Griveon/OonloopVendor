// components/utils/BottomNavBar.tsx
import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "../../constants/AppThem";
import { RootStackParamList } from "../../constants/appNavigations";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type Tab = {
    key: string;
    label: string;
    icon: string;
    iconActive: string;
    disabled?: boolean;
    screen: keyof RootStackParamList;
};

const TABS: Tab[] = [
    {
        key: "Home",
        label: "Home",
        icon: "home-outline",
        iconActive: "home",
        screen: "Dashboard",
    },
    {
        key: "Orders",
        label: "Orders",
        icon: "receipt-outline",
        iconActive: "receipt",
        disabled: true,
        screen: "VendorCouponListing", // swap when Orders screen is ready
    },
    {
        key: "Products",
        label: "Products",
        icon: "cube-outline",
        iconActive: "cube",
        screen: "ProductListing",
    },
    {
        key: "Profile",
        label: "Profile",
        icon: "person-outline",
        iconActive: "person",
        screen: "VendorProfile",
    },
];

interface BottomNavBarProps {
    activeTab: string;
    onTabPress: (key: string) => void;
}

const BottomNavBar = ({ activeTab, onTabPress }: BottomNavBarProps) => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavProp>();

    const handlePress = (tab: Tab) => {
        if (tab.disabled) return; // ✅ block press

        onTabPress(tab.key);
        navigation.navigate(tab.screen);
    };

    return (
        <View
            style={[
                styles.container,
                { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 },
            ]}
        >
            <View style={styles.topBorder} />
            <View style={styles.row}>
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.tab,
                                tab.disabled && { opacity: 0.4 } 
                            ]}
                            onPress={() => handlePress(tab)}
                            activeOpacity={0.7}
                            disabled={tab.disabled} // ✅ RN built-in disable
                        >
                            {isActive && <View style={styles.activePill} />}
                            <Ionicons
                                name={isActive ? tab.iconActive : tab.icon}
                                size={22}
                                color={isActive ? colors.primary : "#94A3B8"}
                            />
                            <Text style={[styles.label, isActive && styles.labelActive]}>
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