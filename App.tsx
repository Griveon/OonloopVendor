// App.tsx

import React from "react";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import Geolocation from "react-native-geolocation-service";

import { colors } from "./src/constants/AppThem";
import { navigationRef } from "./src/components/utils/NavigationService";
import AppNavigator from "./src/constants/AppNavigations";
import { AppUpdateProvider } from "./src/constants/AppUpdateProvider";

Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: "whenInUse", // iOS
  locationProvider: "auto", // Android
});

const App = () => {
  const isDarkMode = useColorScheme() === "dark";

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