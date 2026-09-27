import axios from "axios";
import { API_BASE_URL, GOOGLE_BASE_URL } from "./Environment";
import { showError } from "../components/utils/Toaster";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { navigate } from "../components/utils/NavigationService";

let isRedirectingToLogin = false;

const redirectToLoginIfUnauthorized = async (error: any) => {
    const status = error?.response?.status;

    if (status === 401 || status === 403) {
        try {
            await AsyncStorage.removeItem("userToken");
        } catch (storageError) {
            console.log("Token remove error:", storageError);
        }

        if (!isRedirectingToLogin) {
            isRedirectingToLogin = true;

            showError("Session expired. Please login again.");

            navigate("Login" as never);

            setTimeout(() => {
                isRedirectingToLogin = false;
            }, 2000);
        }

        return true;
    }

    return false;
};

const getErrorMessage = (error: any, fallbackMessage = "Something went wrong") => {
    return (
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        fallbackMessage
    );
};

const showApiError = (error: any, fallbackMessage = "Something went wrong") => {
    const message = getErrorMessage(error, fallbackMessage);
    showError(message);
};

const getAuthHeaders = async (authRequired = true) => {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (authRequired) {
        const token = await AsyncStorage.getItem("userToken");

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
    }

    return headers;
};

export const postRequest = async (
    endpoint: string,
    data: any,
    authRequired = true
) => {
    try {
        const headers = await getAuthHeaders(authRequired);

        const response = await axios.post(`${API_BASE_URL}${endpoint}`, data, {
            headers,
        });

        return response.data;
    } catch (error: any) {
        console.error("API POST Error:", error?.response?.data || error);

        const isUnauthorized = await redirectToLoginIfUnauthorized(error);

        if (!isUnauthorized) {
            showApiError(error);
        }

        return {
            success: false,
            unauthorized: isUnauthorized,
            message: getErrorMessage(error),
        };
    }
};

export const putRequest = async (
    endpoint: string,
    data: any,
    authRequired = true
) => {
    try {
        const headers = await getAuthHeaders(authRequired);

        const response = await axios.put(`${API_BASE_URL}${endpoint}`, data, {
            headers,
        });

        return response.data;
    } catch (error: any) {
        console.error("API PUT Error:", error?.response?.data || error);

        const isUnauthorized = await redirectToLoginIfUnauthorized(error);

        if (!isUnauthorized) {
            showApiError(error);
        }

        return {
            success: false,
            unauthorized: isUnauthorized,
            message: getErrorMessage(error),
        };
    }
};

export const getRequest = async (
    endpoint: string,
    params?: Record<string, any>,
    authRequired = true,
    isShowError = true
) => {
    try {
        const headers = await getAuthHeaders(authRequired);

        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
            headers,
            params,
        });

        return response.data;
    } catch (error: any) {
        console.error("API GET Error:", error?.response?.data || error);

        const isUnauthorized = await redirectToLoginIfUnauthorized(error);

        if (!isUnauthorized && isShowError) {
            showApiError(error);
        }

        return {
            success: false,
            unauthorized: isUnauthorized,
            message: getErrorMessage(error),
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
            message:
                error?.response?.data?.error_message ||
                error?.message ||
                "Google API request failed",
        };
    }
};

export const uploadRequest = async (
    endpoint: string,
    formData: FormData,
    authRequired = true
) => {
    try {
        const headers: Record<string, string> = {};

        if (authRequired) {
            const token = await AsyncStorage.getItem("userToken");

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
        }

        const response = await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
            headers: {
                ...headers,
                "Content-Type": "multipart/form-data",
            },
            transformRequest: data => data,
        });

        return response.data;
    } catch (error: any) {
        console.error("UPLOAD API Error:", error?.response?.data || error);

        const isUnauthorized = await redirectToLoginIfUnauthorized(error);

        if (!isUnauthorized) {
            showApiError(error, "Upload failed");
        }

        return {
            success: false,
            unauthorized: isUnauthorized,
            message: getErrorMessage(error, "Upload failed"),
        };
    }
};

/**
 * PUT-based multipart upload — needed because the profile-image route is:
 *   vendorProfileRoutes.put("/profile-image", authMiddleware, upload.single("profileImage"), controller.updateProfileImage)
 * axios needs `transformRequest: data => data` so it doesn't try to JSON.stringify the FormData,
 * and the Content-Type header must NOT be hardcoded to multipart/form-data on some RN/axios
 * versions — letting the platform set the boundary avoids "Network request failed" issues.
 * If you hit boundary issues on Android, hardcode "multipart/form-data" back in like uploadRequest above.
 */
export const uploadPutRequest = async (
    endpoint: string,
    formData: FormData,
    authRequired = true
) => {
    try {
        const headers: Record<string, string> = {};

        if (authRequired) {
            const token = await AsyncStorage.getItem("userToken");

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
        }

        const response = await axios.put(`${API_BASE_URL}${endpoint}`, formData, {
            headers: {
                ...headers,
                "Content-Type": "multipart/form-data",
            },
            transformRequest: data => data,
        });

        return response.data;
    } catch (error: any) {
        console.error("UPLOAD (PUT) API Error:", error?.response?.data || error);

        const isUnauthorized = await redirectToLoginIfUnauthorized(error);

        if (!isUnauthorized) {
            showApiError(error, "Upload failed");
        }

        return {
            success: false,
            unauthorized: isUnauthorized,
            message: getErrorMessage(error, "Upload failed"),
        };
    }

};

export const deleteRequest = async (
    endpoint: string,
    data?: any,
    authRequired = true
) => {
    try {
        const headers = await getAuthHeaders(authRequired);

        const response = await axios.delete(
            `${API_BASE_URL}${endpoint}`,
            {
                headers,
                data,
            }
        );

        return response.data;
    } catch (error: any) {
        console.error(
            "API DELETE Error:",
            error?.response?.data || error
        );

        const isUnauthorized =
            await redirectToLoginIfUnauthorized(error);

        if (!isUnauthorized) {
            showApiError(error);
        }

        return {
            success: false,
            unauthorized: isUnauthorized,
            message: getErrorMessage(error),
        };
    }
};