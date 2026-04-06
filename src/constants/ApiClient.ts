import axios from "axios";
import { API_BASE_URL, GOOGLE_BASE_URL } from "./Environment";
import { showError } from "../components/utils/Toaster";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const postRequest = async (endpoint: string, data: any, authRequired = true) => {
    try {
        let headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (authRequired) {
            const token = await AsyncStorage.getItem("userToken");
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
        }

        console.log(data)

        const response = await axios.post(`${API_BASE_URL}${endpoint}`, data, { headers });

        return response.data;
    } catch (error: any) {
        console.error("API Error:", error?.response?.data || error);

        showError(error?.response?.data || error);

        return {
            success: false,
            message: error?.response?.data?.message || error?.message || 'Something went wrong',
        };
    }
};

export const putRequest = async (endpoint: string, data: any, authRequired = true) => {
    try {
        let headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (authRequired) {
            const token = await AsyncStorage.getItem("userToken");
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
        }

        console.log(data)

        const response = await axios.put(`${API_BASE_URL}${endpoint}`, data, { headers });

        return response.data;
    } catch (error: any) {
        console.error("API Error:", error?.response?.data || error);

        showError(error?.response?.data || error);

        return {
            success: false,
            message: error?.response?.data?.message || error?.message || 'Something went wrong',
        };
    }
};

export const getRequest = async (
    endpoint: string,
    params?: Record<string, any>,   // ← query params
    authRequired = true
) => {
    try {
        let headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (authRequired) {
            const token = await AsyncStorage.getItem("userToken");
            if (token) headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
            headers,
            params, // ← passed directly to axios
        });
        return response.data;
    } catch (error: any) {
        console.error("API GET Error:", error?.response?.data || error);
        showError(error?.response?.data || error);
        return {
            success: false,
            message: error?.response?.data?.message || error?.message || "Something went wrong",
        };
    }
};

export const googleGetRequest = async (endpoint: string, params: any) => {
    try {
        const response = await axios.get(`${GOOGLE_BASE_URL}${endpoint}`, {
            params,
        });

        return response.data;
    } catch (error: any) {
        console.error("Google API Error:", error?.response?.data || error);

        return {
            success: false,
            message: error?.response?.data?.error_message || error?.message,
        };
    }
};