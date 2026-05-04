import React, { useEffect, useRef } from "react";
import {
    View,
    Image,
    StyleSheet,
    Animated,
    StatusBar,
} from "react-native";
import { getUserData } from "../../components/AsyncStorage/AsyncStorage";
import { getRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";

const AppLoadingScreen = ({ navigation }: any) => {
    const logoScale = useRef(new Animated.Value(0.7)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 6,
                tension: 80,
                useNativeDriver: true,
            }),
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();

        const checkUserAndProfile = async () => {
            await new Promise((res: any) => setTimeout(res, 1800));
            const { user, token } = await getUserData();

            if (!user || !token) {
                navigation.replace("Login");
                return;
            }

            try {
                const res: any = await getRequest(
                    `${API_ENDPOINTS.CHECKPROFILECOMPLETED}/${user?.user?._id}`,
                    undefined,
                    true,
                    false
                );
                if (res?.success && res?.data?.completed) {
                    navigation.replace("Dashboard");
                } else {
                    if (res?.success) {
                        navigation.replace("Login");
                    } else {
                        navigation.replace("Login");
                    }
                }
            } catch { }
        };

        checkUserAndProfile();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
            <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}>
                <Image
                    source={require("../../Assets/images/white_logo_transparent.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>
        </View>
    );
};

export default AppLoadingScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#3B82F6",
        justifyContent: "center",
        alignItems: "center",
    },
    logo: {
        width: 400,
        height: 400,
    },
});