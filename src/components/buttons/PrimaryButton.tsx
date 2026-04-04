// components/Button/index.tsx
import React from "react";
import { Text, TouchableOpacity, TouchableOpacityProps, StyleProp, ViewStyle, TextStyle } from "react-native";
import { buttonStyles } from "./PrimaryButtonStyle";

type ButtonType = "primary" | "success" | "danger" | "warning" | "outlined";

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    type?: ButtonType;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
}

const Button: React.FC<ButtonProps> = ({
    title,
    type = "primary",
    style,
    textStyle,
    ...props
}) => {

    const containerStyle: any = buttonStyles[`${type}Container` as keyof typeof buttonStyles];
    const textStyles = buttonStyles[`${type}Text` as keyof typeof buttonStyles];

    return (
        <TouchableOpacity style={[containerStyle, style]} {...props}>
            <Text style={[textStyles, textStyle]}>{title}</Text>
        </TouchableOpacity>
    );
};

export default Button;