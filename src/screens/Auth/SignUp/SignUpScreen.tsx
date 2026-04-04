import React, { useState } from "react";
import { View, ScrollView, Text, StyleSheet, ActivityIndicator, ToastAndroid } from "react-native";
import Input from "../../../components/inputs/CommonInput";
import Button from "../../../components/buttons/PrimaryButton";
import { postRequest } from "../../../constants/ApiClient";
import { showError } from "../../../components/utils/Toaster";
import { appTheme, colors } from "../../../constants/AppThem";

const SignUpScreen = () => {
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        mobileNumber: "",
        dateOfBirth: "",
        gender: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (field: string, value: string) => {
        setForm({ ...form, [field]: value });
    };

    const handleSignUp = async () => {
        setLoading(true);
        const res = await postRequest("/auth/signup", form);
        setLoading(false);

        if (!res.success) {
            showError(res);
        } else {
            ToastAndroid.show("Registered successfully!", ToastAndroid.LONG);
        }
    };

    return (
        <ScrollView style={appTheme.scaffold} contentContainerStyle={{ padding: 20 }}>
            <Text style={[{ fontSize: 28, fontWeight: "700", color: colors.primary, marginBottom: 20 }]}>
                Create Account
            </Text>

            <Input
                label="First Name"
                placeholder="Enter first name"
                value={form.firstName}
                onChangeText={(text) => handleChange("firstName", text)}
            />

            <Input
                label="Last Name"
                placeholder="Enter last name"
                value={form.lastName}
                onChangeText={(text) => handleChange("lastName", text)}
            />

            <Input
                label="Email"
                placeholder="Enter email"
                keyboardType="email-address"
                value={form.email}
                onChangeText={(text) => handleChange("email", text)}
            />

            <Input
                label="Mobile Number"
                placeholder="Enter mobile number"
                keyboardType="phone-pad"
                value={form.mobileNumber}
                onChangeText={(text) => handleChange("mobileNumber", text)}
            />

            <Input
                label="Password"
                placeholder="Enter password"
                secureTextEntry
                value={form.password}
                onChangeText={(text) => handleChange("password", text)}
            />

            <View style={{ marginTop: 20 }}>
                <Button
                    title={loading ? "Registering..." : "Sign Up"}
                    type="primary"
                    onPress={handleSignUp}
                    disabled={loading}
                />
                {loading && <ActivityIndicator style={{ marginTop: 10 }} color={colors.primary} />}
            </View>
        </ScrollView>
    );
};

export default SignUpScreen;