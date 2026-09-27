import React, { useCallback, useState } from "react";
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
    Linking,
    RefreshControl,
    TextInput,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
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
import {
    getRequest,
    putRequest,
    uploadRequest,
} from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";

type VendorKycDocField =
    | "gstCertificate"
    | "panCard"
    | "cancelledCheque"
    | "storeRegistration"
    | "aadhaarCard"
    | "tradeLicense"
    | "udyamAadhaar"
    | "shopActLicense"
    | "certificateOfIncorporation"
    | "other";

type UploadedFile = {
    uri: string;
    name: string;
    type: string;
};

type ExistingKycDocument = {
    key: VendorKycDocField;
    label: string;
    fileUrl?: string;
    fileKey?: string;
    previewUrl?: string;
    originalName?: string;
    mimeType?: string;
    status?: "pending" | "approved" | "rejected";
    adminRemark?: string;
    updatedAt?: string;
};

type KycFilesState = Partial<Record<VendorKycDocField, UploadedFile>>;
type ExistingKycState = Partial<Record<VendorKycDocField, ExistingKycDocument>>;

type BankDetails = {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
};

const KYC_DOC_CONFIG: Record<
    VendorKycDocField,
    { label: string; icon: string; required: boolean; hint: string }
> = {
    aadhaarCard: {
        label: "Aadhaar Card",
        icon: "finger-print-outline",
        required: false,
        hint: "Upload clear Aadhaar card image",
    },
    panCard: {
        label: "PAN Card",
        icon: "card-outline",
        required: true,
        hint: "Upload clear PAN card image",
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
        hint: "Store or business registration document",
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
    other: {
        label: "Other Document",
        icon: "attach-outline",
        required: false,
        hint: "Any additional business document",
    },
};

const ALL_DOC_FIELDS: VendorKycDocField[] = [
    "aadhaarCard",
    "panCard",
    "gstCertificate",
    "cancelledCheque",
    "storeRegistration",
    "tradeLicense",
    "udyamAadhaar",
    "shopActLicense",
    "certificateOfIncorporation",
    "other",
];

const REQUIRED_DOC_FIELDS: VendorKycDocField[] = ALL_DOC_FIELDS.filter(
    (field) => KYC_DOC_CONFIG[field].required
);

const showToast = (
    type: "success" | "error" | "info",
    text1: string,
    text2?: string
) => {
    Toast.show({
        type,
        text1,
        text2,
    });
};

const getLoggedUserIdFromStorage = async () => {
    const stored: any = await getUserData();

    return (
        stored?.user?.user?._id ||
        stored?.user?._id ||
        stored?.user?.id ||
        stored?.userId ||
        stored?._id ||
        ""
    );
};

const normalizeVendorProfileResponse = (res: any) => {
    return (
        res?.vendor ||
        res?.data?.vendor ||
        res?.data?.data?.vendor ||
        res?.data?.vendorProfile ||
        res?.data?.profile ||
        res?.data?.data?.vendorProfile ||
        res?.data?.data?.profile ||
        res?.data?.data ||
        res?.data ||
        null
    );
};

const normalizePreviewData = (res: any) => {
    return (
        res?.data?.data ||
        res?.data?.vendor ||
        res?.data?.vendorProfile ||
        res?.data ||
        res ||
        null
    );
};

const buildExistingDocsFromKycObject = (kycDocuments: any): ExistingKycState => {
    const docsMap: ExistingKycState = {};

    if (!kycDocuments || typeof kycDocuments !== "object") {
        return docsMap;
    }

    ALL_DOC_FIELDS.forEach((key) => {
        const doc = kycDocuments?.[key];

        if (!doc?.fileUrl && !doc?.previewUrl) return;

        docsMap[key] = {
            key,
            label: KYC_DOC_CONFIG[key].label,
            fileUrl: doc.fileUrl || doc.previewUrl || "",
            fileKey: doc.fileKey || "",
            previewUrl: doc.previewUrl || doc.fileUrl || "",
            originalName: doc.originalName || KYC_DOC_CONFIG[key].label,
            mimeType: doc.mimeType || "",
            status: doc.status || "pending",
            adminRemark: doc.adminRemark || "",
            updatedAt: doc.updatedAt || "",
        };
    });

    return docsMap;
};

const buildExistingDocsFromPreviewArray = (documents: any[]): ExistingKycState => {
    const docsMap: ExistingKycState = {};

    if (!Array.isArray(documents)) {
        return docsMap;
    }

    documents.forEach((doc: ExistingKycDocument) => {
        if (!doc?.key) return;

        docsMap[doc.key] = {
            ...doc,
            key: doc.key,
            label: doc.label || KYC_DOC_CONFIG[doc.key]?.label || String(doc.key),
            fileUrl: doc.fileUrl || doc.previewUrl || "",
            previewUrl: doc.previewUrl || doc.fileUrl || "",
            originalName:
                doc.originalName ||
                doc.label ||
                KYC_DOC_CONFIG[doc.key]?.label ||
                String(doc.key),
            mimeType: doc.mimeType || "",
            status: doc.status || "pending",
            adminRemark: doc.adminRemark || "",
            updatedAt: doc.updatedAt || "",
        };
    });

    return docsMap;
};

const getStatusStyle = (status?: string) => {
    switch (status) {
        case "approved":
            return {
                bg: "#DCFCE7",
                text: "#16A34A",
                icon: "checkmark-circle-outline",
                label: "Approved",
            };
        case "rejected":
            return {
                bg: "#FEE2E2",
                text: "#DC2626",
                icon: "close-circle-outline",
                label: "Rejected",
            };
        default:
            return {
                bg: "#FEF3C7",
                text: "#D97706",
                icon: "time-outline",
                label: "Pending",
            };
    }
};

const PageHeader = ({
    isKycSubmitted,
    isKycApproved,
    profileStatus,
    storeName,
}: {
    isKycSubmitted: boolean;
    isKycApproved: boolean;
    profileStatus: string;
    storeName: string;
}) => {
    const getStatusText = () => {
        if (isKycApproved) return "Verified";
        if (isKycSubmitted) return profileStatus || "Pending Review";
        return "Not Submitted";
    };

    const statusColor = isKycApproved
        ? "#16A34A"
        : isKycSubmitted
            ? "#D97706"
            : "#EF4444";

    return (
        <View style={headerStyles.container}>
            <View style={headerStyles.badge}>
                <Ionicons
                    name="shield-checkmark-outline"
                    size={14}
                    color={colors.primary}
                    style={{ marginRight: 5 }}
                />
                <Text style={headerStyles.eyebrow}>Vendor Verification</Text>
            </View>

            <Text style={headerStyles.title}>Submit Vendor KYC</Text>

            <Text style={headerStyles.subtitle}>
                {storeName
                    ? `${storeName} needs verified bank details and documents before full selling access.`
                    : "Complete your bank details and upload business documents to verify your vendor account."}
            </Text>

            <View style={headerStyles.statusBox}>
                <Ionicons
                    name={
                        isKycApproved
                            ? "checkmark-circle-outline"
                            : isKycSubmitted
                                ? "time-outline"
                                : "alert-circle-outline"
                    }
                    size={18}
                    color={statusColor}
                />

                <Text style={headerStyles.statusText}>
                    KYC Status: {getStatusText()}
                </Text>
            </View>
        </View>
    );
};

const DocumentUploadCard = ({
    field,
    file,
    existingDoc,
    onPick,
    onRemove,
    onPreview,
}: {
    field: VendorKycDocField;
    file?: UploadedFile;
    existingDoc?: ExistingKycDocument;
    onPick: (field: VendorKycDocField) => void;
    onRemove: (field: VendorKycDocField) => void;
    onPreview: (doc?: ExistingKycDocument) => void;
}) => {
    const config = KYC_DOC_CONFIG[field];
    const isLocalUploaded = !!file;
    const isAlreadySubmitted = !!existingDoc;
    const isUploaded = isLocalUploaded || isAlreadySubmitted;
    const statusStyle = getStatusStyle(existingDoc?.status);

    return (
        <View
            style={[
                docStyles.card,
                isUploaded
                    ? docStyles.cardUploaded
                    : config.required
                        ? docStyles.cardRequired
                        : null,
                existingDoc?.status === "rejected" && docStyles.cardRejected,
            ]}
        >
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
                                config.required
                                    ? docStyles.badgeRequired
                                    : docStyles.badgeOptional,
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

                        {existingDoc && (
                            <View
                                style={[
                                    docStyles.statusBadge,
                                    { backgroundColor: statusStyle.bg },
                                ]}
                            >
                                <Ionicons
                                    name={statusStyle.icon as any}
                                    size={11}
                                    color={statusStyle.text}
                                />
                                <Text
                                    style={[
                                        docStyles.statusBadgeText,
                                        { color: statusStyle.text },
                                    ]}
                                >
                                    {statusStyle.label}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={docStyles.hint}>{config.hint}</Text>

                    {!!existingDoc?.adminRemark && existingDoc.status === "rejected" && (
                        <Text style={docStyles.rejectReason}>
                            Reason: {existingDoc.adminRemark}
                        </Text>
                    )}
                </View>
            </View>

            {isLocalUploaded ? (
                <View style={docStyles.uploadedRow}>
                    {file.type.startsWith("image/") ? (
                        <Image source={{ uri: file.uri }} style={docStyles.thumb} />
                    ) : (
                        <View style={docStyles.pdfPreview}>
                            <Ionicons
                                name="document-outline"
                                size={22}
                                color={colors.primary}
                            />
                        </View>
                    )}

                    <View style={{ flex: 1 }}>
                        <Text style={docStyles.fileName} numberOfLines={1}>
                            {file.name}
                        </Text>
                        <Text style={docStyles.fileStatus}>Ready to upload</Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => onRemove(field)}
                        style={docStyles.removeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            ) : isAlreadySubmitted ? (
                <View style={docStyles.submittedBox}>
                    <View style={docStyles.submittedLeft}>
                        {existingDoc?.mimeType?.startsWith("image/") &&
                            (existingDoc?.previewUrl || existingDoc?.fileUrl) ? (
                            <Image
                                source={{
                                    uri: existingDoc.previewUrl || existingDoc.fileUrl,
                                }}
                                style={docStyles.thumb}
                            />
                        ) : (
                            <View style={docStyles.pdfPreview}>
                                <Ionicons
                                    name="document-outline"
                                    size={22}
                                    color={colors.primary}
                                />
                            </View>
                        )}

                        <View style={{ flex: 1 }}>
                            <Text style={docStyles.fileName} numberOfLines={1}>
                                {existingDoc?.originalName || config.label}
                            </Text>
                            <Text style={docStyles.fileStatus}>Already submitted</Text>
                        </View>
                    </View>

                    <View style={docStyles.actionRow}>
                        <TouchableOpacity
                            style={docStyles.previewBtn}
                            onPress={() => onPreview(existingDoc)}
                            activeOpacity={0.75}
                        >
                            <Ionicons
                                name="eye-outline"
                                size={15}
                                color={colors.primary}
                            />
                            <Text style={docStyles.previewBtnText}>Preview</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={docStyles.replaceBtn}
                            onPress={() => onPick(field)}
                            activeOpacity={0.75}
                        >
                            <Ionicons
                                name="cloud-upload-outline"
                                size={15}
                                color="#D97706"
                            />
                            <Text style={docStyles.replaceBtnText}>Replace</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity
                    style={docStyles.uploadBtn}
                    onPress={() => onPick(field)}
                    activeOpacity={0.75}
                >
                    <Ionicons
                        name="cloud-upload-outline"
                        size={18}
                        color={colors.primary}
                    />
                    <Text style={docStyles.uploadBtnText}>Select File</Text>
                    <Text style={docStyles.uploadFormats}>JPG · PNG</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const KycProgress = ({
    uploaded,
    submitted,
    total,
}: {
    uploaded: number;
    submitted: number;
    total: number;
}) => {
    const completed = Math.max(uploaded, submitted);
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    return (
        <View style={progressStyles.container}>
            <View style={progressStyles.row}>
                <Text style={progressStyles.label}>KYC Progress</Text>
                <Text style={progressStyles.count}>
                    {completed} / {total}
                </Text>
            </View>

            <View style={progressStyles.track}>
                <View style={[progressStyles.fill, { width: `${pct}%` as any }]} />
            </View>

            <Text style={progressStyles.sub}>
                Existing submitted documents can be previewed or replaced.
            </Text>
        </View>
    );
};

const VendorKycScreen = ({ navigation, route }: any) => {
    const insets = useSafeAreaInsets();
    const routeVendorId: string = route?.params?.vendorId ?? "";

    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(false);

    const [vendorProfileId, setVendorProfileId] = useState(routeVendorId);
    const [userId, setUserId] = useState("");
    const [storeName, setStoreName] = useState("");

    const [kycFiles, setKycFiles] = useState<KycFilesState>({});
    const [existingDocs, setExistingDocs] = useState<ExistingKycState>({});

    const [isKycSubmitted, setIsKycSubmitted] = useState(false);
    const [isKycApproved, setIsKycApproved] = useState(false);
    const [profileStatus, setProfileStatus] = useState("pending");

    const [bankDetails, setBankDetails] = useState<BankDetails>({
        accountHolder: "",
        bankName: "",
        accountNumber: "",
        ifsc: "",
    });

    const [showAccountNumber, setShowAccountNumber] = useState(false);

    const localUploadedCount = ALL_DOC_FIELDS.filter((field) => kycFiles[field]).length;
    const submittedCount = ALL_DOC_FIELDS.filter((field) => existingDocs[field]).length;

    const patchVendorProfileToState = useCallback((vendor: any) => {
        if (!vendor) return;

        setVendorProfileId(String(vendor.user));

        if (vendor?.user) {
            setUserId(String(vendor.user));
        }

        setStoreName(vendor?.storeName || "");

        setIsKycSubmitted(!!vendor?.isKycSubmitted);
        setIsKycApproved(!!vendor?.isKycApproved);
        setProfileStatus(vendor?.profileStatus || "pending");

        setBankDetails({
            accountHolder: vendor?.bankDetails?.accountHolder || "",
            bankName: vendor?.bankDetails?.bankName || "",
            accountNumber: vendor?.bankDetails?.accountNumber || "",
            ifsc: vendor?.bankDetails?.ifsc || "",
        });

        const docsFromVendor = buildExistingDocsFromKycObject(vendor?.kycDocuments);

        setExistingDocs((prev) => ({
            ...prev,
            ...docsFromVendor,
        }));
    }, []);

    const loadKycPreview = useCallback(async () => {
        try {
            console.log("CALLING VENDOR KYC PREVIEW API");

            const res: any = await getRequest(
                API_ENDPOINTS.VENDORKYCDOCUMENTSPREVIEW,
                {},
                true,
                false
            );

            console.log("Vendor KYC preview response:", JSON.stringify(res));

            if (!res?.success) return;

            const previewData = normalizePreviewData(res);

            if (!previewData) return;

            setIsKycSubmitted(!!previewData?.isKycSubmitted);
            setIsKycApproved(!!previewData?.isKycApproved);
            setProfileStatus(previewData?.profileStatus || "pending");

            if (previewData?.vendorId) {
                setVendorProfileId(String(previewData.user));
            }

            if (previewData?.user) {
                setUserId(String(previewData.user));
            }

            const docsFromPreview = buildExistingDocsFromPreviewArray(
                previewData?.documents || []
            );

            console.log(
                "Vendor preview docs count:",
                Object.keys(docsFromPreview).length
            );

            setExistingDocs((prev) => ({
                ...prev,
                ...docsFromPreview,
            }));
        } catch (error: any) {
            console.log("Vendor KYC preview load error:", error?.message || error);
        }
    }, []);

    const loadVendorProfile = useCallback(
        async (loggedUserId: string) => {
            try {
                if (!loggedUserId) return;

                const res: any = await getRequest(
                    `${API_ENDPOINTS.VENDORPROFILEGET}/${loggedUserId}`,
                    {},
                    true,
                    false
                );

                console.log("Vendor profile response:", JSON.stringify(res));

                if (!res?.success) {
                    console.log("Vendor profile API failed:", res?.message || res);
                    return;
                }

                const vendor = normalizeVendorProfileResponse(res);

                if (!vendor) {
                    console.log("Vendor profile data missing");
                    return;
                }

                patchVendorProfileToState(vendor);

                await loadKycPreview();
            } catch (error: any) {
                console.log("Vendor profile load error:", error?.message || error);
            }
        },
        [patchVendorProfileToState, loadKycPreview]
    );

    const loadInitialData = useCallback(async () => {
        try {
            setInitialLoading(true);

            const loggedUserId = await getLoggedUserIdFromStorage();

            console.log("Vendor KYC logged user id:", loggedUserId);

            if (loggedUserId) {
                setUserId(loggedUserId);
                await loadVendorProfile(loggedUserId);
            }
        } catch (error: any) {
            console.log("Vendor KYC initial load error:", error?.message || error);
        } finally {
            setInitialLoading(false);
        }
    }, [loadVendorProfile]);

    useFocusEffect(
        useCallback(() => {
            loadInitialData();
        }, [loadInitialData])
    );

    const onRefresh = async () => {
        try {
            setRefreshing(true);

            const loggedUserId = userId || (await getLoggedUserIdFromStorage());

            if (loggedUserId) {
                setUserId(loggedUserId);
                await loadVendorProfile(loggedUserId);
            }
        } catch (error: any) {
            console.log("Vendor KYC refresh error:", error?.message || error);
        } finally {
            setRefreshing(false);
        }
    };

    const handlePreviewDocument = async (doc?: ExistingKycDocument) => {
        try {
            const url = doc?.previewUrl || doc?.fileUrl;

            if (!url) {
                showToast(
                    "error",
                    "Preview Not Available",
                    "Document preview URL not found."
                );
                return;
            }

            const canOpen = await Linking.canOpenURL(url);

            if (!canOpen) {
                showToast("error", "Cannot Open", "Unable to open document preview.");
                return;
            }

            await Linking.openURL(url);
        } catch (error: any) {
            showToast(
                "error",
                "Preview Failed",
                error?.message || "Could not open document."
            );
        }
    };

    const applyPickerResult = (
        res: ImagePickerResponse,
        field: VendorKycDocField
    ) => {
        if (res.didCancel || res.errorCode) return;

        const asset: Asset | undefined = res.assets?.[0];

        if (!asset?.uri) return;

        setKycFiles((prev) => ({
            ...prev,
            [field]: {
                uri: asset.uri,
                name: asset.fileName ?? `${field}_${Date.now()}.jpg`,
                type: asset.type ?? "image/jpeg",
            },
        }));
    };

    const handlePickFile = useCallback((field: VendorKycDocField) => {
        Alert.alert("Select Document", "Choose how you want to upload", [
            {
                text: "Camera",
                onPress: () =>
                    launchCamera(
                        {
                            mediaType: "photo",
                            quality: 0.8,
                            saveToPhotos: false,
                        },
                        (res) => applyPickerResult(res, field)
                    ),
            },
            {
                text: "Gallery",
                onPress: () =>
                    launchImageLibrary(
                        {
                            mediaType: "photo",
                            quality: 0.8,
                        },
                        (res) => applyPickerResult(res, field)
                    ),
            },
            {
                text: "Cancel",
                style: "cancel",
            },
        ]);
    }, []);

    const handleRemoveFile = useCallback((field: VendorKycDocField) => {
        setKycFiles((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }, []);

    const handleBankChange = (field: keyof BankDetails, value: string) => {
        setBankDetails((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const hasDocForField = (field: VendorKycDocField) => {
        return !!kycFiles[field] || !!existingDocs[field];
    };

    const validateForm = (): boolean => {
        if (!vendorProfileId) {
            showToast(
                "error",
                "Vendor Profile Missing",
                "Please create your vendor profile first."
            );
            return false;
        }

        if (!bankDetails.accountHolder.trim()) {
            showToast("error", "Bank Details", "Account holder name is required.");
            return false;
        }

        if (!bankDetails.bankName.trim()) {
            showToast("error", "Bank Details", "Bank name is required.");
            return false;
        }

        if (!/^\d{9,18}$/.test(bankDetails.accountNumber.trim())) {
            showToast(
                "error",
                "Bank Details",
                "Enter a valid account number between 9 to 18 digits."
            );
            return false;
        }

        if (
            !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifsc.trim().toUpperCase())
        ) {
            showToast("error", "Bank Details", "Enter valid IFSC code.");
            return false;
        }

        for (const field of REQUIRED_DOC_FIELDS) {
            if (!hasDocForField(field)) {
                showToast(
                    "error",
                    `${KYC_DOC_CONFIG[field].label} Required`,
                    `Please upload ${KYC_DOC_CONFIG[field].label}.`
                );
                return false;
            }
        }

        return true;
    };

    const updateBankDetails = async () => {
        if (!vendorProfileId) {
            throw new Error(
                "Vendor profile id not found. Please complete vendor profile first."
            );
        }

        const payload = {
            bankDetails: {
                accountHolder: bankDetails.accountHolder.trim(),
                bankName: bankDetails.bankName.trim(),
                accountNumber: bankDetails.accountNumber.trim(),
                ifsc: bankDetails.ifsc.trim().toUpperCase(),
            },
        };

        const res: any = await putRequest(
            `${API_ENDPOINTS.VENDORPROFILEUPDATE}/${vendorProfileId}`,
            payload,
            true
        );

        if (!res?.success) {
            throw new Error(res?.message || "Vendor bank details update failed");
        }

        const updatedVendor = normalizeVendorProfileResponse(res);

        if (updatedVendor) {
            patchVendorProfileToState(updatedVendor);
        }

        return res;
    };

    const uploadKycDocuments = async () => {
        const selectedFields = ALL_DOC_FIELDS.filter((field) => !!kycFiles[field]);

        if (!selectedFields.length) {
            return null;
        }

        const formData = new FormData();

        selectedFields.forEach((field) => {
            const file = kycFiles[field];

            if (!file) return;

            formData.append(field, {
                uri: file.uri,
                name: file.name,
                type: file.type,
            } as any);
        });

        const kycRes: any = await uploadRequest(
            API_ENDPOINTS.VENDORKYCDOCUMENTSUPLOAD,
            formData,
            true
        );

        if (!kycRes?.success) {
            throw new Error(kycRes?.message || "Vendor KYC document upload failed");
        }

        return kycRes;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);

        try {
            await updateBankDetails();
            await uploadKycDocuments();

            const loggedUserId = userId || (await getLoggedUserIdFromStorage());

            if (loggedUserId) {
                await loadVendorProfile(loggedUserId);
            } else {
                await loadKycPreview();
            }

            setKycFiles({});

            showToast(
                "success",
                "Vendor KYC Submitted",
                "Your documents are under review."
            );
        } catch (error: any) {
            showToast(
                "error",
                "Submission Failed",
                error?.message || "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const isSubmitEnabled =
        !!vendorProfileId &&
        bankDetails.accountHolder.trim().length > 0 &&
        bankDetails.bankName.trim().length > 0 &&
        bankDetails.accountNumber.trim().length > 0 &&
        bankDetails.ifsc.trim().length > 0 &&
        REQUIRED_DOC_FIELDS.every((field) => hasDocForField(field)) &&
        !loading;

    if (initialLoading) {
        return (
            <SafeAreaView style={screenStyles.loaderRoot}>
                <AppBar title="Vendor KYC" onBack={() => navigation.goBack()} />

                <View style={screenStyles.loaderCenter}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={screenStyles.loaderText}>Loading vendor profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

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
                <AppBar title="Vendor KYC" onBack={() => navigation.goBack()} />

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    automaticallyAdjustKeyboardInsets
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    <PageHeader
                        isKycSubmitted={isKycSubmitted}
                        isKycApproved={isKycApproved}
                        profileStatus={profileStatus}
                        storeName={storeName}
                    />

                    <View style={localStyles.card}>
                        <Text style={localStyles.sectionLabel}>Bank Details</Text>

                        <View style={localStyles.infoBox}>
                            <Ionicons
                                name="lock-closed-outline"
                                size={16}
                                color={colors.primary}
                            />
                            <Text style={localStyles.infoText}>
                                Bank details are securely stored and used only for vendor
                                payout settlement.
                            </Text>
                        </View>

                        <FloatingInput
                            label="Account Holder Name *"
                            placeholder="As per bank records"
                            value={bankDetails.accountHolder}
                            onChangeText={(text: string) =>
                                handleBankChange("accountHolder", text)
                            }
                            rightIcon={
                                <Ionicons
                                    name="person-outline"
                                    size={18}
                                    color={colors.placeholder}
                                />
                            }
                        />

                        <FloatingInput
                            label="Bank Name *"
                            placeholder="e.g. State Bank of India"
                            value={bankDetails.bankName}
                            onChangeText={(text: string) =>
                                handleBankChange("bankName", text)
                            }
                            rightIcon={
                                <Ionicons
                                    name="business-outline"
                                    size={18}
                                    color={colors.placeholder}
                                />
                            }
                        />

                        <View style={accountInputStyles.wrapper}>
                            <Text style={accountInputStyles.label}>Account Number *</Text>

                            <View style={accountInputStyles.inputBox}>
                                <TextInput
                                    value={bankDetails.accountNumber}
                                    onChangeText={(text: string) =>
                                        handleBankChange("accountNumber", text.replace(/\D/g, ""))
                                    }
                                    placeholder="9 to 18 digit account number"
                                    placeholderTextColor={colors.placeholder}
                                    keyboardType="numeric"
                                    secureTextEntry={!showAccountNumber}
                                    style={accountInputStyles.input}
                                />

                                <TouchableOpacity
                                    onPress={() => setShowAccountNumber((prev) => !prev)}
                                    activeOpacity={0.7}
                                    style={accountInputStyles.eyeBtn}
                                    hitSlop={{
                                        top: 10,
                                        bottom: 10,
                                        left: 10,
                                        right: 10,
                                    }}
                                >
                                    <Ionicons
                                        name={showAccountNumber ? "eye-off-outline" : "eye-outline"}
                                        size={22}
                                        color={colors.placeholder}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <FloatingInput
                            label="IFSC Code *"
                            placeholder="e.g. SBIN0001234"
                            value={bankDetails.ifsc}
                            onChangeText={(text: string) =>
                                handleBankChange(
                                    "ifsc",
                                    text.toUpperCase().replace(/\s/g, "")
                                )
                            }
                            autoCapitalize="characters"
                            rightIcon={
                                <Ionicons
                                    name="barcode-outline"
                                    size={18}
                                    color={colors.placeholder}
                                />
                            }
                        />
                    </View>

                    <View style={localStyles.sectionDivider} />

                    <View style={localStyles.card}>
                        <Text style={localStyles.sectionLabel}>KYC Documents</Text>

                        <KycProgress
                            uploaded={localUploadedCount}
                            submitted={submittedCount}
                            total={ALL_DOC_FIELDS.length}
                        />

                        <View style={localStyles.infoBox}>
                            <Ionicons
                                name="information-circle-outline"
                                size={16}
                                color={colors.primary}
                            />
                            <Text style={localStyles.infoText}>
                                PAN Card is mandatory. Aadhaar Card and other business
                                documents are optional and help speed up vendor verification.
                            </Text>
                        </View>

                        <View style={localStyles.warningBox}>
                            <Ionicons name="warning-outline" size={16} color="#D97706" />
                            <Text style={localStyles.warningText}>
                                Upload clear, high-quality documents. Blurry or cropped
                                documents may be rejected. Preview links are temporary and
                                may expire after a few minutes.
                            </Text>
                        </View>

                        {ALL_DOC_FIELDS.map((field) => (
                            <DocumentUploadCard
                                key={field}
                                field={field}
                                file={kycFiles[field]}
                                existingDoc={existingDocs[field]}
                                onPick={handlePickFile}
                                onRemove={handleRemoveFile}
                                onPreview={handlePreviewDocument}
                            />
                        ))}

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
                                        {isKycSubmitted ? "Update Vendor KYC" : "Submit Vendor KYC"}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <Text style={screenStyles.disclaimer}>
                            By submitting, you confirm that the provided bank details
                            and documents are authentic.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
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
        fontWeight: "400",
    },
    statusBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: colors.formBorder,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginTop: 16,
    },
    statusText: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.secondary,
    },
});

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
    cardRejected: {
        borderColor: "#FCA5A5",
        backgroundColor: "#FEF2F2",
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
    badgeRequired: {
        backgroundColor: "#FEE2E2",
    },
    badgeOptional: {
        backgroundColor: "#F1F5F9",
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "700",
    },
    badgeTextRequired: {
        color: "#DC2626",
    },
    badgeTextOptional: {
        color: "#64748B",
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: "800",
    },
    hint: {
        fontSize: 12,
        color: colors.placeholder,
        marginTop: 3,
        lineHeight: 16,
    },
    rejectReason: {
        fontSize: 12,
        color: "#DC2626",
        marginTop: 6,
        lineHeight: 16,
        fontWeight: "600",
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
    uploadFormats: {
        fontSize: 11,
        color: colors.placeholder,
    },
    uploadedRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#DCFCE7",
        borderRadius: 10,
        padding: 10,
    },
    thumb: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: "#E2E8F0",
    },
    pdfPreview: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
    },
    fileName: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.secondary,
    },
    fileStatus: {
        fontSize: 12,
        color: "#16A34A",
        fontWeight: "500",
        marginTop: 2,
    },
    removeBtn: {
        padding: 2,
    },
    submittedBox: {
        backgroundColor: "#F8FAFC",
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    submittedLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 10,
    },
    previewBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: 9,
        paddingVertical: 9,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 5,
        backgroundColor: "#EFF6FF",
    },
    previewBtnText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: "800",
    },
    replaceBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#FBBF24",
        borderRadius: 9,
        paddingVertical: 9,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 5,
        backgroundColor: "#FFFBEB",
    },
    replaceBtnText: {
        color: "#D97706",
        fontSize: 12,
        fontWeight: "800",
    },
});

const progressStyles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.secondary,
    },
    count: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.primary,
    },
    track: {
        height: 6,
        backgroundColor: colors.formBorder,
        borderRadius: 4,
        overflow: "hidden",
    },
    fill: {
        height: "100%",
        backgroundColor: colors.primary,
        borderRadius: 4,
    },
    sub: {
        fontSize: 11,
        color: colors.placeholder,
        marginTop: 5,
    },
});

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

const screenStyles = StyleSheet.create({
    loaderRoot: {
        flex: 1,
        backgroundColor: colors.scaffoldBg,
    },
    loaderCenter: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    loaderText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.placeholder,
        fontWeight: "600",
    },
    primaryBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 15,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
    },
    primaryBtnDisabled: {
        opacity: 0.45,
    },
    primaryBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "800",
    },
    disclaimer: {
        textAlign: "center",
        marginTop: 12,
        fontSize: 11,
        color: colors.placeholder,
        lineHeight: 16,
        paddingHorizontal: 10,
    },
});

const accountInputStyles = StyleSheet.create({
    wrapper: {
        marginBottom: 14,
    },
    label: {
        fontSize: 12,
        fontWeight: "700",
        color: colors.placeholder,
        marginBottom: 6,
        marginLeft: 4,
    },
    inputBox: {
        minHeight: 54,
        borderWidth: 1,
        borderColor: colors.formBorder,
        borderRadius: 12,
        backgroundColor: colors.formBg,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: "600",
        color: colors.secondary,
        paddingVertical: Platform.OS === "ios" ? 14 : 10,
        paddingRight: 12,
    },
    eyeBtn: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
    },
});

export default VendorKycScreen;