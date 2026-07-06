import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Modal,
    PermissionsAndroid,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
// import Geolocation from 'react-native-geolocation-service';
import Ionicons from "react-native-vector-icons/Ionicons";
import { placesService, Prediction } from "./PlacesService";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
const GOOGLE_MAPS_API_KEY = "AIzaSyD06rgmMtvcUfRMvFNvXlnn0rwpGUUzzAc";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GetLocation from 'react-native-get-location';

export interface AddressResult {
    addressLine1: string;
    addressLine2: string;
    landmark: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude: number;
    longitude: number;
}

interface Props {
    value: AddressResult;
    onChange: (addr: AddressResult) => void;
}

type LocationStatus = "idle" | "locating" | "success" | "error";

// ─── Permission helper ────────────────────────────────────────────────────────

async function safeRequestPermission(): Promise<"granted" | "denied" | "blocked"> {
    if (Platform.OS === "ios") {
        // Community geolocation triggers the iOS permission dialog automatically
        // on the first getCurrentPosition call — no manual step needed here.
        return "granted";
    }

    try {
        // ✅ Always call request() directly — skipping the check() pre-flight.
        // On Android, check() returns false even before the dialog has ever been
        // shown, so pre-checking adds no value and can mask the actual result.
        // request() handles all three outcomes: GRANTED, DENIED, NEVER_ASK_AGAIN.
        const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: "Location Permission Required",
                message:
                    "This app needs access to your location to automatically fill in your store address.",
                buttonPositive: "Allow",
                buttonNegative: "Deny",
            }
        );

        if (result === PermissionsAndroid.RESULTS.GRANTED) return "granted";
        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return "blocked";
        return "denied"; // DENIED — user tapped Deny but can be asked again
    } catch {
        return "denied";
    }
}

// ─── GPS position ─────────────────────────────────────────────────────────────


async function getGPSPosition(): Promise<{ lat: number; lng: number } | null> {
    try {
        const location = await GetLocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
        });
        console.log(location);
        return {
            lat: location.latitude,
            lng: location.longitude,
        };
    } catch (error: any) {
        console.warn(
            'GPS error:',
            error?.code,
            error?.message
        );

        return null;
    }
}
// ─── Reverse geocode ──────────────────────────────────────────────────────────

async function reverseGeocode(lat: number, lng: number): Promise<Partial<AddressResult> | null> {
    try {
        const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const json = await res.json();
        if (json.status !== "OK" || !json.results?.length) return null;

        const components: any[] = json.results[0].address_components || [];
        let streetNumber = "", route = "", sublocality = "";
        let city = "", state = "", postalCode = "", country = "";

        for (const c of components) {
            const t: string[] = c.types || [];
            if (t.includes("street_number")) streetNumber = c.long_name;
            if (t.includes("route")) route = c.long_name;
            if (t.includes("sublocality_level_1") || t.includes("sublocality")) sublocality = c.long_name;
            if (t.includes("locality")) city = c.long_name;
            if (t.includes("administrative_area_level_1")) state = c.long_name;
            if (t.includes("postal_code")) postalCode = c.long_name;
            if (t.includes("country")) country = c.long_name;
        }

        return {
            addressLine1: [streetNumber, route].filter(Boolean).join(" "),
            addressLine2: sublocality,
            landmark: "",
            city,
            state,
            postalCode,
            country: country || "India",
            latitude: lat,
            longitude: lng,
        };
    } catch {
        return null;
    }
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────

interface SheetProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (addr: AddressResult) => void;
}

const LocationBottomSheet: React.FC<SheetProps> = ({ visible, onClose, onSelect }) => {
    const insets = useSafeAreaInsets();
    const isInitialRegionSet = useRef(true);
    const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

    const backdropAnim = useRef(new Animated.Value(0)).current;
    const [region, setRegion] = useState({
        latitude: 13.0827,  
        longitude: 80.2707,
        latitudeDelta: 0.5,   
        longitudeDelta: 0.5,
    });
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Prediction[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
    const [detectedAddr, setDetectedAddr] = useState<AddressResult | null>(null);

    // ✅ Track whether permission is permanently blocked so the retry
    // button shows "Open Settings" instead of re-triggering a dead request.
    const [permBlocked, setPermBlocked] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(false);
    const isDetectingRef = useRef(false);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // ── Animate sheet open / close ────────────────────────────────────────
    useEffect(() => {
        if (visible) {
            setQuery("");
            setSuggestions([]);
            setLocationStatus("idle");
            setDetectedAddr(null);
            setPermBlocked(false);          // ✅ reset blocked state on every open
            isDetectingRef.current = false;

            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 22,
                    stiffness: 220,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 240,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: SHEET_HEIGHT,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    // ── Auto-trigger on open (after animation settles) ────────────────────
    useEffect(() => {
        if (!visible) return;
        detectLocation(); // immediate
    }, [visible]);

    // ── Detect location ────────────────────────────────────────────────────
    const detectLocation = useCallback(async () => {
        if (isDetectingRef.current) return;
        isDetectingRef.current = true;

        if (isMountedRef.current) {
            setLocationStatus("locating");
            setDetectedAddr(null);
            setPermBlocked(false);
        }

        // ── 1. Permission ──────────────────────────────────────────────────
        let perm: "granted" | "denied" | "blocked";
        try {
            perm = await safeRequestPermission();
        } catch {
            perm = "denied";
        }

        if (!isMountedRef.current) { isDetectingRef.current = false; return; }

        if (perm === "blocked") {
            // ✅ Mark as blocked so the UI can show "Open Settings" on the card.
            // Show the Alert after a short delay so the permission dialog has
            // fully dismissed before Alert tries to grab the window focus.
            setPermBlocked(true);
            setLocationStatus("error");
            isDetectingRef.current = false;
            setTimeout(() => {
                if (!isMountedRef.current) return;
                Alert.alert(
                    "Location Permission Blocked",
                    "Location access has been permanently denied. Please open Settings and enable it for this app.",
                    [
                        {
                            text: "Not Now",
                            style: "cancel",
                        },
                        {
                            text: "Open Settings",
                            onPress: () => Linking.openSettings(),
                        },
                    ]
                );
            }, 350);
            return;
        }

        if (perm === "denied") {
            // ✅ User tapped Deny on the dialog this session.
            // Show a brief explanation and let them retry (they can still be asked again).
            if (isMountedRef.current) {
                setLocationStatus("error");
            }
            isDetectingRef.current = false;
            setTimeout(() => {
                if (!isMountedRef.current) return;
                Alert.alert(
                    "Location Permission Denied",
                    "We need location permission to detect your address automatically. Tap retry to try again.",
                    [{ text: "OK", style: "cancel" }]
                );
            }, 350);
            return;
        }

        // ── 2. GPS ─────────────────────────────────────────────────────────
        const pos = await getGPSPosition();
        if (!isMountedRef.current) { isDetectingRef.current = false; return; }

        if (!pos) {
            setLocationStatus("error");
            isDetectingRef.current = false;
            setTimeout(() => {
                if (!isMountedRef.current) return;
                Alert.alert(
                    "GPS Unavailable",
                    "Could not get your position. Make sure GPS / Location is turned on and try again.",
                    [{ text: "OK", style: "cancel" }]
                );
            }, 350);
            return;
        }

        // ── 3. Reverse geocode ─────────────────────────────────────────────
        const addr = await reverseGeocode(pos.lat, pos.lng);
        if (!isMountedRef.current) { isDetectingRef.current = false; return; }

        if (!addr) {
            setLocationStatus("error");
            isDetectingRef.current = false;
            return;
        }

        if (addr) {
            const newRegion = {
                latitude: pos.lat,
                longitude: pos.lng,
                latitudeDelta: 0.015,
                longitudeDelta: 0.0121,
            };

            setRegion(newRegion);
        }

        const result: AddressResult = {
            addressLine1: addr.addressLine1 || "",
            addressLine2: addr.addressLine2 || "",
            landmark: "",
            city: addr.city || "",
            state: addr.state || "",
            postalCode: addr.postalCode || "",
            country: addr.country || "India",
            latitude: pos.lat,
            longitude: pos.lng,
        };

        setDetectedAddr(result);
        setLocationStatus("success");
        isDetectingRef.current = false;
    }, []);

    const confirmLocation = useCallback(() => {
        if (detectedAddr) onSelect(detectedAddr);
    }, [detectedAddr, onSelect]);

    // ── What happens when the GPS card is tapped ──────────────────────────
    // ✅ Three distinct actions depending on state:
    //    success  → confirm and close
    //    blocked  → jump straight to Settings (no point re-requesting)
    //    error/idle → retry detectLocation
    const handleCardPress = useCallback(() => {
        if (locationStatus === "success") {
            confirmLocation();
        } else if (permBlocked) {
            Linking.openSettings();
        } else {
            detectLocation();
        }
    }, [locationStatus, permBlocked, confirmLocation, detectLocation]);

    // ── Search / autocomplete ─────────────────────────────────────────────
    const handleSearch = useCallback((text: string) => {
        setQuery(text);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (text.trim().length < 3) { setSuggestions([]); return; }

        debounceRef.current = setTimeout(async () => {
            if (!isMountedRef.current) return;
            setIsFetching(true);
            const result = await placesService.fetchAddressPredictions(text);
            if (!isMountedRef.current) return;
            setIsFetching(false);
            if (result.success) setSuggestions(result.data);
        }, 400);
    }, []);

    const handleSelect = useCallback(async (prediction: Prediction) => {
        Keyboard.dismiss();
        setQuery(prediction.description);
        setSuggestions([]);
        setIsFetching(true);

        const details = await placesService.fetchPlaceDetailsById(prediction.place_id);
        if (!isMountedRef.current) return;
        setIsFetching(false);

        if (details) {
            const newRegion = {
                latitude: details.lat,
                longitude: details.lng,
                latitudeDelta: 0.015,
                longitudeDelta: 0.0121,
            };

            setRegion(newRegion);

            onSelect({
                addressLine1: details.addressLine1 || prediction.description,
                addressLine2: details.addressLine2 || "",
                landmark: "",
                city: details.city,
                state: details.state,
                postalCode: details.postalCode,
                country: details.country || "India",
                latitude: details.lat,
                longitude: details.lng,
            });
        }
    }, [onSelect]);

    const handleClose = useCallback(() => {
        Keyboard.dismiss();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onClose();
    }, [onClose]);

    // ── Card label helpers ────────────────────────────────────────────────
    const cardTitle = () => {
        if (locationStatus === "locating") return "Detecting your location…";
        if (locationStatus === "success") return "Location found! Tap to confirm";
        if (locationStatus === "error" && permBlocked) return "Permission blocked — tap to open Settings";
        if (locationStatus === "error") return "Couldn't detect. Tap to retry";
        return "Use My Current Location";
    };

    const cardSubtitle = () => {
        if (locationStatus === "idle") return "Accurate to ~10 meters using GPS";
        if (locationStatus === "success" && detectedAddr) {
            return [detectedAddr.addressLine1, detectedAddr.city, detectedAddr.state]
                .filter(Boolean).join(", ");
        }
        if (locationStatus === "error" && permBlocked) return "Location permission was permanently denied";
        if (locationStatus === "error") return "Check GPS is on, then tap to retry";
        return null;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
            hardwareAccelerated
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <Animated.View style={[ss.backdrop, { opacity: backdropAnim }]} />
            </TouchableWithoutFeedback>

            <Animated.View style={[ss.sheet, { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom, }]}>
                <View style={ss.handle} />

                <View style={ss.header}>
                    <Text style={ss.headerTitle}>Set Store Location</Text>
                    <TouchableOpacity
                        onPress={handleClose}
                        style={ss.closeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={20} color="#64748B" />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={ss.searchWrap}>
                        <View style={ss.searchBar}>
                            <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                            <TextInput
                                style={ss.searchInput}
                                placeholder="Search area, street, landmark…"
                                placeholderTextColor="#94A3B8"
                                value={query}
                                onChangeText={handleSearch}
                                autoCorrect={false}
                                returnKeyType="search"
                            />
                            {isFetching && (
                                <ActivityIndicator size="small" color="#94A3B8" style={{ marginRight: 6 }} />
                            )}
                            {query.length > 0 && !isFetching && (
                                <TouchableOpacity
                                    onPress={() => { setQuery(""); setSuggestions([]); }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {suggestions.length > 0 ? (
                        <FlatList
                            data={suggestions}
                            keyExtractor={(item) => item.place_id}
                            keyboardShouldPersistTaps="handled"
                            ItemSeparatorComponent={() => <View style={ss.sep} />}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={ss.row}
                                    onPress={() => handleSelect(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={ss.rowIcon}>
                                        <Ionicons name="location-outline" size={16} color="#2563EB" />
                                    </View>
                                    <Text style={ss.rowText} numberOfLines={2}>
                                        {item.description}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    ) : (
                        <View style={{ flex: 1 }}>

                            {/* 🗺️ MAP */}
                            <MapView
                                provider={PROVIDER_GOOGLE}
                                style={{ flex: 1 }}
                                region={region}
                                showsUserLocation
                                onRegionChange={() => {
                                    if (!isInitialRegionSet.current) {
                                        setLocationStatus("locating");
                                    }
                                }}
                                onRegionChangeComplete={(reg) => {
                                    // ❌ Skip first auto-trigger
                                    if (isInitialRegionSet.current) {
                                        isInitialRegionSet.current = false;
                                        return;
                                    }

                                    setRegion(reg);

                                    reverseGeocode(reg.latitude, reg.longitude).then((addr) => {
                                        if (!addr) return;

                                        const result: AddressResult = {
                                            addressLine1: addr.addressLine1 || "",
                                            addressLine2: addr.addressLine2 || "",
                                            landmark: "",
                                            city: addr.city || "",
                                            state: addr.state || "",
                                            postalCode: addr.postalCode || "",
                                            country: addr.country || "India",
                                            latitude: reg.latitude,
                                            longitude: reg.longitude,
                                        };

                                        setDetectedAddr(result);
                                        setLocationStatus("success");
                                    });
                                }}
                            />

                            {/* 📍 CENTER PIN */}
                            <View style={mapStyles.markerFixed}>
                                <Ionicons name="location-sharp" size={36} color="#EF4444" />
                            </View>

                            {/* 📦 BOTTOM CONFIRM CARD */}
                            <View style={mapStyles.bottomCard}>
                                <Text style={mapStyles.addressText} numberOfLines={2}>
                                    {detectedAddr
                                        ? `${detectedAddr.addressLine1}, ${detectedAddr.city}`
                                        : "Move map to select location"}
                                </Text>

                                <TouchableOpacity
                                    style={mapStyles.confirmBtn}
                                    onPress={confirmLocation}
                                    disabled={!detectedAddr}
                                >
                                    <Text style={{ color: "#fff", fontWeight: "600" }}>
                                        Confirm Location
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </Animated.View>
        </Modal>
    );
};

// ─── Exported Picker ──────────────────────────────────────────────────────────

const GoogleAddressPicker: React.FC<Props> = ({ value, onChange }) => {
    const [sheetOpen, setSheetOpen] = useState(false);
    const display = [value.addressLine1, value.city, value.state].filter(Boolean).join(", ");

    return (
        <>
            <TouchableOpacity
                style={[ts.trigger, value.city ? ts.filled : null]}
                onPress={() => setSheetOpen(true)}
                activeOpacity={0.8}
            >
                <View style={ts.left}>
                    <Ionicons
                        name={value.city ? "location" : "locate-outline"}
                        size={20}
                        color="#2563EB"
                        style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                        {value.city ? (
                            <>
                                <Text style={ts.label}>Store Location</Text>
                                <Text style={ts.filledText} numberOfLines={1}>{display}</Text>
                            </>
                        ) : (
                            <Text style={ts.placeholder}>Tap to set store location</Text>
                        )}
                    </View>
                </View>
                <Ionicons
                    name={value.city ? "pencil-outline" : "chevron-forward"}
                    size={16}
                    color="#2563EB"
                />
            </TouchableOpacity>

            <LocationBottomSheet
                visible={sheetOpen}
                onClose={() => setSheetOpen(false)}
                onSelect={(addr) => {
                    onChange(addr);
                    setSheetOpen(false);
                }}
            />
        </>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const ts = StyleSheet.create({
    trigger: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        borderWidth: 1.5, borderColor: "#BFDBFE", borderRadius: 12,
        backgroundColor: "#EFF6FF", paddingVertical: 13, paddingHorizontal: 14,
    },
    filled: { borderColor: "#2563EB" },
    left: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
    placeholder: { fontSize: 14, color: "#2563EB", fontWeight: "600" },
    label: { fontSize: 11, color: "#2563EB", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    filledText: { fontSize: 13, color: "#1E40AF", fontWeight: "500" },
});

const ss = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.52)" },
    sheet: {
        position: "absolute", bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT,
        backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24,
        shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15, shadowRadius: 20, elevation: 24,
    },
    handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", marginTop: 12, marginBottom: 4 },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
    },
    headerTitle: { fontSize: 17, fontWeight: "700", color: "#0F172A" },
    closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
    searchWrap: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
    searchBar: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0",
        borderRadius: 12, paddingVertical: Platform.OS === "ios" ? 12 : 6, paddingHorizontal: 12,
    },
    searchInput: { flex: 1, fontSize: 14, color: "#1E293B" },
    sep: { height: 1, backgroundColor: "#F8FAFC", marginLeft: 58 },
    row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
    rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
    rowText: { flex: 1, fontSize: 14, color: "#1E293B", lineHeight: 20 },
    body: { flex: 1, padding: 16 },
    gpsCard: {
        flexDirection: "row", alignItems: "center", gap: 12,
        padding: 16, borderRadius: 14, borderWidth: 1.5,
        borderColor: "#BFDBFE", backgroundColor: "#EFF6FF",
    },
    gpsCardSuccess: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
    gpsCardError: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
    gpsIconBox: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center" },
    gpsIconBoxSuccess: { backgroundColor: "#DCFCE7" },
    gpsIconBoxError: { backgroundColor: "#FEE2E2" },
    gpsTitle: { fontSize: 14, fontWeight: "700", color: "#1D4ED8", marginBottom: 3 },
    gpsSub: { fontSize: 12, color: "#64748B", lineHeight: 17 },
    divRow: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
    divLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
    divText: { marginHorizontal: 12, fontSize: 12, color: "#94A3B8", fontWeight: "500" },
    hint: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 10, padding: 14 },
    hintText: { flex: 1, fontSize: 13, color: "#94A3B8", lineHeight: 19 },

});

const mapStyles = StyleSheet.create({
    markerFixed: {
        position: "absolute",
        top: "50%",
        left: "50%",
        marginLeft: -18,
        marginTop: -36,
    },
    bottomCard: {
        position: "absolute",
        bottom: 20,
        left: 16,
        right: 16,
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 14,
        elevation: 6,
    },
    addressText: {
        fontSize: 14,
        color: "#1E293B",
        fontWeight: "500",
    },
    confirmBtn: {
        marginTop: 12,
        backgroundColor: "#2563EB",
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
    },
});

export default GoogleAddressPicker;