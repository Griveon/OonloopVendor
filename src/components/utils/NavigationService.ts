// utils/navigationService.ts
import { createNavigationContainerRef } from "@react-navigation/native";
import { RootStackParamList } from "../../constants/appNavigations";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingNavigation:
    | {
        name: keyof RootStackParamList;
        params?: RootStackParamList[keyof RootStackParamList];
    }
    | null = null;

const flushPendingNavigation = () => {
    if (!pendingNavigation || !navigationRef.isReady()) return;

    const nextNavigation = pendingNavigation;
    pendingNavigation = null;

    navigationRef.navigate(
        nextNavigation.name as any,
        nextNavigation.params as any,
    );
};

export function navigate<RouteName extends keyof RootStackParamList>(
    name: RouteName,
    params?: RootStackParamList[RouteName]
) {
    if (navigationRef.isReady()) {
        // Type-safe navigate
        navigationRef.navigate(name as any, params as any);
        return;
    }

    pendingNavigation = { name, params };
    setTimeout(flushPendingNavigation, 500);
    setTimeout(flushPendingNavigation, 1500);
    setTimeout(flushPendingNavigation, 3000);
}

export const flushPendingNavigationWhenReady = flushPendingNavigation;
