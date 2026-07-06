// src/components/utils/AppUpdateProvider.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import SpInAppUpdates, {
    IAUInstallStatus,
    IAUUpdateKind,
    StartUpdateOptions,
} from "sp-react-native-in-app-updates";

const inAppUpdates = new SpInAppUpdates(false);

type UpdateStep =
    | "checking"
    | "available"
    | "downloading"
    | "downloaded"
    | "not_available";

type AppUpdateProviderProps = {
    children: React.ReactNode;
    forceUpdate?: boolean;
};

const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) {
        return "0 MB";
    }

    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
};

export const AppUpdateProvider = ({
    children,
    forceUpdate = false,
}: AppUpdateProviderProps) => {
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState<UpdateStep>("checking");
    const [progress, setProgress] = useState(0);
    const [downloadedBytes, setDownloadedBytes] = useState(0);
    const [totalBytes, setTotalBytes] = useState(0);

    const isMountedRef = useRef(true);
    const listenerAddedRef = useRef(false);

    const title = useMemo(() => {
        if (step === "available") {
            return "Update Available";
        }

        if (step === "downloading") {
            return "Updating App";
        }

        if (step === "downloaded") {
            return "Update Ready";
        }

        return "Checking Update";
    }, [step]);

    const description = useMemo(() => {
        if (step === "available") {
            return "A new version of the app is available. Update now to get the latest features and fixes.";
        }

        if (step === "downloading") {
            return "Please wait while the latest version is downloading from Play Store.";
        }

        if (step === "downloaded") {
            return "The update has been downloaded. Restart the app to complete installation.";
        }

        return "Checking for the latest app version.";
    }, [step]);

    const hideUpdateModal = useCallback(() => {
        if (!isMountedRef.current) {
            return;
        }

        setVisible(false);
        setStep("not_available");
        setProgress(0);
        setDownloadedBytes(0);
        setTotalBytes(0);
    }, []);

    const addUpdateListener = useCallback(() => {
        if (listenerAddedRef.current) {
            return;
        }

        listenerAddedRef.current = true;

        inAppUpdates.addStatusUpdateListener((status: any) => {
            if (!isMountedRef.current) {
                return;
            }

            const bytesDownloaded = Number(status?.bytesDownloaded || 0);
            const totalBytesToDownload = Number(status?.totalBytesToDownload || 0);

            if (totalBytesToDownload > 0) {
                const percentage = Math.round(
                    (bytesDownloaded / totalBytesToDownload) * 100
                );

                setProgress(Math.min(Math.max(percentage, 0), 100));
                setDownloadedBytes(bytesDownloaded);
                setTotalBytes(totalBytesToDownload);
            }

            if (status?.status === IAUInstallStatus.DOWNLOADING) {
                setStep("downloading");
                setVisible(true);
                return;
            }

            if (status?.status === IAUInstallStatus.DOWNLOADED) {
                setProgress(100);
                setStep("downloaded");
                setVisible(true);
                return;
            }

            if (
                status?.status === IAUInstallStatus.FAILED ||
                status?.status === IAUInstallStatus.CANCELED
            ) {
                hideUpdateModal();
            }
        });
    }, [hideUpdateModal]);

    const checkForUpdate = useCallback(async () => {
        try {
            if (Platform.OS !== "android") {
                hideUpdateModal();
                return;
            }

            const result = await inAppUpdates.checkNeedsUpdate();

            if (!isMountedRef.current) {
                return;
            }

            if (!result?.shouldUpdate) {
                hideUpdateModal();
                return;
            }

            setStep("available");
            setVisible(true);
        } catch (error) {
            console.log("In-app update check bypassed:", error);
            hideUpdateModal();
        }
    }, [hideUpdateModal]);

    const startFlexibleUpdate = useCallback(async () => {
        try {
            if (Platform.OS !== "android") {
                hideUpdateModal();
                return;
            }

            addUpdateListener();

            setStep("downloading");
            setProgress(0);
            setDownloadedBytes(0);
            setTotalBytes(0);
            setVisible(true);

            const updateOptions: StartUpdateOptions = {
                updateType: IAUUpdateKind.FLEXIBLE,
            };

            await inAppUpdates.startUpdate(updateOptions);
        } catch (error) {
            console.log("In-app update start bypassed:", error);
            hideUpdateModal();
        }
    }, [addUpdateListener, hideUpdateModal]);

    const installDownloadedUpdate = useCallback(async () => {
        try {
            await inAppUpdates.installUpdate();
        } catch (error) {
            console.log("In-app update install bypassed:", error);
            hideUpdateModal();
        }
    }, [hideUpdateModal]);

    const closeModal = useCallback(() => {
        if (forceUpdate) {
            return;
        }

        setVisible(false);
    }, [forceUpdate]);

    useEffect(() => {
        isMountedRef.current = true;

        checkForUpdate();

        return () => {
            isMountedRef.current = false;
        };
    }, [checkForUpdate]);

    return (
        <>
            {children}

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={closeModal}
            >
                <View style={styles.overlay}>
                    <View style={styles.card}>
                        <View style={styles.iconCircle}>
                            {step === "downloading" || step === "checking" ? (
                                <ActivityIndicator size="large" color="#2563EB" />
                            ) : (
                                <Text style={styles.iconText}>
                                    {step === "downloaded" ? "✓" : "↑"}
                                </Text>
                            )}
                        </View>

                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.description}>{description}</Text>

                        {step === "downloading" && (
                            <View style={styles.progressSection}>
                                <View style={styles.progressHeader}>
                                    <Text style={styles.progressText}>{progress}%</Text>
                                    <Text style={styles.sizeText}>
                                        {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
                                    </Text>
                                </View>

                                <View style={styles.progressTrack}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${progress}%`,
                                            },
                                        ]}
                                    />
                                </View>
                            </View>
                        )}

                        {step === "available" && (
                            <View style={styles.buttonRow}>
                                {!forceUpdate && (
                                    <Pressable
                                        style={[styles.button, styles.secondaryButton]}
                                        onPress={closeModal}
                                    >
                                        <Text style={styles.secondaryButtonText}>Later</Text>
                                    </Pressable>
                                )}

                                <Pressable
                                    style={[
                                        styles.button,
                                        styles.primaryButton,
                                        forceUpdate && styles.fullButton,
                                    ]}
                                    onPress={startFlexibleUpdate}
                                >
                                    <Text style={styles.primaryButtonText}>Update Now</Text>
                                </Pressable>
                            </View>
                        )}

                        {step === "downloaded" && (
                            <Pressable
                                style={[styles.button, styles.primaryButton, styles.fullButton]}
                                onPress={installDownloadedUpdate}
                            >
                                <Text style={styles.primaryButtonText}>Restart & Install</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },

    card: {
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        paddingHorizontal: 22,
        paddingVertical: 26,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 20,
        shadowOffset: {
            width: 0,
            height: 10,
        },
        elevation: 10,
    },

    iconCircle: {
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
    },

    iconText: {
        fontSize: 36,
        color: "#2563EB",
        fontWeight: "800",
    },

    title: {
        fontSize: 22,
        fontWeight: "800",
        color: "#0F172A",
        textAlign: "center",
        marginBottom: 8,
    },

    description: {
        fontSize: 14,
        lineHeight: 21,
        color: "#64748B",
        textAlign: "center",
        marginBottom: 22,
    },

    progressSection: {
        width: "100%",
        marginTop: 4,
    },

    progressHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },

    progressText: {
        fontSize: 14,
        fontWeight: "800",
        color: "#2563EB",
    },

    sizeText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748B",
    },

    progressTrack: {
        width: "100%",
        height: 10,
        borderRadius: 20,
        backgroundColor: "#E2E8F0",
        overflow: "hidden",
    },

    progressFill: {
        height: "100%",
        borderRadius: 20,
        backgroundColor: "#2563EB",
    },

    buttonRow: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    button: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },

    fullButton: {
        flex: 0,
        width: "100%",
    },

    primaryButton: {
        backgroundColor: "#2563EB",
    },

    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "800",
    },

    secondaryButton: {
        backgroundColor: "#F1F5F9",
    },

    secondaryButtonText: {
        color: "#334155",
        fontSize: 15,
        fontWeight: "800",
    },
});