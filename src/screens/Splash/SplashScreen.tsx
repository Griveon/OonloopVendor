import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { getUserData } from "../../components/AsyncStorage/AsyncStorage";
import { getRequest, postRequest } from "../../constants/ApiClient";
import { API_ENDPOINTS } from "../../constants/ApiEndpoints";


const AppLoadingScreen = ({ navigation }: any) => {
    useEffect(() => {
        const checkUserAndProfile = async () => {
            const { user, token } = await getUserData();

            if (!user || !token) {
                navigation.replace("Login");
                return;
            }

            try {
                console.log(user.user);
                console.log(user._id);
                const res: any = await getRequest(`${API_ENDPOINTS.CHECKPROFILECOMPLETED}/${user?.user?._id}`);

                if (res?.success && res?.data?.completed) {
                    navigation.replace("Dashboard");
                } else {
                    navigation.replace("VendorBusinessInfoUpdating");
                }
            } catch (e) {
                console.error("Profile check failed:", e);

                navigation.replace("VendorBusinessInfoUpdating");
            }
        };

        checkUserAndProfile();
    }, []);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.text}>Loading...</Text>
        </View>
    );
};

export default AppLoadingScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    text: {
        marginTop: 12,
        fontSize: 16,
        color: "#555",
    },
});