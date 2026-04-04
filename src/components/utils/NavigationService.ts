// utils/navigationService.ts
import { createNavigationContainerRef } from "@react-navigation/native";
import { RootStackParamList } from "../../constants/appNavigations";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params?: RootStackParamList[RouteName]
) {
    if (navigationRef.isReady()) {
        // Type-safe navigate
        navigationRef.navigate(name as any, params as any);
    }
}