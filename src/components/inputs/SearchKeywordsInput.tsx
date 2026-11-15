import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    StyleProp,
    ViewStyle,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors } from "../../constants/AppThem";

interface SearchKeywordsInputProps {
    keywords: string[];
    onChangeKeywords: (keywords: string[]) => void;
    maxKeywords?: number;
    containerStyle?: StyleProp<ViewStyle>;
    label?: string;
    helperText?: string;
}

export const SearchKeywordsInput: React.FC<SearchKeywordsInputProps> = ({
    keywords = [],
    onChangeKeywords,
    maxKeywords = 25,
    containerStyle,
    label = "Search Keywords & Tags",
    helperText = "Add keywords to help buyers find your product in search. Press comma or Enter to add.",
}) => {
    const [inputText, setInputText] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const addKeyword = (rawText: string) => {
        const trimmed = rawText.trim().replace(/^,+|,+$/g, "");
        if (!trimmed) return;

        if (keywords.length >= maxKeywords) {
            setErrorMsg(`Maximum ${maxKeywords} keywords allowed.`);
            return;
        }

        // Check if keyword already exists (case-insensitive)
        const lowerTrimmed = trimmed.toLowerCase();
        const exists = keywords.some((k) => k.toLowerCase() === lowerTrimmed);
        if (exists) {
            setErrorMsg(`"${trimmed}" is already added.`);
            return;
        }

        setErrorMsg("");
        onChangeKeywords([...keywords, trimmed]);
        setInputText("");
    };

    const handleTextChange = (text: string) => {
        setErrorMsg("");
        if (text.includes(",")) {
            // Split by comma
            const parts = text.split(",");
            const lastPart = parts.pop() || "";
            const newToAdd: string[] = [];

            for (const part of parts) {
                const clean = part.trim();
                if (clean) {
                    const lowerClean = clean.toLowerCase();
                    const alreadyInList = keywords.some((k) => k.toLowerCase() === lowerClean);
                    const alreadyInBatch = newToAdd.some((k) => k.toLowerCase() === lowerClean);

                    if (!alreadyInList && !alreadyInBatch && (keywords.length + newToAdd.length < maxKeywords)) {
                        newToAdd.push(clean);
                    }
                }
            }

            if (newToAdd.length > 0) {
                onChangeKeywords([...keywords, ...newToAdd]);
            }
            setInputText(lastPart.trimStart());
        } else {
            setInputText(text);
        }
    };

    const removeKeyword = (indexToRemove: number) => {
        setErrorMsg("");
        const updated = keywords.filter((_, idx) => idx !== indexToRemove);
        onChangeKeywords(updated);
    };

    const handleClearAll = () => {
        setErrorMsg("");
        setInputText("");
        onChangeKeywords([]);
    };

    return (
        <View style={[styles.container, containerStyle]}>
            <View style={styles.headerRow}>
                <View style={styles.labelRow}>
                    <Ionicons name="search-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.label}>{label}</Text>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.counterText}>
                        {keywords.length}/{maxKeywords}
                    </Text>
                    {keywords.length > 0 && (
                        <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={styles.clearAllText}>Clear All</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. cotton, casual, summer wear"
                    placeholderTextColor={colors.placeholder}
                    value={inputText}
                    onChangeText={handleTextChange}
                    onSubmitEditing={() => addKeyword(inputText)}
                    returnKeyType="done"
                    blurOnSubmit={false}
                    maxLength={50}
                />
                <TouchableOpacity
                    style={[
                        styles.addBtn,
                        (!inputText.trim() || keywords.length >= maxKeywords) && styles.addBtnDisabled,
                    ]}
                    onPress={() => addKeyword(inputText)}
                    disabled={!inputText.trim() || keywords.length >= maxKeywords}
                    activeOpacity={0.7}
                >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
            </View>

            {!!errorMsg && (
                <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            )}

            {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

            {keywords.length > 0 && (
                <View style={styles.chipsContainer}>
                    {keywords.map((kw, idx) => (
                        <View key={`${kw}-${idx}`} style={styles.chip}>
                            <Text style={styles.chipText} numberOfLines={1}>
                                {kw}
                            </Text>
                            <TouchableOpacity
                                onPress={() => removeKeyword(idx)}
                                style={styles.chipRemoveBtn}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                accessibilityLabel={`Remove ${kw}`}
                            >
                                <Ionicons name="close-circle" size={16} color="#3B82F6" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.label,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    counterText: {
        fontSize: 12,
        color: colors.placeholder,
        fontWeight: "500",
    },
    clearAllBtn: {
        paddingHorizontal: 4,
    },
    clearAllText: {
        fontSize: 12,
        color: colors.error,
        fontWeight: "600",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.formBg,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.formBorder,
        paddingHorizontal: 12,
        minHeight: 48,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: colors.secondary,
        paddingVertical: 10,
    },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.primary,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 7,
        gap: 2,
    },
    addBtnDisabled: {
        backgroundColor: "#93C5FD",
        opacity: 0.6,
    },
    addBtnText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "600",
    },
    helperText: {
        fontSize: 12,
        color: colors.placeholder,
        marginTop: 5,
        lineHeight: 16,
    },
    errorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
    },
    errorText: {
        fontSize: 12,
        color: colors.error,
        fontWeight: "500",
    },
    chipsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 10,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        borderRadius: 20,
        paddingVertical: 5,
        paddingLeft: 12,
        paddingRight: 8,
        maxWidth: "100%",
        gap: 6,
    },
    chipText: {
        fontSize: 13,
        color: "#1E40AF",
        fontWeight: "500",
        flexShrink: 1,
    },
    chipRemoveBtn: {
        justifyContent: "center",
        alignItems: "center",
    },
});

export default SearchKeywordsInput;
