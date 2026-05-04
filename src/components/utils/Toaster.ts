import Toast from 'react-native-toast-message';

interface ApiError {
    message?: string;
    error?: { path: string[]; message: string }[];
}

export const showError = (error: ApiError | any) => {
    if (!error) return;

    if (error.error && Array.isArray(error.error)) {
        error?.error?.forEach((err: any) => {
            console.log("error.error")
            const msg = `${err?.message}`;
            console.log(msg)
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: msg,
                position: 'top',
                visibilityTime: 4000,
            });
        });
    }
    // If error is a single message
    else if (error.message) {
        Toast.show({
            type: 'error',
            text1: 'Error',
            text2: error.message,
            position: 'top',
            visibilityTime: 4000,
        });
    }
    // Fallback
    else {
        Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Something went wrong',
            position: 'top',
            visibilityTime: 4000,
        });
    }
};