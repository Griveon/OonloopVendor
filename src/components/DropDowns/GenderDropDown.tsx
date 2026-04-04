// components/GenderPicker.tsx
import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { inputloginStyles } from "../../screens/Auth/Login/LoginScreenStyle";
import { colors } from "../../constants/AppThem";
import { DropdownStyles } from "./GenderDropDownStyle";

const GENDERS = [
    { label: "Male", value: "male", icon: "male-outline" },
    { label: "Female", value: "female", icon: "female-outline" },
    { label: "Other", value: "other", icon: "transgender-outline" },
];

const GenderPicker = ({
    label,
    selectedValue,
    onValueChange,
}: {
    label?: string;
    selectedValue: string;
    onValueChange: (val: string) => void;
}) => {
    const [open, setOpen] = useState(false);

    const selected = GENDERS.find((g) => g.value === selectedValue);

    return (
        <View style={{ marginBottom: 14 }}>
            {label && <Text style={inputloginStyles.label}>{label}</Text>}

            <TouchableOpacity
                onPress={() => setOpen(true)}
                activeOpacity={1}
                style={DropdownStyles.trigger}
            >
                <View style={DropdownStyles.triggerLeft}>
                    {selected ? (
                        <>
                            <View style={DropdownStyles.iconBadge}>
                                <Ionicons
                                    name={selected.icon}
                                    size={16}
                                    color={colors.primary}
                                />
                            </View>
                            <Text style={DropdownStyles.selectedText}>{selected.label}</Text>
                        </>
                    ) : (
                        <Text style={DropdownStyles.placeholderText}>Select Gender</Text>
                    )}
                </View>
                <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.placeholder}
                />
            </TouchableOpacity>

            <Modal
                visible={open}
                transparent
                animationType="slide"
                onRequestClose={() => setOpen(false)}
            >
                <TouchableOpacity
                    style={DropdownStyles.backdrop}
                    activeOpacity={1}
                    onPress={() => setOpen(false)}
                />

                <View style={DropdownStyles.sheet}>

                    <View style={DropdownStyles.handle} />

                    <Text style={DropdownStyles.sheetTitle}>Select Gender</Text>

                    <FlatList
                        data={GENDERS}
                        keyExtractor={(item) => item.value}
                        scrollEnabled={false}
                        ItemSeparatorComponent={() => <View style={DropdownStyles.separator} />}
                        renderItem={({ item }) => {
                            const isSelected = item.value === selectedValue;
                            return (
                                <TouchableOpacity
                                    onPress={() => {
                                        onValueChange(item.value);
                                        setOpen(false);
                                    }}
                                    activeOpacity={0.7}
                                    style={[
                                        DropdownStyles.option,
                                        isSelected && DropdownStyles.optionSelected,
                                    ]}
                                >
                                    {/* Left: icon + label */}
                                    <View style={DropdownStyles.optionLeft}>
                                        <View
                                            style={[
                                                DropdownStyles.optionIconWrap,
                                                isSelected && DropdownStyles.optionIconWrapSelected,
                                            ]}
                                        >
                                            <Ionicons
                                                name={item.icon}
                                                size={20}
                                                color={
                                                    isSelected
                                                        ? colors.primary
                                                        : colors.placeholder
                                                }
                                            />
                                        </View>
                                        <Text
                                            style={[
                                                DropdownStyles.optionLabel,
                                                isSelected && DropdownStyles.optionLabelSelected,
                                            ]}
                                        >
                                            {item.label}
                                        </Text>
                                    </View>

                                    {isSelected && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={22}
                                            color={colors.primary}
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            </Modal>
        </View>
    );
};


export default GenderPicker;