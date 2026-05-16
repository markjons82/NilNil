import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { setupPushNotifications } from './src/services/pushNotifications';

export default function App() {
  useEffect(() => {
    setupPushNotifications();
  }, []);

  return <AppNavigator />;
}
