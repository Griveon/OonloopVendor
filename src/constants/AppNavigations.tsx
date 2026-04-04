import React, { forwardRef } from "react";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Screens
import AppLoadingScreen from "../screens/Splash/SplashScreen";
import LoginScreen from "../screens/Auth/Login/LoginScreen";
import SignUpScreen from "../screens/Auth/SignUp/SignUpScreen";
import VendorRegistration from "../screens/Auth/VendorRegistration/VendorRegistration";
import VendorBusinessInfoUpdatingScreen from "../screens/Auth/VendorRegistration/VendorBusinessInfoUpdatingScreen";
import DashboardScreen from "../screens/Auth/Dashboard/DashboardScreen";
// import DashboardScreen from "../screens/Dashboard/DashboardScreen"; // Uncomment when ready

export type RootStackParamList = {
    AppLoading: undefined;
    Login: undefined;
    SignUp: undefined;
    VendorRegistration: undefined;
    VendorBusinessInfoUpdating: undefined;
    Dashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = forwardRef<NavigationContainerRef<RootStackParamList>>((props, ref) => {
    return (
        <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AppLoading">
                {/* Use children prop to pass extra props like setInitialRoute */}
                <Stack.Screen name="AppLoading">
                    {(props) => <AppLoadingScreen {...props} />}
                </Stack.Screen>

                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
                <Stack.Screen name="VendorRegistration" component={VendorRegistration} />
                <Stack.Screen name="VendorBusinessInfoUpdating" component={VendorBusinessInfoUpdatingScreen} />
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
});

export default AppNavigator;