// screens/vendor/VendorProfileScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
    View,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Linking,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Animated,
    Switch,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { colors } from "../../constants/AppThem";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";
import { getRequest, putRequest } from "../../constants/ApiClient";
import AppBar from "../../components/utils/AppBar";
import { getUserData } from "../../components/AsyncStorage/AsyncStorage";
import GenderPicker from "../../components/DropDowns/GenderDropDown";
import GoogleAddressPicker, { AddressResult } from "../../components/LocationPicker/LocationPicker";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserProfile = {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    dateOfBirth?: string;
    gender?: string;
    status: string;
    isEmailVerified: boolean;
    role: string;
    createdAt: string;
    lastLogin?: string;
};

type VendorProfile = {
    _id: string;
    user: string;
    businessType: string;
    storeName: string;
    storeSlug?: string;
    storeLogo?: string;
    storeImages: any[];
    storeLocationAddress: {
        addressLine1: string;
        addressLine2?: string;
        landmark?: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
        latitude?: number;
        longitude?: number;
        location?: { type: string; coordinates: number[] };
    };
    gstNumber?: string;
    panNumber?: string;
    workingHours: { openingTime: string; closingTime: string };
    workingDays: string[];
    bankDetails?: {
        accountHolder?: string;
        bankName?: string;
        accountNumber?: string;
        ifsc?: string;
    };
    kycDocuments?: {
        gstCertificate?: { status: string };
        panCard?: { status: string };
        cancelledCheque?: { status: string };
        storeRegistration?: { status: string };
        aadhaarCard?: { status: string };
        tradeLicense?: { status: string };
        udyamAadhaar?: { status: string };
        shopActLicense?: { status: string };
        certificateOfIncorporation?: { status: string };
    };
    isKycSubmitted: boolean;
    isKycApproved: boolean;
    profileStatus: string;
    isVerified: boolean;
    isOnHoliday: boolean;
    holidayMessage?: string;
    holidayStartDate?: string;
    holidayEndDate?: string;
    createdAt: string;
    updatedAt: string;
};

type EditForm = {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    dateOfBirth: string;
    gender: string;
};

// ─── Holiday Theme Constants ──────────────────────────────────────────────────
const HOLIDAY_COLOR = "#3B82F6";
const HOLIDAY_LIGHT = "#EFF6FF";
const HOLIDAY_BORDER = "#BFDBFE";
const HOLIDAY_DARK = "#1D4ED8";

// ─── Days config ──────────────────────────────────────────────────────────────
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BUSINESS_TYPES: Record<string, string> = {
    individual: "Individual",
    proprietorship: "Proprietorship",
    partnership: "Partnership",
    private_limited: "Private Limited",
    llp: "LLP",
    public_limited: "Public Limited",
};

const STATUS_COLORS: Record<string, string> = {
    approved: "#16A34A",
    active: "#16A34A",
    pending: "#D97706",
    rejected: "#DC2626",
    suspended: "#DC2626",
};

const KYC_STATUS_COLORS: Record<string, string> = {
    approved: "#16A34A",
    pending: "#D97706",
    rejected: "#DC2626",
};

const fmt = (type: string) => BUSINESS_TYPES[type] || type;
const statusColor = (s: string) => STATUS_COLORS[s] || "#9CA3AF";
const kycColor = (s?: string) => KYC_STATUS_COLORS[s || ""] || "#9CA3AF";
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const docLabel = (key: string) =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

const isoToDisplay = (iso: string) => {
    if (!iso) return "";
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

const displayToIso = (display: string) => {
    if (!display) return "";
    const [dd, mm, yyyy] = display.split("/");
    return `${yyyy}-${mm}-${dd}`;
};

const parseDisplayDate = (val: string): Date => {
    if (val && val.length === 10) {
        const [dd, mm, yyyy] = val.split("/");
        const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (!isNaN(d.getTime())) return d;
    }
    const def = new Date();
    def.setFullYear(def.getFullYear() - 18);
    return def;
};

// ─── Time Picker Field ────────────────────────────────────────────────────────

const TimePickerField = ({
    label,
    value,
    onConfirm,
}: {
    label: string;
    value: string; // "HH:MM"
    onConfirm: (time: string) => void;
}) => {
    const [show, setShow] = useState(false);
    const parseTime = (t: string): Date => {
        const [h, m] = (t || "09:00").split(":").map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
    };
    const [iosTemp, setIosTemp] = useState<Date>(() => parseTime(value));

    const formatTime = (d: Date) =>
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    if (Platform.OS === "android") {
        return (
            <>
                <TouchableOpacity
                    onPress={() => { setIosTemp(parseTime(value)); setShow(true); }}
                    activeOpacity={0.8}
                >
                    <View style={{ position: "relative", justifyContent: "center" }}>
                        <TextInput
                            style={[bs.input, { paddingRight: 44 }]}
                            value={value}
                            placeholder="HH:MM"
                            placeholderTextColor={colors.placeholder}
                            editable={false}
                            pointerEvents="none"
                        />
                        <View style={bs.inputIconRight} pointerEvents="none">
                            <Ionicons name="time-outline" size={18} color={colors.placeholder} />
                        </View>
                    </View>
                </TouchableOpacity>
                {show && (
                    <DateTimePicker
                        value={parseTime(value)}
                        mode="time"
                        is24Hour
                        display="spinner"
                        onChange={(event: DateTimePickerEvent, selected?: Date) => {
                            setShow(false);
                            if (event.type === "set" && selected) onConfirm(formatTime(selected));
                        }}
                    />
                )}
            </>
        );
    }

    return (
        <>
            <TouchableOpacity
                onPress={() => { setIosTemp(parseTime(value)); setShow(true); }}
                activeOpacity={0.8}
            >
                <View style={{ position: "relative", justifyContent: "center" }}>
                    <TextInput
                        style={[bs.input, { paddingRight: 44 }]}
                        value={value}
                        placeholder="HH:MM"
                        placeholderTextColor={colors.placeholder}
                        editable={false}
                        pointerEvents="none"
                    />
                    <View style={bs.inputIconRight} pointerEvents="none">
                        <Ionicons name="time-outline" size={18} color={colors.placeholder} />
                    </View>
                </View>
            </TouchableOpacity>
            <Modal
                visible={show}
                transparent
                animationType="slide"
                onRequestClose={() => setShow(false)}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
                    activeOpacity={1}
                    onPress={() => setShow(false)}
                />
                <View style={bs.iosSheet}>
                    <View style={bs.iosSheetHeader}>
                        <TouchableOpacity onPress={() => setShow(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={bs.iosCancelBtn}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={bs.iosSheetTitle}>{label}</Text>
                        <TouchableOpacity
                            onPress={() => { onConfirm(formatTime(iosTemp)); setShow(false); }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={bs.iosConfirmBtn}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <DateTimePicker
                        value={iosTemp}
                        mode="time"
                        is24Hour
                        display="spinner"
                        onChange={(_: DateTimePickerEvent, d?: Date) => d && setIosTemp(d)}
                        style={{ backgroundColor: colors.scaffoldBg }}
                    />
                </View>
            </Modal>
        </>
    );
};

// ─── Inline Date Picker Field ─────────────────────────────────────────────────

const DatePickerField = ({
    value,
    onConfirm,
}: {
    value: string;
    onConfirm: (date: Date) => void;
}) => {
    const [show, setShow] = useState(false);
    const [iosTemp, setIosTemp] = useState<Date>(() => parseDisplayDate(value));

    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 5);
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 100);

    const DisplayField = () => (
        <TouchableOpacity
            onPress={() => { setIosTemp(parseDisplayDate(value)); setShow(true); }}
            activeOpacity={0.8}
        >
            <View style={{ position: "relative", justifyContent: "center" }}>
                <TextInput
                    style={[bs.input, { paddingRight: 44 }]}
                    value={value}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={colors.placeholder}
                    editable={false}
                    pointerEvents="none"
                />
                <View style={bs.inputIconRight} pointerEvents="none">
                    <Ionicons name="calendar-outline" size={18} color={colors.placeholder} />
                </View>
            </View>
        </TouchableOpacity>
    );

    if (Platform.OS === "android") {
        return (
            <>
                <DisplayField />
                {show && (
                    <DateTimePicker
                        value={parseDisplayDate(value)}
                        mode="date"
                        display="spinner"
                        maximumDate={maxDate}
                        minimumDate={minDate}
                        onChange={(event: DateTimePickerEvent, selected?: Date) => {
                            setShow(false);
                            if (event.type === "set" && selected) onConfirm(selected);
                        }}
                    />
                )}
            </>
        );
    }

    return (
        <>
            <DisplayField />
            <Modal
                visible={show}
                transparent
                animationType="slide"
                onRequestClose={() => setShow(false)}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
                    activeOpacity={1}
                    onPress={() => setShow(false)}
                />
                <View style={bs.iosSheet}>
                    <View style={bs.iosSheetHeader}>
                        <TouchableOpacity onPress={() => setShow(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={bs.iosCancelBtn}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={bs.iosSheetTitle}>Date of Birth</Text>
                        <TouchableOpacity
                            onPress={() => { onConfirm(iosTemp); setShow(false); }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={bs.iosConfirmBtn}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <DateTimePicker
                        value={iosTemp}
                        mode="date"
                        display="spinner"
                        maximumDate={maxDate}
                        minimumDate={minDate}
                        onChange={(_: DateTimePickerEvent, d?: Date) => d && setIosTemp(d)}
                        style={{ backgroundColor: colors.scaffoldBg }}
                    />
                </View>
            </Modal>
        </>
    );
};

// ─── Atoms ────────────────────────────────────────────────────────────────────

const Pill = ({ label, color }: { label: string; color: string }) => (
    <View style={[a.pill, { backgroundColor: color + "18" }]}>
        <View style={[a.dot, { backgroundColor: color }]} />
        <Text style={[a.pillText, { color }]}>{label}</Text>
    </View>
);

const Row = ({ label, value }: { label: string; value?: string | null }) => (
    <View style={a.row}>
        <Text style={a.rowLabel}>{label}</Text>
        <Text style={a.rowValue} numberOfLines={1}>{value || "—"}</Text>
    </View>
);

const Divider = () => <View style={a.divider} />;

// ─── Section Card ─────────────────────────────────────────────────────────────

const Section = ({
    title,
    icon,
    children,
    noPad,
    rightAction,
}: {
    title: string;
    icon: string;
    children: React.ReactNode;
    noPad?: boolean;
    rightAction?: React.ReactNode;
}) => (
    <View style={s.card}>
        <View style={s.cardHeader}>
            <View style={s.iconWrap}>
                <Ionicons name={icon as any} size={15} color={colors.primary} />
            </View>
            <Text style={[s.cardTitle, { flex: 1 }]}>{title}</Text>
            {rightAction}
        </View>
        <View style={noPad ? undefined : s.cardBody}>{children}</View>
    </View>
);

// ─── Store Hero ───────────────────────────────────────────────────────────────

const StoreHero = ({ vendor, user }: { vendor: VendorProfile; user: UserProfile }) => {
    const storeInitials = vendor.storeName
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();

    return (
        <View style={s.hero}>
            <View style={s.avatarWrap}>
                <Text style={s.avatarText}>{storeInitials}</Text>
            </View>
            <View style={s.heroInfo}>
                <Text style={s.heroName} numberOfLines={1}>{vendor.storeName}</Text>
                <Text style={s.heroOwner}>{user.firstName} {user.lastName}</Text>
                <Text style={s.heroType}>{fmt(vendor.businessType)}</Text>
                <View style={s.heroMeta}>
                    <Pill label={capitalize(vendor.profileStatus)} color={statusColor(vendor.profileStatus)} />
                    {vendor.isVerified && <Pill label="Verified" color="#16A34A" />}
                    <Pill
                        label={user.status === "active" ? "Active" : capitalize(user.status)}
                        color={user.status === "active" ? "#16A34A" : "#DC2626"}
                    />
                    {vendor.isOnHoliday && <Pill label="On Holiday" color={HOLIDAY_COLOR} />}
                </View>
            </View>
        </View>
    );
};

// ─── KYC Stat Strip ───────────────────────────────────────────────────────────

const KycStrip = ({ vendor }: { vendor: VendorProfile }) => (
    <View style={s.strip}>
        <StatCell
            icon={vendor.isKycSubmitted ? "checkmark-circle" : "ellipse-outline"}
            color={vendor.isKycSubmitted ? "#16A34A" : "#9CA3AF"}
            label="KYC Submitted"
            value={vendor.isKycSubmitted ? "Yes" : "No"}
        />
        <View style={s.stripDivider} />
        <StatCell
            icon={vendor.isKycApproved ? "shield-checkmark" : "shield-outline"}
            color={vendor.isKycApproved ? "#16A34A" : "#D97706"}
            label="KYC Approved"
            value={vendor.isKycApproved ? "Yes" : "Pending"}
        />
        <View style={s.stripDivider} />
        <StatCell
            icon="calendar-outline"
            color={colors.primary}
            label="Member Since"
            value={new Date(vendor.createdAt).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
            })}
        />
    </View>
);

const StatCell = ({
    icon,
    color,
    label,
    value,
}: {
    icon: string;
    color: string;
    label: string;
    value: string;
}) => (
    <View style={s.statCell}>
        <Ionicons name={icon as any} size={16} color={color} style={{ marginBottom: 4 }} />
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
    </View>
);

// ─── Edit Profile Bottom Sheet ────────────────────────────────────────────────

const EditProfileSheet = ({
    visible,
    user,
    onClose,
    onSaved,
}: {
    visible: boolean;
    user: UserProfile;
    onClose: () => void;
    onSaved: (updated: UserProfile) => void;
}) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(600)).current;
    const [saving, setSaving] = useState(false);
    const [isRendered, setIsRendered] = useState(false);

    const [form, setForm] = useState<EditForm>({
        firstName: "",
        lastName: "",
        email: "",
        mobileNumber: "",
        dateOfBirth: "",
        gender: "",
    });

    useEffect(() => {
        if (visible) {
            setForm({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                mobileNumber: user.mobileNumber,
                dateOfBirth: isoToDisplay(user.dateOfBirth || ""),
                gender: user.gender || "",
            });
            setIsRendered(true);
            slideAnim.setValue(600);
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }).start();
        } else {
            Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => setIsRendered(false));
        }
    }, [visible]);

    const set = (key: keyof EditForm, val: string) =>
        setForm((prev) => ({ ...prev, [key]: val }));

    const handleDateConfirm = (date: Date) => {
        const dd = String(date.getDate()).padStart(2, "0");
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const yyyy = date.getFullYear();
        set("dateOfBirth", `${dd}/${mm}/${yyyy}`);
    };

    const handleSave = async () => {
        if (!form.firstName.trim() || !form.lastName.trim()) {
            Toast.show({ type: "error", text1: "Validation", text2: "First and last name are required." });
            return;
        }
        setSaving(true);
        try {
            const payload: any = {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                mobileNumber: form.mobileNumber.trim(),
            };
            if (form.gender) payload.gender = form.gender;
            if (form.dateOfBirth) payload.dateOfBirth = displayToIso(form.dateOfBirth);

            const res: any = await putRequest(API_ENDPOINTS.USERPROFILEUPDATE, payload);
            if (res?.success) {
                Toast.show({ type: "success", text1: "Saved", text2: "Profile updated successfully." });
                onSaved({ ...user, ...payload, dateOfBirth: payload.dateOfBirth });
                onClose();
            } else {
                Toast.show({ type: "error", text1: "Error", text2: res?.message || "Update failed." });
            }
        } catch (err: any) {
            Toast.show({ type: "error", text1: "Error", text2: err?.message || "Something went wrong." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal transparent animationType="none" visible={isRendered} onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                <Pressable style={bs.backdrop} onPress={onClose} />
                <Animated.View
                    style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        height: "75%", backgroundColor: "#fff",
                        borderTopLeftRadius: 20, borderTopRightRadius: 20,
                        transform: [{ translateY: slideAnim }],
                        paddingBottom: insets.bottom || 16,
                    }}
                >
                    <View style={bs.handle} />
                    <View style={bs.header}>
                        <Text style={bs.title}>Edit Account Info</Text>
                        <TouchableOpacity onPress={onClose} style={bs.closeBtn} activeOpacity={0.7}>
                            <Ionicons name="close" size={20} color={colors.secondary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                        <View style={bs.fieldRow}>
                            <View style={[bs.fieldWrap, { flex: 1 }]}>
                                <Text style={bs.label}>First Name *</Text>
                                <TextInput style={bs.input} value={form.firstName} onChangeText={(v) => set("firstName", v)} placeholder="John" placeholderTextColor={colors.placeholder} autoCapitalize="words" />
                            </View>
                            <View style={[bs.fieldWrap, { flex: 1 }]}>
                                <Text style={bs.label}>Last Name *</Text>
                                <TextInput style={bs.input} value={form.lastName} onChangeText={(v) => set("lastName", v)} placeholder="Doe" placeholderTextColor={colors.placeholder} autoCapitalize="words" />
                            </View>
                        </View>
                        <View style={bs.fieldWrap}>
                            <Text style={bs.label}>Date of Birth</Text>
                            <DatePickerField value={form.dateOfBirth} onConfirm={handleDateConfirm} />
                        </View>
                        <View style={bs.fieldWrap}>
                            <GenderPicker label="Gender" selectedValue={form.gender} onValueChange={(val: string) => set("gender", val)} />
                        </View>
                        <View style={bs.fieldWrap}>
                            <Text style={bs.label}>Email</Text>
                            <TextInput style={bs.input} value={form.email} onChangeText={(v) => set("email", v)} placeholder="email@example.com" placeholderTextColor={colors.placeholder} keyboardType="email-address" autoCapitalize="none" />
                        </View>
                        <View style={bs.fieldWrap}>
                            <Text style={bs.label}>Mobile Number</Text>
                            <TextInput style={bs.input} value={form.mobileNumber} onChangeText={(v) => set("mobileNumber", v)} placeholder="9876543210" placeholderTextColor={colors.placeholder} keyboardType="phone-pad" maxLength={10} />
                        </View>
                    </ScrollView>
                    <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                        <TouchableOpacity style={[bs.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                                <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={bs.saveBtnText}>Save Changes</Text></>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Edit Store Info Bottom Sheet ─────────────────────────────────────────────
// Edits: storeName, workingHours (openingTime + closingTime), workingDays
// Also allows editing seller name (firstName + lastName) in same sheet

type StoreForm = {
    storeName: string;
    openingTime: string;
    closingTime: string;
    workingDays: string[];
    firstName: string;
    lastName: string;
};

const EditStoreSheet = ({
    visible,
    vendor,
    user,
    onClose,
    onSaved,
}: {
    visible: boolean;
    vendor: VendorProfile;
    user: UserProfile;
    onClose: () => void;
    onSaved: (updatedVendor: Partial<VendorProfile>, updatedUser: Partial<UserProfile>) => void;
}) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(600)).current;
    const [saving, setSaving] = useState(false);
    const [isRendered, setIsRendered] = useState(false);

    const [form, setForm] = useState<StoreForm>({
        storeName: "",
        openingTime: "09:00",
        closingTime: "21:00",
        workingDays: [],
        firstName: "",
        lastName: "",
    });

    useEffect(() => {
        if (visible) {
            setForm({
                storeName: vendor.storeName,
                openingTime: vendor.workingHours.openingTime,
                closingTime: vendor.workingHours.closingTime,
                workingDays: [...vendor.workingDays],
                firstName: user.firstName,
                lastName: user.lastName,
            });
            setIsRendered(true);
            slideAnim.setValue(600);
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }).start();
        } else {
            Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => setIsRendered(false));
        }
    }, [visible]);

    const set = <K extends keyof StoreForm>(key: K, val: StoreForm[K]) =>
        setForm((prev) => ({ ...prev, [key]: val }));

    const toggleDay = (day: string) => {
        setForm((prev) => ({
            ...prev,
            workingDays: prev.workingDays.includes(day)
                ? prev.workingDays.filter((d) => d !== day)
                : [...prev.workingDays, day],
        }));
    };

    const handleSave = async () => {
        if (!form.storeName.trim()) {
            Toast.show({ type: "error", text1: "Validation", text2: "Store name is required." });
            return;
        }
        if (!form.firstName.trim() || !form.lastName.trim()) {
            Toast.show({ type: "error", text1: "Validation", text2: "Seller first and last name are required." });
            return;
        }
        if (form.workingDays.length === 0) {
            Toast.show({ type: "error", text1: "Validation", text2: "Select at least one working day." });
            return;
        }

        setSaving(true);
        try {
            const { user: storedUser } = await getUserData();
            const userId = storedUser?.user?._id || storedUser?.user;

            // 1. Update vendor profile (storeName, workingHours, workingDays)
            const vendorPayload = {
                storeName: form.storeName.trim(),
                workingHours: {
                    openingTime: form.openingTime,
                    closingTime: form.closingTime,
                },
                workingDays: form.workingDays,
            };

            const vendorRes: any = await putRequest(
                `${API_ENDPOINTS.VENDORPROFILEUPDATE}/${userId}`,
                vendorPayload
            );

            if (!vendorRes?.success) {
                Toast.show({ type: "error", text1: "Error", text2: vendorRes?.message || "Store update failed." });
                setSaving(false);
                return;
            }

            // 2. Update user profile (firstName, lastName) only if changed
            const nameChanged =
                form.firstName.trim() !== user.firstName ||
                form.lastName.trim() !== user.lastName;

            if (nameChanged) {
                const userPayload = {
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                };
                const userRes: any = await putRequest(API_ENDPOINTS.USERPROFILEUPDATE, userPayload);
                if (!userRes?.success) {
                    // Vendor already saved — warn but don't block
                    Toast.show({
                        type: "info",
                        text1: "Partial Save",
                        text2: "Store info saved, but seller name update failed.",
                    });
                    onSaved(vendorPayload, {});
                    onClose();
                    return;
                }
                onSaved(vendorPayload, { firstName: form.firstName.trim(), lastName: form.lastName.trim() });
            } else {
                onSaved(vendorPayload, {});
            }

            Toast.show({ type: "success", text1: "Saved", text2: "Store info updated successfully." });
            onClose();
        } catch (err: any) {
            Toast.show({ type: "error", text1: "Error", text2: err?.message || "Something went wrong." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal transparent animationType="none" visible={isRendered} onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                <Pressable style={bs.backdrop} onPress={onClose} />
                <Animated.View
                    style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        height: "88%", backgroundColor: "#fff",
                        borderTopLeftRadius: 20, borderTopRightRadius: 20,
                        transform: [{ translateY: slideAnim }],
                        paddingBottom: insets.bottom || 16,
                    }}
                >
                    <View style={bs.handle} />
                    <View style={bs.header}>
                        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View style={ese.headerIcon}>
                                <Ionicons name="storefront-outline" size={15} color={colors.primary} />
                            </View>
                            <Text style={bs.title}>Edit Store Info</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={bs.closeBtn} activeOpacity={0.7}>
                            <Ionicons name="close" size={20} color={colors.secondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 20 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* ── Store Name ── */}
                        <Text style={ese.sectionLabel}>Store Details</Text>
                        <View style={bs.fieldWrap}>
                            <Text style={bs.label}>Store Name *</Text>
                            <TextInput
                                style={bs.input}
                                value={form.storeName}
                                onChangeText={(v) => set("storeName", v)}
                                placeholder="Your store name"
                                placeholderTextColor={colors.placeholder}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* ── Seller Name ── */}
                        <Text style={ese.sectionLabel}>Seller Name</Text>
                        <View style={bs.fieldRow}>
                            <View style={[bs.fieldWrap, { flex: 1 }]}>
                                <Text style={bs.label}>First Name *</Text>
                                <TextInput
                                    style={bs.input}
                                    value={form.firstName}
                                    onChangeText={(v) => set("firstName", v)}
                                    placeholder="First"
                                    placeholderTextColor={colors.placeholder}
                                    autoCapitalize="words"
                                />
                            </View>
                            <View style={[bs.fieldWrap, { flex: 1 }]}>
                                <Text style={bs.label}>Last Name *</Text>
                                <TextInput
                                    style={bs.input}
                                    value={form.lastName}
                                    onChangeText={(v) => set("lastName", v)}
                                    placeholder="Last"
                                    placeholderTextColor={colors.placeholder}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        {/* ── Working Hours ── */}
                        <Text style={ese.sectionLabel}>Working Hours</Text>
                        <View style={bs.fieldRow}>
                            <View style={[bs.fieldWrap, { flex: 1 }]}>
                                <Text style={bs.label}>Opening Time</Text>
                                <TimePickerField
                                    label="Opening Time"
                                    value={form.openingTime}
                                    onConfirm={(t) => set("openingTime", t)}
                                />
                            </View>
                            <View style={[bs.fieldWrap, { flex: 1 }]}>
                                <Text style={bs.label}>Closing Time</Text>
                                <TimePickerField
                                    label="Closing Time"
                                    value={form.closingTime}
                                    onConfirm={(t) => set("closingTime", t)}
                                />
                            </View>
                        </View>

                        {/* Time summary banner */}
                        <View style={ese.timeBanner}>
                            <Ionicons name="time-outline" size={14} color={colors.primary} />
                            <Text style={ese.timeBannerText}>
                                Store open from <Text style={ese.timeBannerBold}>{form.openingTime}</Text> to <Text style={ese.timeBannerBold}>{form.closingTime}</Text>
                            </Text>
                        </View>

                        {/* ── Working Days ── */}
                        <Text style={[ese.sectionLabel, { marginTop: 8 }]}>Working Days *</Text>
                        <Text style={ese.sectionHint}>Tap to toggle days on/off</Text>
                        <View style={ese.daysGrid}>
                            {DAYS.map((day) => {
                                const active = form.workingDays.includes(day);
                                return (
                                    <TouchableOpacity
                                        key={day}
                                        onPress={() => toggleDay(day)}
                                        activeOpacity={0.75}
                                        style={[ese.dayBtn, active ? ese.dayBtnOn : ese.dayBtnOff]}
                                    >
                                        <Text style={[ese.dayBtnInitial, active ? ese.dayBtnInitialOn : ese.dayBtnInitialOff]}>
                                            {DAY_LABELS[day].slice(0, 1)}
                                        </Text>
                                        <Text style={[ese.dayBtnLabel, active ? ese.dayBtnLabelOn : ese.dayBtnLabelOff]}>
                                            {DAY_LABELS[day]}
                                        </Text>
                                        {active && (
                                            <View style={ese.dayCheckDot}>
                                                <Ionicons name="checkmark" size={8} color="#fff" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Selected days summary */}
                        {form.workingDays.length > 0 && (
                            <View style={ese.selectedDaysSummary}>
                                <Text style={ese.selectedDaysText}>
                                    {form.workingDays.length === 7
                                        ? "Open all 7 days"
                                        : `${form.workingDays.length} day${form.workingDays.length > 1 ? "s" : ""} selected: ${form.workingDays.map((d) => DAY_LABELS[d]).join(", ")}`}
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                        <TouchableOpacity
                            style={[bs.saveBtn, saving && { opacity: 0.7 }]}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.85}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={bs.saveBtnText}>Save Store Info</Text></>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Edit Address Bottom Sheet ────────────────────────────────────────────────

const EditAddressSheet = ({
    visible,
    vendor,
    onClose,
    onSaved,
}: {
    visible: boolean;
    vendor: VendorProfile;
    onClose: () => void;
    onSaved: (updated: Partial<VendorProfile["storeLocationAddress"]>) => void;
}) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(600)).current;
    const [saving, setSaving] = useState(false);
    const [isRendered, setIsRendered] = useState(false);

    const [addr, setAddr] = useState<AddressResult>({
        addressLine1: "",
        addressLine2: "",
        landmark: "",
        city: "",
        state: "",
        country: "India",
        postalCode: "",
        latitude: 0,
        longitude: 0,
    });

    useEffect(() => {
        if (visible) {
            const a = vendor.storeLocationAddress;
            const coords = a.location?.coordinates;
            setAddr({
                addressLine1: a.addressLine1 || "",
                addressLine2: a.addressLine2 || "",
                landmark: a.landmark || "",
                city: a.city || "",
                state: a.state || "",
                country: a.country || "India",
                postalCode: a.postalCode || "",
                latitude: coords?.[1] ?? a.latitude ?? 0,
                longitude: coords?.[0] ?? a.longitude ?? 0,
            });
            setIsRendered(true);
            slideAnim.setValue(600);
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }).start();
        } else {
            Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => setIsRendered(false));
        }
    }, [visible]);

    const set = (key: keyof AddressResult, val: string) =>
        setAddr((prev: any) => ({ ...prev, [key]: val }));

    const handleSave = async () => {
        if (!addr.addressLine1.trim() || !addr.city.trim() || !addr.state.trim() || !addr.postalCode.trim()) {
            Toast.show({ type: "error", text1: "Validation", text2: "Address line 1, city, state and postal code are required." });
            return;
        }
        setSaving(true);
        try {
            const { user } = await getUserData();
            const userId = user?.user?._id || user?.user;

            const payload = {
                storeLocationAddress: {
                    addressLine1: addr.addressLine1.trim(),
                    addressLine2: addr.addressLine2?.trim() || "",
                    landmark: addr.landmark?.trim() || "",
                    city: addr.city.trim(),
                    state: addr.state.trim(),
                    country: addr.country?.trim() || "India",
                    postalCode: addr.postalCode.trim(),
                    location: {
                        type: "Point",
                        coordinates: [addr.longitude, addr.latitude],
                    },
                },
            };

            const res: any = await putRequest(`${API_ENDPOINTS.VENDORPROFILEUPDATE}/${userId}`, payload);
            if (res?.success) {
                Toast.show({ type: "success", text1: "Saved", text2: "Store address updated successfully." });
                onSaved(payload.storeLocationAddress);
                onClose();
            } else {
                Toast.show({ type: "error", text1: "Error", text2: res?.message || "Update failed." });
            }
        } catch (err: any) {
            Toast.show({ type: "error", text1: "Error", text2: err?.message || "Something went wrong." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal transparent animationType="none" visible={isRendered} onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                <Pressable style={bs.backdrop} onPress={onClose} />
                <Animated.View
                    style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        height: "85%", backgroundColor: "#fff",
                        borderTopLeftRadius: 20, borderTopRightRadius: 20,
                        transform: [{ translateY: slideAnim }],
                        paddingBottom: insets.bottom || 16,
                    }}
                >
                    <View style={bs.handle} />
                    <View style={bs.header}>
                        <Text style={bs.title}>Edit Store Address</Text>
                        <TouchableOpacity onPress={onClose} style={bs.closeBtn} activeOpacity={0.7}>
                            <Ionicons name="close" size={20} color={colors.secondary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View style={bs.fieldWrap}>
                            <Text style={bs.label}>Pick Location</Text>
                            <GoogleAddressPicker value={addr} onChange={(picked: any) => setAddr(picked)} />
                        </View>
                        <View style={bs.fieldWrap}>
                            <Text style={bs.label}>Address Line 1 *</Text>
                            <TextInput style={bs.input} value={addr.addressLine1} onChangeText={(v) => set("addressLine1", v)} placeholder="House no, Building, Street" placeholderTextColor={colors.placeholder} />
                        </View>
                        <View style={bs.fieldWrap}>
                            <Text style={bs.label}>Address Line 2</Text>
                            <TextInput style={bs.input} value={addr.addressLine2} onChangeText={(v) => set("addressLine2", v)} placeholder="Area, Colony, Sector" placeholderTextColor={colors.placeholder} />
                        </View>
                        <View style={bs.fieldWrap}>
                            <Text style={bs.label}>Landmark</Text>
                            <TextInput style={bs.input} value={addr.landmark} onChangeText={(v) => set("landmark", v)} placeholder="Nearby landmark" placeholderTextColor={colors.placeholder} />
                        </View>
                        <View style={bs.fieldRow}>
                            <View style={[bs.fieldWrap, { flex: 1 }]}>
                                <Text style={bs.label}>City *</Text>
                                <TextInput style={bs.input} value={addr.city} onChangeText={(v) => set("city", v)} placeholder="City" placeholderTextColor={colors.placeholder} />
                            </View>
                            <View style={[bs.fieldWrap, { flex: 1 }]}>
                                <Text style={bs.label}>State *</Text>
                                <TextInput style={bs.input} value={addr.state} onChangeText={(v) => set("state", v)} placeholder="State" placeholderTextColor={colors.placeholder} />
                            </View>
                        </View>
                        <View style={bs.fieldRow}>
                            <View style={[bs.fieldWrap, { flex: 1 }]}>
                                <Text style={bs.label}>Postal Code *</Text>
                                <TextInput style={bs.input} value={addr.postalCode} onChangeText={(v) => set("postalCode", v)} placeholder="600000" placeholderTextColor={colors.placeholder} keyboardType="number-pad" maxLength={6} />
                            </View>
                            <View style={[bs.fieldWrap, { flex: 1 }]}>
                                <Text style={bs.label}>Country</Text>
                                <TextInput style={bs.input} value={addr.country} onChangeText={(v) => set("country", v)} placeholder="India" placeholderTextColor={colors.placeholder} />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                        <TouchableOpacity style={[bs.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                                <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={bs.saveBtnText}>Save Address</Text></>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Holiday Bottom Sheet ─────────────────────────────────────────────────────

const HolidaySheet = ({
    visible,
    vendor,
    onClose,
    onSaved,
}: {
    visible: boolean;
    vendor: VendorProfile;
    onClose: () => void;
    onSaved: (updated: Partial<VendorProfile>) => void;
}) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(600)).current;
    const [saving, setSaving] = useState(false);
    const [isRendered, setIsRendered] = useState(false);
    const [isOnHoliday, setIsOnHoliday] = useState(false);
    const [holidayMessage, setHolidayMessage] = useState("");

    useEffect(() => {
        if (visible) {
            setIsOnHoliday(vendor.isOnHoliday);
            setHolidayMessage(vendor.holidayMessage || "");
            setIsRendered(true);
            slideAnim.setValue(600);
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }).start();
        } else {
            Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => setIsRendered(false));
        }
    }, [visible]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { user } = await getUserData();
            if (!user?.user?._id) return;
            const res: any = await putRequest(
                `${API_ENDPOINTS.VENDORHOLIDAYTOGGLE}/${user?.user?._id}`,
                { isOnHoliday, holidayMessage: isOnHoliday ? holidayMessage.trim() : "" }
            );
            if (res?.success) {
                Toast.show({
                    type: "success",
                    text1: isOnHoliday ? "Holiday Mode On" : "Holiday Mode Off",
                    text2: isOnHoliday ? "Your store is now on holiday." : "Your store is back online.",
                });
                onSaved({ isOnHoliday, holidayMessage: holidayMessage.trim() });
                onClose();
            } else {
                Toast.show({ type: "error", text1: "Error", text2: res?.message || "Update failed." });
            }
        } catch (err: any) {
            Toast.show({ type: "error", text1: "Error", text2: err?.message || "Something went wrong." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal transparent animationType="none" visible={isRendered} onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                <Pressable style={bs.backdrop} onPress={onClose} />
                <Animated.View
                    style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
                        transform: [{ translateY: slideAnim }],
                        paddingBottom: insets.bottom || 20,
                    }}
                >
                    <View style={bs.handle} />
                    <View style={bs.header}>
                        <View style={hs.headerLeft}>
                            <View style={hs.headerIcon}>
                                <Ionicons name="airplane-outline" size={16} color={HOLIDAY_COLOR} />
                            </View>
                            <Text style={bs.title}>Holiday Mode</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={bs.closeBtn} activeOpacity={0.7}>
                            <Ionicons name="close" size={20} color={colors.secondary} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 }}>
                        <View style={hs.toggleCard}>
                            <View style={hs.toggleLeft}>
                                <Text style={hs.toggleTitle}>{isOnHoliday ? "Store on Holiday" : "Store is Open"}</Text>
                                <Text style={hs.toggleSub}>{isOnHoliday ? "Customers cannot place new orders" : "Toggle to pause orders temporarily"}</Text>
                            </View>
                            <Switch
                                value={isOnHoliday}
                                onValueChange={setIsOnHoliday}
                                trackColor={{ false: colors.formBorder, true: HOLIDAY_COLOR + "30" }}
                                thumbColor={isOnHoliday ? HOLIDAY_COLOR : "#9CA3AF"}
                                ios_backgroundColor={colors.formBorder}
                            />
                        </View>
                        <View style={[hs.statusBanner, { backgroundColor: isOnHoliday ? HOLIDAY_LIGHT : "#F0FDF4", borderColor: isOnHoliday ? HOLIDAY_BORDER : "#DCFCE7" }]}>
                            <Ionicons name={isOnHoliday ? "moon-outline" : "sunny-outline"} size={15} color={isOnHoliday ? HOLIDAY_COLOR : "#16A34A"} />
                            <Text style={[hs.statusBannerText, { color: isOnHoliday ? HOLIDAY_DARK : "#166534" }]}>
                                {isOnHoliday ? "Holiday mode is active — your store is paused" : "Your store is live and accepting orders"}
                            </Text>
                        </View>
                        {isOnHoliday && (
                            <View style={[bs.fieldWrap, { marginTop: 16 }]}>
                                <Text style={bs.label}>Holiday Message (optional)</Text>
                                <Text style={hs.inputHint}>Shown to customers visiting your store</Text>
                                <TextInput
                                    style={[bs.input, hs.messageInput]}
                                    value={holidayMessage}
                                    onChangeText={setHolidayMessage}
                                    placeholder="e.g. We're on a short break, back on 10th Jan!"
                                    placeholderTextColor={colors.placeholder}
                                    multiline
                                    maxLength={160}
                                    textAlignVertical="top"
                                />
                                <Text style={hs.charCount}>{holidayMessage.length}/160</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={[bs.saveBtn, { backgroundColor: isOnHoliday ? HOLIDAY_COLOR : "#16A34A" }, saving && { opacity: 0.7 }]}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.85}
                        >
                            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                                <><Ionicons name={isOnHoliday ? "airplane-outline" : "checkmark-circle-outline"} size={18} color="#fff" /><Text style={bs.saveBtnText}>{isOnHoliday ? "Enable Holiday Mode" : "Set Store Live"}</Text></>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Holiday Status Card ──────────────────────────────────────────────────────

const HolidayCard = ({ vendor, onEditPress }: { vendor: VendorProfile; onEditPress: () => void }) => {
    const isOn = vendor.isOnHoliday;
    return (
        <View style={hs.card}>
            <View style={hs.cardHeader}>
                <View style={[hs.cardIconWrap, { backgroundColor: isOn ? HOLIDAY_LIGHT : "#F0FDF4" }]}>
                    <Ionicons name={isOn ? "airplane" : "storefront-outline"} size={15} color={isOn ? HOLIDAY_COLOR : "#16A34A"} />
                </View>
                <Text style={s.cardTitle}>Holiday Mode</Text>
                <TouchableOpacity onPress={onEditPress} style={[hs.editBtn, { backgroundColor: isOn ? HOLIDAY_LIGHT : colors.primary + "12" }]} activeOpacity={0.7}>
                    <Ionicons name="create-outline" size={13} color={isOn ? HOLIDAY_COLOR : colors.primary} />
                    <Text style={[hs.editBtnText, { color: isOn ? HOLIDAY_COLOR : colors.primary }]}>Edit</Text>
                </TouchableOpacity>
            </View>
            <View style={hs.statusRow}>
                <View style={[hs.statusPill, { backgroundColor: isOn ? HOLIDAY_LIGHT : "#F0FDF4", borderColor: isOn ? HOLIDAY_BORDER : "#DCFCE7" }]}>
                    <View style={[hs.statusDot, { backgroundColor: isOn ? HOLIDAY_COLOR : "#22C55E" }]} />
                    <Text style={[hs.statusPillText, { color: isOn ? HOLIDAY_DARK : "#166534" }]}>{isOn ? "On Holiday" : "Store Open"}</Text>
                </View>
                <Text style={hs.statusDesc}>{isOn ? "Orders are paused while you're away" : "Your store is live and accepting orders"}</Text>
            </View>
            {isOn && vendor.holidayMessage ? (
                <View style={hs.messageBox}>
                    <Ionicons name="chatbubble-ellipses-outline" size={13} color={HOLIDAY_COLOR} />
                    <Text style={hs.messageText} numberOfLines={2}>{vendor.holidayMessage}</Text>
                </View>
            ) : null}
        </View>
    );
};

// ─── Account Info Section ─────────────────────────────────────────────────────

const AccountInfo = ({ user, onEditPress }: { user: UserProfile; onEditPress: () => void }) => {
    const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    return (
        <Section
            title="Account Information"
            icon="person-circle-outline"
            rightAction={
                <TouchableOpacity onPress={onEditPress} style={s.editIconBtn} activeOpacity={0.7}>
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text style={s.editIconText}>Edit</Text>
                </TouchableOpacity>
            }
        >
            <View style={s.userCard}>
                <View style={s.userAvatar}>
                    <Text style={s.userAvatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={s.userName}>{user.firstName} {user.lastName}</Text>
                    <Text style={s.userRole}>{capitalize(user.role)}</Text>
                </View>
                <Pill label={user.isEmailVerified ? "Email Verified" : "Unverified"} color={user.isEmailVerified ? "#16A34A" : "#D97706"} />
            </View>
            <Divider />
            <Row label="Email" value={user.email} />
            <Row label="Mobile" value={user.mobileNumber} />
            {user.gender ? <Row label="Gender" value={capitalize(user.gender)} /> : null}
            {user.dateOfBirth ? <Row label="Date of Birth" value={formatDate(user.dateOfBirth)} /> : null}
            <Row label="Account Status" value={capitalize(user.status)} />
            {user.lastLogin ? <Row label="Last Login" value={formatDate(user.lastLogin)} /> : null}
        </Section>
    );
};

// ─── Working Days Display ─────────────────────────────────────────────────────

const DayChips = ({ workingDays }: { workingDays: string[] }) => (
    <View style={s.daysRow}>
        {DAYS.map((day) => {
            const active = workingDays.includes(day);
            return (
                <View key={day} style={[s.dayChip, active ? s.dayChipOn : s.dayChipOff]}>
                    <Text style={[s.dayChipText, active ? s.dayChipTextOn : s.dayChipTextOff]}>
                        {day.slice(0, 1).toUpperCase()}
                    </Text>
                </View>
            );
        })}
    </View>
);

// ─── KYC Doc List ─────────────────────────────────────────────────────────────

const KycDocs = ({ docs }: { docs: VendorProfile["kycDocuments"] }) => {
    if (!docs) return null;
    const entries = Object.entries(docs).filter(([, v]) => v && (v as any).status);
    if (!entries.length) return <Text style={a.rowLabel}>No documents uploaded.</Text>;
    return (
        <View style={{ gap: 6 }}>
            {entries.map(([key, doc]: [string, any]) => {
                const color = kycColor(doc.status);
                return (
                    <View key={key} style={s.kycRow}>
                        <View style={[s.kycDot, { backgroundColor: color }]} />
                        <Text style={s.kycLabel}>{docLabel(key)}</Text>
                        <Text style={[s.kycStatus, { color }]}>{capitalize(doc.status)}</Text>
                    </View>
                );
            })}
        </View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const VendorProfileScreen = ({ navigation, route }: any) => {
    const insets = useSafeAreaInsets();
    const [vendor, setVendor] = useState<VendorProfile | null>(route.params?.vendor || null);
    const [userInfo, setUserInfo] = useState<any | null>(route.params?.user || null);
    const [loading, setLoading] = useState(true);
    const [editSheetVisible, setEditSheetVisible] = useState(false);
    const [storeSheetVisible, setStoreSheetVisible] = useState(false);
    const [holidaySheetVisible, setHolidaySheetVisible] = useState(false);
    const [addressSheetVisible, setAddressSheetVisible] = useState(false);

    useEffect(() => {
        const init = async () => {
            const { user } = await getUserData();
            if (user?.user?._id || user?.user) fetchVendorProfile(user);
        };
        init();
    }, []);

    const fetchVendorProfile = async (user: any) => {
        setLoading(true);
        try {
            const res: any = await getRequest(
                `${API_ENDPOINTS.VENDORPROFILEGET}/${user?.user?._id || user?.user}`,
                undefined, undefined, false
            );
            if (res?.success && res?.data) {
                setVendor(res.data.vendor);
                setUserInfo(res.data.user);
            }
        } catch (err: any) {
            Toast.show({ type: "error", text1: "Error", text2: err?.message || "Something went wrong" });
        } finally {
            setLoading(false);
        }
    };

    const openMap = () => {
        if (!vendor) return;
        const coords = vendor.storeLocationAddress.location?.coordinates;
        if (coords?.length === 2) {
            const [lng, lat] = coords;
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
        }
    };

    const hasMapCoords = (vendor?.storeLocationAddress?.location?.coordinates?.length ?? 0) === 2;

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.scaffoldBg }}>
                <AppBar title="Vendor Profile" onBack={() => navigation.goBack()} />
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ color: colors.placeholder, fontSize: 13 }}>Loading profile…</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!vendor) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.scaffoldBg }}>
                <AppBar title="Vendor Profile" onBack={() => navigation.goBack()} />
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 }}>
                    <Ionicons name="storefront-outline" size={44} color={colors.primary} />
                    <Text style={{ color: colors.secondary, fontSize: 16, fontWeight: "600", textAlign: "center" }}>Business profile not created yet</Text>
                    <Text style={{ color: colors.placeholder, fontSize: 13, textAlign: "center" }}>Share your business details to get started</Text>
                    <TouchableOpacity
                        style={{ backgroundColor: colors.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10, marginTop: 10 }}
                        onPress={() => navigation.navigate("VendorBusinessInfoUpdating", { user: userInfo })}
                    >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>Share Business Info</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const addr = vendor.storeLocationAddress;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.scaffoldBg }} edges={["bottom"]}>
            <AppBar title="Vendor Profile" onBack={() => navigation.goBack()} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                showsVerticalScrollIndicator={false}
            >
                <StoreHero vendor={vendor} user={userInfo} />
                <KycStrip vendor={vendor} />

                <AccountInfo user={userInfo} onEditPress={() => setEditSheetVisible(true)} />

                <Section title="Business Information" icon="business-outline">
                    <Row label="Business Type" value={fmt(vendor.businessType)} />
                    <Row label="GST Number" value={vendor.gstNumber} />
                    <Row label="PAN Number" value={vendor.panNumber} />
                    {vendor.storeSlug && <Row label="Store Slug" value={`@${vendor.storeSlug}`} />}
                </Section>

                <Section
                    title="Store Address"
                    icon="location-outline"
                    rightAction={
                        <TouchableOpacity onPress={() => setAddressSheetVisible(true)} style={s.editIconBtn} activeOpacity={0.7}>
                            <Ionicons name="create-outline" size={16} color={colors.primary} />
                            <Text style={s.editIconText}>Edit</Text>
                        </TouchableOpacity>
                    }
                >
                    <View style={s.addrBlock}>
                        <Text style={s.addrMain}>{addr.addressLine1}</Text>
                        {addr.addressLine2 ? <Text style={s.addrSub}>{addr.addressLine2}</Text> : null}
                        {addr.landmark ? <Text style={s.addrLandmark}>Near {addr.landmark}</Text> : null}
                        <Text style={s.addrCity}>{addr.city}, {addr.state} — {addr.postalCode}</Text>
                        <Text style={s.addrCountry}>{addr.country}</Text>
                    </View>
                    {hasMapCoords && (
                        <TouchableOpacity style={s.mapBtn} onPress={openMap} activeOpacity={0.8}>
                            <Ionicons name="navigate-outline" size={14} color="#fff" />
                            <Text style={s.mapBtnText}>Open in Maps</Text>
                        </TouchableOpacity>
                    )}
                </Section>

                {/* ── Working Schedule — with Edit button ── */}
                <Section
                    title="Working Schedule"
                    icon="time-outline"
                    rightAction={
                        <TouchableOpacity onPress={() => setStoreSheetVisible(true)} style={s.editIconBtn} activeOpacity={0.7}>
                            <Ionicons name="create-outline" size={16} color={colors.primary} />
                            <Text style={s.editIconText}>Edit</Text>
                        </TouchableOpacity>
                    }
                >
                    <View style={s.hoursRow}>
                        <View style={s.hourCell}>
                            <Text style={s.hourLabel}>Opens</Text>
                            <Text style={s.hourValue}>{vendor.workingHours.openingTime}</Text>
                        </View>
                        <View style={s.hourSep}>
                            <Ionicons name="arrow-forward-outline" size={14} color={colors.placeholder} />
                        </View>
                        <View style={[s.hourCell, { alignItems: "flex-end" }]}>
                            <Text style={s.hourLabel}>Closes</Text>
                            <Text style={s.hourValue}>{vendor.workingHours.closingTime}</Text>
                        </View>
                    </View>
                    <Divider />
                    <Text style={s.daysHeading}>Working Days</Text>
                    <DayChips workingDays={vendor.workingDays} />
                </Section>

                <HolidayCard vendor={vendor} onEditPress={() => setHolidaySheetVisible(true)} />

                {vendor.bankDetails && (
                    <Section title="Bank Details" icon="card-outline">
                        <Row label="Account Holder" value={vendor.bankDetails.accountHolder} />
                        <Row label="Bank Name" value={vendor.bankDetails.bankName} />
                        <Row label="Account No." value={vendor.bankDetails.accountNumber} />
                        <Row label="IFSC Code" value={vendor.bankDetails.ifsc} />
                    </Section>
                )}

                {vendor.kycDocuments && (
                    <Section title="KYC Documents" icon="documents-outline">
                        <KycDocs docs={vendor.kycDocuments} />
                    </Section>
                )}
            </ScrollView>

            {/* ── Edit Account Info Sheet ── */}
            {userInfo && (
                <EditProfileSheet
                    visible={editSheetVisible}
                    user={userInfo}
                    onClose={() => setEditSheetVisible(false)}
                    onSaved={(updated) => setUserInfo(updated)}
                />
            )}

            {/* ── Edit Store Info Sheet (store name + hours + days + seller name) ── */}
            {vendor && userInfo && (
                <EditStoreSheet
                    visible={storeSheetVisible}
                    vendor={vendor}
                    user={userInfo}
                    onClose={() => setStoreSheetVisible(false)}
                    onSaved={(updatedVendor, updatedUser) => {
                        setVendor((prev) => prev ? { ...prev, ...updatedVendor } : prev);
                        if (Object.keys(updatedUser).length > 0) {
                            setUserInfo((prev: any) => prev ? { ...prev, ...updatedUser } : prev);
                        }
                    }}
                />
            )}

            {/* ── Holiday Sheet ── */}
            {vendor && (
                <HolidaySheet
                    visible={holidaySheetVisible}
                    vendor={vendor}
                    onClose={() => setHolidaySheetVisible(false)}
                    onSaved={(updated) => setVendor((prev) => prev ? { ...prev, ...updated } : prev)}
                />
            )}

            {/* ── Edit Address Sheet ── */}
            {vendor && (
                <EditAddressSheet
                    visible={addressSheetVisible}
                    vendor={vendor}
                    onClose={() => setAddressSheetVisible(false)}
                    onSaved={(updatedAddr) =>
                        setVendor((prev) =>
                            prev ? { ...prev, storeLocationAddress: { ...prev.storeLocationAddress, ...updatedAddr } } : prev
                        )
                    }
                />
            )}
        </SafeAreaView>
    );
};

// ─── Atoms StyleSheet ─────────────────────────────────────────────────────────

const a = StyleSheet.create({
    pill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, gap: 5 },
    dot: { width: 5, height: 5, borderRadius: 3 },
    pillText: { fontSize: 11, fontWeight: "600" },
    row: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.formBorder,
    },
    rowLabel: { fontSize: 13, color: colors.label, fontWeight: "400", flex: 1 },
    rowValue: { fontSize: 13, color: colors.secondary, fontWeight: "600", flex: 1, textAlign: "right", marginLeft: 12 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.formBorder, marginVertical: 14 },
});

// ─── Layout StyleSheet ────────────────────────────────────────────────────────

const s = StyleSheet.create({
    hero: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 14 },
    avatarWrap: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.primary + "18", justifyContent: "center", alignItems: "center", flexShrink: 0 },
    avatarText: { fontSize: 18, fontWeight: "700", color: colors.primary, letterSpacing: -0.5 },
    heroInfo: { flex: 1, gap: 1 },
    heroName: { fontSize: 17, fontWeight: "700", color: colors.secondary, letterSpacing: -0.3 },
    heroOwner: { fontSize: 12, color: colors.placeholder },
    heroType: { fontSize: 12, color: colors.placeholder, marginBottom: 6 },
    heroMeta: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    strip: {
        flexDirection: "row", marginHorizontal: 16, marginBottom: 12,
        backgroundColor: colors.formBg, borderRadius: 12, overflow: "hidden",
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.formBorder,
    },
    statCell: { flex: 1, alignItems: "center", paddingVertical: 12 },
    statValue: { fontSize: 13, fontWeight: "700", color: colors.secondary },
    statLabel: { fontSize: 10, color: colors.placeholder, marginTop: 1 },
    stripDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.formBorder, marginVertical: 8 },
    card: {
        backgroundColor: "#ffffff", marginHorizontal: 16, marginBottom: 10,
        borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.formBorder, overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11, gap: 9,
        backgroundColor: colors.formBg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.formBorder,
    },
    iconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primary + "15", justifyContent: "center", alignItems: "center" },
    cardTitle: { fontSize: 12, fontWeight: "700", color: colors.secondary, textTransform: "uppercase", letterSpacing: 0.6 },
    cardBody: { paddingHorizontal: 14 },
    editIconBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.primary + "12" },
    editIconText: { fontSize: 11, fontWeight: "700", color: colors.primary },
    userCard: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
    userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "18", justifyContent: "center", alignItems: "center" },
    userAvatarText: { fontSize: 14, fontWeight: "700", color: colors.primary },
    userName: { fontSize: 14, fontWeight: "700", color: colors.secondary },
    userRole: { fontSize: 11, color: colors.placeholder, marginTop: 1 },
    addrBlock: { marginBottom: 10 },
    addrMain: { fontSize: 14, fontWeight: "600", color: colors.secondary, marginBottom: 2 },
    addrSub: { fontSize: 13, color: colors.label, marginBottom: 2 },
    addrLandmark: { fontSize: 12, color: colors.placeholder, fontStyle: "italic", marginBottom: 4 },
    addrCity: { fontSize: 13, color: colors.secondary, fontWeight: "500" },
    addrCountry: { fontSize: 12, color: colors.placeholder },
    mapBtn: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.primary, marginTop: 10, marginBottom: 4 },
    mapBtnText: { fontSize: 12, fontWeight: "600", color: "#fff" },
    hoursRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
    hourCell: { flex: 1 },
    hourLabel: { fontSize: 11, color: colors.placeholder, marginBottom: 3 },
    hourValue: { fontSize: 20, fontWeight: "700", color: colors.secondary, letterSpacing: -0.5 },
    hourSep: { paddingHorizontal: 12 },
    daysHeading: { fontSize: 11, color: colors.placeholder, marginBottom: 10, fontWeight: "600" },
    daysRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
    dayChip: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    dayChipOn: { backgroundColor: colors.primary },
    dayChipOff: { backgroundColor: colors.formBorder },
    dayChipText: { fontSize: 12, fontWeight: "700" },
    dayChipTextOn: { color: "#fff" },
    dayChipTextOff: { color: colors.placeholder },
    kycRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.formBg },
    kycDot: { width: 7, height: 7, borderRadius: 4 },
    kycLabel: { flex: 1, fontSize: 13, color: colors.secondary, fontWeight: "500" },
    kycStatus: { fontSize: 11, fontWeight: "700" },
});

// ─── Holiday StyleSheet ───────────────────────────────────────────────────────

const hs = StyleSheet.create({
    card: { backgroundColor: "#ffffff", marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.formBorder, overflow: "hidden" },
    cardHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11, gap: 9, backgroundColor: colors.formBg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.formBorder },
    cardIconWrap: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    editBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginLeft: "auto" },
    editBtnText: { fontSize: 11, fontWeight: "700" },
    statusRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
    statusPill: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, gap: 6 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusPillText: { fontSize: 12, fontWeight: "700" },
    statusDesc: { fontSize: 12, color: colors.placeholder, lineHeight: 17 },
    messageBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginHorizontal: 14, marginBottom: 12, backgroundColor: HOLIDAY_LIGHT, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: HOLIDAY_BORDER },
    messageText: { flex: 1, fontSize: 12, color: HOLIDAY_DARK, lineHeight: 18 },
    headerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    headerIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: HOLIDAY_LIGHT, justifyContent: "center", alignItems: "center" },
    toggleCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.formBg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.formBorder, padding: 14, marginBottom: 12, gap: 12 },
    toggleLeft: { flex: 1 },
    toggleTitle: { fontSize: 14, fontWeight: "700", color: colors.secondary, marginBottom: 2 },
    toggleSub: { fontSize: 12, color: colors.placeholder, lineHeight: 17 },
    statusBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 4 },
    statusBannerText: { flex: 1, fontSize: 12, fontWeight: "500", lineHeight: 17 },
    inputHint: { fontSize: 11, color: colors.placeholder, marginBottom: 6, marginTop: -2 },
    messageInput: { height: 80, paddingTop: 10 },
    charCount: { fontSize: 11, color: colors.placeholder, textAlign: "right", marginTop: 4 },
});

// ─── Edit Store Sheet StyleSheet ──────────────────────────────────────────────

const ese = StyleSheet.create({
    headerIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primary + "15", justifyContent: "center", alignItems: "center" },
    sectionLabel: {
        fontSize: 11, fontWeight: "700", color: colors.placeholder,
        textTransform: "uppercase", letterSpacing: 0.7,
        marginBottom: 10, marginTop: 4,
    },
    sectionHint: { fontSize: 11, color: colors.placeholder, marginBottom: 10, marginTop: -6 },
    timeBanner: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: colors.primary + "10", borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.primary + "30",
        padding: 10, marginBottom: 4,
    },
    timeBannerText: { fontSize: 12, color: colors.label, flex: 1 },
    timeBannerBold: { fontWeight: "700", color: colors.secondary },
    // Day toggle grid
    daysGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 10,
    },
    dayBtn: {
        width: "13%",
        minWidth: 42,
        flex: 1,
        aspectRatio: 0.85,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        borderWidth: 1.5,
    },
    dayBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    dayBtnOff: { backgroundColor: colors.formBg, borderColor: colors.formBorder },
    dayBtnInitial: { fontSize: 16, fontWeight: "800", lineHeight: 20 },
    dayBtnInitialOn: { color: "#fff" },
    dayBtnInitialOff: { color: colors.secondary },
    dayBtnLabel: { fontSize: 9, fontWeight: "600", marginTop: 1 },
    dayBtnLabelOn: { color: "rgba(255,255,255,0.85)" },
    dayBtnLabelOff: { color: colors.placeholder },
    dayCheckDot: {
        position: "absolute", top: 4, right: 4,
        width: 13, height: 13, borderRadius: 7,
        backgroundColor: "rgba(255,255,255,0.3)",
        justifyContent: "center", alignItems: "center",
    },
    selectedDaysSummary: {
        backgroundColor: colors.primary + "10",
        borderRadius: 10,
        padding: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.primary + "30",
        marginTop: 4,
    },
    selectedDaysText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
});

// ─── Bottom Sheet StyleSheet ──────────────────────────────────────────────────

const bs = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", paddingTop: 12 },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.formBorder, alignSelf: "center", marginBottom: 12, marginTop: 12 },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.formBorder, marginBottom: 4 },
    title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.secondary },
    closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.formBg, justifyContent: "center", alignItems: "center" },
    fieldRow: { flexDirection: "row", gap: 12 },
    fieldWrap: { marginBottom: 14 },
    label: { fontSize: 12, fontWeight: "600", color: colors.label, marginBottom: 6 },
    input: {
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.formBorder, borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 10,
        fontSize: 14, color: colors.secondary, backgroundColor: colors.formBg,
    },
    inputIconRight: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center", alignItems: "center" },
    iosSheet: { backgroundColor: colors.scaffoldBg, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 },
    iosSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.formBorder },
    iosSheetTitle: { fontSize: 15, fontWeight: "700", color: colors.secondary },
    iosCancelBtn: { fontSize: 15, color: colors.placeholder },
    iosConfirmBtn: { fontSize: 15, fontWeight: "700", color: colors.primary },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 8 },
    saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

export default VendorProfileScreen;