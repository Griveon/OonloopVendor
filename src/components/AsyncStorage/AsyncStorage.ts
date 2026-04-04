import AsyncStorage from "@react-native-async-storage/async-storage";

export const storeUserData = async (user: any, token: string) => {
    try {
        await AsyncStorage.setItem("userData", JSON.stringify(user));
        await AsyncStorage.setItem("userToken", token);
    } catch (e) {
        console.error("Failed to store user data", e);
    }
};

export const getUserData = async () => {
    try {
        const userData: any = await AsyncStorage.getItem("userData");
        const token = await AsyncStorage.getItem("userToken");
        return { user: userData ? JSON.parse(userData) : null, token };
    } catch (e) {
        console.error("Failed to get user data", e);
        return { user: null, token: null };
    }
};

export const clearUserData = async () => {
    await AsyncStorage.removeItem("userData");
    await AsyncStorage.removeItem("userToken");
};