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
    ManualDeliveryPickupDefault,
    CalculateDistanceResult,
} from "../../types/manualDelivery.types";
import {
    LocationBottomSheet,
    AddressResult,
} from "../../components/LocationPicker/LocationPicker";
import Toast from "react-native-toast-message";

export const ManualDeliveryCreateScreen = ({ route, navigation }: any) => {
    const prefill = route?.params?.prefillData || route?.params?.recreateFrom || route?.params?.initialData;
    const isRecreateMode = Boolean(prefill);

    // ─── Section 1: Pickup Location State ─────────────────────────────────────────
    const [pickup, setPickup] = useState<ManualDeliveryPickupDefault | null>(null);
    const [loadingPickup, setLoadingPickup] = useState(true);
    const [pickupError, setPickupError] = useState<string | null>(null);

    // ─── Section 2: Customer Info ────────────────────────────────────────────────
    const [customerName, setCustomerName] = useState("");
    const [mobileNumber, setMobileNumber] = useState("");
    const countryCode = "+91";

    // ─── Section 3: Dropoff Location ─────────────────────────────────────────────
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
    const [mapSheetVisible, setMapSheetVisible] = useState(false);

    // ─── Section 4: Customer Notes ───────────────────────────────────────────────
    const [customerNotes, setCustomerNotes] = useState("");

    // ─── Section 5: Distance Preview ─────────────────────────────────────────────
    const [distanceResult, setDistanceResult] = useState<CalculateDistanceResult | null>(null);
    const [calculatingDistance, setCalculatingDistance] = useState(false);
    const distanceDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Submission State ────────────────────────────────────────────────────────
    const [submitting, setSubmitting] = useState(false);

    // ─── Fetch default pickup on mount ───────────────────────────────────────────
    useEffect(() => {
        let isMounted = true;
        const loadPickup = async () => {
            try {
                setLoadingPickup(true);
                setPickupError(null);
                const res = await manualDeliveryApi.getDefaultPickupAddress();

                if (isMounted) {
                    if (res.success && res.data) {
                        setPickup(res.data);
                    } else {
                        setPickupError(
                            res.message || "Failed to load default store pickup address."
                        );
                    }
                }
            } catch (err: any) {
                if (isMounted) {
                    setPickupError(
                        err?.message || "Error connecting to store profile."
                    );
                }
            } finally {
                if (isMounted) setLoadingPickup(false);
            }
        };

        loadPickup();
        return () => {
            isMounted = false;
        };
    }, []);

    // ─── Debounced distance calculation when dropoff coordinates change ──────────
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
                    } else {
                        setDistanceResult(null);
                    }
                } catch (error) {
                    console.log("Distance calculation error:", error);
                    setDistanceResult(null);
                } finally {
                    setCalculatingDistance(false);
                }
            }, 500);
        },
        []
    );

    // ─── Extract Coordinates from Google Maps URLs ──────────────────────────────
    const extractCoordsFromGoogleMapsUrl = (url: string): { latitude: number; longitude: number } | null => {
        if (!url) return null;
        try {
            // Pattern 1: /@19.0760,72.8777,
            const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (atMatch) {
                const lat = parseFloat(atMatch[1]);
                const lng = parseFloat(atMatch[2]);
                if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
            }

            // Pattern 2: ?q=19.0760,72.8777 or &ll=19.0760,72.8777 or ?query=
            const qMatch = url.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (qMatch) {
                const lat = parseFloat(qMatch[1]);
                const lng = parseFloat(qMatch[2]);
                if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
            }

            // Pattern 3: destination=19.0760,72.8777
            const destMatch = url.match(/[?&]destination=(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (destMatch) {
                const lat = parseFloat(destMatch[1]);
                const lng = parseFloat(destMatch[2]);
                if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
            }
        } catch {
            // Ignore parse errors
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

    // ─── Recreate Order Prefill Handling ─────────────────────────────────────────
    useEffect(() => {
        if (!prefill) return;

        if (prefill.customer?.name) {
            setCustomerName(prefill.customer.name);
        }
        if (prefill.customer?.mobileNumber) {
            setMobileNumber(prefill.customer.mobileNumber);
        }

        if (prefill.dropoff) {
            if (prefill.dropoff.addressLine1) setAddressLine1(prefill.dropoff.addressLine1);
            if (prefill.dropoff.addressLine2) setAddressLine2(prefill.dropoff.addressLine2);
            if (prefill.dropoff.area) setArea(prefill.dropoff.area);
            if (prefill.dropoff.city) setCity(prefill.dropoff.city);
            if (prefill.dropoff.state) setStateName(prefill.dropoff.state);
            if (prefill.dropoff.postalCode) setPostalCode(prefill.dropoff.postalCode);
            if (prefill.dropoff.landmark) setLandmark(prefill.dropoff.landmark);
            if (prefill.dropoff.mapLink) {
                setMapLink(prefill.dropoff.mapLink);
            }

            if (typeof prefill.dropoff.latitude === "number" && typeof prefill.dropoff.longitude === "number") {
                setLatitude(prefill.dropoff.latitude);
                setLongitude(prefill.dropoff.longitude);
                triggerDistanceCalculation(prefill.dropoff.latitude, prefill.dropoff.longitude);
            } else if (prefill.dropoff.mapLink) {
                const coords = extractCoordsFromGoogleMapsUrl(prefill.dropoff.mapLink);
                if (coords) {
                    setLatitude(coords.latitude);
                    setLongitude(coords.longitude);
                    triggerDistanceCalculation(coords.latitude, coords.longitude);
                }
            }
        }

        if (prefill.customerNotes) {
            setCustomerNotes(prefill.customerNotes);
        }

        Toast.show({
            type: "info",
            text1: "Order Details Pre-filled",
            text2: "Customer & delivery details populated from previous order.",
        });
    }, [prefill, triggerDistanceCalculation]);

    // ─── Handle map location select ──────────────────────────────────────────────
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

    // ─── Validation ──────────────────────────────────────────────────────────────
    const isFormValid = () => {
        const nameValid = customerName.trim().length >= 2;
        const mobileValid = /^[0-9]{10,15}$/.test(mobileNumber.trim());
        const addressValid = addressLine1.trim().length >= 2 || mapLink.trim().length > 5;
        return nameValid && mobileValid && addressValid && !submitting;
    };

    // ─── Create Delivery Action ──────────────────────────────────────────────────
    const handleCreateDelivery = async () => {
        if (!customerName.trim() || customerName.trim().length < 2) {
            Alert.alert("Validation", "Please enter a valid customer name (at least 2 characters).");
            return;
        }

        const cleanedMobile = mobileNumber.replace(/\D/g, "");
        if (cleanedMobile.length < 10 || cleanedMobile.length > 15) {
            Alert.alert("Validation", "Please enter a valid 10 to 15 digit mobile number.");
            return;
        }

        const effectiveAddressLine1 =
            addressLine1.trim() || (mapLink.trim() ? "Customer Location via Google Maps" : "");

        if (!effectiveAddressLine1) {
            Alert.alert("Validation", "Please enter the delivery address line 1 or paste a Google Maps link.");
            return;
        }

        try {
            setSubmitting(true);

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
                    country: "India",
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

            const res = await manualDeliveryApi.createManualDelivery(payload);

            if (res.success && res.data) {
                Toast.show({
                    type: "success",
                    text1: "Delivery Created!",
                    text2: `Reference #${res.data.deliveryNumber} created successfully.`,
                });

                // Navigate directly to details screen
                navigation.replace("ManualDeliveryDetails", {
                    id: res.data._id,
                });
            } else {
                Toast.show({
                    type: "error",
                    text1: "Creation Failed",
                    text2: res.message || "Failed to create manual delivery.",
                });
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Submission Error",
                text2: error?.message || "Something went wrong.",
            });
        } finally {
            setSubmitting(false);
        }
    };

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
                    title={isRecreateMode ? "Recreate Delivery" : "New Manual Delivery"}
                    onBack={() => navigation.goBack()}
                />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Recreating past order banner */}
                    {isRecreateMode && (
                        <View style={styles.recreateBanner}>
                            <Ionicons name="repeat" size={18} color="#2563EB" />
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.recreateBannerTitle}>Recreating Order</Text>
                                <Text style={styles.recreateBannerSub}>
                                    Customer & delivery details pre-filled from past order. Review details below.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Header instruction */}
                    <View style={styles.introCard}>
                        <Ionicons name="call" size={20} color="#2563EB" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.introTitle}>Phone Call Delivery Order</Text>
                            <Text style={styles.introSub}>
                                Record customer details and destination. No cart items or pricing required.
                            </Text>
                        </View>
                    </View>

                    {/* ── SECTION 1: PICKUP ADDRESS ── */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionNumber, { backgroundColor: "#EFF6FF" }]}>
                                <Text style={[styles.sectionNumberText, { color: "#2563EB" }]}>1</Text>
                            </View>
                            <Text style={styles.sectionTitle}>PICKUP LOCATION</Text>
                        </View>

                        {loadingPickup ? (
                            <View style={styles.pickupLoading}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={styles.loadingText}>Fetching store address...</Text>
                            </View>
                        ) : pickupError ? (
                            <View style={styles.pickupAlert}>
                                <Ionicons name="warning-outline" size={20} color="#DC2626" />
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.pickupAlertTitle}>Store Address Incomplete</Text>
                                    <Text style={styles.pickupAlertSub}>{pickupError}</Text>
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate("VendorProfile")}
                                        style={styles.editProfileBtn}
                                    >
                                        <Text style={styles.editProfileText}>Update Store Profile →</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : pickup ? (
                            <View style={styles.pickupBox}>
                                <View style={styles.storeRow}>
                                    <View style={styles.storeIconWrap}>
                                        <Ionicons name="storefront" size={16} color="#2563EB" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.storeName}>{pickup.storeName}</Text>
                                        <Text style={styles.storeAddress}>
                                            {pickup.formattedAddress || pickup.addressLine1}
                                        </Text>
                                    </View>
                                </View>

                                {pickup.contactPhone && (
                                    <Text style={styles.storePhone}>
                                        📞 Store Contact: {pickup.contactPhone}
                                    </Text>
                                )}

                                <View style={styles.defaultPill}>
                                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                                    <Text style={styles.defaultPillText}>Default Store Address</Text>
                                </View>

                                {pickup.warnings && pickup.warnings.length > 0 && (
                                    <View style={styles.warningBox}>
                                        <Ionicons name="alert-circle-outline" size={15} color="#D97706" />
                                        <Text style={styles.warningText}>{pickup.warnings[0]}</Text>
                                    </View>
                                )}
                            </View>
                        ) : null}
                    </View>

                    {/* ── SECTION 2: CUSTOMER INFORMATION ── */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionNumber, { backgroundColor: "#ECFDF5" }]}>
                                <Text style={[styles.sectionNumberText, { color: "#059669" }]}>2</Text>
                            </View>
                            <Text style={styles.sectionTitle}>CUSTOMER INFORMATION</Text>
                        </View>

                        {/* Customer Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Customer Name <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter customer's full name"
                                placeholderTextColor="#94A3B8"
                                autoCapitalize="words"
                                value={customerName}
                                onChangeText={setCustomerName}
                            />
                        </View>

                        {/* Mobile Number */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Customer Mobile Number <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={styles.phoneInputRow}>
                                <View style={styles.countryCodeBox}>
                                    <Text style={styles.countryCodeText}>{countryCode}</Text>
                                </View>
                                <TextInput
                                    style={[styles.textInput, { flex: 1 }]}
                                    placeholder="Enter 10-digit mobile number"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="phone-pad"
                                    maxLength={15}
                                    value={mobileNumber}
                                    onChangeText={(txt) => setMobileNumber(txt.replace(/\D/g, ""))}
                                />
                            </View>
                        </View>
                    </View>

                    {/* ── SECTION 3: CUSTOMER DELIVERY LOCATION ── */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeaderBetween}>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <View style={[styles.sectionNumber, { backgroundColor: "#FDF2F8" }]}>
                                    <Text style={[styles.sectionNumberText, { color: "#DB2777" }]}>3</Text>
                                </View>
                                <Text style={styles.sectionTitle}>DELIVERY LOCATION</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.mapPickerBtn}
                                onPress={() => setMapSheetVisible(true)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="map-outline" size={14} color="#2563EB" />
                                <Text style={styles.mapPickerText}>Select on Map</Text>
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

                        {/* Address Line 1 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Flat, House No., Building, Street <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. B-204, Shree Residency, Near Main Road"
                                placeholderTextColor="#94A3B8"
                                value={addressLine1}
                                onChangeText={(t) => {
                                    setAddressLine1(t);
                                    // If user edits text manually after map pin, keep coords if plausible
                                }}
                            />
                        </View>

                        {/* Address Line 2 */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Address Line 2 (Optional)</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. Floor 2, Tower A"
                                placeholderTextColor="#94A3B8"
                                value={addressLine2}
                                onChangeText={setAddressLine2}
                            />
                        </View>

                        {/* Area & Landmark Row */}
                        <View style={styles.twoColRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Area / Colony</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Manjalpur"
                                    placeholderTextColor="#94A3B8"
                                    value={area}
                                    onChangeText={setArea}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Landmark</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Near Bank"
                                    placeholderTextColor="#94A3B8"
                                    value={landmark}
                                    onChangeText={setLandmark}
                                />
                            </View>
                        </View>

                        {/* City, State, Postal Code */}
                        <View style={styles.threeColRow}>
                            <View style={[styles.inputGroup, { flex: 1.2 }]}>
                                <Text style={styles.label}>City</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="City"
                                    placeholderTextColor="#94A3B8"
                                    value={city}
                                    onChangeText={setCity}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>State</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="State"
                                    placeholderTextColor="#94A3B8"
                                    value={stateName}
                                    onChangeText={setStateName}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>PIN Code</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="PIN"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                    maxLength={8}
                                    value={postalCode}
                                    onChangeText={setPostalCode}
                                />
                            </View>
                        </View>

                        {/* Selected GPS Coordinates Badge */}
                        {typeof latitude === "number" && typeof longitude === "number" && (
                            <View style={styles.coordsBadge}>
                                <Ionicons name="navigate-circle" size={15} color="#2563EB" />
                                <Text style={styles.coordsText}>
                                    Pin set: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* ── SECTION 4: DELIVERY NOTES ── */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionNumber, { backgroundColor: "#FEF3C7" }]}>
                                <Text style={[styles.sectionNumberText, { color: "#D97706" }]}>4</Text>
                            </View>
                            <Text style={styles.sectionTitle}>DELIVERY NOTES / ITEMS</Text>
                        </View>

                        <Text style={styles.helperText}>
                            Enter items requested on call, preferred delivery time, or driver instructions.
                        </Text>

                        <TextInput
                            style={styles.textArea}
                            placeholder="e.g. 2 packets of milk, 1 brown bread. Deliver after 6 PM. Call before reaching."
                            placeholderTextColor="#94A3B8"
                            multiline
                            numberOfLines={4}
                            maxLength={1000}
                            value={customerNotes}
                            onChangeText={setCustomerNotes}
                        />
                        <Text style={styles.charCount}>{customerNotes.length}/1000</Text>
                    </View>

                    {/* ── SECTION 5: DISTANCE PREVIEW ── */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionNumber, { backgroundColor: "#F3E8FF" }]}>
                                <Text style={[styles.sectionNumberText, { color: "#7C3AED" }]}>5</Text>
                            </View>
                            <Text style={styles.sectionTitle}>ESTIMATED DISTANCE</Text>
                        </View>

                        {calculatingDistance ? (
                            <View style={styles.distanceLoading}>
                                <ActivityIndicator size="small" color="#7C3AED" />
                                <Text style={styles.distanceLoadingText}>Calculating road distance...</Text>
                            </View>
                        ) : distanceResult && distanceKmValue !== null ? (
                            <View style={styles.distanceBox}>
                                <View style={styles.routeHeader}>
                                    <View style={styles.routePointItem}>
                                        <Ionicons name="storefront" size={14} color="#2563EB" />
                                        <Text style={styles.routePointText}>Store</Text>
                                    </View>
                                    <View style={styles.routeLine} />
                                    <View style={styles.routePointItem}>
                                        <Ionicons name="location" size={14} color="#059669" />
                                        <Text style={styles.routePointText}>Customer</Text>
                                    </View>
                                </View>

                                <View style={styles.distanceMetricRow}>
                                    <Text style={styles.distanceKmText}>
                                        {distanceKmValue.toFixed(1)} km
                                    </Text>
                                    <View style={styles.methodTag}>
                                        <Text style={styles.methodTagText}>
                                            {distanceResult.calculationMethod === "ROAD"
                                                ? "Road Driving Distance"
                                                : "Straight-Line Distance"}
                                        </Text>
                                    </View>
                                </View>

                                {distanceResult.calculationMethod === "STRAIGHT_LINE" && (
                                    <Text style={styles.straightLineNote}>
                                        Straight-line distance — actual driving distance may differ.
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <View style={styles.distanceUnavailable}>
                                <Ionicons name="compass-outline" size={20} color="#94A3B8" />
                                <Text style={styles.distanceUnavailableText}>
                                    Distance unavailable. Select a location on the map to calculate driving distance.
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* ── STICKY BOTTOM ACTION ── */}
                <View style={styles.stickyFooter}>
                    <TouchableOpacity
                        style={[
                            styles.submitBtn,
                            (!isFormValid() || submitting) && styles.submitBtnDisabled,
                        ]}
                        onPress={handleCreateDelivery}
                        disabled={!isFormValid() || submitting}
                        activeOpacity={0.8}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons
                                    name={isRecreateMode ? "repeat" : "paper-plane"}
                                    size={18}
                                    color="#FFFFFF"
                                />
                                <Text style={styles.submitBtnText}>
                                    {isRecreateMode ? "Recreate Order" : "Create Delivery"}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Location Map Bottom Sheet */}
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
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 30,
        gap: 14,
    },
    introCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        borderRadius: 14,
        padding: 14,
    },
    introTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1E40AF",
    },
    introSub: {
        fontSize: 12,
        color: "#3B82F6",
        marginTop: 2,
        lineHeight: 16,
    },
    sectionCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
        gap: 8,
    },
    sectionHeaderBetween: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
    },
    sectionNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    sectionNumberText: {
        fontSize: 13,
        fontWeight: "800",
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: "#1E293B",
        letterSpacing: 0.5,
    },
    pickupLoading: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        gap: 8,
    },
    loadingText: {
        fontSize: 13,
        color: "#64748B",
    },
    pickupAlert: {
        flexDirection: "row",
        backgroundColor: "#FEF2F2",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#FECACA",
    },
    pickupAlertTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#991B1B",
    },
    pickupAlertSub: {
        fontSize: 12,
        color: "#B91C1C",
        marginTop: 2,
    },
    editProfileBtn: {
        marginTop: 6,
    },
    editProfileText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#2563EB",
    },
    pickupBox: {
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    storeRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    storeIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 2,
    },
    storeName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0F172A",
    },
    storeAddress: {
        fontSize: 13,
        color: "#475569",
        marginTop: 2,
        lineHeight: 18,
    },
    storePhone: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
    },
    defaultPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ECFDF5",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: "flex-start",
        gap: 5,
        marginTop: 10,
    },
    defaultPillText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#059669",
    },
    warningBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFBEB",
        padding: 8,
        borderRadius: 8,
        marginTop: 8,
        gap: 6,
    },
    warningText: {
        flex: 1,
        fontSize: 11,
        color: "#B45309",
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
    phoneInputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    countryCodeBox: {
        backgroundColor: "#F1F5F9",
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === "ios" ? 12 : 10,
        justifyContent: "center",
        alignItems: "center",
    },
    countryCodeText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1E293B",
    },
    mapPickerBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 4,
    },
    mapPickerText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#2563EB",
    },
    twoColRow: {
        flexDirection: "row",
        gap: 10,
    },
    threeColRow: {
        flexDirection: "row",
        gap: 8,
    },
    coordsBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: "flex-start",
        gap: 5,
        marginTop: 2,
    },
    coordsText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#2563EB",
    },
    helperText: {
        fontSize: 12,
        color: "#64748B",
        marginBottom: 8,
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
        height: 84,
    },
    charCount: {
        fontSize: 11,
        color: "#94A3B8",
        textAlign: "right",
        marginTop: 4,
    },
    distanceLoading: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        gap: 8,
    },
    distanceLoadingText: {
        fontSize: 13,
        color: "#7C3AED",
    },
    distanceBox: {
        backgroundColor: "#F5F3FF",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "#DDD6FE",
    },
    routeHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    routePointItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    routePointText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#475569",
    },
    routeLine: {
        flex: 1,
        height: 1,
        backgroundColor: "#CBD5E1",
        marginHorizontal: 10,
    },
    distanceMetricRow: {
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
    },
    distanceKmText: {
        fontSize: 20,
        fontWeight: "800",
        color: "#6D28D9",
    },
    methodTag: {
        backgroundColor: "#EDE9FE",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    methodTagText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#6D28D9",
    },
    straightLineNote: {
        fontSize: 11,
        color: "#8B5CF6",
        marginTop: 6,
        fontStyle: "italic",
    },
    distanceUnavailable: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        padding: 12,
        borderRadius: 10,
        gap: 8,
    },
    distanceUnavailableText: {
        flex: 1,
        fontSize: 12,
        color: "#64748B",
        lineHeight: 16,
    },
    stickyFooter: {
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === "ios" ? 24 : 14,
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 8,
    },
    submitBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    submitBtnDisabled: {
        backgroundColor: "#93C5FD",
    },
    submitBtnText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    recreateBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#BFDBFE",
        marginBottom: 12,
    },
    recreateBannerTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#1E40AF",
    },
    recreateBannerSub: {
        fontSize: 12,
        color: "#2563EB",
        marginTop: 2,
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

export default ManualDeliveryCreateScreen;
