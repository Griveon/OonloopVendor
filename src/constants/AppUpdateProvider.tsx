import React, { useEffect, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, AppState, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppUpdateBottomSheet from "../components/AppUpdate/AppUpdateBottomSheet";
import { appUpdateService, InstallStatus } from "../services/AppUpdateService";
import { colors } from "./AppThem";

export const AppUpdateProvider = ({ children, enabled }: {
    children: React.ReactNode;
    enabled: boolean;
}) => {
    const state = useSyncExternalStore(appUpdateService.subscribe, appUpdateService.getSnapshot);
    const [foreground, setForeground] = useState(AppState.currentState === "active");
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const subscription = AppState.addEventListener("change", next => setForeground(next === "active"));
        return () => subscription.remove();
    }, []);
    useEffect(() => {
        if (enabled) appUpdateService.start();
        return appUpdateService.stop;
    }, [enabled]);

    const ready = state.installStatus === InstallStatus.DOWNLOADED;
    const downloading = state.installStatus === InstallStatus.DOWNLOADING;
    const pending = state.installStatus === InstallStatus.PENDING;
    const installing = state.installStatus === InstallStatus.INSTALLING || state.completing;
    const progress = state.totalBytesToDownload > 0
        ? Math.min(100, Math.max(0, Math.round(state.bytesDownloaded / state.totalBytesToDownload * 100)))
        : null;

    return (
        <View style={styles.root}>
            {children}
            <AppUpdateBottomSheet
                visible={enabled && foreground && state.promptVisible}
                onDismiss={appUpdateService.dismiss}
                onUpdateNow={() => { void appUpdateService.startUpdate(); }}
            />
            {enabled && foreground && (ready || downloading || pending || installing) && (
                <View style={[styles.banner, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <View style={styles.message}>
                        <Text style={styles.title}>{installing ? "Installing update…" : ready
                            ? "An update is ready to install." : pending ? "Update pending…"
                                : `Downloading update${progress === null ? "…" : `: ${progress}%`}`}</Text>
                        {downloading && progress !== null && (
                            <View style={styles.track}>
                                <View style={[styles.progress, { width: `${progress}%` }]} />
                            </View>
                        )}
                    </View>
                    {ready && !installing ? (
                        <TouchableOpacity accessibilityRole="button" style={styles.button}
                            onPress={() => { void appUpdateService.completeUpdate(); }}>
                            <Text style={styles.buttonText}>Restart & Update</Text>
                        </TouchableOpacity>
                    ) : <ActivityIndicator color={colors.primary} />}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1 },
    banner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16,
        backgroundColor: colors.formBg, borderTopWidth: 1, borderTopColor: colors.formBorder },
    message: { flex: 1 },
    title: { color: colors.secondary, fontSize: 13, fontWeight: "600" },
    button: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 },
    buttonText: { color: colors.formBg, fontWeight: "700", fontSize: 12 },
    track: { height: 4, borderRadius: 2, backgroundColor: `${colors.primary}20`, marginTop: 8, overflow: "hidden" },
    progress: { height: 4, backgroundColor: colors.primary },
});
