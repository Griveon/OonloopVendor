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
    createdAt: string;
    updatedAt: string;
};

type EditForm = {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
    dateOfBirth: string; // stored as dd/mm/yyyy display format
    gender: string;
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

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

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

// "1998-05-21" → "21/05/1998"  (display format for the picker)
const isoToDisplay = (iso: string) => {
    if (!iso) return "";

    const date = new Date(iso);

    if (isNaN(date.getTime())) return "";

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
};

// "21/05/1998" → "1998-05-21"
const displayToIso = (display: string) => {
    if (!display) return "";

    const [dd, mm, yyyy] = display.split("/");

    return `${yyyy}-${mm}-${dd}`;
};

// "21/05/1998" → Date object
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

// ─── Inline Date Picker Field (mirrors VendorRegistrationScreen) ──────────────

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
            onPress={() => {
                setIosTemp(parseDisplayDate(value));
                setShow(true);
            }}
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

    // iOS — sheet modal
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
                        <TouchableOpacity
                            onPress={() => setShow(false)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
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

// ─── Edit Bottom Sheet ────────────────────────────────────────────────────────

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
                // API returns ISO "1998-05-21" — convert to dd/mm/yyyy for display
                dateOfBirth: isoToDisplay(user.dateOfBirth || ""),
                gender: user.gender || "",
            });
            setIsRendered(true);
            slideAnim.setValue(600);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 60,
                friction: 12,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 600,
                duration: 250,
                useNativeDriver: true,
            }).start(() => setIsRendered(false));
        }
    }, [visible]);

    const set = (key: keyof EditForm, val: string) =>
        setForm((prev) => ({ ...prev, [key]: val }));

    // Called by DatePickerField — receives a Date object, stores as dd/mm/yyyy
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
            // Convert dd/mm/yyyy → yyyy-mm-dd before sending to API
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
        <Modal
            transparent
            animationType="none"
            visible={isRendered}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior="padding"
            >
                <Pressable style={bs.backdrop} onPress={onClose} />

                <Animated.View
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '75%',
                        backgroundColor: '#fff',
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        transform: [{ translateY: slideAnim }],
                        paddingBottom: insets.bottom || 16,
                    }}

                >
                    {/* Handle */}
                    <View style={bs.handle} />

                    {/* Header */}
                    <View style={bs.header}>
                        <Text style={bs.title}>Edit Account Info</Text>
                        <TouchableOpacity onPress={onClose} style={bs.closeBtn} activeOpacity={0.7}>
                            <Ionicons name="close" size={20} color={colors.secondary} />
                        </TouchableOpacity>
                    </View>


                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 20 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={bs.fieldRow}>
                            <View style={[bs.fieldWrap, { flex: 1 }]}>
                                <Text style={bs.label}>First Name *</Text>
                                <TextInput
                                    style={bs.input}
                                    value={form.firstName}
                                    onChangeText={(v) => set("firstName", v)}
                                    placeholder="John"
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
                                    placeholder="Doe"
                                    placeholderTextColor={colors.placeholder}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        <View style={bs.fieldWrap}>
                            <Text style={bs.label}>Date of Birth</Text>
                            <DatePickerField
                                value={form.dateOfBirth}
                                onConfirm={handleDateConfirm}
                            />
                        </View>

                        {/* Gender — same GenderPicker as registration */}
                        <View style={bs.fieldWrap}>
                            <GenderPicker
                                label="Gender"
                                selectedValue={form.gender}
                                onValueChange={(val: string) => set("gender", val)}
                            />
                        </View>

                        {/* Email */}
                        <View style={bs.fieldWrap}>
                            <Text style={bs.label}>Email</Text>
                            <TextInput
                                style={bs.input}
                                value={form.email}
                                onChangeText={(v) => set("email", v)}
                                placeholder="email@example.com"
                                placeholderTextColor={colors.placeholder}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Mobile */}
                        <View style={bs.fieldWrap}>
                            <Text style={bs.label}>Mobile Number</Text>
                            <TextInput
                                style={bs.input}
                                value={form.mobileNumber}
                                onChangeText={(v) => set("mobileNumber", v)}
                                placeholder="9876543210"
                                placeholderTextColor={colors.placeholder}
                                keyboardType="phone-pad"
                                maxLength={10}
                            />
                        </View>
                    </ScrollView>

                    {/* Save button */}
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
                                <>
                                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                                    <Text style={bs.saveBtnText}>Save Changes</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Account Info Section ─────────────────────────────────────────────────────

const AccountInfo = ({
    user,
    onEditPress,
}: {
    user: UserProfile;
    onEditPress: () => void;
}) => {
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
                <Pill
                    label={user.isEmailVerified ? "Email Verified" : "Unverified"}
                    color={user.isEmailVerified ? "#16A34A" : "#D97706"}
                />
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

// ─── Working Days ─────────────────────────────────────────────────────────────

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

    useEffect(() => {
        const init = async () => {
            const { user } = await getUserData();
            console.log("Logged in user:", user);
            if (user?.user?._id || user?.user) fetchVendorProfile(user);
        };
        init();
    }, []);

    const fetchVendorProfile = async (user: any) => {
        setLoading(true);
        try {
            const res: any = await getRequest(
                `${API_ENDPOINTS.VENDORPROFILEGET}/${user?.user?._id || user?.user}`,
                undefined,
                undefined,
                false
            );
            if (res?.success && res?.data) {
                setVendor(res.data.vendor);
                setUserInfo(res.data.user);
                console.log("Fetched vendor profile:", res.data.vendor);
            } else {
                // Toast.show({ type: "error", text1: "Error", text2: res?.message || "Failed to load" });
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

    const hasMapCoords =
        (vendor?.storeLocationAddress?.location?.coordinates?.length ?? 0) === 2;

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

                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        padding: 24,
                        gap: 12,
                    }}
                >
                    <Ionicons name="storefront-outline" size={44} color={colors.primary} />

                    <Text
                        style={{
                            color: colors.secondary,
                            fontSize: 16,
                            fontWeight: "600",
                            textAlign: "center",
                        }}
                    >
                        Business profile not created yet
                    </Text>

                    <Text
                        style={{
                            color: colors.placeholder,
                            fontSize: 13,
                            textAlign: "center",
                        }}
                    >
                        Share your business details to get started
                    </Text>

                    {/* CTA Button */}
                    <TouchableOpacity
                        style={{
                            backgroundColor: colors.primary,
                            paddingHorizontal: 22,
                            paddingVertical: 12,
                            borderRadius: 10,
                            marginTop: 10,
                        }}
                        onPress={() =>
                            navigation.navigate("VendorBusinessInfoUpdating", {
                                user: userInfo,
                            })
                        }
                    >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>
                            Share Business Info
                        </Text>
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

                <Section title="Store Address" icon="location-outline">
                    <View style={s.addrBlock}>
                        <Text style={s.addrMain}>{addr.addressLine1}</Text>
                        {addr.addressLine2 ? <Text style={s.addrSub}>{addr.addressLine2}</Text> : null}
                        {addr.landmark ? <Text style={s.addrLandmark}>Near {addr.landmark}</Text> : null}
                        <Text style={s.addrCity}>
                            {addr.city}, {addr.state} — {addr.postalCode}
                        </Text>
                        <Text style={s.addrCountry}>{addr.country}</Text>
                    </View>
                    {hasMapCoords && (
                        <TouchableOpacity style={s.mapBtn} onPress={openMap} activeOpacity={0.8}>
                            <Ionicons name="navigate-outline" size={14} color="#fff" />
                            <Text style={s.mapBtnText}>Open in Maps</Text>
                        </TouchableOpacity>
                    )}
                </Section>

                <Section title="Working Schedule" icon="time-outline">
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

            {userInfo && (
                <EditProfileSheet
                    visible={editSheetVisible}
                    user={userInfo}
                    onClose={() => setEditSheetVisible(false)}
                    onSaved={(updated) => setUserInfo(updated)}
                />
            )}
        </SafeAreaView>
    );
};

// ─── Atoms StyleSheet ─────────────────────────────────────────────────────────

const a = StyleSheet.create({
    pill: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        gap: 5,
    },
    dot: { width: 5, height: 5, borderRadius: 3 },
    pillText: { fontSize: 11, fontWeight: "600" },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.formBorder,
    },
    rowLabel: { fontSize: 13, color: colors.label, fontWeight: "400", flex: 1 },
    rowValue: {
        fontSize: 13,
        color: colors.secondary,
        fontWeight: "600",
        flex: 1,
        textAlign: "right",
        marginLeft: 12,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.formBorder,
        marginVertical: 14,
    },
});

// ─── Layout StyleSheet ────────────────────────────────────────────────────────

const s = StyleSheet.create({
    hero: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        gap: 14,
    },
    avatarWrap: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: colors.primary + "18",
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    avatarText: { fontSize: 18, fontWeight: "700", color: colors.primary, letterSpacing: -0.5 },
    heroInfo: { flex: 1, gap: 1 },
    heroName: { fontSize: 17, fontWeight: "700", color: colors.secondary, letterSpacing: -0.3 },
    heroOwner: { fontSize: 12, color: colors.placeholder },
    heroType: { fontSize: 12, color: colors.placeholder, marginBottom: 6 },
    heroMeta: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    strip: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: colors.formBg,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.formBorder,
    },
    statCell: { flex: 1, alignItems: "center", paddingVertical: 12 },
    statValue: { fontSize: 13, fontWeight: "700", color: colors.secondary },
    statLabel: { fontSize: 10, color: colors.placeholder, marginTop: 1 },
    stripDivider: {
        width: StyleSheet.hairlineWidth,
        backgroundColor: colors.formBorder,
        marginVertical: 8,
    },
    card: {
        backgroundColor: "#ffffff",
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.formBorder,
        overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 11,
        gap: 9,
        backgroundColor: colors.formBg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.formBorder,
    },
    iconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.primary + "15",
        justifyContent: "center",
        alignItems: "center",
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: colors.secondary,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    cardBody: { paddingHorizontal: 14 },
    editIconBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: colors.primary + "12",
    },
    editIconText: { fontSize: 11, fontWeight: "700", color: colors.primary },
    userCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + "18",
        justifyContent: "center",
        alignItems: "center",
    },
    userAvatarText: { fontSize: 14, fontWeight: "700", color: colors.primary },
    userName: { fontSize: 14, fontWeight: "700", color: colors.secondary },
    userRole: { fontSize: 11, color: colors.placeholder, marginTop: 1 },
    addrBlock: { marginBottom: 10 },
    addrMain: { fontSize: 14, fontWeight: "600", color: colors.secondary, marginBottom: 2 },
    addrSub: { fontSize: 13, color: colors.label, marginBottom: 2 },
    addrLandmark: { fontSize: 12, color: colors.placeholder, fontStyle: "italic", marginBottom: 4 },
    addrCity: { fontSize: 13, color: colors.secondary, fontWeight: "500" },
    addrCountry: { fontSize: 12, color: colors.placeholder },
    mapBtn: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: colors.primary,
        marginTop: 10,
        marginBottom: 4,
    },
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
    kycRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: colors.formBg,
    },
    kycDot: { width: 7, height: 7, borderRadius: 4 },
    kycLabel: { flex: 1, fontSize: 13, color: colors.secondary, fontWeight: "500" },
    kycStatus: { fontSize: 11, fontWeight: "700" },
    retryBtn: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

// ─── Bottom Sheet StyleSheet ──────────────────────────────────────────────────

const bs = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "85%",
        paddingTop: 12,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.formBorder,
        alignSelf: "center",
        marginBottom: 12,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.formBorder,
        marginBottom: 16,
    },
    title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.secondary },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.formBg,
        justifyContent: "center",
        alignItems: "center",
    },
    fieldRow: { flexDirection: "row", gap: 12 },
    fieldWrap: { marginBottom: 14 },
    label: { fontSize: 12, fontWeight: "600", color: colors.label, marginBottom: 6 },
    input: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.formBorder,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === "ios" ? 12 : 10,
        fontSize: 14,
        color: colors.secondary,
        backgroundColor: colors.formBg,
    },
    // Calendar icon positioned inside the date input
    inputIconRight: {
        position: "absolute",
        right: 12,
        top: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    // iOS date picker sheet
    iosSheet: {
        backgroundColor: colors.scaffoldBg,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 24,
    },
    iosSheetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.formBorder,
    },
    iosSheetTitle: { fontSize: 15, fontWeight: "700", color: colors.secondary },
    iosCancelBtn: { fontSize: 15, color: colors.placeholder },
    iosConfirmBtn: { fontSize: 15, fontWeight: "700", color: colors.primary },
    saveBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
    },
    saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

export default VendorProfileScreen;