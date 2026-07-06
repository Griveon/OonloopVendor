import { Platform } from "react-native";
import SpInAppUpdates, {
    IAUUpdateKind,
    StartUpdateOptions,
} from "sp-react-native-in-app-updates";

const inAppUpdates = new SpInAppUpdates(false);

export const checkAppUpdate = async () => {
    try {
        if (Platform.OS !== "android") {
            return;
        }

        const result = await inAppUpdates.checkNeedsUpdate();

        if (!result.shouldUpdate) {
            console.log("App is already updated");
            return;
        }

        const updateOptions: StartUpdateOptions = {
            updateType: IAUUpdateKind.IMMEDIATE,
        };

        await inAppUpdates.startUpdate(updateOptions);
    } catch (error) {
        console.log("In-app update error:", error);
    }
};