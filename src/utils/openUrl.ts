import { Linking, Alert } from 'react-native';

export async function openUrl(url: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('無法開啟連結', `無法開啟: ${url}`);
    }
  } catch (error) {
    console.error('Failed to open URL:', error);
    Alert.alert('錯誤', '無法開啟連結');
  }
}