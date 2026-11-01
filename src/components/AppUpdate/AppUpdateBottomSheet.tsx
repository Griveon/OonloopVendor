import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { colors } from "../../constants/AppThem";
import { Fonts } from "../../constants/Fonts";

interface AppUpdateBottomSheetProps {
    visible: boolean;
    onUpdateNow: () => void;
    onDismiss?: () => void;
}

export const AppUpdateBottomSheet: React.FC<AppUpdateBottomSheetProps> = ({
    visible,
    onUpdateNow,
    onDismiss,
}) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(600)).current;
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        if (visible) {
            setIsRendered(true);
            slideAnim.setValue(600);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 600,
                duration: 220,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) setIsRendered(false);
            });
        }
        return () => slideAnim.stopAnimation();
    }, [visible, slideAnim]);

    if (!isRendered && !visible) {
        return null;
    }

    const title = "Update available";
    const message = "A new version of the app is available with the latest improvements and fixes.";

    return (
        <Modal
            transparent
            animationType="none"
            visible={isRendered}
            onRequestClose={onDismiss}
            statusBarTranslucent
        >
            <View style={styles.root}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onDismiss}
                />

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            paddingBottom: Math.max(insets.bottom, 16),
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Handle bar */}
                    <View style={styles.handle} />

                    <View style={styles.content}>
                        {/* Icon Badge */}
                        <View style={styles.iconCircle}>
                            <View style={styles.iconInner}>
                                <Icon
                                    name="cellphone-arrow-down"
                                    size={36}
                                    color={colors.primary}
                                />
                            </View>
                        </View>

                        {/* Title */}
                        <Text style={styles.title}>{title}</Text>

                        <Text style={styles.message}>{message}</Text>

                        {/* Primary Action Button */}
                        <TouchableOpacity
                            style={styles.updateButton}
                            onPress={onUpdateNow}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel="Update now"
                        >
                            <Icon
                                name="google-play"
                                size={20}
                                color="#FFFFFF"
                                style={{ marginRight: 8 }}
                            />
                            <Text style={styles.updateButtonText}>Update now</Text>
                        </TouchableOpacity>

                        {onDismiss && (
                            <TouchableOpacity
                                style={styles.laterButton}
                                onPress={onDismiss}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.laterButtonText}>Later</Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.footerNoteWrap}>
                            <Icon
                                name="shield-check-outline"
                                size={14}
                                color="#94A3B8"
                                style={{ marginRight: 5 }}
                            />
                            <Text style={styles.footerNote}>
                                Secure update via official app store
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: "flex-end",
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
    },
    sheet: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 12,
        paddingHorizontal: 22,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
        elevation: 25,
    },
    handle: {
        alignSelf: "center",
        width: 44,
        height: 5,
        borderRadius: 3,
        backgroundColor: "#CBD5E1",
        marginBottom: 16,
    },
    content: {
        alignItems: "center",
        paddingBottom: 8,
    },
    iconCircle: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: `${colors.primary}12`,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    iconInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: `${colors.primary}1A`,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 20,
        lineHeight: 26,
        fontFamily: Fonts.Bold,
        color: "#0F172A",
        textAlign: "center",
        marginBottom: 6,
    },
    message: {
        fontSize: 13.5,
        lineHeight: 20,
        fontFamily: Fonts.Regular,
        color: "#64748B",
        textAlign: "center",
        marginBottom: 22,
        paddingHorizontal: 8,
    },
    updateButton: {
        width: "100%",
        height: 50,
        borderRadius: 14,
        backgroundColor: colors.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    updateButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontFamily: Fonts.Bold,
        lineHeight: 20,
    },
    laterButton: {
        marginTop: 10,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    laterButtonText: {
        color: "#64748B",
        fontSize: 14,
        fontFamily: Fonts.Medium,
    },
    footerNoteWrap: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 14,
    },
    footerNote: {
        fontSize: 11.5,
        color: "#94A3B8",
        fontFamily: Fonts.Regular,
    },
});

export default AppUpdateBottomSheet;
