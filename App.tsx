// App.tsx
import React from "react";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "./src/constants/AppThem";
import { navigationRef } from "./src/components/utils/NavigationService";
import AppNavigator from "./src/constants/AppNavigations";
import Toast from "react-native-toast-message";
import Geolocation from 'react-native-geolocation-service';

Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: "whenInUse",   // iOS
  locationProvider: "auto",          // Android — tries GPS then network
});

const App = () => {
  const isDarkMode = useColorScheme() === "dark";
  

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.scaffoldBg}
      />
      <AppNavigator ref={navigationRef} />

      {/* Toast Message Provider */}
      <Toast />
    </SafeAreaProvider>
  );
};

export default App;