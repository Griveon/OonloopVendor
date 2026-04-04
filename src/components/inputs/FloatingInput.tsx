import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors, inputStyles, localStyles } from "../../constants/AppThem";

interface FloatingInputProps {
    label?: string;
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    secureTextEntry?: boolean;
    showToggle?: boolean;
    editable?: boolean;
    onPress?: () => void;
    rightIcon?: React.ReactNode;
    type?: "text" | "password" | "select"; // add more types later
}

const FloatingInput: React.FC<FloatingInputProps> = ({
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
    type = "text",
}) => {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(secureTextEntry);

    const renderInput = () => {
        if (type === "select") {
            // For select dropdown, make the TextInput non-editable
            return (
                <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
                    <View style={[inputStyles.input, focused && inputStyles.inputFocused]}>
                        <Text style={{ color: value ? colors.label : colors.placeholder }}>
                            {value || placeholder}
                        </Text>
                        {rightIcon && <View style={localStyles.eyeBtn}>{rightIcon}</View>}
                    </View>
                </TouchableOpacity>
            );
        }

        return (
            <View style={{ position: "relative", justifyContent: "center" }}>
                <TextInput
                    style={[
                        inputStyles.input,
                        focused ? inputStyles.inputFocused : undefined,
                        (showToggle || rightIcon) ? { paddingRight: 44 } : undefined,
                        !editable ? { color: colors.placeholder } : undefined,
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
                {showToggle && type === "password" && (
                    <TouchableOpacity
                        onPress={() => setHidden((h) => !h)}
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
                {rightIcon && !showToggle && <View style={localStyles.eyeBtn}>{rightIcon}</View>}
            </View>
        );
    };

    return (
        <View style={inputStyles.wrapper}>
            {label && <Text style={inputStyles.label}>{label}</Text>}
            {type === "select" && onPress ? renderInput() : renderInput()}
        </View>
    );
};

export default FloatingInput;