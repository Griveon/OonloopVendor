import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    ScrollView,
    Switch,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Toast from "react-native-toast-message";

import AppBar from "../../components/utils/AppBar";
import TimePickerField from "../../components/TimePicker/TimePicker";
import { appTheme, colors, inputStyles, textStyles } from "../../constants/AppThem";
import { Fonts } from "../../constants/Fonts";
import { getRequest, postRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";
import { PreorderConfig, getConfigProductId } from "./preorderUtils";

type SlotForm = {
    key: number;
    label: string;
    start: string;
    end: string;
};

const TIME_REGEX = /^\d{2}:\d{2}$/;

const showValidationError = (message: string) =>
    Toast.show({ type: "error", text1: "Check preorder rules", text2: message });

const PreorderRulesScreen = ({ route, navigation }: any) => {
    const productId: string = route?.params?.productId || "";
    const productName: string = route?.params?.productName || "";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasConfig, setHasConfig] = useState(false);
    const [isActive, setIsActive] = useState(true);

    const [sameDayEnabled, setSameDayEnabled] = useState(true);
    const [readyWithinHours, setReadyWithinHours] = useState("3");
    const [cutoffTime, setCutoffTime] = useState("");

    const [scheduledEnabled, setScheduledEnabled] = useState(false);
    const [minLeadDays, setMinLeadDays] = useState("1");
    const [horizonDays, setHorizonDays] = useState("7");
    const [slots, setSlots] = useState<SlotForm[]>([]);

    const slotKeyRef = useRef(0);
    const nextSlotKey = () => {
        slotKeyRef.current += 1;
        return slotKeyRef.current;
    };

    useEffect(() => {
        // There is no get-by-product endpoint, so find this product in the vendor's list.
        const loadConfig = async () => {
            const res: any = await getRequest(API_ENDPOINTS.PREORDERCONFIGMINE);

            const config: PreorderConfig | undefined = Array.isArray(res?.data)
                ? res.data.find(
                    (c: PreorderConfig) => getConfigProductId(c) === productId
                )
                : undefined;

            if (config) {
                setHasConfig(true);
                setIsActive(config.isActive !== false);

                setSameDayEnabled(Boolean(config.sameDay?.enabled));
                setReadyWithinHours(
                    String(config.sameDay?.readyWithinHours ?? "3")
                );
                setCutoffTime(config.sameDay?.cutoffTime || "");

                setScheduledEnabled(Boolean(config.scheduled?.enabled));
                setMinLeadDays(String(config.scheduled?.minLeadDays ?? "1"));
                setHorizonDays(String(config.scheduled?.horizonDays ?? "7"));
                setSlots(
                    (config.scheduled?.slots || []).map((slot) => ({
                        key: nextSlotKey(),
                        label: slot.label || "",
                        start: slot.start || "",
                        end: slot.end || "",
                    }))
                );
            }

            setLoading(false);
        };

        loadConfig();
    }, [productId]);

    const addSlot = () =>
        setSlots((prev) => [
            ...prev,
            { key: nextSlotKey(), label: "", start: "", end: "" },
        ]);

    const updateSlot = (key: number, patch: Partial<SlotForm>) =>
        setSlots((prev) =>
            prev.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot))
        );

    const removeSlot = (key: number) =>
        setSlots((prev) => prev.filter((slot) => slot.key !== key));

    /** Returns an error message, or null when the form is valid. */
    const validate = (): string | null => {
        if (!sameDayEnabled && !scheduledEnabled) {
            return "Turn on Same-day or Scheduled preorder.";
        }

        if (sameDayEnabled) {
            const hours = Number(readyWithinHours);

            if (!readyWithinHours.trim() || isNaN(hours) || hours <= 0) {
                return "Ready within hours must be more than 0.";
            }
        }

        if (scheduledEnabled) {
            const lead = Number(minLeadDays);
            const horizon = Number(horizonDays);

            if (!minLeadDays.trim() || !Number.isInteger(lead) || lead < 0) {
                return "Minimum lead days must be 0 or more.";
            }

            if (!horizonDays.trim() || !Number.isInteger(horizon) || horizon < 1) {
                return "Booking window must be at least 1 day.";
            }

            if (horizon < lead) {
                return "Booking window cannot be shorter than the minimum lead days.";
            }

            if (slots.length === 0) {
                return "Add at least one delivery slot.";
            }

            for (let i = 0; i < slots.length; i++) {
                const slot = slots[i];
                const name = `Slot ${i + 1}`;

                if (!slot.label.trim()) return `${name}: enter a name.`;

                if (!TIME_REGEX.test(slot.start) || !TIME_REGEX.test(slot.end)) {
                    return `${name}: choose a start and end time.`;
                }

                // "HH:mm" strings compare correctly as text.
                if (slot.start >= slot.end) {
                    return `${name}: start time must be before end time.`;
                }
            }
        }

        return null;
    };

    const handleSave = async () => {
        if (saving) return;

        const error = validate();

        if (error) {
            showValidationError(error);
            return;
        }

        // A turned-off section is not validated, so fall back to safe values for it.
        const hours = Number(readyWithinHours);
        const lead = Number(minLeadDays);
        const horizon = Number(horizonDays);
        const safeLead = Number.isInteger(lead) && lead >= 0 ? lead : 1;

        const payload = {
            isActive,
            sameDay: {
                enabled: sameDayEnabled,
                readyWithinHours: hours > 0 ? hours : 3,
                cutoffTime,
            },
            scheduled: {
                enabled: scheduledEnabled,
                minLeadDays: safeLead,
                horizonDays:
                    Number.isInteger(horizon) && horizon >= Math.max(1, safeLead)
                        ? horizon
                        : Math.max(7, safeLead),
                slots: slots
                    .filter(
                        (slot) =>
                            slot.label.trim() &&
                            TIME_REGEX.test(slot.start) &&
                            TIME_REGEX.test(slot.end) &&
                            slot.start < slot.end
                    )
                    .map((slot) => ({
                        label: slot.label.trim(),
                        start: slot.start,
                        end: slot.end,
                    })),
            },
        };

        setSaving(true);

        const res: any = await postRequest(
            `${API_ENDPOINTS.PREORDERCONFIG}/${productId}`,
            payload
        );

        setSaving(false);

        if (res?.success) {
            Toast.show({
                type: "success",
                text1: "Preorder rules saved",
            });
            navigation.goBack();
        }
    };

    if (loading) {
        return (
            <View style={appTheme.scaffold}>
                <AppBar
                    title="Preorder Rules"
                    onBack={() => navigation.goBack()}
                />
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={appTheme.scaffold}>
            <AppBar
                title={hasConfig ? "Edit Preorder Rules" : "Set Up Preorder"}
                onBack={() => navigation.goBack()}
            />

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {productName ? (
                    <View style={styles.productBox}>
                        <Ionicons name="cube-outline" size={18} color={colors.primary} />
                        <Text style={styles.productName} numberOfLines={2}>
                            {productName}
                        </Text>
                    </View>
                ) : null}

                {/* Master switch */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>Accept preorders</Text>
                            <Text style={styles.sectionHint}>
                                Turn off to hide this product from the customer
                                preorder list. Your rules are kept.
                            </Text>
                        </View>
                        <Switch
                            value={isActive}
                            onValueChange={setIsActive}
                            trackColor={{ false: colors.formBorder, true: colors.primary + "80" }}
                            thumbColor={isActive ? colors.primary : "#F4F4F5"}
                        />
                    </View>
                </View>

                {/* Same-day */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>Same-day</Text>
                            <Text style={styles.sectionHint}>
                                Customer orders today and gets it today.
                            </Text>
                        </View>
                        <Switch
                            value={sameDayEnabled}
                            onValueChange={setSameDayEnabled}
                            trackColor={{ false: colors.formBorder, true: colors.primary + "80" }}
                            thumbColor={sameDayEnabled ? colors.primary : "#F4F4F5"}
                        />
                    </View>

                    {sameDayEnabled && (
                        <View style={styles.sectionBody}>
                            <Text style={inputStyles.label}>
                                Ready within (hours)
                            </Text>
                            <TextInput
                                style={inputStyles.input}
                                value={readyWithinHours}
                                onChangeText={(t) =>
                                    setReadyWithinHours(t.replace(/[^0-9.]/g, ""))
                                }
                                keyboardType="decimal-pad"
                                placeholder="e.g. 3"
                                placeholderTextColor={colors.placeholder}
                                maxLength={5}
                            />

                            <View style={styles.labelRow}>
                                <Text style={inputStyles.label}>
                                    Last order time (optional)
                                </Text>
                                {cutoffTime ? (
                                    <TouchableOpacity onPress={() => setCutoffTime("")}>
                                        <Text style={styles.clearText}>Clear</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                            <TimePickerField
                                value={cutoffTime}
                                onConfirm={setCutoffTime}
                                title="Last Order Time"
                                placeholder="No cutoff"
                            />
                        </View>
                    )}
                </View>

                {/* Scheduled */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>Scheduled</Text>
                            <Text style={styles.sectionHint}>
                                Customer picks a future day and a delivery slot.
                            </Text>
                        </View>
                        <Switch
                            value={scheduledEnabled}
                            onValueChange={(value) => {
                                setScheduledEnabled(value);
                                if (value && slots.length === 0) addSlot();
                            }}
                            trackColor={{ false: colors.formBorder, true: colors.primary + "80" }}
                            thumbColor={scheduledEnabled ? colors.primary : "#F4F4F5"}
                        />
                    </View>

                    {scheduledEnabled && (
                        <View style={styles.sectionBody}>
                            <View style={styles.row}>
                                <View style={styles.half}>
                                    <Text style={inputStyles.label}>
                                        Minimum lead (days)
                                    </Text>
                                    <TextInput
                                        style={inputStyles.input}
                                        value={minLeadDays}
                                        onChangeText={(t) =>
                                            setMinLeadDays(t.replace(/[^0-9]/g, ""))
                                        }
                                        keyboardType="number-pad"
                                        placeholder="e.g. 1"
                                        placeholderTextColor={colors.placeholder}
                                        maxLength={3}
                                    />
                                </View>
                                <View style={styles.half}>
                                    <Text style={inputStyles.label}>
                                        Booking window (days)
                                    </Text>
                                    <TextInput
                                        style={inputStyles.input}
                                        value={horizonDays}
                                        onChangeText={(t) =>
                                            setHorizonDays(t.replace(/[^0-9]/g, ""))
                                        }
                                        keyboardType="number-pad"
                                        placeholder="e.g. 7"
                                        placeholderTextColor={colors.placeholder}
                                        maxLength={3}
                                    />
                                </View>
                            </View>
                            <Text style={styles.fieldHint}>
                                Earliest delivery is today + minimum lead. Latest
                                is today + booking window.
                            </Text>

                            <Text style={styles.slotsTitle}>Delivery slots</Text>

                            {slots.map((slot, index) => (
                                <View key={slot.key} style={styles.slotCard}>
                                    <View style={styles.labelRow}>
                                        <Text style={inputStyles.label}>
                                            Slot {index + 1} name
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => removeSlot(slot.key)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons
                                                name="trash-outline"
                                                size={17}
                                                color={colors.error}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    <TextInput
                                        style={inputStyles.input}
                                        value={slot.label}
                                        onChangeText={(t) =>
                                            updateSlot(slot.key, { label: t })
                                        }
                                        placeholder="e.g. Morning"
                                        placeholderTextColor={colors.placeholder}
                                        maxLength={30}
                                    />

                                    <View style={[styles.row, { marginTop: 10 }]}>
                                        <View style={styles.half}>
                                            <Text style={inputStyles.label}>Start</Text>
                                            <TimePickerField
                                                value={slot.start}
                                                onConfirm={(time) =>
                                                    updateSlot(slot.key, { start: time })
                                                }
                                                title="Slot Start"
                                                placeholder="Start"
                                            />
                                        </View>
                                        <View style={styles.half}>
                                            <Text style={inputStyles.label}>End</Text>
                                            <TimePickerField
                                                value={slot.end}
                                                onConfirm={(time) =>
                                                    updateSlot(slot.key, { end: time })
                                                }
                                                title="Slot End"
                                                placeholder="End"
                                            />
                                        </View>
                                    </View>
                                </View>
                            ))}

                            <TouchableOpacity
                                style={styles.addSlotBtn}
                                activeOpacity={0.8}
                                onPress={addSlot}
                            >
                                <Ionicons name="add" size={17} color={colors.primary} />
                                <Text style={styles.addSlotText}>Add slot</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    activeOpacity={0.85}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save Rules</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

export default PreorderRulesScreen;

const styles = StyleSheet.create({
    loadingBox: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    content: {
        padding: 14,
        paddingBottom: 40,
    },
    productBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#EFF6FF",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    productName: {
        ...textStyles.titleLarge,
        fontSize: 14,
        flex: 1,
    },
    section: {
        backgroundColor: colors.formBg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.formBorder,
        padding: 14,
        marginBottom: 12,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    sectionTitle: {
        ...textStyles.titleLarge,
        fontSize: 15,
    },
    sectionHint: {
        fontSize: 12,
        color: colors.placeholder,
        fontFamily: Fonts.Regular,
        marginTop: 2,
        lineHeight: 17,
    },
    sectionBody: {
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: colors.formBorder,
    },
    row: {
        flexDirection: "row",
        gap: 10,
    },
    half: {
        flex: 1,
    },
    labelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
    },
    clearText: {
        fontSize: 12,
        color: colors.primary,
        fontFamily: Fonts.Medium,
        marginBottom: 6,
    },
    fieldHint: {
        fontSize: 12,
        color: colors.placeholder,
        fontFamily: Fonts.Regular,
        marginTop: 6,
        lineHeight: 17,
    },
    slotsTitle: {
        ...textStyles.titleMedium,
        fontSize: 13,
        marginTop: 16,
    },
    slotCard: {
        backgroundColor: colors.scaffoldBg,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingBottom: 12,
        marginTop: 10,
    },
    addSlotBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        borderWidth: 1,
        borderColor: colors.primary,
        borderStyle: "dashed",
        borderRadius: 10,
        paddingVertical: 11,
        marginTop: 12,
    },
    addSlotText: {
        fontSize: 13,
        color: colors.primary,
        fontFamily: Fonts.Medium,
    },
    saveBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: "center",
        marginTop: 6,
    },
    saveBtnText: {
        color: "#fff",
        fontSize: 15,
        fontFamily: Fonts.Medium,
    },
});
