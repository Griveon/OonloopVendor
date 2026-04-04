// components/GoogleAddressPicker/GoogleAddressPicker.tsx

import React, { useRef, useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    ActivityIndicator,
    Platform,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Dimensions,
} from "react-native";
import MapView, { Region } from "react-native-maps";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import Geolocation from "@react-native-community/geolocation";
import { PermissionsAndroid } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors } from "../../constants/AppThem";
import { googleGetRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";

const GOOGLE_API_KEY = "AIzaSyD06rgmMtvcUfRMvFNvXlnn0rwpGUUzzAc";
const { height: SCREEN_H } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddressResult = {
    addressLine1: string;
    addressLine2: string;
    landmark: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude: number;
    longitude: number;
};

type Props = {
    value: AddressResult;
    onChange: (addr: AddressResult) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function emptyAddress(lat = 0, lng = 0): AddressResult {
    return {
        addressLine1: "", addressLine2: "", landmark: "",
        city: "", state: "", country: "India", postalCode: "",
        latitude: lat, longitude: lng,
    };
}

function getComp(components: any[], type: string): string {
    return components?.find((c: any) => c.types.includes(type))?.long_name ?? "";
}

function parseGeocodeResult(json: any, fallbackLat: number, fallbackLng: number): AddressResult {
    const result = json.results?.[0];
    if (!result) return emptyAddress(fallbackLat, fallbackLng);

    const comps = result.address_components ?? [];
    const streetNumber = getComp(comps, "street_number");
    const route = getComp(comps, "route");
    const premise = getComp(comps, "premise");
    const subpremise = getComp(comps, "subpremise");
    const establishment = getComp(comps, "establishment");
    const poi = getComp(comps, "point_of_interest");

    const addressLine1 =
        [subpremise, premise].filter(Boolean).join(", ") ||
        [streetNumber, route].filter(Boolean).join(", ") ||
        establishment || poi || route || "";

    const addressLine2 =
        getComp(comps, "sublocality_level_2") ||
        getComp(comps, "sublocality_level_1") ||
        getComp(comps, "sublocality") ||
        getComp(comps, "neighborhood") || "";

    const landmark =
        (premise && !addressLine1.includes(premise)) ? premise :
            (poi && !addressLine1.includes(poi)) ? poi : "";

    const city =
        getComp(comps, "locality") ||
        getComp(comps, "administrative_area_level_3") ||
        getComp(comps, "administrative_area_level_2") || "";

    return {
        addressLine1,
        addressLine2,
        landmark,
        city,
        state: getComp(comps, "administrative_area_level_1"),
        country: getComp(comps, "country") || "India",
        postalCode: getComp(comps, "postal_code"),
        latitude: result.geometry?.location?.lat ?? fallbackLat,
        longitude: result.geometry?.location?.lng ?? fallbackLng,
    };
}

async function reverseGeocode(lat: number, lng: number): Promise<AddressResult> {
    try {
        const json = await googleGetRequest(API_ENDPOINTS.GOOGLE_GEOCODE, {
            latlng: `${lat},${lng}`,
            key: GOOGLE_API_KEY,
        });

        console.log(json);

        return parseGeocodeResult(json, lat, lng);
    } catch {
        return emptyAddress(lat, lng);
    }
}

async function geocodeByPlaceId(
    placeId: string,
    lat: number,
    lng: number
): Promise<AddressResult> {
    try {
        const json = await googleGetRequest(API_ENDPOINTS.GOOGLE_GEOCODE, {
            place_id: placeId,
            key: GOOGLE_API_KEY,
        });

        return parseGeocodeResult(json, lat, lng);
    } catch {
        return emptyAddress(lat, lng);
    }
}

async function requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
}

// ─── Component ────────────────────────────────────────────────────────────────

const GoogleAddressPicker = ({ value, onChange }: Props) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [locating, setLocating] = useState(false);
    const [geocoding, setGeocoding] = useState(false);
    const [draft, setDraft] = useState<AddressResult>(emptyAddress());
    const [region, setRegion] = useState<Region>({
        latitude: 23.0225, longitude: 72.5714,
        latitudeDelta: 0.005, longitudeDelta: 0.005,
    });

    const mapRef = useRef<MapView>(null);
    const autocompleteRef = useRef<any>(null);
    const userIsDragging = useRef(false);
    const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Shared GPS fetch ──────────────────────────────────────────────────────
    const fetchCurrentLocation = useCallback(async () => {
        const ok = await requestLocationPermission();
        if (!ok) return;
        setLocating(true);
        Geolocation.getCurrentPosition(
            async (pos: any) => {
                const { latitude, longitude } = pos.coords;
                const newRegion = { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 };
                userIsDragging.current = false;
                setRegion(newRegion);
                mapRef.current?.animateToRegion(newRegion, 600);
                setLocating(false);
                setGeocoding(true);
                const addr = await reverseGeocode(latitude, longitude);
                console.log(addr);
                setDraft(addr);
                setGeocoding(false);
            },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 15000 }
        );
    }, []);

    // ── Open modal ────────────────────────────────────────────────────────────
    const openModal = () => {
        const hasCoords = value.latitude && value.latitude !== 0;
        setDraft(hasCoords ? { ...value } : emptyAddress());
        setRegion({
            latitude: hasCoords ? value.latitude : 23.0225,
            longitude: hasCoords ? value.longitude : 72.5714,
            latitudeDelta: 0.005, longitudeDelta: 0.005,
        });
        userIsDragging.current = false;
        setGeocoding(false);
        setModalVisible(true);
    };

    // Auto-trigger GPS when modal opens and no address saved yet
    useEffect(() => {
        if (modalVisible && (!value.latitude || value.latitude === 0)) {
            fetchCurrentLocation();
        }
    }, [modalVisible]);

    // ── Autocomplete ──────────────────────────────────────────────────────────
    const handlePlaceSelect = async (data: any, detail: any) => {
        const lat = detail?.geometry?.location?.lat ?? 0;
        const lng = detail?.geometry?.location?.lng ?? 0;
        const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 };
        userIsDragging.current = false;
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 600);
        setGeocoding(true);
        const addr = await geocodeByPlaceId(data.place_id, lat, lng);
        setDraft(addr);
        setGeocoding(false);
    };

    // ── Map drag ──────────────────────────────────────────────────────────────
    const handleRegionChangeComplete = useCallback(async (r: Region) => {
        setRegion(r);
        if (!userIsDragging.current) return;
        if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
        setGeocoding(true);
        geocodeTimer.current = setTimeout(async () => {
            const addr = await reverseGeocode(r.latitude, r.longitude);
            setDraft(addr);
            setGeocoding(false);
            userIsDragging.current = false;
        }, 800);
    }, []);

    const editDraft = (key: keyof AddressResult, val: string) =>
        setDraft((prev) => ({ ...prev, [key]: val }));

    const confirm = () => {
        onChange({ ...draft });
        setModalVisible(false);
    };

    const summaryText = value.addressLine1
        ? [value.addressLine1, value.city, value.state].filter(Boolean).join(", ")
        : null;

    const FIELDS: { key: keyof AddressResult; label: string; placeholder: string; keyboard?: any }[] = [
        { key: "addressLine1", label: "Address Line 1 *", placeholder: "Shop No., Building, Street" },
        { key: "addressLine2", label: "Area / Colony", placeholder: "Area, Colony (optional)" },
        { key: "landmark", label: "Landmark", placeholder: "Near temple, opposite school…" },
        { key: "city", label: "City *", placeholder: "Vadodara" },
        { key: "state", label: "State *", placeholder: "Gujarat" },
        { key: "postalCode", label: "Postal Code *", placeholder: "390001", keyboard: "number-pad" },
    ];

    return (
        <>
            {/* ─────────────────────────────────────────────────────────────────
                Trigger field
                Uses a flex row container — no absolute positioning needed.
                Left icon | text | right chevron
            ──────────────────────────────────────────────────────────────── */}
            <TouchableOpacity onPress={openModal} activeOpacity={0.8}>
                <View style={S.triggerRow}>
                    {/* Left icon */}
                    <Ionicons name="location-outline" size={20} color={colors.primary} style={S.triggerLeftIcon} />

                    {/* Placeholder / value text */}
                    <Text
                        style={[S.triggerText, !summaryText && S.triggerPlaceholder]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {summaryText ?? "Search or pick location…"}
                    </Text>

                    {/* Right chevron */}
                    <Ionicons name="chevron-forward-outline" size={18} color={colors.placeholder} />
                </View>
            </TouchableOpacity>

            {/* ── Full-screen modal ── */}
            <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: colors.scaffoldBg }}>

                    {/* Header */}
                    <View style={S.header}>
                        <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Ionicons name="close" size={24} color={colors.secondary} />
                        </TouchableOpacity>
                        <Text style={S.headerTitle}>Choose Location</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    {/* Search bar */}
                    <View style={S.searchWrapper}>
                        <GooglePlacesAutocomplete
                            ref={autocompleteRef}
                            placeholder="Search area, street, landmark…"
                            fetchDetails
                            onPress={handlePlaceSelect}
                            query={{ key: GOOGLE_API_KEY, language: "en", components: "country:in" }}
                            styles={{
                                container: { flex: 0, zIndex: 100 },
                                textInputContainer: S.textInputContainer,
                                textInput: S.searchInput,
                                listView: S.suggestionList,
                                row: S.suggestionRow,
                                description: S.suggestionText,
                                separator: { height: 0 },
                                poweredContainer: { display: "none" },
                            }}
                            renderLeftButton={() => (
                                <View style={S.searchIconWrap}>
                                    <Ionicons name="search-outline" size={18} color={colors.placeholder} />
                                </View>
                            )}
                            enablePoweredByContainer={false}
                            keyboardShouldPersistTaps="handled"
                        />
                    </View>

                    {/* GPS button */}
                    <TouchableOpacity style={S.gpsBtn} onPress={fetchCurrentLocation} disabled={locating} activeOpacity={0.8}>
                        {locating
                            ? <ActivityIndicator size="small" color={colors.primary} />
                            : <Ionicons name="navigate-outline" size={18} color={colors.primary} />
                        }
                        <Text style={S.gpsBtnText}>
                            {locating ? "Getting your location…" : "Use current location"}
                        </Text>
                    </TouchableOpacity>

                    {/* Map */}
                    <View style={S.mapContainer}>
                        <MapView
                            ref={mapRef}
                            style={StyleSheet.absoluteFillObject}
                            region={region}
                            onPanDrag={() => { userIsDragging.current = true; }}
                            onRegionChangeComplete={handleRegionChangeComplete}
                            showsUserLocation
                            showsMyLocationButton={false}
                        />
                        <View style={S.pinWrapper} pointerEvents="none">
                            <Ionicons name="location" size={44} color={colors.primary} />
                            <View style={S.pinShadow} />
                        </View>
                        {geocoding && (
                            <View style={S.geocodingBadge}>
                                <ActivityIndicator size="small" color="#fff" />
                                <Text style={S.geocodingText}>Finding address…</Text>
                            </View>
                        )}
                    </View>

                    {/* Bottom sheet */}
                    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                        <ScrollView style={S.sheet} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                            {/* Address summary */}
                            <View style={S.addressRow}>
                                <View style={S.addressIconWrap}>
                                    <Ionicons name="home-outline" size={18} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={S.addressMain} numberOfLines={2}>
                                        {geocoding ? "Finding address…" : draft.addressLine1 || "Drag the pin or search above"}
                                    </Text>
                                    {!geocoding && (draft.city || draft.state) ? (
                                        <Text style={S.addressSub} numberOfLines={1}>
                                            {[draft.city, draft.state].filter(Boolean).join(", ")}
                                        </Text>
                                    ) : null}
                                </View>
                            </View>

                            <View style={S.sheetDivider} />
                            <Text style={S.fieldsLabel}>Confirm or edit address</Text>

                            {FIELDS.map(({ key, label, placeholder, keyboard }) => (
                                <View key={key} style={S.fieldRow}>
                                    <Text style={S.fieldLabel}>{label}</Text>
                                    <TextInput
                                        style={S.fieldInput}
                                        value={String(draft[key] ?? "")}
                                        onChangeText={(t) => editDraft(key, t)}
                                        placeholder={placeholder}
                                        placeholderTextColor={colors.placeholder}
                                        autoCapitalize={keyboard === "number-pad" ? "none" : "words"}
                                        keyboardType={keyboard ?? "default"}
                                    />
                                </View>
                            ))}

                            <TouchableOpacity
                                style={[S.confirmBtn, (!draft.addressLine1 || geocoding) && S.confirmBtnDisabled]}
                                onPress={confirm}
                                disabled={!draft.addressLine1 || geocoding}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={S.confirmBtnText}>Confirm Location</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({

    // ── Trigger row — pure flex, no absolute ──
    triggerRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: "#D1D5DB",
        paddingHorizontal: 14,
        height: 50,
    },
    triggerLeftIcon: {
        marginRight: 10,
    },
    triggerText: {
        flex: 1,
        fontSize: 15,
        color: "#1F2937",
    },
    triggerPlaceholder: {
        color: "#9CA3AF",
    },

    // ── Modal header ──
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "ios" ? 56 : 16,
        paddingBottom: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1, borderBottomColor: "#D1D5DB",
    },
    headerTitle: { fontSize: 17, fontWeight: "700", color: "#1F2937" },

    // ── Search ──
    searchWrapper: {
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 12, paddingVertical: 8,
        zIndex: 50, elevation: 50,
    },
    textInputContainer: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#F5F5F5",
        borderRadius: 10, borderWidth: 1.5, borderColor: "#D1D5DB",
        paddingHorizontal: 8,
    },
    searchIconWrap: { justifyContent: "center", alignItems: "center", marginRight: 4 },
    searchInput: {
        flex: 1, height: 48,
        fontSize: 15, color: "#1F2937",
        backgroundColor: "transparent",
        borderWidth: 0, paddingHorizontal: 4,
    },
    suggestionList: {
        position: "absolute", top: 54, left: 0, right: 0,
        backgroundColor: "#FFFFFF", borderRadius: 10,
        elevation: 20, zIndex: 200,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12, shadowRadius: 10,
        maxHeight: 220,
    },
    suggestionRow: { paddingHorizontal: 14, paddingVertical: 12 },
    suggestionText: { fontSize: 14, color: "#1F2937" },

    // ── GPS ──
    gpsBtn: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#EFF6FF",
        marginHorizontal: 12, marginBottom: 8,
        paddingVertical: 11, paddingHorizontal: 14,
        borderRadius: 10, borderWidth: 1.5, borderColor: "#BFDBFE",
    },
    gpsBtnText: { marginLeft: 8, fontSize: 14, fontWeight: "600", color: colors.primary },

    // ── Map ──
    mapContainer: { height: SCREEN_H * 0.26, position: "relative" },
    pinWrapper: {
        position: "absolute",
        top: "50%", left: "50%",
        marginLeft: -22, marginTop: -44,
        alignItems: "center",
    },
    pinShadow: {
        width: 12, height: 5, borderRadius: 6,
        backgroundColor: "rgba(0,0,0,0.18)", marginTop: -2,
    },
    geocodingBadge: {
        position: "absolute", bottom: 10, alignSelf: "center",
        flexDirection: "row", alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 7,
    },
    geocodingText: { color: "#fff", fontSize: 12, marginLeft: 6, fontWeight: "500" },

    // ── Bottom sheet ──
    sheet: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingTop: 12 },
    addressRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
    addressIconWrap: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginRight: 12,
    },
    addressMain: { fontSize: 14, fontWeight: "700", color: "#1F2937", lineHeight: 20 },
    addressSub: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
    sheetDivider: { height: 1, backgroundColor: "#D1D5DB", marginVertical: 8 },
    fieldsLabel: {
        fontSize: 11, fontWeight: "700", letterSpacing: 1.1,
        color: "#9CA3AF", textTransform: "uppercase", marginBottom: 12, marginTop: 4,
    },

    fieldRow: { marginBottom: 12 },
    fieldLabel: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 4 },
    fieldInput: {
        backgroundColor: "#F5F5F5",
        borderRadius: 10, borderWidth: 1.5, borderColor: "#D1D5DB",
        paddingVertical: Platform.OS === "ios" ? 12 : 9,
        paddingHorizontal: 14, fontSize: 14, color: "#1F2937",
    },

    confirmBtn: {
        backgroundColor: colors.primary, borderRadius: 12,
        paddingVertical: 15, flexDirection: "row",
        justifyContent: "center", alignItems: "center",
        marginTop: 8, marginBottom: 32,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    confirmBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
    confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

export default GoogleAddressPicker;
