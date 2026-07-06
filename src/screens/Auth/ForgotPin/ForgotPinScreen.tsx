// screens/ForgotPinScreen.tsx
import React, { useState, useRef, useEffect } from "react";
import {
    View,
    ScrollView,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    ToastAndroid,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from "react-native";
import { postRequest, putRequest } from "../../../constants/ApiClient";
import { appTheme, colors, inputStyles } from "../../../constants/AppThem";
import Toast from "react-native-toast-message";
import { loginStyles, pinloginStyles } from "../Login/LoginScreenStyle";
import { API_ENDPOINTS } from "../../../constants/ApiEndpoints";
import { storeUserData } from "../../../components/AsyncStorage/AsyncStorage";

const PIN_LENGTH = 6;
const OTP_LENGTH = 6;

// ─── Reusable FloatingInput (same as LoginScreen) ────────────────────────────
const FloatingInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
    autoCapitalize = "none",
    secureTextEntry = false,
}: any) => {
    const [focused, setFocused] = useState(false);
    return (
        <View style={inputStyles.wrapper}>
            {label ? <Text style={inputStyles.label}>{label}</Text> : null}
            <TextInput
                style={[
                    inputStyles.input,
                    focused && inputStyles.inputFocused,
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.placeholder}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                secureTextEntry={secureTextEntry}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </View>
    );
};

// ─── Reusable PinInput (same as LoginScreen) ──────────────────────────────────
const PinInput = ({
    value,
    onChangeText,
    maxLength = PIN_LENGTH,
}: {
    value: string;
    onChangeText: (text: string) => void;
    maxLength?: number;
}) => {
    const inputRef = useRef<TextInput>(null);
    return (
        <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={pinloginStyles.row}
        >
            {Array.from({ length: maxLength }).map((_, i) => {
                const filled = i < value.length;
                const showCursor = i === value.length;
                return (
                    <View
                        key={i}
                        style={[
                            pinloginStyles.cell,
                            filled && pinloginStyles.cellFilled,
                        ]}
                    >
                        <Text style={pinloginStyles.digit}>{filled ? "●" : ""}</Text>
                        {showCursor && <View style={pinloginStyles.cursor} />}
                    </View>
                );
            })}
            <TextInput
                ref={inputRef}
                value={value}
                onChangeText={(t) =>
                    onChangeText(t.replace(/[^0-9]/g, "").slice(0, maxLength))
                }
                keyboardType="number-pad"
                maxLength={maxLength}
                style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
                caretHidden
            />
        </TouchableOpacity>
    );
};

// ─── Step indicator ───────────────────────────────────────────────────────────
const StepDots = ({ current, total }: { current: number; total: number }) => (
    <View style={forgotStyles.dotsRow}>
        {Array.from({ length: total }).map((_, i) => (
            <View
                key={i}
                style={[
                    forgotStyles.dot,
                    i < current && forgotStyles.dotDone,
                    i === current && forgotStyles.dotActive,
                ]}
            />
        ))}
    </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ForgotPinScreen = ({ navigation }: any) => {
    // 0 = enter mobile, 1 = verify OTP, 2 = set new PIN
    const [step, setStep] = useState(0);
    const [mobile, setMobile] = useState("");
    const [otp, setOtp] = useState("");
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [loading, setLoading] = useState(false);

    // Resend OTP countdown
    const [resendTimer, setResendTimer] = useState(30);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startResendTimer = () => {
        setResendTimer(30);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setResendTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // ── Step 0: Send OTP ──────────────────────────────────────────────────────
    const handleSendOtp = async () => {
        if (!/^[6-9]\d{9}$/.test(mobile)) {
            ToastAndroid.show("Enter a valid 10-digit mobile number.", ToastAndroid.SHORT);
            return;
        }
        try {
            setLoading(true);
            const res: any = await postRequest(API_ENDPOINTS.SENDWHATSAPPOTP, {
                mobile,
            });
            setLoading(false);
            if (res?.success) {
                Toast.show({ type: "success", text1: "OTP Sent", text2: res?.message ?? "Check your messages." });
                startResendTimer();
                setStep(1);
            } else {
                ToastAndroid.show(res?.message ?? "Failed to send OTP.", ToastAndroid.LONG);
            }
        } catch {
            setLoading(false);
            ToastAndroid.show("Something went wrong. Try again.", ToastAndroid.LONG);
        }
    };

    // ── Step 1: Verify OTP ────────────────────────────────────────────────────
    const handleVerifyOtp = async () => {
        if (otp.length < OTP_LENGTH) {
            ToastAndroid.show(`Enter the ${OTP_LENGTH}-digit OTP.`, ToastAndroid.SHORT);
            return;
        }
        try {
            setLoading(true);
            const res: any = await postRequest(API_ENDPOINTS.VERIFYWHATSAPPOTP, {
                mobile,
                otp,
                role: 'vendor'
            });
            setLoading(false);
            if (res?.success) {
                Toast.show({ type: "success", text1: "Verified", text2: "Now set your new PIN." });
                setStep(2);
            } else {
                ToastAndroid.show(res?.message ?? "Invalid OTP.", ToastAndroid.LONG);
            }
        } catch {
            setLoading(false);
            ToastAndroid.show("Something went wrong. Try again.", ToastAndroid.LONG);
        }
    };

    // ── Step 1: Resend OTP ────────────────────────────────────────────────────
    const handleResendOtp = async () => {
        if (resendTimer > 0) return;
        try {
            setLoading(true);
            const res: any = await postRequest("/auth/forgot-pin/send-otp", { mobile });
            setLoading(false);
            if (res?.success) {
                Toast.show({ type: "success", text1: "OTP Resent", text2: "Check your messages." });
                startResendTimer();
                setOtp("");
            } else {
                ToastAndroid.show(res?.message ?? "Failed to resend OTP.", ToastAndroid.LONG);
            }
        } catch {
            setLoading(false);
        }
    };

    // ── Step 2: Reset PIN ─────────────────────────────────────────────────────
    const handleResetPin = async () => {
        if (newPin.length < PIN_LENGTH) {
            ToastAndroid.show(`Enter a ${PIN_LENGTH}-digit PIN.`, ToastAndroid.SHORT);
            return;
        }
        if (newPin !== confirmPin) {
            ToastAndroid.show("PINs do not match.", ToastAndroid.SHORT);
            return;
        }
        try {
            setLoading(true);
            const res: any = await putRequest(API_ENDPOINTS.UPDATEUSERPIN, {
                mobile: mobile,
                pin: newPin,
                role: 'vendor'
            });
            setLoading(false);
            if (res?.success) {
                const user = res?.data;
                const token = res?.data?.token;

                await storeUserData(user, token);

                Toast.show({
                    type: "success",
                    text1: "Success",
                    text2: "Logged In successful!",
                });
                // Toast.show({ type: "success", text1: "PIN Reset!", text2: "Please log in with your new PIN." });

                

                navigation.navigate("Dashboard");
            } else {
                // ToastAndroid.show(res?.message ?? "Failed to reset PIN.", ToastAndroid.LONG);
            }
        } catch {
            setLoading(false);
            // ToastAndroid.show("Something went wrong. Try again.", ToastAndroid.LONG);
        }
    };

    // ── Step config ───────────────────────────────────────────────────────────
    const stepConfig = [
        { emoji: "📱", title: "Forgot PIN?", subtitle: "Enter your registered mobile number to receive an OTP." },
        { emoji: "🔐", title: "Verify OTP", subtitle: `Enter the ${OTP_LENGTH}-digit OTP sent to +91 ${mobile}.` },
        { emoji: "🔑", title: "New PIN", subtitle: "Choose a strong 6-digit PIN you'll remember." },
    ];

    const { emoji, title, subtitle } = stepConfig[step];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                style={appTheme.scaffold}
                contentContainerStyle={loginStyles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Banner — mirrors LoginScreen */}
                <View style={loginStyles.heroBanner}>
                    <View style={loginStyles.waveShape} />
                    <View style={loginStyles.illustrationWrapper}>
                        <View style={loginStyles.illustrationPlaceholder}>
                            <Text style={loginStyles.illustrationEmoji}>{emoji}</Text>
                        </View>
                    </View>
                </View>

                {/* Card */}
                <View style={loginStyles.card}>
                    {/* Step dots */}
                    <StepDots current={step} total={3} />

                    <Text style={loginStyles.greeting}>
                        {title.split(" ").slice(0, -1).join(" ")}{" "}
                        <Text style={loginStyles.greetingAccent}>
                            {title.split(" ").slice(-1)[0]}
                        </Text>
                    </Text>
                    <Text style={loginStyles.subtitle}>{subtitle}</Text>

                    {/* ── STEP 0: Mobile number ──────────────────────────────── */}
                    {step === 0 && (
                        <>
                            <FloatingInput
                                label="Mobile Number"
                                placeholder="Enter your mobile number"
                                keyboardType="phone-pad"
                                value={mobile}
                                onChangeText={(t: string) =>
                                    setMobile(t.replace(/[^0-9]/g, "").slice(0, 10))
                                }
                            />
                            <TouchableOpacity
                                style={[
                                    loginStyles.signInBtn,
                                    (loading || mobile.length < 10) && loginStyles.signInBtnDisabled,
                                ]}
                                onPress={handleSendOtp}
                                disabled={loading || mobile.length < 10}
                                activeOpacity={0.85}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={loginStyles.signInBtnText}>Send OTP</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ── STEP 1: OTP ────────────────────────────────────────── */}
                    {step === 1 && (
                        <>
                            <View style={loginStyles.pinSection}>
                                <Text style={inputStyles.label}>Enter OTP</Text>
                                <PinInput
                                    value={otp}
                                    onChangeText={setOtp}
                                    maxLength={OTP_LENGTH}
                                />
                            </View>

                            {/* Resend row */}
                            <View style={forgotStyles.resendRow}>
                                <Text style={forgotStyles.resendLabel}>Didn't receive OTP? </Text>
                                <TouchableOpacity onPress={handleResendOtp} disabled={resendTimer > 0}>
                                    <Text
                                        style={[
                                            forgotStyles.resendLink,
                                            resendTimer > 0 && forgotStyles.resendLinkDisabled,
                                        ]}
                                    >
                                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend"}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[
                                    loginStyles.signInBtn,
                                    (loading || otp.length < OTP_LENGTH) && loginStyles.signInBtnDisabled,
                                ]}
                                onPress={handleVerifyOtp}
                                disabled={loading || otp.length < OTP_LENGTH}
                                activeOpacity={0.85}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={loginStyles.signInBtnText}>Verify OTP</Text>
                                )}
                            </TouchableOpacity>

                            {/* Back */}
                            <TouchableOpacity
                                style={forgotStyles.backBtn}
                                onPress={() => { setStep(0); setOtp(""); }}
                            >
                                <Text style={forgotStyles.backBtnText}>← Change Mobile Number</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ── STEP 2: New PIN ────────────────────────────────────── */}
                    {step === 2 && (
                        <>
                            <View style={loginStyles.pinSection}>
                                <Text style={inputStyles.label}>New PIN</Text>
                                <PinInput
                                    value={newPin}
                                    onChangeText={setNewPin}
                                    maxLength={PIN_LENGTH}
                                />
                            </View>

                            <View style={[loginStyles.pinSection, { marginTop: 16 }]}>
                                <Text style={inputStyles.label}>Confirm PIN</Text>
                                <PinInput
                                    value={confirmPin}
                                    onChangeText={setConfirmPin}
                                    maxLength={PIN_LENGTH}
                                />
                            </View>

                            {/* Mismatch hint */}
                            {confirmPin.length === PIN_LENGTH && newPin !== confirmPin && (
                                <Text style={forgotStyles.mismatchText}>PINs do not match</Text>
                            )}

                            <TouchableOpacity
                                style={[
                                    loginStyles.signInBtn,
                                    (loading ||
                                        newPin.length < PIN_LENGTH ||
                                        confirmPin.length < PIN_LENGTH ||
                                        newPin !== confirmPin) &&
                                    loginStyles.signInBtnDisabled,
                                ]}
                                onPress={handleResetPin}
                                disabled={
                                    loading ||
                                    newPin.length < PIN_LENGTH ||
                                    confirmPin.length < PIN_LENGTH ||
                                    newPin !== confirmPin
                                }
                                activeOpacity={0.85}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={loginStyles.signInBtnText}>Reset PIN</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Back to Login link (all steps) */}
                    <TouchableOpacity
                        style={{ marginTop: 20, alignItems: "center" }}
                        onPress={() => navigation?.navigate("Login")}
                    >
                        <Text style={{ fontSize: 13, color: colors.placeholder }}>
                            Remember your PIN?{" "}
                            <Text style={{ color: colors.primary, fontWeight: "600" }}>
                                Sign In
                            </Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// ─── Local styles (only what's new — everything else reused from LoginScreenStyle) ──
const forgotStyles = StyleSheet.create({
    dotsRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 20,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.placeholder ?? "#ccc",
    },
    dotActive: {
        width: 24,
        backgroundColor: colors.primary,
    },
    dotDone: {
        backgroundColor: colors.primary,
        opacity: 0.4,
    },
    resendRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 12,
        marginBottom: 4,
    },
    resendLabel: {
        fontSize: 13,
        color: colors.placeholder,
    },
    resendLink: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: "600",
    },
    resendLinkDisabled: {
        color: colors.placeholder,
        fontWeight: "400",
    },
    mismatchText: {
        color: "#e53935",
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
    },
    backBtn: {
        marginTop: 14,
        alignItems: "center",
    },
    backBtnText: {
        fontSize: 13,
        color: colors.placeholder,
    },
});

export default ForgotPinScreen;
