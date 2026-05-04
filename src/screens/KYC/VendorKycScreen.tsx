// screens/vendor/VendorKycScreen.tsx
import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    ScrollView,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Alert,
    Image,
    TextInput
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";
import {
    launchImageLibrary,
    launchCamera,
    ImagePickerResponse,
    Asset,
} from "react-native-image-picker";
import { colors } from "../../constants/AppThem";
import AppBar from "../../components/utils/AppBar";
import FloatingInput from "../../components/inputs/FloatingInput";
import { getUserData } from "../../components/AsyncStorage/AsyncStorage";
import { getRequest, putRequest, uploadRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";

// ─── Types ────────────────────────────────────────────────────────────────────

type KycDocField =
    | "panCard"
    | "gstCertificate"
    | "cancelledCheque"
    | "aadhaarCard"
    | "storeRegistration"
    | "tradeLicense"
    | "udyamAadhaar"
    | "shopActLicense"
    | "certificateOfIncorporation";

type UploadedFile = {
    uri: string;
    name: string;
    type: string;
};

type OtherDocument = {
    id: string;
    label: string;
    file: UploadedFile;
};


type KycFilesState = Partial<Record<KycDocField, UploadedFile>>;

type BankDetails = {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
};

// ─── KYC Document Config ──────────────────────────────────────────────────────
// required: true  → mandatory (only Aadhaar)
// required: false → optional

const KYC_DOC_CONFIG: Record<
    KycDocField,
    { label: string; icon: string; required: boolean; hint: string }
> = {
    aadhaarCard: {
        label: "Aadhaar Card",
        icon: "finger-print-outline",
        required: true,
        hint: "Front side of your Aadhaar card",
    },
    panCard: {
        label: "PAN Card",
        icon: "card-outline",
        required: true,
        hint: "Upload a clear image of your PAN card",
    },
    gstCertificate: {
        label: "GST Certificate",
        icon: "document-text-outline",
        required: false,
        hint: "GST registration certificate",
    },
    cancelledCheque: {
        label: "Cancelled Cheque",
        icon: "checkmark-done-circle-outline",
        required: false,
        hint: "Cancelled cheque or bank passbook front page",
    },
    storeRegistration: {
        label: "Store Registration",
        icon: "storefront-outline",
        required: false,
        hint: "Store / Business registration document",
    },
    tradeLicense: {
        label: "Trade License",
        icon: "ribbon-outline",
        required: false,
        hint: "Valid trade license from local authority",
    },
    udyamAadhaar: {
        label: "Udyam Aadhaar / MSME",
        icon: "business-outline",
        required: false,
        hint: "Udyam registration certificate",
    },
    shopActLicense: {
        label: "Shop Act License",
        icon: "home-outline",
        required: false,
        hint: "Shops and Establishments Act registration",
    },
    certificateOfIncorporation: {
        label: "Certificate of Incorporation",
        icon: "briefcase-outline",
        required: false,
        hint: "Issued by Ministry of Corporate Affairs",
    },
};

// Fixed display order — Aadhaar first as it is the only required doc
const ALL_DOC_FIELDS: KycDocField[] = [
    "aadhaarCard",
    "panCard",
    "gstCertificate",
    "cancelledCheque",
    "storeRegistration",
    "tradeLicense",
    "udyamAadhaar",
    "shopActLicense",
    "certificateOfIncorporation",
];

// ─── Page Header ──────────────────────────────────────────────────────────────

const PageHeader = () => (
    <View style={headerStyles.container}>
        <View style={headerStyles.badge}>
            <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={colors.primary}
                style={{ marginRight: 5 }}
            />
            <Text style={headerStyles.eyebrow}>KYC Verification</Text>
        </View>
        <Text style={headerStyles.title}>Submit KYC Documents</Text>
        <Text style={headerStyles.subtitle}>
            Upload your business documents and bank details to verify your vendor
            account. Approved accounts unlock full selling features.
        </Text>
    </View>
);

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
        fontWeight: "400",
    },
});

// ─── Document Upload Card ─────────────────────────────────────────────────────

const DocumentUploadCard = ({
    field,
    file,
    onPick,
    onRemove,
}: {
    field: KycDocField;
    file?: UploadedFile;
    onPick: (field: KycDocField) => void;
    onRemove: (field: KycDocField) => void;
}) => {
    const config = KYC_DOC_CONFIG[field];
    const isUploaded = !!file;

    return (
        <View
            style={[
                docStyles.card,
                isUploaded
                    ? docStyles.cardUploaded
                    : config.required
                        ? docStyles.cardRequired
                        : null,
            ]}
        >
            {/* Header */}
            <View style={docStyles.header}>
                <View style={[docStyles.iconBg, isUploaded && docStyles.iconBgUploaded]}>
                    <Ionicons
                        name={(isUploaded ? "checkmark-outline" : config.icon) as any}
                        size={20}
                        color={isUploaded ? "#fff" : colors.primary}
                    />
                </View>

                <View style={{ flex: 1 }}>
                    <View style={docStyles.labelRow}>
                        <Text style={docStyles.docLabel}>{config.label}</Text>
                        <View
                            style={[
                                docStyles.badge,
                                config.required ? docStyles.badgeRequired : docStyles.badgeOptional,
                            ]}
                        >
                            <Text
                                style={[
                                    docStyles.badgeText,
                                    config.required
                                        ? docStyles.badgeTextRequired
                                        : docStyles.badgeTextOptional,
                                ]}
                            >
                                {config.required ? "Required" : "Optional"}
                            </Text>
                        </View>
                    </View>
                    <Text style={docStyles.hint}>{config.hint}</Text>
                </View>
            </View>

            {/* Upload area */}
            {isUploaded ? (
                <View style={docStyles.uploadedRow}>
                    {file.type.startsWith("image/") ? (
                        <Image
                            source={{ uri: file.uri }}
                            style={docStyles.thumb}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={docStyles.pdfPreview}>
                            <Ionicons name="document-outline" size={22} color={colors.primary} />
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={docStyles.fileName} numberOfLines={1}>
                            {file.name}
                        </Text>
                        <Text style={docStyles.fileStatus}>✓ Ready to upload</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => onRemove(field)}
                        style={docStyles.removeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    style={docStyles.uploadBtn}
                    onPress={() => onPick(field)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                    <Text style={docStyles.uploadBtnText}>Select File</Text>
                    <Text style={docStyles.uploadFormats}>JPG · PNG · PDF</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const docStyles = StyleSheet.create({
    card: {
        backgroundColor: colors.formBg,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        padding: 16,
        marginBottom: 12,
    },
    cardRequired: {
        borderColor: "#FECACA",
        backgroundColor: "#FFF8F8",
    },
    cardUploaded: {
        borderColor: "#86EFAC",
        backgroundColor: "#F0FDF4",
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 12,
    },
    iconBg: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    iconBgUploaded: {
        backgroundColor: "#22C55E",
    },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
    },
    docLabel: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.secondary,
    },
    badge: {
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    badgeRequired: { backgroundColor: "#FEE2E2" },
    badgeOptional: { backgroundColor: "#F1F5F9" },
    badgeText: { fontSize: 10, fontWeight: "700" },
    badgeTextRequired: { color: "#DC2626" },
    badgeTextOptional: { color: "#64748B" },
    hint: {
        fontSize: 12,
        color: colors.placeholder,
        marginTop: 3,
        lineHeight: 16,
    },
    uploadBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderWidth: 1.5,
        borderColor: colors.primary,
        borderStyle: "dashed",
        borderRadius: 10,
        paddingVertical: 13,
        backgroundColor: "#EFF6FF",
    },
    uploadBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.primary,
    },
    uploadFormats: { fontSize: 11, color: colors.placeholder },
    uploadedRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#DCFCE7",
        borderRadius: 10,
        padding: 10,
    },
    thumb: { width: 44, height: 44, borderRadius: 8 },
    pdfPreview: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
    },
    fileName: { fontSize: 13, fontWeight: "600", color: colors.secondary },
    fileStatus: { fontSize: 12, color: "#16A34A", fontWeight: "500", marginTop: 2 },
    removeBtn: { padding: 2 },
});

// ─── Progress Indicator ───────────────────────────────────────────────────────

const KycProgress = ({ uploaded, total }: { uploaded: number; total: number }) => {
    const pct = total === 0 ? 0 : Math.round((uploaded / total) * 100);
    const remaining = total - uploaded;
    return (
        <View style={progressStyles.container}>
            <View style={progressStyles.row}>
                <Text style={progressStyles.label}>Documents Uploaded</Text>
                <Text style={progressStyles.count}>
                    {uploaded} / {total}
                </Text>
            </View>
            <View style={progressStyles.track}>
                <View style={[progressStyles.fill, { width: `${pct}%` as any }]} />
            </View>
            <Text style={progressStyles.sub}>
                {remaining === 0
                    ? "All documents uploaded"
                    : `${remaining} optional document${remaining > 1 ? "s" : ""} remaining`}
            </Text>
        </View>
    );
};

const progressStyles = StyleSheet.create({
    container: { marginBottom: 20 },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    label: { fontSize: 13, fontWeight: "600", color: colors.secondary },
    count: { fontSize: 13, fontWeight: "700", color: colors.primary },
    track: {
        height: 6,
        backgroundColor: colors.formBorder,
        borderRadius: 4,
        overflow: "hidden",
    },
    fill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
    sub: { fontSize: 11, color: colors.placeholder, marginTop: 5 },
});

// ─── Shared styles ────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
    card: {
        backgroundColor: colors.scaffoldBg,
        marginHorizontal: 20,
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.primary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 16,
        marginTop: 8,
    },
    infoBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#EFF6FF",
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: colors.primary,
        lineHeight: 18,
        fontWeight: "500",
    },
    warningBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#FFFBEB",
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: "#FDE68A",
    },
    warningText: {
        flex: 1,
        fontSize: 12,
        color: "#92400E",
        lineHeight: 18,
        fontWeight: "500",
    },
    sectionDivider: {
        height: 1,
        backgroundColor: colors.formBorder,
        marginHorizontal: 20,
        marginBottom: 20,
    },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const VendorKycScreen = ({ navigation, route }: any) => {
    const insets = useSafeAreaInsets();
    const vendorId: string = route?.params?.vendorId ?? "";
    const [initialLoading, setInitialLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [kycFiles, setKycFiles] = useState<KycFilesState>({});
    const [bankDetails, setBankDetails] = useState<BankDetails>({
        accountHolder: "",
        bankName: "",
        accountNumber: "",
        ifsc: "",
    });
    const [otherDocs, setOtherDocs] = useState<OtherDocument[]>([]);
    const [otherDocLabel, setOtherDocLabel] = useState("");

    const uploadedCount = ALL_DOC_FIELDS.filter((d) => kycFiles[d]).length;

    // ── File Picker ──────────────────────────────────────────────────────────

    const handlePickFile = useCallback((field: KycDocField) => {
        Alert.alert("Select Document", "Choose how you want to upload", [
            {
                text: "Camera",
                onPress: () =>
                    launchCamera(
                        { mediaType: "photo", quality: 0.8, saveToPhotos: false },
                        (res: ImagePickerResponse) => applyPickerResult(res, field)
                    ),
            },
            {
                text: "Gallery",
                onPress: () =>
                    launchImageLibrary(
                        { mediaType: "mixed", quality: 0.8 },
                        (res: ImagePickerResponse) => applyPickerResult(res, field)
                    ),
            },
            { text: "Cancel", style: "cancel" },
        ]);
    }, []);
    useEffect(() => {
        loadUser();
    }, []);
    const loadUser = async () => {
        try {
            const { user } = await getUserData();

            if (user?.user?._id) {
                const res: any = await getRequest(
                    `${API_ENDPOINTS.VENDORPROFILEGET}/${user.user._id}`
                );

                if (res?.success) {
                    const vendor = res.data.vendor;

                    // ✅ PATCH BANK DETAILS
                    if (vendor?.bankDetails) {
                        setBankDetails({
                            accountHolder: vendor.bankDetails.accountHolder || "",
                            bankName: vendor.bankDetails.bankName || "",
                            accountNumber: vendor.bankDetails.accountNumber || "",
                            ifsc: vendor.bankDetails.ifsc || "",
                        });
                    }

                    // (Optional future) mark KYC already submitted
                    if (vendor?.isKycSubmitted) {
                        console.log("KYC already submitted");
                    }
                }
            }
        } catch (err) {
            console.log("KYC load error:", err);
        } finally {
            setInitialLoading(false);
        }
    };
    const applyPickerResult = (res: ImagePickerResponse, field: KycDocField) => {
        if (res.didCancel || res.errorCode) return;
        const asset: Asset | undefined = res.assets?.[0];
        if (!asset?.uri) return;
        setKycFiles((prev) => ({
            ...prev,
            [field]: {
                uri: asset.uri!,
                name: asset.fileName ?? `${field}_${Date.now()}.jpg`,
                type: asset.type ?? "image/jpeg",
            },
        }));
    };

    const handleRemoveFile = useCallback((field: KycDocField) => {
        setKycFiles((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }, []);

    const handleAddOtherDoc = useCallback(() => {
        if (!otherDocLabel.trim()) {
            Toast.show({ type: "error", text1: "Label Required", text2: "Enter a name for this document" });
            return;
        }
        Alert.alert("Select Document", "Choose how you want to upload", [
            {
                text: "Camera",
                onPress: () =>
                    launchCamera({ mediaType: "photo", quality: 0.8 }, (res) =>
                        applyOtherDoc(res)
                    ),
            },
            {
                text: "Gallery",
                onPress: () =>
                    launchImageLibrary({ mediaType: "mixed", quality: 0.8 }, (res) =>
                        applyOtherDoc(res)
                    ),
            },
            { text: "Cancel", style: "cancel" },
        ]);
    }, [otherDocLabel]);

    const applyOtherDoc = (res: ImagePickerResponse) => {
        if (res.didCancel || res.errorCode) return;
        const asset = res.assets?.[0];
        if (!asset?.uri) return;
        setOtherDocs((prev) => [
            ...prev,
            {
                id: Date.now().toString(),
                label: otherDocLabel.trim(),
                file: {
                    uri: asset.uri!,
                    name: asset.fileName ?? `other_${Date.now()}.jpg`,
                    type: asset.type ?? "image/jpeg",
                },
            },
        ]);
        setOtherDocLabel("");
    };

    const handleRemoveOtherDoc = useCallback((id: string) => {
        setOtherDocs((prev) => prev.filter((d) => d.id !== id));
    }, []);

    // ── Bank Detail Change ────────────────────────────────────────────────────

    const handleBankChange = (field: keyof BankDetails, value: string) => {
        setBankDetails((prev) => ({ ...prev, [field]: value }));
    };

    // ── Validation ────────────────────────────────────────────────────────────

    const validateForm = (): boolean => {
        if (!kycFiles["panCard"]) {
            Toast.show({
                type: "error",
                text1: "PAN Card Required",
                text2: "Please upload your PAN card to proceed",
            });
            return false;
        }
        if (!kycFiles["aadhaarCard"]) {
            Toast.show({
                type: "error",
                text1: "Aadhaar Card Required",
                text2: "Please upload your Aadhaar card to proceed",
            });
            return false;
        }
        if (!bankDetails.accountHolder.trim()) {
            Toast.show({ type: "error", text1: "Bank Details", text2: "Account holder name is required" });
            return false;
        }
        if (!bankDetails.bankName.trim()) {
            Toast.show({ type: "error", text1: "Bank Details", text2: "Bank name is required" });
            return false;
        }
        if (!/^\d{9,18}$/.test(bankDetails.accountNumber.trim())) {
            Toast.show({
                type: "error",
                text1: "Bank Details",
                text2: "Enter a valid account number (9–18 digits)",
            });
            return false;
        }
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifsc.trim().toUpperCase())) {
            Toast.show({
                type: "error",
                text1: "Bank Details",
                text2: "Enter a valid IFSC code (e.g. SBIN0123456)",
            });
            return false;
        }
        return true;
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!validateForm()) return;

        let id = vendorId;
        if (!id) {
            const { user } = await getUserData();
            id = user?.user?._id ?? "";
        }

        if (!id) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Vendor ID not found. Please re-login.",
            });
            return;
        }

        setLoading(true);

        try {
            // ── Step 1: Upload KYC Documents ────────────────────────────────
            const formData = new FormData();
            (Object.keys(kycFiles) as KycDocField[]).forEach((field) => {
                const file = kycFiles[field];
                if (!file) return;

                // Backend expects all files under "kycDocuments"
                formData.append("kycDocuments", {
                    uri: file.uri,
                    name: file.name,
                    type: file.type,
                } as any);
            });

            otherDocs.forEach((doc) => {
                formData.append("kycDocuments", {
                    uri: doc.file.uri,
                    name: doc.file.name,
                    type: doc.file.type,
                } as any);
            });


            const kycRes = await uploadRequest(
                `${API_ENDPOINTS.VENDORKYCDOCUMENTSUPLOAD}`,
                formData
            );

            if (!kycRes?.success) {
                Toast.show({
                    type: "error",
                    text1: "KYC Upload Failed",
                    text2: kycRes?.message || "Could not submit documents",
                });
                setLoading(false);
                return;
            }

            const bankRes: any = await putRequest(
                `${API_ENDPOINTS.VENDORPROFILEUPDATE}/${id}`,
                {
                    bankDetails: {
                        accountHolder: bankDetails.accountHolder.trim(),
                        bankName: bankDetails.bankName.trim(),
                        accountNumber: bankDetails.accountNumber.trim(),
                        ifsc: bankDetails.ifsc.trim().toUpperCase(),
                    },
                }
            );

            setLoading(false);

            if (bankRes?.success) {
                Toast.show({
                    type: "success",
                    text1: "KYC Submitted!",
                    text2: "Your documents are under review.",
                });
                navigation.goBack();
            } else {
                Toast.show({
                    type: "error",
                    text1: "Bank Update Failed",
                    text2:
                        bankRes?.message ||
                        "Documents saved but bank details failed. Please retry.",
                });
            }
        } catch (err: any) {
            setLoading(false);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: err?.message || "Something went wrong. Please try again.",
            });
        }
    };

    const isSubmitEnabled =
        !!kycFiles["aadhaarCard"] &&
        !!kycFiles["panCard"] &&           // ← add this
        bankDetails.accountHolder.trim().length > 0 &&
        bankDetails.bankName.trim().length > 0 &&
        bankDetails.accountNumber.trim().length > 0 &&
        bankDetails.ifsc.trim().length > 0 &&
        !loading;

    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: colors.scaffoldBg }}
            edges={["bottom"]}
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <AppBar title="KYC Verification" onBack={() => navigation.goBack()} />

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    automaticallyAdjustKeyboardInsets
                >
                    <PageHeader />

                    {/* ── Bank Details ───────────────────────────────────────── */}
                    <View style={localStyles.card}>
                        <Text style={localStyles.sectionLabel}>Bank Details</Text>

                        <View style={localStyles.infoBox}>
                            <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
                            <Text style={localStyles.infoText}>
                                Your bank details are securely stored and used only for payouts.
                            </Text>
                        </View>

                        <FloatingInput
                            label="Account Holder Name *"
                            placeholder="As per bank records"
                            value={bankDetails.accountHolder}
                            onChangeText={(t: string) => handleBankChange("accountHolder", t)}
                            rightIcon={
                                <Ionicons name="person-outline" size={18} color={colors.placeholder} />
                            }
                        />

                        <FloatingInput
                            label="Bank Name *"
                            placeholder="e.g. State Bank of India"
                            value={bankDetails.bankName}
                            onChangeText={(t: string) => handleBankChange("bankName", t)}
                            rightIcon={
                                <Ionicons name="business-outline" size={18} color={colors.placeholder} />
                            }
                        />

                        <FloatingInput
                            label="Account Number *"
                            placeholder="9 to 18 digit account number"
                            value={bankDetails.accountNumber}
                            onChangeText={(t: string) =>
                                handleBankChange("accountNumber", t.replace(/\D/g, ""))
                            }
                            keyboardType="numeric"
                            secureTextEntry
                            rightIcon={
                                <Ionicons name="key-outline" size={18} color={colors.placeholder} />
                            }
                        />

                        <FloatingInput
                            label="IFSC Code *"
                            placeholder="e.g. SBIN0001234"
                            value={bankDetails.ifsc}
                            onChangeText={(t: string) =>
                                handleBankChange("ifsc", t.toUpperCase().replace(/\s/g, ""))
                            }
                            autoCapitalize="characters"
                            rightIcon={
                                <Ionicons name="barcode-outline" size={18} color={colors.placeholder} />
                            }
                        />
                    </View>

                    <View style={localStyles.sectionDivider} />

                    {/* ── KYC Documents ──────────────────────────────────────── */}
                    <View style={localStyles.card}>
                        <Text style={localStyles.sectionLabel}>KYC Documents</Text>

                        <KycProgress
                            uploaded={uploadedCount}
                            total={ALL_DOC_FIELDS.length}
                        />

                        <View style={localStyles.infoBox}>
                            <Ionicons
                                name="information-circle-outline"
                                size={16}
                                color={colors.primary}
                            />
                            <Text style={localStyles.infoText}>
                                Aadhaar Card is mandatory. All other documents are optional but help
                                speed up account verification.
                            </Text>
                        </View>

                        <View style={localStyles.warningBox}>
                            <Ionicons name="warning-outline" size={16} color="#D97706" />
                            <Text style={localStyles.warningText}>
                                Upload clear, high-quality images. Blurry or cropped documents will
                                be rejected.
                            </Text>
                        </View>

                        {ALL_DOC_FIELDS.map((field) => (
                            <DocumentUploadCard
                                key={field}
                                field={field}
                                file={kycFiles[field]}
                                onPick={handlePickFile}
                                onRemove={handleRemoveFile}
                            />
                        ))}

                        {/* ── Other Documents ── */}
                        <View style={{ marginTop: 8, marginBottom: 4 }}>
                            <View style={localStyles.sectionDivider} />
                            <Text style={otherSectionStyles.sectionLabel}>Other Documents (Optional)</Text>

                            <View style={localStyles.infoBox}>
                                <Ionicons name="attach-outline" size={16} color={colors.primary} />
                                <Text style={localStyles.infoText}>
                                    Add any additional documents relevant to your business (e.g. Partnership Deed, NOC).
                                </Text>
                            </View>

                            {/* Label + Pick button */}
                            <View style={otherSectionStyles.inputRow}>
                                <TextInput
                                    style={otherSectionStyles.labelInput}
                                    placeholder="Document name (e.g. NOC)"
                                    placeholderTextColor={colors.placeholder}
                                    value={otherDocLabel}
                                    onChangeText={setOtherDocLabel}
                                />
                                <TouchableOpacity
                                    style={otherSectionStyles.addBtn}
                                    onPress={handleAddOtherDoc}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                                    <Text style={otherSectionStyles.addBtnText}>Pick</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Uploaded other docs list */}
                            {otherDocs.length === 0 ? (
                                <Text style={otherSectionStyles.emptyHint}>
                                    No extra documents added yet
                                </Text>
                            ) : (
                                otherDocs.map((doc) => (
                                    <View key={doc.id} style={otherSectionStyles.docRow}>
                                        {doc.file.type.startsWith("image/") ? (
                                            <Image
                                                source={{ uri: doc.file.uri }}
                                                style={otherSectionStyles.thumb}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={otherSectionStyles.pdfPreview}>
                                                <Ionicons name="document-outline" size={22} color={colors.primary} />
                                            </View>
                                        )}
                                        <View style={otherSectionStyles.docInfo}>
                                            <Text style={otherSectionStyles.docLabel}>{doc.label}</Text>
                                            <Text style={otherSectionStyles.docName} numberOfLines={1}>
                                                {doc.file.name}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={otherSectionStyles.removeBtn}
                                            onPress={() => handleRemoveOtherDoc(doc.id)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="close-circle" size={22} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* ── Submit Button ── */}
                        <TouchableOpacity
                            style={[
                                screenStyles.primaryBtn,
                                !isSubmitEnabled && screenStyles.primaryBtnDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={!isSubmitEnabled}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons
                                        name="shield-checkmark-outline"
                                        size={18}
                                        color="#fff"
                                        style={{ marginRight: 8 }}
                                    />
                                    <Text style={screenStyles.primaryBtnText}>
                                        Submit KYC for Review
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <Text style={screenStyles.disclaimer}>
                            By submitting, you confirm that all provided documents are authentic
                            and belong to your business.
                        </Text>
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
    primaryBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
    primaryBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    disclaimer: {
        fontSize: 11,
        color: colors.placeholder,
        textAlign: "center",
        marginTop: 12,
        lineHeight: 16,
        paddingHorizontal: 8,
        marginBottom: 4,
    },
});
const otherSectionStyles = StyleSheet.create({
    sectionLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.primary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 12,
        marginTop: 8,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 14,
    },
    labelInput: {
        flex: 1,
        backgroundColor: colors.formBg,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.secondary,
    },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#EFF6FF",
        borderWidth: 1.5,
        borderColor: colors.primary,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    addBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.primary,
    },
    docRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#F0FDF4",
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#86EFAC",
        padding: 12,
        marginBottom: 10,
    },
    thumb: { width: 44, height: 44, borderRadius: 8 },
    pdfPreview: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
    },
    docInfo: { flex: 1 },
    docLabel: { fontSize: 13, fontWeight: "700", color: colors.secondary },
    docName: { fontSize: 11, color: colors.placeholder, marginTop: 2 },
    removeBtn: { padding: 4 },
    emptyHint: {
        fontSize: 12,
        color: colors.placeholder,
        textAlign: "center",
        paddingVertical: 16,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.formBorder,
        borderRadius: 10,
        marginBottom: 8,
    },
});
export default VendorKycScreen;
