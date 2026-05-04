// screens/VendorRegistrationScreen.tsx
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
    Modal,
    StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { postRequest } from "../../../constants/ApiClient";
import { colors } from "../../../constants/AppThem";
import { inputloginStyles, pinloginStyles } from "../Login/LoginScreenStyle";
import AppBar from "../../../components/utils/AppBar";
import { localStyles } from "./VendorRegistrationStyle";
import GenderPicker from "../../../components/DropDowns/GenderDropDown";
import Toast from "react-native-toast-message";
import { API_ENDPOINTS } from "../../../constants/ApiEndpoints";
import { clearUserData, storeUserData } from "../../../components/AsyncStorage/AsyncStorage";

const PIN_LENGTH = 6;

const DatePickerField = ({
    value,
    onConfirm,
}: {
    value: string;
    onConfirm: (date: Date) => void;
}) => {
    const [show, setShow] = useState(false);
    const [iosTemp, setIosTemp] = useState<Date>(() => parseStoredDate(value));

    function parseStoredDate(val: string): Date {
        if (val && val.length === 10) {
            const [dd, mm, yyyy] = val.split("/");
            const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
            if (!isNaN(d.getTime())) return d;
        }
        const def = new Date();
        def.setFullYear(def.getFullYear() - 18);
        return def;
    }

    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 5);
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 100);

    const DisplayField = () => (
        <TouchableOpacity
            onPress={() => {
                setIosTemp(parseStoredDate(value));
                setShow(true);
            }}
            activeOpacity={0.8}
        >
            <View style={{ position: "relative", justifyContent: "center" }}>
                <TextInput
                    style={[inputloginStyles.input, { paddingRight: 44 }]}
                    value={value}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={colors.placeholder}
                    editable={false}
                    pointerEvents="none"
                />
                <View style={localStyles.eyeBtn} pointerEvents="none">
                    <Ionicons name="calendar-outline" size={20} color={colors.placeholder} />
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
                        value={parseStoredDate(value)}
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
                <View style={localStyles.iosSheet}>
                    <View style={localStyles.iosSheetHeader}>
                        <TouchableOpacity
                            onPress={() => setShow(false)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={localStyles.cancelBtn}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={localStyles.sheetTitle}>Date of Birth</Text>
                        <TouchableOpacity
                            onPress={() => { onConfirm(iosTemp); setShow(false); }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={localStyles.confirmBtn}>Done</Text>
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

const FloatingInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
    autoCapitalize = "none",
    secureTextEntry = false,
    showToggle = false,
    editable = true,
    onPress,
    rightIcon,
}: any) => {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(secureTextEntry);
    // useEffect(() => {
    //     clearUserData();
    // },);
    const inputContent = (
        <View style={{ position: "relative", justifyContent: "center" }}>
            <TextInput
                style={[
                    inputloginStyles.input,
                    focused && inputloginStyles.inputFocused,
                    (showToggle || rightIcon) && { paddingRight: 44 },
                    !editable && { color: colors.placeholder },
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.placeholder}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                secureTextEntry={hidden}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                editable={editable}
                pointerEvents={editable ? "auto" : "none"}
            />
            {showToggle && (
                <TouchableOpacity
                    onPress={() => setHidden((h: boolean) => !h)}
                    style={localStyles.eyeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons
                        name={hidden ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.placeholder}
                    />
                </TouchableOpacity>
            )}
            {rightIcon && !showToggle && (
                <View style={localStyles.eyeBtn} pointerEvents="none">
                    {rightIcon}
                </View>
            )}
        </View>
    );

    return (
        <View style={inputloginStyles.wrapper}>
            {label ? <Text style={inputloginStyles.label}>{label}</Text> : null}
            {onPress ? (
                <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
                    {inputContent}
                </TouchableOpacity>
            ) : (
                inputContent
            )}
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
    const [showPin, setShowPin] = useState(false);

    return (
        <View>
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
                            style={[pinloginStyles.cell, filled && pinloginStyles.cellFilled]}
                        >
                            <Text style={pinloginStyles.digit}>
                                {filled ? (showPin ? value[i] : "●") : ""}
                            </Text>
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

            <TouchableOpacity
                onPress={() => setShowPin((s) => !s)}
                style={localStyles.pinToggle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Ionicons
                    name={showPin ? "eye-off-outline" : "eye-outline"}
                    size={14}
                    color={colors.primary}
                    style={{ marginRight: 4 }}
                />
                <Text style={localStyles.pinToggleText}>
                    {showPin ? "Hide PIN" : "Show PIN"}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const VendorRegistrationScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        mobileNumber: "",
        dateOfBirth: "",
        gender: "",
        password: "",
        pin: "",
        role: 'vendor'
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (field: string, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value ?? "" }));

    const handleDateConfirm = (date: Date) => {
        const dd = String(date.getDate()).padStart(2, "0");
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const yyyy = date.getFullYear();
        handleChange("dateOfBirth", `${dd}/${mm}/${yyyy}`);
    };

    const validateForm = () => {
        const requiredFields: (keyof typeof form)[] = [
            "firstName",
            "email",
            "password",
            "dateOfBirth",
            "gender",
            "pin",
        ];

        for (let field of requiredFields) {

            if (!form[field] || (field === "pin" && form.pin.length < PIN_LENGTH)) {
                return false;
            }
        }
        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) {
            Toast.show({
                type: "error",
                text1: "Validation Error",
                text2: "Please fill all required fields and ensure PIN is 6 digits.",
            });
            return;
        }

        setLoading(true);

        try {

            let dobIso: string | undefined;
            if (form.dateOfBirth) {
                const [dd, mm, yyyy] = form.dateOfBirth.split("/");
                const dateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
                if (!isNaN(dateObj.getTime())) {
                    dobIso = dateObj.toISOString();
                } else {
                    setLoading(false);
                    return;
                }
            }

            const payload = {
                ...form,
                dateOfBirth: dobIso,
            };

            const res: any = await postRequest(API_ENDPOINTS.REGISTER, payload);
            setLoading(false);

            if (res?.success) {
                const user = res?.data;
                const token = res?.data?.token;

                await storeUserData(user, token);

                Toast.show({
                    type: "success",
                    text1: "Success",
                    text2: "Registration successful!",
                });

                navigation.navigate("VendorBusinessInfoUpdating");

            }
        } catch (error) {
            
            setLoading(false);
            // showError(error);
        }
    };

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
                <AppBar
                    title="Vendor Registration"
                    onBack={() => navigation?.goBack()}
                />

                <ScrollView
                    style={{ flex: 1, backgroundColor: colors.scaffoldBg }}
                    contentContainerStyle={[
                        localStyles.container,
                        { paddingBottom: insets.bottom + 60 },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    automaticallyAdjustKeyboardInsets={true}
                >
                    <View style={localStyles.card}>

                        <Text style={localStyles.sectionLabel}>Personal Info</Text>

                        <FloatingInput
                            label="First Name *"
                            placeholder="John"
                            value={form.firstName}
                            onChangeText={(t: string) => handleChange("firstName", t)}
                            autoCapitalize="words"
                        />
                        <FloatingInput
                            label="Last Name"
                            placeholder="Doe"
                            value={form.lastName}
                            onChangeText={(t: string) => handleChange("lastName", t)}
                            autoCapitalize="words"
                        />

                        <View style={inputloginStyles.wrapper}>
                            <Text style={inputloginStyles.label}>Date of Birth</Text>
                            <DatePickerField
                                value={form.dateOfBirth}
                                onConfirm={handleDateConfirm}
                            />
                        </View>

                        <GenderPicker
                            label="Gender"
                            selectedValue={form.gender}
                            onValueChange={(val) => handleChange("gender", val)}
                        />


                        <View style={localStyles.divider} />

                        <Text style={localStyles.sectionLabel}>Contact</Text>

                        <FloatingInput
                            label="Email *"
                            placeholder="example@mail.com"
                            keyboardType="email-address"
                            value={form.email}
                            onChangeText={(t: string) => handleChange("email", t)}
                        />
                        <FloatingInput
                            label="Mobile Number"
                            placeholder="1234567890"
                            keyboardType="phone-pad"
                            value={form.mobileNumber}
                            onChangeText={(t: string) => handleChange("mobileNumber", t)}
                        />

                        <View style={localStyles.divider} />

                        <Text style={localStyles.sectionLabel}>Security</Text>

                        <FloatingInput
                            label="Password *"
                            placeholder="••••••••"
                            secureTextEntry
                            showToggle
                            value={form.password}
                            onChangeText={(t: string) => handleChange("password", t)}
                        />

                        <View style={localStyles.pinSection}>
                            <Text style={inputloginStyles.label}>PIN (6-digit)</Text>
                            <PinInput
                                value={form.pin}
                                onChangeText={(t) => handleChange("pin", t)}
                                maxLength={PIN_LENGTH}
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                localStyles.registerBtn,
                                (loading || form.pin.length < PIN_LENGTH) &&
                                localStyles.registerBtnDisabled,
                            ]}
                            onPress={handleRegister}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={localStyles.registerBtnText}>Create Account</Text>
                            )}
                        </TouchableOpacity>

                        <View style={localStyles.signInRow}>
                            <Text style={localStyles.signInPrompt}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation?.navigate("Login")}>
                                <Text style={localStyles.signInLink}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default VendorRegistrationScreen;