import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, TextStyle, ViewStyle, KeyboardTypeOptions } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors, inputStyles, localStyles } from "../../constants/AppThem";

interface FloatingInputProps {
    label?: string;
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    keyboardType?: KeyboardTypeOptions;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    secureTextEntry?: boolean;
    showToggle?: boolean;
    editable?: boolean;
    onPress?: () => void;
    rightIcon?: React.ReactNode;
    type?: "text" | "password" | "select";
    multiline?: boolean;
    numberOfLines?: number;
    style?: TextStyle | ViewStyle;
    onSubmitEditing?: () => void;
    returnKeyType?: "done" | "go" | "next" | "search" | "send";
    onBlur?: () => void;
    onFocus?: () => void;
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
    multiline = false,
    numberOfLines,
    style,
    onSubmitEditing,
    returnKeyType,
    onBlur,
    onFocus,
}) => {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(secureTextEntry);

    const renderInput = () => {
        if (type === "select") {
            return (
                <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
                    <View style={[inputStyles.input, focused && inputStyles.inputFocused, style] as any}>
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
                        multiline ? { height: undefined, textAlignVertical: "top" } : undefined,
                        style,
                    ] as any}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.placeholder}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    secureTextEntry={hidden}
                    onFocus={() => {
                        setFocused(true);
                        onFocus?.();
                    }}
                    onBlur={() => {
                        setFocused(false);
                        onBlur?.();
                    }}
                    editable={editable}
                    pointerEvents={editable ? "auto" : "none"}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    onSubmitEditing={onSubmitEditing}
                    returnKeyType={returnKeyType}
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
