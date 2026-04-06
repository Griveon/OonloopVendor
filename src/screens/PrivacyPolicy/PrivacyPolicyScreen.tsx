import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Platform,
    Dimensions,
    KeyboardAvoidingView,
} from 'react-native';
import Pdf from 'react-native-pdf';
import { NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppBar from '../../components/utils/AppBar';

const PRIMARY_COLOR = '#4F46E5';

type Props = {
    navigation: NavigationProp<any>;
};

type PdfRef = {
    setPage: (page: number) => void;
};

const PrivacyPolicyScreen = ({ navigation }: Props) => {
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const pdfRef = useRef<PdfRef>(null);

    const source = { uri: 'bundle-assets://OonloopPrivacyPolicy1.pdf', cache: true };

    const goToPage = (page: number) => {
        if (pdfRef.current) {
            pdfRef.current.setPage(page);
            setCurrentPage(page);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <AppBar
                    title="Privacy Policy"
                    onBack={() => navigation.goBack()}
                />

                <View style={styles.pdfContainer}>
                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : (
                        <>
                            {loading && (
                                <ActivityIndicator
                                    style={StyleSheet.absoluteFill}
                                    size="large"
                                    color={PRIMARY_COLOR}
                                />
                            )}
                            <Pdf
                                ref={pdfRef as any}
                                source={source}
                                horizontal={true}
                                enablePaging={true}
                                onLoadComplete={(numberOfPages: number) => {
                                    setTotalPages(numberOfPages);
                                    setLoading(false);
                                }}
                                onPageChanged={(page: number) => {
                                    setCurrentPage(page);
                                }}
                                onError={(e: unknown) => {
                                    console.error('PDF Error:', e);
                                    setError('Failed to load Privacy Policy.');
                                    setLoading(false);
                                }}
                                onPressLink={(uri: string) => {
                                    console.log(`Link pressed: ${uri}`);
                                }}
                                style={styles.pdf}
                            />
                        </>
                    )}
                </View>

                {/* Page Navigation */}
                {totalPages > 0 && !error && (
                    <View style={styles.navBar}>
                        <TouchableOpacity
                            style={[styles.navBtn, currentPage <= 1 && styles.navBtnDisabled]}
                            onPress={() => goToPage(currentPage - 1)}
                            disabled={currentPage <= 1}
                        >
                            <Text style={styles.navBtnText}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.pageInfo}>Page {currentPage} of {totalPages}</Text>
                        <TouchableOpacity
                            style={[styles.navBtn, currentPage >= totalPages && styles.navBtnDisabled]}
                            onPress={() => goToPage(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                        >
                            <Text style={styles.navBtnText}>›</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    pdfContainer: { flex: 1 },
    pdf: {
        flex: 1,
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { color: 'red', fontSize: 14, textAlign: 'center' },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#e5e7eb',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    navBtn: { padding: 8 },
    navBtnDisabled: { opacity: 0.35 },
    navBtnText: { fontSize: 28, color: '#111', lineHeight: 30 },
    pageInfo: { fontWeight: '600', fontSize: 14, color: '#333' },
});

export default PrivacyPolicyScreen;