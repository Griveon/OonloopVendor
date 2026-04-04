// screens/LoginScreen.tsx
import React, { useState, useRef, useEffect } from "react";
import {
    View,
    ScrollView,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    ToastAndroid,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Image,
} from "react-native";
import { postRequest } from "../../../constants/ApiClient";
import { appTheme, colors } from "../../../constants/AppThem";
import { loginStyles, pinloginStyles, inputloginStyles } from "./LoginScreenStyle";
import { getUserData } from "../../../components/AsyncStorage/AsyncStorage";

const { width } = Dimensions.get("window");
const PIN_LENGTH = 6;

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
        <View style={inputloginStyles.wrapper}>
            {label ? <Text style={inputloginStyles.label}>{label}</Text> : null}
            <TextInput
                style={[
                    inputloginStyles.input,
                    focused && inputloginStyles.inputFocused,
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
                const showCursor = i === value.length; // next empty cell
                return (
                    <View
                        key={i}
                        style={[
                            pinloginStyles.cell,
                            filled && pinloginStyles.cellFilled,
                        ]}
                    >
                        <Text style={pinloginStyles.digit}>
                            {filled ? "●" : ""}
                        </Text>
                        {showCursor && (
                            <View style={pinloginStyles.cursor} />
                        )}
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

const LoginScreen = ({ navigation }: any) => {
    const [form, setForm] = useState<{ email: string; pin: string }>({ email: "", pin: "" });
    const [loading, setLoading] = useState(false);

    const handleChange = (field: string, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value ?? "" }));

    useEffect(() => {
        const checkStoredUser = async () => {
            const { user, token } = await getUserData();

            console.log("Stored User:", user);
            console.log("Stored Token:", token);

            if (user && token) {
                ToastAndroid.show("User already logged in", ToastAndroid.SHORT);

                // For debug (optional navigation)
                // navigation.navigate("Dashboard");
            } else {
                console.log("No user data found");
            }
        };

        checkStoredUser();
    }, []);
    
    const handleLogin = async () => {
        try {

            if (!form.email) {
                ToastAndroid.show("Please enter your email.", ToastAndroid.SHORT);
                return;
            }
            if ((form.pin ?? "").length < PIN_LENGTH) {
                ToastAndroid.show(`Enter your ${PIN_LENGTH}-digit PIN.`, ToastAndroid.SHORT);
                return;
            }
            setLoading(true);
            const res: any = await postRequest("/auth/login", {
                email: form.email,
                pin: form.pin,
            });
            setLoading(false);

            if (res?.success) {
                ToastAndroid.show("Login successful!", ToastAndroid.LONG);
                // navigation.navigate("Dashboard");
            } else {
                setLoading(false);
                ToastAndroid.show(res?.message ?? "Login failed.", ToastAndroid.LONG);
            }
        } catch (error) {
            setLoading(false);

        }
    };

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
                <View style={loginStyles.heroBanner}>
                    {/* Green wave background shape */}
                    <View style={loginStyles.waveShape} />

                    {/* Illustration placeholder — swap with your asset */}
                    <View style={loginStyles.illustrationWrapper}>
                        {/* If you have an image: */}
                        {/* <Image source={require("../../../assets/grocery_illustration.png")} style={loginStyles.illustration} resizeMode="contain" /> */}
                        <View style={loginStyles.illustrationPlaceholder}>
                            <Text style={loginStyles.illustrationEmoji}>🛒</Text>
                        </View>
                    </View>
                </View>

                <View style={loginStyles.card}>
                    {/* Title */}
                    <Text style={loginStyles.greeting}>
                        Hello{" "}
                        <Text style={loginStyles.greetingAccent}>Again!</Text>
                    </Text>
                    <Text style={loginStyles.subtitle}>
                        Fill your details or continue with vendor registration.
                    </Text>

                    <FloatingInput
                        label="Email"
                        placeholder="imshuvo97@gmail.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={form.email}
                        onChangeText={(t: string) => handleChange("email", t)}
                    />

                    <View style={loginStyles.pinSection}>
                        <Text style={inputloginStyles.label}>PIN</Text>
                        <PinInput
                            value={form.pin}
                            onChangeText={(t) => handleChange("pin", t)}
                            maxLength={PIN_LENGTH}
                        />
                        <TouchableOpacity
                            style={loginStyles.forgotRow}
                            onPress={() => navigation?.navigate("ForgotPin")}
                        >
                            <Text style={loginStyles.forgotText}>Forgot PIN?</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[
                            loginStyles.signInBtn,
                            (loading || (form.pin ?? "").length < PIN_LENGTH) &&
                            loginStyles.signInBtnDisabled,
                        ]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={loginStyles.signInBtnText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={loginStyles.vendorBtn}
                        activeOpacity={0.8}
                        onPress={() => navigation?.navigate("VendorRegistration")}
                    >
                        <Text style={loginStyles.vendorBtnText}>Register as Vendor</Text>
                    </TouchableOpacity>

                    <View style={loginStyles.signUpRow}>
                        <Text style={loginStyles.signUpPrompt}>New User? </Text>
                        <TouchableOpacity onPress={() => navigation?.navigate("SignUp")}>
                            <Text style={loginStyles.signUpLink}>Create Account</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default LoginScreen;
