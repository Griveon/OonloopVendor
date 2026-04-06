import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
    Image,
    StatusBar,
} from "react-native";
import { getUserData } from "../../components/AsyncStorage/AsyncStorage";
import { getRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";

const AppLoadingScreen = ({ navigation }: any) => {
    const logoScale = useRef(new Animated.Value(0.6)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textTranslateY = useRef(new Animated.Value(12)).current;
    const dotOpacity1 = useRef(new Animated.Value(0.2)).current;
    const dotOpacity2 = useRef(new Animated.Value(0.2)).current;
    const dotOpacity3 = useRef(new Animated.Value(0.2)).current;
    const ringScale = useRef(new Animated.Value(0.7)).current;
    const ringOpacity = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        // Logo entrance
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

        // Text entrance after logo
        Animated.sequence([
            Animated.delay(300),
            Animated.parallel([
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 400,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(textTranslateY, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        // Ripple ring animation
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(ringScale, {
                        toValue: 1.4,
                        duration: 1600,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(ringOpacity, {
                        toValue: 0,
                        duration: 1600,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(ringScale, {
                        toValue: 0.7,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                    Animated.timing(ringOpacity, {
                        toValue: 0.6,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        ).start();

        // Dot pulse animation
        const pulseDot = (dot: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0.2,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.delay(400),
                ])
            ).start();

        pulseDot(dotOpacity1, 200);
        pulseDot(dotOpacity2, 450);
        pulseDot(dotOpacity3, 700);

        // Navigation logic
        const checkUserAndProfile = async () => {
            await new Promise((res:any) => setTimeout(res, 1800));
            const { user, token } = await getUserData();

            if (!user || !token) {
                navigation.replace("Login");
                return;
            }

            try {
                const res: any = await getRequest(
                    `${API_ENDPOINTS.CHECKPROFILECOMPLETED}/${user?.user?._id}`
                );
                if (res?.success && res?.data?.completed) {
                    navigation.replace("Dashboard");
                } else {
                    navigation.replace("VendorBusinessInfoUpdating");
                }
            } catch {
                navigation.replace("VendorBusinessInfoUpdating");
            }
        };

        checkUserAndProfile();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

            {/* Background gradient circles */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />

            {/* Logo area */}
            <View style={styles.centerContent}>
                <View style={styles.logoWrapper}>
                    {/* Ripple ring */}
                    <Animated.View
                        style={[
                            styles.rippleRing,
                            { transform: [{ scale: ringScale }], opacity: ringOpacity },
                        ]}
                    />

                    {/* Logo container */}
                    <Animated.View
                        style={[
                            styles.logoContainer,
                            {
                                transform: [{ scale: logoScale }],
                                opacity: logoOpacity,
                            },
                        ]}
                    >
                        {/* Replace with: <Image source={require('../../assets/icon.png')} style={styles.logoImage} /> */}
                        <Image
                            source={{
                                uri: "https://cdn-icons-png.flaticon.com/512/1518/1518700.png",
                            }}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </Animated.View>
                </View>

                {/* Brand name */}
                <Animated.View
                    style={{
                        opacity: textOpacity,
                        transform: [{ translateY: textTranslateY }],
                        alignItems: "center",
                    }}
                >
                    <Text style={styles.brandName}>oonloop</Text>
                    <Text style={styles.tagline}>Connecting vendors & customers</Text>
                </Animated.View>
            </View>

            {/* Loading dots */}
            <Animated.View style={styles.dotsContainer}>
                <Animated.View style={[styles.dot, { opacity: dotOpacity1 }]} />
                <Animated.View style={[styles.dot, { opacity: dotOpacity2 }]} />
                <Animated.View style={[styles.dot, { opacity: dotOpacity3 }]} />
            </Animated.View>

            {/* Footer */}
            <Text style={styles.footer}>v1.0.0</Text>
        </View>
    );
};

export default AppLoadingScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0F172A",
        justifyContent: "center",
        alignItems: "center",
    },

    // Decorative background blobs
    bgCircle1: {
        position: "absolute",
        width: 340,
        height: 340,
        borderRadius: 170,
        backgroundColor: "#3B82F620",
        top: -80,
        right: -80,
    },
    bgCircle2: {
        position: "absolute",
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: "#6366F115",
        bottom: -60,
        left: -60,
    },

    centerContent: {
        alignItems: "center",
        gap: 28,
    },

    logoWrapper: {
        width: 120,
        height: 120,
        justifyContent: "center",
        alignItems: "center",
    },

    rippleRing: {
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: "#3B82F650",
    },

    logoContainer: {
        width: 88,
        height: 88,
        borderRadius: 24,
        backgroundColor: "#1E293B",
        justifyContent: "center",
        alignItems: "center",
        // Glow effect via shadow
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 16,
        borderWidth: 1,
        borderColor: "#3B82F630",
    },

    logoImage: {
        width: 48,
        height: 48,
        tintColor: "#3B82F6", // remove this line when using your real logo
    },

    brandName: {
        fontSize: 32,
        fontWeight: "700",
        color: "#F8FAFC",
        letterSpacing: 2,
        textTransform: "lowercase",
    },

    tagline: {
        fontSize: 13,
        color: "#64748B",
        letterSpacing: 0.5,
        marginTop: 6,
    },

    dotsContainer: {
        position: "absolute",
        bottom: 100,
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
    },

    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#3B82F6",
    },

    footer: {
        position: "absolute",
        bottom: 48,
        fontSize: 11,
        color: "#334155",
        letterSpacing: 1,
    },
});