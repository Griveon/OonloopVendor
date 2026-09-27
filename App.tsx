// App.tsx

import React, { useEffect } from "react";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import Geolocation from "react-native-geolocation-service";

import { colors } from "./src/constants/AppThem";
import { navigationRef } from "./src/components/utils/NavigationService";
import AppNavigator from "./src/constants/AppNavigations";
import { AppUpdateProvider } from "./src/constants/AppUpdateProvider";
import { initializeNotifications } from "./src/FirebaseService/notifications/firebaseNotificationService";

// Geolocation.setRNConfiguration({
//   skipPermissionRequests: false,
//   authorizationLevel: "whenInUse", // iOS
//   locationProvider: "auto", // Android
// });

const App = () => {
  const isDarkMode = useColorScheme() === "dark";

  useEffect(() => {
    let notificationCleanup: (() => void) | undefined;
    let mounted = true;

    const setupNotifications = async () => {
      const result: any = await initializeNotifications();

      if (!mounted) {
        result?.unsubscribe?.();
        return;
      }

      notificationCleanup = result?.unsubscribe;
    };

    void setupNotifications();

    return () => {
      mounted = false;
      notificationCleanup?.();
    };
  }, []);
  
  return (
    <SafeAreaProvider>
      {/* <AppUpdateProvider forceUpdate={false}> */}
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.scaffoldBg}
      />

      <AppNavigator ref={navigationRef} />

      <Toast />
      {/* </AppUpdateProvider> */}
    </SafeAreaProvider>
  );
};

export default App;