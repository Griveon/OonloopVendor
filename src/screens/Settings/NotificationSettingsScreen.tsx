import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    RefreshControl,
    Platform,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import notifee, { AndroidImportance, AndroidVisibility } from "@notifee/react-native";
import AppBar from "../../components/utils/AppBar";
import { colors } from "../../constants/AppThem";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";
import { getRequest, postRequest } from "../../constants/ApiClient";
import {
    getLocalPreferences,
    setSingleLocalPreference,
} from "../../components/AsyncStorage/AsyncStorage";
import { USER_PREFERENCES } from "../../constants/userpreferences";
import { createNotificationChannels } from "../../FirebaseService/notifications/firebaseNotificationService";

export interface NotificationSoundOption {
    id: string;
    key: string;
    name: string;
    sound: string;
    channelId: string;
    apnsSound: string;
    description?: string;
}

const DEFAULT_SOUND_KEY = "order_alert";
const PREFERENCE_KEY = USER_PREFERENCES.VENDOR_ORDER_NOTIFICATION_SOUND.key; // "vendorOrderNotificationSound"

export const FALLBACK_SOUNDS: NotificationSoundOption[] = [
    {
        id: "order_alert",
        key: "order_alert",
        name: "Order Alert (Classic)",
        sound: "order_alert",
        channelId: "new_paid_orders_v1",
        apnsSound: "order_alert.wav",
        description: "Classic chime for new incoming order alerts",
    },
    {
        id: "order_alert_sound_v2",
        key: "order_alert_sound_v2",
        name: "Order Alert V2",
        sound: "order_alert_sound_v2",
        channelId: "new_paid_orders_v2",
        apnsSound: "order_alert_sound_v2.mpeg",
        description: "Modern, attention-grabbing order alert tone",
    },
];

export default function NotificationSettingsScreen({ navigation }: { navigation?: any }) {
    const fallbackNav = useNavigation<any>();
    const activeNav = navigation || fallbackNav;

    const [sounds, setSounds] = useState<NotificationSoundOption[]>(FALLBACK_SOUNDS);
    const [selectedSound, setSelectedSound] = useState<string>(DEFAULT_SOUND_KEY);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
    const [testingSound, setTestingSound] = useState<string | null>(null);

    const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadData = useCallback(async () => {
        try {
            // 1. Load preference from local storage first for instant UI response
            const localPrefs = await getLocalPreferences();
            if (localPrefs && PREFERENCE_KEY in localPrefs) {
                const localVal = String(localPrefs[PREFERENCE_KEY] || "").trim();
                if (localVal) {
                    setSelectedSound(localVal);
                }
            }

            // 2. Fetch available sounds & backend preference in parallel
            const results = await Promise.allSettled([
                getRequest(API_ENDPOINTS.USERPREFERENCE_SOUNDS),
                getRequest(API_ENDPOINTS.USERPREFERENCE_GET),
            ]);
            const soundsRes: any = results[0].status === "fulfilled" ? results[0].value : null;
            const prefRes: any = results[1].status === "fulfilled" ? results[1].value : null;

            // Populate sounds if available
            if (soundsRes?.success && Array.isArray(soundsRes?.data) && soundsRes.data.length > 0) {
                const mapped: NotificationSoundOption[] = soundsRes.data.map(
                    (s: any, idx: number) => ({
                        id: s.id || s.key || s.sound || `sound_${idx}`,
                        key: s.key || s.id || s.sound,
                        name: s.name || s.sound || `Sound ${idx + 1}`,
                        sound: s.sound,
                        channelId: s.channelId || (s.sound === "order_alert_sound_v2" ? "new_paid_orders_v2" : "new_paid_orders_v1"),
                        apnsSound: s.apnsSound || (s.sound === "order_alert_sound_v2" ? "order_alert_sound_v2.mpeg" : "order_alert.wav"),
                        description:
                            s.sound === "order_alert_sound_v2"
                                ? "Modern, attention-grabbing order alert tone"
                                : "Classic chime for new incoming order alerts",
                    })
                );
                setSounds(mapped);
            }

            // Populate preference
            const backendSound =
                prefRes?.data?.values?.[PREFERENCE_KEY] ||
                prefRes?.data?.[PREFERENCE_KEY];

            if (backendSound && typeof backendSound === "string") {
                setSelectedSound(backendSound);
                await setSingleLocalPreference(PREFERENCE_KEY, backendSound);
            }
        } catch (error) {
            console.warn("[NotificationSettings] Load error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        createNotificationChannels();

        return () => {
            if (previewTimerRef.current) {
                clearTimeout(previewTimerRef.current);
            }
            notifee.cancelNotification("notification_sound_preview").catch(() => {});
        };
    }, [loadData]);

    const handleSelectSound = async (soundOption: NotificationSoundOption) => {
        const soundKey = soundOption.key || soundOption.sound;
        if (selectedSound === soundKey) return;

        const previousSound = selectedSound;
        setSelectedSound(soundKey);
        setSaving(true);

        try {
            await setSingleLocalPreference(PREFERENCE_KEY, soundKey);

            const res: any = await postRequest(API_ENDPOINTS.USERPREFERENCE_SET, {
                key: PREFERENCE_KEY,
                value: soundKey,
            });

            if (res?.success) {
                Toast.show({
                    type: "success",
                    text1: "Sound Updated",
                    text2: `${soundOption.name} set as order notification sound.`,
                });
            } else {
                // Rollback on failure
                setSelectedSound(previousSound);
                await setSingleLocalPreference(PREFERENCE_KEY, previousSound);
                Toast.show({
                    type: "error",
                    text1: "Update Failed",
                    text2: res?.message || "Failed to update notification sound.",
                });
            }
        } catch (error: any) {
            setSelectedSound(previousSound);
            await setSingleLocalPreference(PREFERENCE_KEY, previousSound);
            Toast.show({
                type: "error",
                text1: "Update Failed",
                text2: error?.message || "Failed to update notification sound.",
            });
        } finally {
            setSaving(false);
        }
    };

    const handlePreviewSound = async (soundOption: NotificationSoundOption) => {
        try {
            if (previewTimerRef.current) {
                clearTimeout(previewTimerRef.current);
            }

            setPlayingSoundId(soundOption.id);

            // Ensure Android channels exist
            await createNotificationChannels();

            // Trigger notification sound preview via Notifee channel
            await notifee.displayNotification({
                id: "notification_sound_preview",
                title: "🔔 Sound Preview",
                body: `Testing ${soundOption.name}`,
                android: {
                    channelId: soundOption.channelId,
                    sound: soundOption.sound,
                    importance: AndroidImportance.HIGH,
                    visibility: AndroidVisibility.PUBLIC,
                    pressAction: { id: "default" },
                    smallIcon: "ic_launcher",
                    autoCancel: true,
                    timestamp: Date.now(),
                },
                ios: {
                    sound: soundOption.apnsSound || (soundOption.sound === "order_alert_sound_v2" ? "order_alert_sound_v2.mpeg" : "order_alert.wav"),
                },
            });

            // Automatically reset preview state after sound completes
            previewTimerRef.current = setTimeout(() => {
                setPlayingSoundId(null);
                notifee.cancelNotification("notification_sound_preview").catch(() => {});
            }, 3500);
        } catch (error) {
            console.warn("[NotificationSettings] Preview sound error:", error);
            setPlayingSoundId(null);
        }
    };

    const handleSendTestPush = async (soundOption: NotificationSoundOption) => {
        const soundKey = soundOption.sound || soundOption.key;
        try {
            setTestingSound(soundKey);
            const res: any = await postRequest(API_ENDPOINTS.USERPREFERENCE_TEST_SOUND, {
                sound: soundKey,
                channelId: soundOption.channelId,
                apnsSound: soundOption.apnsSound,
            });

            if (res?.success) {
                Toast.show({
                    type: "success",
                    text1: "Test Push Sent",
                    text2: `A test notification for "${soundOption.name}" has been sent. Background or lock your device to hear it.`,
                    visibilityTime: 4000,
                });
                Alert.alert(
                    "Test Push Sent",
                    `A test notification for "${soundOption.name}" has been sent to your device. Background or lock your device to hear it.`
                );
            } else {
                Toast.show({
                    type: "error",
                    text1: "Test Failed",
                    text2: res?.message || "Failed to trigger test push notification.",
                });
                Alert.alert(
                    "Test Failed",
                    res?.message || "Failed to trigger test push notification."
                );
            }
        } catch (err: any) {
            Toast.show({
                type: "error",
                text1: "Test Failed",
                text2: err?.message || "Failed to trigger test push notification.",
            });
            Alert.alert(
                "Test Failed",
                err?.message || "Failed to trigger test push notification."
            );
        } finally {
            setTestingSound(null);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppBar title="Notification Sounds" onBack={() => (activeNav?.goBack ? activeNav.goBack() : null)} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadData();
                        }}
                        colors={[colors.primary]}
                    />
                }
            >
                {/* Header Banner */}
                <View style={styles.headerCard}>
                    <View style={styles.headerIconWrapper}>
                        <Ionicons name="notifications-outline" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.headerTextWrap}>
                        <Text style={styles.headerTitle}>Order Alert Tone</Text>
                        <Text style={styles.headerSubtitle}>
                            Select the sound you want to hear when a new paid order or delivery is assigned to your store.
                        </Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Loading sounds...</Text>
                    </View>
                ) : (
                    <View style={styles.soundList}>
                        <Text style={styles.sectionTitle}>Available Tones</Text>

                        {sounds.map((soundItem) => {
                            const isSelected =
                                selectedSound === soundItem.key || selectedSound === soundItem.sound;
                            const isPlaying = playingSoundId === soundItem.id;
                            const isTesting = testingSound === soundItem.sound || testingSound === soundItem.key;

                            return (
                                <View
                                    key={soundItem.id}
                                    style={[
                                        styles.soundCard,
                                        isSelected && styles.soundCardSelected,
                                    ]}
                                >
                                    {/* Selection Row */}
                                    <TouchableOpacity
                                        style={styles.soundSelectArea}
                                        onPress={() => handleSelectSound(soundItem)}
                                        activeOpacity={0.7}
                                        disabled={saving}
                                    >
                                        {/* Left: Radio Selection */}
                                        <View style={styles.radioContainer}>
                                            <Ionicons
                                                name={isSelected ? "radio-button-on" : "radio-button-off"}
                                                size={22}
                                                color={isSelected ? colors.primary : colors.placeholder}
                                            />
                                        </View>

                                        {/* Middle: Name & Description */}
                                        <View style={styles.soundInfo}>
                                            <View style={styles.titleRow}>
                                                <Text
                                                    style={[
                                                        styles.soundName,
                                                        isSelected && styles.soundNameSelected,
                                                    ]}
                                                >
                                                    {soundItem.name}
                                                </Text>
                                                {isSelected && (
                                                    <View style={styles.activeBadge}>
                                                        <Text style={styles.activeBadgeText}>Active</Text>
                                                    </View>
                                                )}
                                            </View>
                                            {soundItem.description ? (
                                                <Text style={styles.soundDescription}>
                                                    {soundItem.description}
                                                </Text>
                                            ) : null}
                                            <Text style={styles.metaText}>
                                                Channel: {soundItem.channelId} | iOS: {soundItem.apnsSound}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Bottom Action Buttons: Preview & Test Push */}
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity
                                            style={[
                                                styles.previewButton,
                                                isPlaying && styles.previewButtonPlaying,
                                            ]}
                                            onPress={() => handlePreviewSound(soundItem)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name={isPlaying ? "volume-high" : "play"}
                                                size={16}
                                                color={isPlaying ? "#FFFFFF" : colors.primary}
                                            />
                                            <Text
                                                style={[
                                                    styles.previewButtonText,
                                                    isPlaying && styles.previewButtonTextPlaying,
                                                ]}
                                            >
                                                {isPlaying ? "Playing" : "Preview"}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                styles.testPushButton,
                                                isTesting && styles.testPushButtonActive,
                                            ]}
                                            disabled={testingSound !== null}
                                            onPress={() => handleSendTestPush(soundItem)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            activeOpacity={0.7}
                                        >
                                            {isTesting ? (
                                                <ActivityIndicator size="small" color={colors.primary} />
                                            ) : (
                                                <>
                                                    <Ionicons name="notifications-outline" size={15} color="#0F172A" />
                                                    <Text style={styles.testPushButtonText}>Test Push</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Helpful Note Card */}
                <View style={styles.noteCard}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                    <Text style={styles.noteText}>
                        Tip: Make sure your device's Notification Volume is turned up and "Do Not Disturb" is turned off so you never miss an order alert.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.scaffoldBg,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    headerCard: {
        flexDirection: "row",
        backgroundColor: colors.formBg,
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.formBorder,
        gap: 14,
        alignItems: "center",
    },
    headerIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTextWrap: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.secondary,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 13,
        color: colors.label,
        lineHeight: 18,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: colors.secondary,
        marginBottom: 12,
        marginLeft: 2,
    },
    loadingContainer: {
        paddingVertical: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.placeholder,
    },
    soundList: {
        gap: 12,
    },
    soundCard: {
        backgroundColor: colors.formBg,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        gap: 14,
    },
    soundCardSelected: {
        borderColor: colors.primary,
        backgroundColor: "#F0F7FF",
    },
    soundSelectArea: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    radioContainer: {
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 2,
    },
    soundInfo: {
        flex: 1,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
    },
    soundName: {
        fontSize: 15,
        fontWeight: "600",
        color: colors.secondary,
    },
    soundNameSelected: {
        color: colors.primary,
    },
    activeBadge: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    activeBadgeText: {
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "700",
    },
    soundDescription: {
        fontSize: 12,
        color: colors.label,
        marginTop: 3,
    },
    metaText: {
        fontSize: 11,
        color: colors.placeholder,
        marginTop: 4,
    },
    cardActions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 10,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.formBorder || "#E2E8F0",
    },
    previewButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: "#EFF6FF",
        gap: 5,
    },
    previewButtonPlaying: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    previewButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.primary,
    },
    previewButtonTextPlaying: {
        color: "#FFFFFF",
    },
    testPushButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.formBorder || "#CBD5E1",
        backgroundColor: "#FFFFFF",
        gap: 5,
    },
    testPushButtonActive: {
        backgroundColor: "#F1F5F9",
    },
    testPushButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#0F172A",
    },
    noteCard: {
        flexDirection: "row",
        backgroundColor: "#EFF6FF",
        borderRadius: 12,
        padding: 14,
        marginTop: 24,
        borderWidth: 1,
        borderColor: "#BFDBFE",
        gap: 10,
        alignItems: "flex-start",
    },
    noteText: {
        flex: 1,
        fontSize: 12,
        color: "#1E40AF",
        lineHeight: 18,
    },
});
