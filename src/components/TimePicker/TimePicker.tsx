// components/TimePickerField.tsx
// Drop-in replacement for the working hours time inputs.
// Mirrors DatePickerField exactly — same sheet, same Android/iOS split.

import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    Platform,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors, inputStyles, localStyles } from "../../constants/AppThem";

function parseStoredTime(val: string): Date {
    const base = new Date();
    base.setSeconds(0, 0);
    if (val && val.length === 5) {
        const [hh, mm] = val.split(":");
        const h = Number(hh);
        const m = Number(mm);
        if (!isNaN(h) && !isNaN(m)) {
            base.setHours(h, m);
            return base;
        }
    }
    // Default: 09:00
    base.setHours(9, 0);
    return base;
}

/** Format a Date → "HH:MM" (24-hour) */
function formatTime(date: Date): string {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

/** Format a Date → "09:00 AM" for display */
function formatTimeDisplay(val: string): string {
    if (!val || val.length !== 5) return "";
    const [hh, mm] = val.split(":");
    const h = Number(hh);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, "0")}:${mm} ${ampm}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

type TimePickerFieldProps = {
    /** Stored value in 24-h "HH:MM" format, e.g. "09:00" */
    value: string;
    /** Called with the new "HH:MM" string on confirm */
    onConfirm: (time: string) => void;
    /** Sheet title, e.g. "Opening Time" */
    title?: string;
    /** Placeholder shown in the input */
    placeholder?: string;
};

const TimePickerField = ({
    value,
    onConfirm,
    title = "Select Time",
    placeholder = "HH:MM",
}: TimePickerFieldProps) => {
    const [show, setShow] = useState(false);
    const [iosTemp, setIosTemp] = useState<Date>(() => parseStoredTime(value));

    // ── Shared display field ─────────────────────────────────────────────────
    const DisplayField = () => (
        <TouchableOpacity
            onPress={() => {
                setIosTemp(parseStoredTime(value));
                setShow(true);
            }}
            activeOpacity={0.8}
        >
            <View style={{ position: "relative", justifyContent: "center" }}>
                <TextInput
                    style={[inputStyles.input, { paddingRight: 44 }]}
                    value={value ? formatTimeDisplay(value) : ""}
                    placeholder={placeholder}
                    placeholderTextColor={colors.placeholder}
                    editable={false}
                    pointerEvents="none"
                />
                <View style={localStyles.eyeBtn} pointerEvents="none">
                    <Ionicons name="time-outline" size={20} color={colors.placeholder} />
                </View>
            </View>
        </TouchableOpacity>
    );

    // ── Android: inline spinner ──────────────────────────────────────────────
    if (Platform.OS === "android") {
        return (
            <>
                <DisplayField />
                {show && (
                    <DateTimePicker
                        value={parseStoredTime(value)}
                        mode="time"
                        display="spinner"
                        is24Hour={true}
                        onChange={(event: DateTimePickerEvent, selected?: Date) => {
                            setShow(false);
                            if (event.type === "set" && selected) {
                                onConfirm(formatTime(selected));
                            }
                        }}
                    />
                )}
            </>
        );
    }

    // ── iOS: bottom sheet modal ──────────────────────────────────────────────
    return (
        <>
            <DisplayField />
            <Modal
                visible={show}
                transparent
                animationType="slide"
                onRequestClose={() => setShow(false)}
            >
                {/* Dimmed backdrop — tap to dismiss */}
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
                    activeOpacity={1}
                    onPress={() => setShow(false)}
                />

                {/* Sheet */}
                <View style={localStyles.iosSheet}>
                    <View style={localStyles.iosSheetHeader}>
                        <TouchableOpacity
                            onPress={() => setShow(false)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={localStyles.cancelBtn}>Cancel</Text>
                        </TouchableOpacity>

                        <Text style={localStyles.sheetTitle}>{title}</Text>

                        <TouchableOpacity
                            onPress={() => {
                                onConfirm(formatTime(iosTemp));
                                setShow(false);
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={localStyles.confirmBtn}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <DateTimePicker
                        value={iosTemp}
                        mode="time"
                        display="spinner"
                        is24Hour={true}
                        onChange={(_: DateTimePickerEvent, d?: Date) => d && setIosTemp(d)}
                        style={{ backgroundColor: colors.scaffoldBg }}
                    />
                </View>
            </Modal>
        </>
    );
};

export default TimePickerField;
