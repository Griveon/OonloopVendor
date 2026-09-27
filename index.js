/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import {
  firebaseBackgroundMessageHandler,
} from './src/FirebaseService/notifications/firebaseNotificationService';

messaging().setBackgroundMessageHandler(
  firebaseBackgroundMessageHandler,
);

AppRegistry.registerComponent(appName, () => App);
