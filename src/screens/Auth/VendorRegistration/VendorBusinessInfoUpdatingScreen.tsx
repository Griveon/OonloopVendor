// screens/VendorBusinessInfoUpdatingScreen.tsx
import React, { useState } from "react";
import {
    View,
    ScrollView,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import { postRequest } from "../../../constants/ApiClient";
import { API_ENDPOINTS } from "../../../constants/ApiEndpoints";
import { colors } from "../../../constants/AppThem";
import { inputloginStyles } from "../Login/LoginScreenStyle";
import AppBar from "../../../components/utils/AppBar";
import { localStyles } from "./VendorRegistrationStyle";
import FloatingInput from "../../../components/inputs/FloatingInput";
import TimePickerField from "../../../components/TimePicker/TimePicker";
import GoogleAddressPicker, { AddressResult } from "../../../components/LocationPicker/LocationPicker";
import { getUserData } from "../../../components/AsyncStorage/AsyncStorage";

// ─── Types ───────────────────────────────────────────────────────────────────

type WorkingHours = { openingTime: string; closingTime: string };
type StoreAddress = {
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
type FormState = {
    storeName: string;
    businessType: string;
    gstNumber: string;
    panNumber: string;
    workingHours: WorkingHours;
    workingDays: string[];
    storeLocationAddress: StoreAddress;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const WORKING_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const BUSINESS_TYPES = [
    { label: "Proprietorship", value: "proprietorship" },
    { label: "Partnership", value: "partnership" },
    { label: "Private Ltd.", value: "private_ltd" },
    { label: "LLP", value: "llp" },
    { label: "Public Ltd.", value: "public_ltd" },
];

// ─── Step Indicator ──────────────────────────────────────────────────────────

const StepIndicator = ({ step, total }: { step: number; total: number }) => (
    <View style={stepStyles.row}>
        {Array.from({ length: total }).map((_, i) => {
            const active = i + 1 === step;
            const done = i + 1 < step;
            return (
                <React.Fragment key={i}>
                    <View style={[stepStyles.circle, active && stepStyles.circleActive, done && stepStyles.circleDone]}>
                        {done ? (
                            <Ionicons name="checkmark" size={12} color="#fff" />
                        ) : (
                            <Text style={[stepStyles.num, active && stepStyles.numActive]}>{i + 1}</Text>
                        )}
                    </View>
                    {i < total - 1 && (
                        <View style={[stepStyles.line, done && stepStyles.lineDone]} />
                    )}
                </React.Fragment>
            );
        })}
    </View>
);

const stepStyles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8 },
    circle: {
        width: 28, height: 28, borderRadius: 14,
        borderWidth: 2, borderColor: colors.formBorder,
        backgroundColor: colors.formBg,
        justifyContent: "center", alignItems: "center",
    },
    circleActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    circleDone: { borderColor: colors.primary, backgroundColor: colors.primary },
    num: { fontSize: 12, fontWeight: "700", color: colors.placeholder },
    numActive: { color: "#fff" },
    line: { flex: 1, height: 2, backgroundColor: colors.formBorder, marginHorizontal: 4 },
    lineDone: { backgroundColor: colors.primary },
});

// ─── Business Type Selector ───────────────────────────────────────────────────

const BusinessTypeSelector = ({
    selected,
    onSelect,
}: {
    selected: string;
    onSelect: (val: string) => void;
}) => (
    <View style={inputloginStyles.wrapper}>
        <Text style={inputloginStyles.label}>Business Type *</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {BUSINESS_TYPES.map((bt) => {
                const active = selected === bt.value;
                return (
                    <TouchableOpacity
                        key={bt.value}
                        onPress={() => onSelect(bt.value)}
                        style={[bizStyles.chip, active && bizStyles.chipActive]}
                        activeOpacity={0.7}
                    >
                        <Text style={[bizStyles.chipText, active && bizStyles.chipTextActive]}>
                            {bt.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    </View>
);

const bizStyles = StyleSheet.create({
    chip: {
        paddingVertical: 8, paddingHorizontal: 14,
        borderRadius: 20, borderWidth: 1.5,
        borderColor: colors.formBorder,
        backgroundColor: colors.formBg,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: "#EFF6FF" },
    chipText: { fontSize: 13, color: colors.placeholder, fontWeight: "500" },
    chipTextActive: { color: colors.primary },
});

// ─── Day Picker ───────────────────────────────────────────────────────────────

const DayPicker = ({
    selected,
    onToggle,
}: {
    selected: string[];
    onToggle: (day: string) => void;
}) => (
    <View style={inputloginStyles.wrapper}>
        <Text style={inputloginStyles.label}>Working Days *</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {WORKING_DAYS.map((day) => {
                const active = selected.includes(day);
                return (
                    <TouchableOpacity
                        key={day}
                        onPress={() => onToggle(day)}
                        style={[dayStyles.chip, active && dayStyles.chipActive]}
                        activeOpacity={0.7}
                    >
                        <Text style={[dayStyles.chipText, active && dayStyles.chipTextActive]}>
                            {day.slice(0, 3).toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    </View>
);

const dayStyles = StyleSheet.create({
    chip: {
        width: 42, height: 42, borderRadius: 21,
        borderWidth: 1.5, borderColor: colors.formBorder,
        backgroundColor: colors.formBg,
        justifyContent: "center", alignItems: "center",
    },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    chipText: { fontSize: 12, fontWeight: "700", color: colors.placeholder },
    chipTextActive: { color: "#fff" },
});

// ─── Time Input Row ───────────────────────────────────────────────────────────

const TimeInputRow = ({
    opening,
    closing,
    onChangeOpening,
    onChangeClosing,
}: {
    opening: string;
    closing: string;
    onChangeOpening: (t: string) => void;
    onChangeClosing: (t: string) => void;
}) => (
    <View style={inputloginStyles.wrapper}>
        <Text style={inputloginStyles.label}>Working Hours *</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
                <FloatingInput
                    placeholder="09:00"
                    value={opening}
                    onChangeText={onChangeOpening}
                    keyboardType="numeric"
                    rightIcon={<Ionicons name="time-outline" size={18} color={colors.placeholder} />}
                />
            </View>
            <View style={timeStyles.separator}>
                <Text style={timeStyles.dash}>—</Text>
            </View>
            <View style={{ flex: 1 }}>
                <FloatingInput
                    placeholder="21:00"
                    value={closing}
                    onChangeText={onChangeClosing}
                    keyboardType="numeric"
                    rightIcon={<Ionicons name="time-outline" size={18} color={colors.placeholder} />}
                />
            </View>
        </View>
    </View>
);

const timeStyles = StyleSheet.create({
    separator: { justifyContent: "center", alignItems: "center", paddingTop: 4 },
    dash: { fontSize: 18, color: colors.placeholder, fontWeight: "300" },
});

// ─── Page Header ──────────────────────────────────────────────────────────────

const PageHeader = ({ step }: { step: number }) => {
    const copy = step === 1
        ? {
            eyebrow: "Step 1 of 2 · Business Details",
            title: "Tell us about\nyour business",
            subtitle: "We'd love to know a few details about your store so we can set everything up perfectly for you.",
        }
        : {
            eyebrow: "Step 2 of 2 · Store Location",
            title: "Where is your\nstore located?",
            subtitle: "Help your customers find you by adding your store's address. This will be visible on your public profile.",
        };

    return (
        <View style={headerStyles.container}>
            <View style={headerStyles.badge}>
                <Ionicons
                    name={step === 1 ? "storefront-outline" : "location-outline"}
                    size={14}
                    color={colors.primary}
                    style={{ marginRight: 5 }}
                />
                <Text style={headerStyles.eyebrow}>{copy.eyebrow}</Text>
            </View>
            <Text style={headerStyles.title}>{copy.title}</Text>
            <Text style={headerStyles.subtitle}>{copy.subtitle}</Text>
            <StepIndicator step={step} total={2} />
        </View>
    );
};

const headerStyles = StyleSheet.create({
    container: {
        paddingHorizontal: 28,
        paddingTop: 24,
        paddingBottom: 20,
        backgroundColor: colors.scaffoldBg,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        marginBottom: 12,
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.primary,
        letterSpacing: 0.3,
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
        color: colors.secondary,
        lineHeight: 36,
        marginBottom: 10,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: colors.placeholder,
        lineHeight: 21,
        marginBottom: 20,
        fontWeight: "400",
    },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const VendorBusinessInfoUpdatingScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState<FormState>({
        storeName: "",
        businessType: "",
        gstNumber: "",
        panNumber: "",
        workingHours: { openingTime: "", closingTime: "" },
        workingDays: [],
        storeLocationAddress: {
            addressLine1: "",
            addressLine2: "",
            landmark: "",
            city: "",
            state: "",
            country: "India",
            postalCode: "",
            latitude: 0,
            longitude: 0,
        },
    });

    const handleChange = (field: string, value: any, parent?: keyof FormState) => {
        if (parent) {
            setForm((prev) => ({
                ...prev,
                [parent]: { ...(prev[parent] as object), [field]: value },
            }));
        } else {
            setForm((prev) => ({ ...prev, [field]: value }));
        }
    };

    const toggleDay = (day: string) =>
        setForm((prev) => ({
            ...prev,
            workingDays: prev.workingDays.includes(day)
                ? prev.workingDays.filter((d) => d !== day)
                : [...prev.workingDays, day],
        }));

    const validateStep = () => {
        if (step === 1) {
            const { storeName, businessType, workingHours, workingDays, panNumber } = form;
            return !!(storeName && businessType && workingHours.openingTime && workingHours.closingTime && workingDays.length && panNumber);
        }
        const addr = form.storeLocationAddress;
        return !!(addr.addressLine1 && addr.city && addr.state && addr.postalCode);
    };

    const handleNext = () => {
        if (!validateStep()) {
            Toast.show({ type: "error", text1: "Validation Error", text2: "Please fill all required fields." });
            return;
        }
        setStep(2);
    };

    const handleAddressChange = (addr: AddressResult) => {
        setForm((prev) => ({ ...prev, storeLocationAddress: addr }));
    };

    const handleSubmit = async () => {
        if (!validateStep()) {
            Toast.show({
                type: "error",
                text1: "Validation Error",
                text2: "Please fill all required fields.",
            });
            return;
        }

        const addr = form.storeLocationAddress;
        const { user, token } = await getUserData();

        const payload = {
            user: user?.user?._id,
            storeName: form.storeName,
            businessType: form.businessType,
            gstNumber: form.gstNumber,
            panNumber: form.panNumber,
            workingHours: form.workingHours,
            workingDays: form.workingDays,

            storeLocationAddress: {
                addressLine1: addr.addressLine1,
                addressLine2: addr.addressLine2,
                landmark: addr.landmark,
                city: addr.city,
                state: addr.state,
                country: addr.country,
                postalCode: addr.postalCode,
                location: {
                    type: "Point",
                    coordinates: [
                        addr.longitude, // ✅ MUST be longitude first
                        addr.latitude,  // ✅ then latitude
                    ],
                },
            },

        };

        console.log("FINAL PAYLOAD:", payload);

        setLoading(true);
        try {
            const res: any = await postRequest(
                API_ENDPOINTS.VENDORPROFILECREATE,
                payload
            );

            setLoading(false);

            if (res?.success) {
                // Toast.show({
                //     type: "success",
                //     text1: "Success",
                //     text2: "Business info saved!",
                // });
                // navigation.navigate("VendorDashboardScreen");
            }
        } catch {
            setLoading(false);
            // Toast.show({
            //     type: "error",
            //     text1: "Error",
            //     text2: "Something went wrong. Please try again.",
            // });
        }
    };
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.scaffoldBg }} edges={["bottom"]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <AppBar
                    title="Vendor Registration"
                    onBack={step === 1 ? () => () => setStep(0) : () => setStep(1)}
                />

                <ScrollView
                    style={{ flex: 1, backgroundColor: colors.scaffoldBg }}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    automaticallyAdjustKeyboardInsets={true}
                >

                    <PageHeader step={step} />

                    <View style={localStyles.card}>

                        {step === 1 && (
                            <>
                                <Text style={localStyles.sectionLabel}>Store Info</Text>

                                <FloatingInput
                                    label="Store Name *"
                                    placeholder="e.g. Krishna Traders"
                                    value={form.storeName}
                                    onChangeText={(t: string) => handleChange("storeName", t)}
                                    autoCapitalize="words"
                                />

                                <BusinessTypeSelector
                                    selected={form.businessType}
                                    onSelect={(val) => handleChange("businessType", val)}
                                />

                                <View style={localStyles.divider} />
                                <Text style={localStyles.sectionLabel}>Schedule</Text>

                                {/* Working Hours */}
                                <View style={inputloginStyles.wrapper}>
                                    <Text style={inputloginStyles.label}>Working Hours *</Text>
                                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>

                                        <View style={{ flex: 1 }}>
                                            <Text style={[inputloginStyles.label, { fontSize: 11, color: colors.placeholder }]}>
                                                Opens
                                            </Text>
                                            <TimePickerField
                                                value={form.workingHours.openingTime}
                                                onConfirm={(t) => handleChange("openingTime", t, "workingHours")}
                                                title="Opening Time"
                                                placeholder="09:00 AM"
                                            />
                                        </View>

                                        <View style={{ justifyContent: "flex-end", paddingBottom: 14 }}>
                                            <Text style={{ fontSize: 20, color: colors.placeholder, fontWeight: "300" }}>—</Text>
                                        </View>

                                        <View style={{ flex: 1 }}>
                                            <Text style={[inputloginStyles.label, { fontSize: 11, color: colors.placeholder }]}>
                                                Closes
                                            </Text>
                                            <TimePickerField
                                                value={form.workingHours.closingTime}
                                                onConfirm={(t) => handleChange("closingTime", t, "workingHours")}
                                                title="Closing Time"
                                                placeholder="09:00 PM"
                                            />
                                        </View>

                                    </View>
                                </View>
                                <DayPicker selected={form.workingDays} onToggle={toggleDay} />

                                <View style={localStyles.divider} />
                                <Text style={localStyles.sectionLabel}>Tax & Compliance</Text>

                                <FloatingInput
                                    label="GST Number"
                                    placeholder="22AAAAA0000A1Z5"
                                    value={form.gstNumber}
                                    onChangeText={(t: string) => handleChange("gstNumber", t.toUpperCase())}
                                    autoCapitalize="characters"
                                />
                                <FloatingInput
                                    label="PAN Number *"
                                    placeholder="ABCDE1234F"
                                    value={form.panNumber}
                                    onChangeText={(t: string) => handleChange("panNumber", t.toUpperCase())}
                                    autoCapitalize="characters"
                                />

                                <TouchableOpacity
                                    style={[screenStyles.primaryBtn, !validateStep() && screenStyles.primaryBtnDisabled]}
                                    onPress={handleNext}
                                    activeOpacity={0.85}
                                >
                                    <Text style={screenStyles.primaryBtnText}>Continue to Address</Text>
                                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
                                </TouchableOpacity>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <Text style={localStyles.sectionLabel}>Store Address</Text>

                                <View style={inputloginStyles.wrapper}>
                                    <Text style={inputloginStyles.label}>Search or pick on map *</Text>
                                    <GoogleAddressPicker
                                        value={form.storeLocationAddress}
                                        onChange={handleAddressChange}
                                    />
                                </View>

                                <View style={localStyles.divider} />
                                <Text style={localStyles.sectionLabel}>Confirm Details</Text>

                                <FloatingInput
                                    label="Address Line 1 *"
                                    placeholder="Shop No., Building, Street"
                                    value={form.storeLocationAddress.addressLine1}
                                    onChangeText={(t: string) => handleChange("addressLine1", t, "storeLocationAddress")}
                                    autoCapitalize="words"
                                />
                                <FloatingInput
                                    label="Address Line 2"
                                    placeholder="Area, Colony (optional)"
                                    value={form.storeLocationAddress.addressLine2}
                                    onChangeText={(t: string) => handleChange("addressLine2", t, "storeLocationAddress")}
                                    autoCapitalize="words"
                                />
                                <FloatingInput
                                    label="Landmark"
                                    placeholder="Near temple, opposite school…"
                                    value={form.storeLocationAddress.landmark}
                                    onChangeText={(t: string) => handleChange("landmark", t, "storeLocationAddress")}
                                    autoCapitalize="words"
                                />

                                <View style={{ flexDirection: "row", gap: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <FloatingInput
                                            label="City *"
                                            placeholder="Vadodara"
                                            value={form.storeLocationAddress.city}
                                            onChangeText={(t: string) => handleChange("city", t, "storeLocationAddress")}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <FloatingInput
                                            label="State *"
                                            placeholder="Gujarat"
                                            value={form.storeLocationAddress.state}
                                            onChangeText={(t: string) => handleChange("state", t, "storeLocationAddress")}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                </View>

                                <View style={{ flexDirection: "row", gap: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <FloatingInput
                                            label="Postal Code *"
                                            placeholder="390001"
                                            value={form.storeLocationAddress.postalCode}
                                            onChangeText={(t: string) => handleChange("postalCode", t, "storeLocationAddress")}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <FloatingInput
                                            label="Country"
                                            value={form.storeLocationAddress.country}
                                            onChangeText={(t: string) => handleChange("country", t, "storeLocationAddress")}
                                            editable={false}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[screenStyles.primaryBtn, (loading || !validateStep()) && screenStyles.primaryBtnDisabled]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Text style={screenStyles.primaryBtnText}>Submit & Continue</Text>
                                            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginLeft: 6 }} />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const screenStyles = StyleSheet.create({
    primaryBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 15,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 24,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryBtnDisabled: { opacity: 0.55, shadowOpacity: 0 },
    primaryBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
});

export default VendorBusinessInfoUpdatingScreen;
