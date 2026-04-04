// components/Input/index.tsx
import React, { useState } from "react";
import { TextInput, View, Text, TextInputProps, StyleProp, ViewStyle, TextStyle } from "react-native";
import { inputStyles, colors } from "../../constants/AppThem";

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<TextStyle>;
}

const Input: React.FC<InputProps> = ({
    label,
    error,
    containerStyle,
    inputStyle,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);

    // Determine container style based on focus/error
    const combinedContainerStyle = [
        inputStyles.container,
        isFocused && inputStyles.focused,
        error && inputStyles.error,
        containerStyle,
    ];

    return (
        <View style={{ marginVertical: 8 }}>
            {label && <Text style={inputStyles.label}>{label}</Text>}
            <TextInput
                style={[combinedContainerStyle, inputStyle]}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholderTextColor={inputStyles.placeholder.color}
                {...props}
            />
            {error ? (
                <Text style={inputStyles.errorText}>{error}</Text>
            ) : null}
        </View>
    );
};

export default Input;