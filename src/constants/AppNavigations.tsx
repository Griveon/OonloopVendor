import React, { forwardRef } from "react";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TransitionPresets } from "@react-navigation/stack"; // if using JS stack

// Screens
import AppLoadingScreen from "../screens/Splash/SplashScreen";
import LoginScreen from "../screens/Auth/Login/LoginScreen";
import SignUpScreen from "../screens/Auth/SignUp/SignUpScreen";
import VendorRegistration from "../screens/Auth/VendorRegistration/VendorRegistration";
import VendorBusinessInfoUpdatingScreen from "../screens/Auth/VendorRegistration/VendorBusinessInfoUpdatingScreen";
import DashboardScreen from "../screens/Auth/Dashboard/DashboardScreen";
import SubscriptionScreen from "../screens/Subscription/SubscriptionScreen";
import BrandListScreen from "../screens/Brand/BrandListingScreen";
import AddBrandScreen from "../screens/Brand/AddBrandScreen";
import EditBrandScreen from "../screens/Brand/EditBrandScreen";
import VendorProfileScreen from "../screens/VendorProfile/VendorProfileScreen";
import PrivacyPolicyScreen from "../screens/PrivacyPolicy/PrivacyPolicyScreen";
import TermsAndConditionsScreen from "../screens/TermsAndConditions/TermsAndConditionsScreen";
import CouponListingScreen from "../screens/Coupon/CouponListingScreen";
import AddCouponScreen from "../screens/Coupon/AddCouponScreen";
import EditCouponScreen from "../screens/Coupon/EditCouponScreen";
import VendorKycScreen from "../screens/KYC/VendorKycScreen";
import ForgotPinScreen from "../screens/Auth/ForgotPin/ForgotPinScreen";
import ProductListingScreen from "../screens/Product/ProductListingScreen";
import VendorAddProductScreen from "../screens/Product/AddProductScreen";
import VendorEditProductScreen from "../screens/Product/EditProductScreen";
import SearchAndAddProduct from "../screens/Product/SearchAndAddProduct";
import OrdersScreen from "../screens/Orders/OrdersScreen";
import VendorAccountStatementScreen from "../screens/Accounts/VendorAccountStatementScreen";
// import DashboardScreen from "../screens/Dashboard/DashboardScreen"; // Uncomment when ready

export type RootStackParamList = {
    AppLoading: undefined;
    Login: undefined;
    SignUp: undefined;
    VendorRegistration: undefined;
    VendorBusinessInfoUpdating: undefined;
    Dashboard: undefined;
    Subscription: undefined;
    BrandListing: undefined;
    AddBrand: undefined;
    EditBrand: undefined;
    VendorProfile: undefined;
    PrivacyPolicy: undefined;
    TermsAndCondition: undefined;
    VendorCouponListing: undefined;
    AddCoupon: undefined;
    EditCoupon: undefined;
    VendorKYC: undefined;
    Orders:
        | {
            status?: string;
            sellerStatus?: string;
            vendorOrderId?: string;
            orderId?: string;
            notificationRefreshKey?: string | number;
        }
        | undefined;
    ForgotPin: undefined;
    ProductListing: undefined;
    AddProduct: undefined;
    EditProduct: undefined;
    SearchAndAddProduct: undefined;
    Accounts: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = forwardRef<NavigationContainerRef<RootStackParamList>>((props, ref) => {
    return (
        <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{
                headerShown: false,
                // ✅ Smooth slide-from-right (like native iOS/Android)
                animation: "slide_from_right",
                // Fine-tune the animation feel
                animationDuration: 350,
                // Prevents flash on Android
                animationTypeForReplace: "push",
                // Gesture to swipe back (iOS)
                gestureEnabled: true,
                gestureDirection: "horizontal",
                // Smooth the gesture response
                fullScreenGestureEnabled: true,
            }}
                initialRouteName="AppLoading">
                {/* Use children prop to pass extra props like setInitialRoute */}
                <Stack.Screen name="AppLoading">
                    {(props) => <AppLoadingScreen {...props} />}
                </Stack.Screen>

                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
                <Stack.Screen name="VendorRegistration" component={VendorRegistration} />
                <Stack.Screen name="VendorBusinessInfoUpdating" component={VendorBusinessInfoUpdatingScreen} />
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
                <Stack.Screen name="Subscription" component={SubscriptionScreen} />
                <Stack.Screen name="BrandListing" component={BrandListScreen} />
                <Stack.Screen name="AddBrand" component={AddBrandScreen} />
                <Stack.Screen name="EditBrand" component={EditBrandScreen} />
                <Stack.Screen name="VendorCouponListing" component={CouponListingScreen} />
                <Stack.Screen name="AddCoupon" component={AddCouponScreen} />
                <Stack.Screen name="EditCoupon" component={EditCouponScreen} />
                <Stack.Screen name="Orders" component={OrdersScreen} />
                <Stack.Screen name="ProductListing" component={ProductListingScreen} />
                <Stack.Screen name="AddProduct" component={VendorAddProductScreen} />
                <Stack.Screen name="VendorKYC" component={VendorKycScreen} />
                <Stack.Screen name="ForgotPin" component={ForgotPinScreen} />
                <Stack.Screen name="VendorProfile" component={VendorProfileScreen} />
                <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                <Stack.Screen name="TermsAndCondition" component={TermsAndConditionsScreen} />
                <Stack.Screen name="EditProduct" component={VendorEditProductScreen} />
                <Stack.Screen name="Accounts" component={VendorAccountStatementScreen} />
                <Stack.Screen name="SearchAndAddProduct" component={SearchAndAddProduct} />
            </Stack.Navigator>
        </NavigationContainer>
    );
});

export default AppNavigator;
