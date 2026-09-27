import AsyncStorage from "@react-native-async-storage/async-storage";
const PREFERENCES_KEY = "userPreferences";

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

export const storeLocalPreferences = async (preferences: Record<string, any>) => {
    try {
        await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (e) {
        console.error("Failed to store local preferences", e);
    }
};

export const getLocalPreferences = async (): Promise<Record<string, any>> => {
    try {
        const prefs = await AsyncStorage.getItem(PREFERENCES_KEY);
        return prefs ? JSON.parse(prefs) : {};
    } catch (e) {
        console.error("Failed to get local preferences", e);
        return {};
    }
};

export const setSingleLocalPreference = async (key: string, value: any) => {
    try {
        const currentPrefs = await getLocalPreferences();
        currentPrefs[key] = value;
        await storeLocalPreferences(currentPrefs);
    } catch (e) {
        console.error("Failed to update single preference locally", e);
    }
};

export const clearUserData = async () => {
    await AsyncStorage.removeItem("userData");
    await AsyncStorage.removeItem("userToken");
};