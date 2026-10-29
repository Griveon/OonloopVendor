import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AppBar from "../../components/utils/AppBar";
import { colors } from "../../constants/AppThem";
import { manualDeliveryApi } from "../../services/manualDeliveryApi";
import type {
    ManualDelivery,
    CalculateDistanceResult,
} from "../../types/manualDelivery.types";
import {
    LocationBottomSheet,
    AddressResult,
} from "../../components/LocationPicker/LocationPicker";
import Toast from "react-native-toast-message";

export const ManualDeliveryEditScreen = ({ route, navigation }: any) => {
    const deliveryId = route?.params?.id;

    const [delivery, setDelivery] = useState<ManualDelivery | null>(null);
    const [loadingInitial, setLoadingInitial] = useState(true);

    // Form fields
    const [customerName, setCustomerName] = useState("");
    const [mobileNumber, setMobileNumber] = useState("");
    const [countryCode, setCountryCode] = useState("+91");

    const [addressLine1, setAddressLine1] = useState("");
    const [addressLine2, setAddressLine2] = useState("");
    const [area, setArea] = useState("");
    const [city, setCity] = useState("");
    const [stateName, setStateName] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [landmark, setLandmark] = useState("");
    const [mapLink, setMapLink] = useState("");
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [customerNotes, setCustomerNotes] = useState("");

    const [mapSheetVisible, setMapSheetVisible] = useState(false);
    const [distanceResult, setDistanceResult] = useState<CalculateDistanceResult | null>(null);
    const [calculatingDistance, setCalculatingDistance] = useState(false);
    const distanceDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [saving, setSaving] = useState(false);

    // Fetch initial delivery details
    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            if (!deliveryId) return;

            try {
                setLoadingInitial(true);
                const res = await manualDeliveryApi.getManualDeliveryById(deliveryId);
                if (isMounted && res.success && res.data) {
                    const d = res.data;
                    if (d.status !== "CREATED") {
                        Alert.alert(
                            "Cannot Edit",
                            `This delivery is in '${d.status}' status and cannot be edited. Only deliveries in 'CREATED' status can be modified.`,
                            [{ text: "OK", onPress: () => navigation.goBack() }]
                        );
                        return;
                    }

                    setDelivery(d);
                    setCustomerName(d.customer.name || "");
                    setMobileNumber(d.customer.mobileNumber || "");
                    setCountryCode(d.customer.countryCode || "+91");

                    setAddressLine1(d.dropoff.addressLine1 || "");
                    setAddressLine2(d.dropoff.addressLine2 || "");
                    setArea(d.dropoff.area || "");
                    setCity(d.dropoff.city || "");
                    setStateName(d.dropoff.state || "");
                    setPostalCode(d.dropoff.postalCode || "");
                    setLandmark(d.dropoff.landmark || "");
                    setMapLink(d.dropoff.mapLink || "");
                    setLatitude(d.dropoff.latitude ?? null);
                    setLongitude(d.dropoff.longitude ?? null);

                    setCustomerNotes(d.customerNotes || "");

                    if (d.distance?.valueKm !== null && d.distance?.valueKm !== undefined) {
                        setDistanceResult({
                            distanceKm: d.distance.valueKm,
                            distanceMeters: d.distance.valueMeters,
                            calculationMethod: d.distance.calculationMethod,
                            provider: d.distance.provider,
                        });
                    }
                }
            } catch (err: any) {
                console.log("Error loading delivery to edit:", err);
            } finally {
                if (isMounted) setLoadingInitial(false);
            }
        };

        load();
        return () => {
            isMounted = false;
        };
    }, [deliveryId, navigation]);

    // Recalculate distance when coordinates change
    const triggerDistanceCalculation = useCallback(
        (lat: number | null, lng: number | null) => {
            if (distanceDebounce.current) clearTimeout(distanceDebounce.current);

            if (lat === null || lng === null) {
                setDistanceResult(null);
                return;
            }

            distanceDebounce.current = setTimeout(async () => {
                try {
                    setCalculatingDistance(true);
                    const res = await manualDeliveryApi.calculateDistance({
                        dropoff: { latitude: lat, longitude: lng },
                    });

                    if (res.success && res.data) {
                        setDistanceResult(res.data);
                    }
                } catch (error) {
                    console.log("Distance calculation error:", error);
                } finally {
                    setCalculatingDistance(false);
                }
            }, 500);
        },
        []
    );

    const handleMapLocationSelected = (addr: AddressResult) => {
        setAddressLine1(addr.addressLine1 || "");
        setAddressLine2(addr.addressLine2 || "");
        setCity(addr.city || "");
        setStateName(addr.state || "");
        setPostalCode(addr.postalCode || "");
        setLatitude(addr.latitude);
        setLongitude(addr.longitude);

        triggerDistanceCalculation(addr.latitude, addr.longitude);
        setMapSheetVisible(false);
    };

    const extractCoordsFromGoogleMapsUrl = (url: string): { latitude: number; longitude: number } | null => {
        if (!url) return null;
        try {
            const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (atMatch) {
                const lat = parseFloat(atMatch[1]);
                const lng = parseFloat(atMatch[2]);
                if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
            }

            const qMatch = url.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (qMatch) {
                const lat = parseFloat(qMatch[1]);
                const lng = parseFloat(qMatch[2]);
                if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
            }

            const destMatch = url.match(/[?&]destination=(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (destMatch) {
                const lat = parseFloat(destMatch[1]);
                const lng = parseFloat(destMatch[2]);
                if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
            }
        } catch {
            // Ignore
        }
        return null;
    };

    const handleMapLinkChange = (url: string) => {
        setMapLink(url);
        const coords = extractCoordsFromGoogleMapsUrl(url);
        if (coords) {
            setLatitude(coords.latitude);
            setLongitude(coords.longitude);
            triggerDistanceCalculation(coords.latitude, coords.longitude);
        }
    };

    const handleSave = async () => {
        if (!customerName.trim() || customerName.trim().length < 2) {
            Alert.alert("Validation", "Customer name must be at least 2 characters.");
            return;
        }

        const cleanedMobile = mobileNumber.replace(/\D/g, "");
        if (cleanedMobile.length < 10 || cleanedMobile.length > 15) {
            Alert.alert("Validation", "Mobile number must be 10 to 15 digits.");
            return;
        }

        const effectiveAddressLine1 =
            addressLine1.trim() || (mapLink.trim() ? "Customer Location via Google Maps" : "");

        if (!effectiveAddressLine1) {
            Alert.alert("Validation", "Address line 1 or a Google Maps link is required.");
            return;
        }

        try {
            setSaving(true);

            const payload = {
                customer: {
                    name: customerName.trim(),
                    mobileNumber: cleanedMobile,
                    countryCode: countryCode.trim() || "+91",
                },
                dropoff: {
                    addressLine1: effectiveAddressLine1,
                    addressLine2: addressLine2.trim() || undefined,
                    area: area.trim() || undefined,
                    city: city.trim() || undefined,
                    state: stateName.trim() || undefined,
                    postalCode: postalCode.trim() || undefined,
                    landmark: landmark.trim() || undefined,
                    latitude: latitude,
                    longitude: longitude,
                    mapLink: mapLink.trim() || undefined,
                    formattedAddress: [
                        effectiveAddressLine1,
                        addressLine2.trim(),
                        area.trim(),
                        landmark.trim() ? `Near ${landmark.trim()}` : null,
                        city.trim(),
                        stateName.trim(),
                        postalCode.trim(),
                    ]
                        .filter(Boolean)
                        .join(", "),
                },
                customerNotes: customerNotes.trim() || undefined,
            };

            const res = await manualDeliveryApi.updateManualDelivery(
                deliveryId,
                payload
            );

            if (res.success) {
                Toast.show({
                    type: "success",
                    text1: "Changes Saved",
                    text2: "Manual delivery updated successfully.",
                });
                navigation.goBack();
            } else {
                Toast.show({
                    type: "error",
                    text1: "Update Failed",
                    text2: res.message || "Failed to update delivery.",
                });
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: error?.message || "Something went wrong.",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loadingInitial) {
        return (
            <View style={styles.container}>
                <AppBar title="Edit Delivery" onBack={() => navigation.goBack()} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading delivery...</Text>
                </View>
            </View>
        );
    }

    const distanceKmValue =
        typeof distanceResult?.valueKm === "number"
            ? distanceResult.valueKm
            : typeof distanceResult?.distanceKm === "number"
            ? distanceResult.distanceKm
            : null;

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.container}>
                <AppBar
                    title={`Edit #${delivery?.deliveryNumber}`}
                    onBack={() => navigation.goBack()}
                />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Customer Information */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>CUSTOMER INFORMATION</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Customer Name <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                value={customerName}
                                onChangeText={setCustomerName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Mobile Number <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                keyboardType="phone-pad"
                                value={mobileNumber}
                                onChangeText={(t) => setMobileNumber(t.replace(/\D/g, ""))}
                            />
                        </View>
                    </View>

                    {/* Delivery Location */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeaderBetween}>
                            <Text style={styles.sectionTitle}>DELIVERY LOCATION</Text>
                            <TouchableOpacity
                                style={styles.mapPickerBtn}
                                onPress={() => setMapSheetVisible(true)}
                            >
                                <Ionicons name="map-outline" size={14} color="#2563EB" />
                                <Text style={styles.mapPickerText}>Update on Map</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Customer Map Link (Google Maps) */}
                        <View style={styles.inputGroup}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>Customer Map Link (Google Maps)</Text>
                                <View style={styles.mapLinkBadge}>
                                    <Ionicons name="location" size={10} color="#2563EB" />
                                    <Text style={styles.mapLinkBadgeText}>Auto Coordinates</Text>
                                </View>
                            </View>
                            <View style={styles.mapLinkInputRow}>
                                <View style={styles.mapLinkIconBox}>
                                    <Ionicons name="link-outline" size={16} color="#2563EB" />
                                </View>
                                <TextInput
                                    style={[styles.textInput, styles.mapLinkInput]}
                                    placeholder="Paste customer's Google Maps link here"
                                    placeholderTextColor="#94A3B8"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="url"
                                    value={mapLink}
                                    onChangeText={handleMapLinkChange}
                                />
                                {mapLink.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => handleMapLinkChange("")}
                                        style={styles.clearMapLinkBtn}
                                    >
                                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <Text style={styles.mapLinkHelperText}>
                                Sellers can paste the customer's Google Maps link here if the exact address is unknown. This automatically extracts location coordinates and calculates delivery distance.
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Address Line 1 <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                value={addressLine1}
                                onChangeText={setAddressLine1}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Address Line 2 (Optional)</Text>
                            <TextInput
                                style={styles.textInput}
                                value={addressLine2}
                                onChangeText={setAddressLine2}
                            />
                        </View>

                        <View style={styles.twoColRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Area</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={area}
                                    onChangeText={setArea}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Landmark</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={landmark}
                                    onChangeText={setLandmark}
                                />
                            </View>
                        </View>

                        <View style={styles.threeColRow}>
                            <View style={[styles.inputGroup, { flex: 1.2 }]}>
                                <Text style={styles.label}>City</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={city}
                                    onChangeText={setCity}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>State</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={stateName}
                                    onChangeText={setStateName}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>PIN</Text>
                                <TextInput
                                    style={styles.textInput}
                                    keyboardType="numeric"
                                    maxLength={8}
                                    value={postalCode}
                                    onChangeText={setPostalCode}
                                />
                            </View>
                        </View>

                        {/* Distance Badge */}
                        {calculatingDistance ? (
                            <View style={styles.distanceLoading}>
                                <ActivityIndicator size="small" color="#7C3AED" />
                                <Text style={styles.distanceLoadingText}>Recalculating distance...</Text>
                            </View>
                        ) : distanceResult && distanceKmValue !== null ? (
                            <View style={styles.distanceRow}>
                                <Ionicons name="compass" size={15} color="#6D28D9" />
                                <Text style={styles.distanceText}>
                                    Distance: {distanceKmValue.toFixed(1)} km (
                                    {distanceResult.calculationMethod === "ROAD"
                                        ? "Road distance"
                                        : "Straight-line"}
                                    )
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Customer Notes */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>DELIVERY NOTES / INSTRUCTIONS</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Enter notes..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            numberOfLines={4}
                            maxLength={1000}
                            value={customerNotes}
                            onChangeText={setCustomerNotes}
                        />
                        <Text style={styles.charCount}>{customerNotes.length}/1000</Text>
                    </View>
                </ScrollView>

                {/* Bottom save button */}
                <View style={styles.stickyFooter}>
                    <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Map Bottom Sheet */}
                <LocationBottomSheet
                    visible={mapSheetVisible}
                    onClose={() => setMapSheetVisible(false)}
                    onSelect={handleMapLocationSelected}
                />
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.scaffoldBg,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    loadingText: {
        fontSize: 13,
        color: "#64748B",
        marginTop: 10,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 30,
        gap: 14,
    },
    sectionCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: "#1E293B",
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    sectionHeaderBetween: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    mapPickerBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    mapPickerText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#2563EB",
    },
    inputGroup: {
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        fontWeight: "600",
        color: "#475569",
        marginBottom: 6,
    },
    required: {
        color: "#DC2626",
    },
    textInput: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === "ios" ? 12 : 9,
        fontSize: 14,
        color: "#0F172A",
    },
    twoColRow: {
        flexDirection: "row",
        gap: 10,
    },
    threeColRow: {
        flexDirection: "row",
        gap: 8,
    },
    distanceLoading: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        gap: 6,
    },
    distanceLoadingText: {
        fontSize: 12,
        color: "#7C3AED",
    },
    distanceRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F3FF",
        padding: 8,
        borderRadius: 8,
        gap: 6,
        marginTop: 4,
    },
    distanceText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6D28D9",
    },
    textArea: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        borderRadius: 10,
        padding: 12,
        fontSize: 13,
        color: "#0F172A",
        textAlignVertical: "top",
        height: 80,
    },
    charCount: {
        fontSize: 11,
        color: "#94A3B8",
        textAlign: "right",
        marginTop: 4,
    },
    stickyFooter: {
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === "ios" ? 24 : 14,
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
    },
    saveBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    saveBtnDisabled: {
        backgroundColor: "#93C5FD",
    },
    saveBtnText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    mapLinkBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#DBEAFE",
    },
    mapLinkBadgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#2563EB",
    },
    mapLinkInputRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        borderRadius: 10,
        paddingHorizontal: 10,
    },
    mapLinkIconBox: {
        marginRight: 6,
    },
    mapLinkInput: {
        flex: 1,
        borderWidth: 0,
        backgroundColor: "transparent",
        paddingHorizontal: 0,
        fontSize: 13,
    },
    clearMapLinkBtn: {
        padding: 4,
    },
    mapLinkHelperText: {
        fontSize: 11,
        color: "#64748B",
        lineHeight: 16,
        marginTop: 5,
        fontStyle: "italic",
    },
});

export default ManualDeliveryEditScreen;
