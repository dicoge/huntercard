import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated,
  Dimensions,
  Alert,
  Platform,
  Linking,
  ScrollView,
  TextInput,
  Modal,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import WebCamera, { WebCameraHandle } from '../components/WebCamera';
import ScanSessionPanel from '../components/ScanSessionPanel';
import { useScanSessionStore } from '../stores/scanSessionStore';
import * as ImagePicker from 'expo-image-picker';
import { recognizeText } from 'expo-ocr-kit';
import { COLORS } from '../constants';
import { recognizeCard, searchCards, CardInfo } from '../services/cardRecognition';

// iOS Safari: getUserMedia 需直接從使用者手勢觸發
// 所以 web 版跳過 expo-camera 的 useCameraPermissions，改用 WebCamera 直接管
const isWeb = Platform.OS === 'web';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.75;

export default function ScanScreen() {
  // iOS web 不用 expo-camera 權限系統（避免 getUserMedia 手勢鏈中斷）
  const [permission, requestPermission] = isWeb ? [null, null] as any : useCameraPermissions();
  const [webCameraStarted, setWebCameraStarted] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);
  const webCameraRef = useRef<WebCameraHandle>(null);
  // 在手勢鏈中取得的 stream，避免 iOS Safari 阻擋 getUserMedia
  const webStreamRef = useRef<MediaStream | null>(null);
  const addCard = useScanSessionStore(s => s.addCard);
  const [lastScannedCard, setLastScannedCard] = useState<CardInfo | null>(null);
  
  // 相機狀態
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionJustGranted, setPermissionJustGranted] = useState<boolean>(false);
  
  // 辨識結果狀態
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [isProcessingOCR, setIsProcessingOCR] = useState<boolean>(false);
  const [flash, setFlash] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanComplete, setScanComplete] = useState<boolean>(false);
  
  // 辨識結果狀態
  const [recognizedCard, setRecognizedCard] = useState<CardInfo | null>(null);
  const [suggestions, setSuggestions] = useState<CardInfo[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // 手動搜尋
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<CardInfo[]>([]);
  
  // 动画 refs
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  // 显式请求相机权限 - 修复 Android/iOS 权限问题（web 版跳過，由 WebCamera 直接處理）
  useEffect(() => {
    if (isWeb) return;
    const requestPermissionExplicitly = async () => {
      if (!permission?.granted) {
        try {
          const { status } = await requestPermission();
          console.log('Camera permission status:', status);
        } catch (error) {
          console.error('Error requesting camera permission:', error);
        }
      }
    };
    requestPermissionExplicitly();
  }, []);

  // 扫描线动画
  useEffect(() => {
    const scanAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    scanAnimation.start();
    return () => scanAnimation.stop();
  }, [scanLineAnim]);

  // 边框脉冲动画
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [pulseAnim]);

  // 边框颜色动画
  useEffect(() => {
    const borderAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(borderAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );
    borderAnimation.start();
    return () => borderAnimation.stop();
  }, [borderAnim]);

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => !current);
  };

  // OCR 識別功能
  const captureAndRecognize = async () => {
    if (isWeb) {
      if (!webCameraRef.current) {
        Alert.alert('錯誤', '相機未準備好');
        return;
      }
    } else if (!cameraRef.current) {
      Alert.alert('錯誤', '相機未準備好');
      return;
    }
    
    try {
      setIsProcessingOCR(true);
      setIsScanning(true);
      
      // 拍攝照片
      let photo;
      if (isWeb) {
        photo = await webCameraRef.current!.takePictureAsync({
          quality: 0.8,
        });
      } else {
        photo = await cameraRef.current!.takePictureAsync({
          quality: 0.8,
        });
      }
      
      if (!photo?.uri) {
        throw new Error('無法拍攝照片');
      }
      
      // 使用 expo-ocr-kit 識別文字
      const ocrResult = await recognizeText(photo.uri);

      const recognizedText = typeof ocrResult?.text === 'string' ? ocrResult.text : '';
      setRecognizedText(recognizedText);

      setIsProcessingOCR(false);
      setIsScanning(false);

      if (recognizedText.trim().length > 0) {
        // 使用識別的文字進行卡牌匹配
        const result = recognizeCard(recognizedText);
        
        if (result.success && result.card) {
          addCard(result.card);
          setLastScannedCard(result.card);
          setSearchResults([]);
          setSearchError(null);
          setSuggestions([]);
        } else {
          // 沒有精確匹配，顯示文字讓用戶確認
          Alert.alert(
            '🔍 識別結果',
            `識別到的文字：\n\n"${recognizedText}"\n\n請選擇：`,
            [
              { 
                text: '使用此文字搜尋', 
                onPress: () => {
                  const result = recognizeCard(recognizedText);
                  if (result.success && result.card) {
                    addCard(result.card);
                    setLastScannedCard(result.card);
                    setSearchResults([]);
                    setSearchError(null);
                    setSuggestions([]);
                  } else {
                    setSearchError(result.error || '找不到匹配的卡牌');
                    const searchResult = searchCards(recognizedText, 5);
                    setSearchResults(searchResult);
                  }
                }
              },
              { 
                text: '手動輸入', 
                onPress: () => setShowSearch(true)
              },
            ]
          );
        }
      } else {
        Alert.alert(
          '❌ 無法識別',
          '請確保卡牌文字清晰可見，或使用手動輸入',
          [
            { text: '重試', onPress: () => captureAndRecognize() },
            { text: '手動輸入', onPress: () => setShowSearch(true) },
          ]
        );
      }
    } catch (error) {
      console.error('OCR Error:', error);
      setIsProcessingOCR(false);
      setIsScanning(false);
      
      Alert.alert(
        '⚠️ 識別失敗',
        '無法識別圖像，請重試或使用手動輸入',
        [
          { text: '重試', onPress: () => captureAndRecognize() },
          { text: '手動輸入', onPress: () => setShowSearch(true) },
        ]
      );
    }
  };

  // 從相冊選擇圖片進行識別
  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0]?.uri) {
        setIsProcessingOCR(true);
        setIsScanning(true);
        
        const ocrResult = await recognizeText(result.assets[0].uri);
        const recognizedText = typeof ocrResult?.text === 'string' ? ocrResult.text : '';
        setRecognizedText(recognizedText);

        setIsProcessingOCR(false);
        setIsScanning(false);

        if (recognizedText.trim().length > 0) {
          const cardResult = recognizeCard(recognizedText);
          if (cardResult.success && cardResult.card) {
            addCard(cardResult.card);
            setLastScannedCard(cardResult.card);
            setSearchResults([]);
            setSearchError(null);
            setSuggestions([]);
          } else {
            setSearchError(cardResult.error || '找不到匹配的卡牌');
            const searchResult = searchCards(recognizedText, 5);
            setSearchResults(searchResult);
          }
        } else {
          Alert.alert(
            '❌ 無法識別',
            '請確保卡牌文字清晰可見，或使用手動輸入',
            [
              { text: '重試', onPress: () => pickFromGallery() },
              { text: '手動輸入', onPress: () => setShowSearch(true) },
            ]
          );
        }
      }
    } catch (error) {
      console.error('Gallery OCR Error:', error);
      setIsProcessingOCR(false);
      setIsScanning(false);
      Alert.alert(
        '⚠️ 識別失敗',
        '無法讀取或識別圖片，請重試或使用手動輸入',
        [
          { text: '重試', onPress: () => pickFromGallery() },
          { text: '手動輸入', onPress: () => setShowSearch(true) },
        ]
      );
    }
  };

  const handleScan = () => {
    if (isScanning || isProcessingOCR) return;
    
    Alert.alert(
      '📷 選擇掃描方式',
      '請選擇如何掃描卡牌',
      [
        { 
          text: '📸 拍照識別', 
          onPress: () => captureAndRecognize()
        },
        { 
          text: '🖼️ 從相冊選擇', 
          onPress: () => pickFromGallery()
        },
        { 
          text: '🔤 手動輸入', 
          onPress: () => setShowSearch(true)
        },
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  // 當權限被授予時，設置標記並等待相機準備
  useEffect(() => {
    if (permission?.granted && !permissionJustGranted) {
      setPermissionJustGranted(true);
      setIsCameraReady(false);
      setCameraError(null);
    }
  }, [permission?.granted]);

  // 相機準備好的回調
  const handleCameraReady = () => {
    setIsCameraReady(true);
    setCameraError(null);
  };

  // 相機載入錯誤的回調
  const handleMountError = (error: { message?: string }) => {
    const errorMessage = error?.message || '相機載入失敗，請重新開啟應用程式';
    setCameraError(errorMessage);
    setIsCameraReady(false);
  };
  
  // 演示識別功能
  const demoRecognition = () => {
    const demoNames = ['博衣こより', '雪花ラミィ', 'ラプラス・ダークネス', '大空スバル'];
    const randomName = demoNames[Math.floor(Math.random() * demoNames.length)];
    
    const result = recognizeCard(randomName);
    if (result.success && result.card) {
      setSearchResults([]);
      setSearchError(null);
      setRecognizedCard(result.card);
      setSuggestions(result.suggestions || []);
    } else {
      setSearchError(result.error || '辨識失敗');
    }
  };
  
  // 執行搜尋
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      Alert.alert('請輸入搜尋內容');
      return;
    }
    
    const result = recognizeCard(searchQuery);
    if (result.success && result.card) {
      setSearchResults([]);
      setSearchError(null);
      setRecognizedCard(result.card);
      setSuggestions(result.suggestions || []);
      setShowSearch(false);
      setSearchQuery('');
    } else {
      setSearchError(result.error || '找不到匹配的卡牌');
      // 顯示搜尋結果作為建議
      const searchResult = searchCards(searchQuery, 5);
      setSearchResults(searchResult);
    }
  };
  
  // 選擇建議的卡牌
  const handleSelectSuggestion = (card: CardInfo) => {
    setRecognizedCard(card);
    setSuggestions([]);
  };
  
  // 清除結果
  const clearResult = () => {
    setRecognizedCard(null);
    setSuggestions([]);
    setSearchError(null);
    setScanComplete(false);
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    }
  };

  // === Web 版：不用 expo-camera 權限，直接讓 WebCamera 處理 getUserMedia ===
  if (isWeb && !webCameraStarted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>需要相機權限</Text>
          <Text style={styles.permissionText}>
            掃描卡牌需要使用相機功能，請點擊下方按鈕以允許存取相機。
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={async () => {
              // iOS Safari 的 getUserMedia 必須在點擊事件手勢鏈中直接呼叫
              // 先等 stream 拿到再 mount WebCamera，避免 timing 競爭
              try {
                const stream = await navigator.mediaDevices.getUserMedia({
                  video: { facingMode: 'environment' },
                  audio: false,
                });
                webStreamRef.current = stream;
                setWebCameraStarted(true);
              } catch (e: any) {
                setCameraError(e?.message || '無法開啟相機');
                setIsCameraReady(false);
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.permissionButtonText}>允許相機權限</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={openSettings}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsButtonText}>打開設定</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // === Native 版：用 expo-camera 權限系統 ===
  if (!isWeb) {
    // 权限请求中
    if (!permission) {
      return (
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>載入相機中...</Text>
          </View>
        </View>
      );
    }

    // 权限被拒绝
    if (!permission.granted) {
      return (
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionIcon}>📷</Text>
            <Text style={styles.permissionTitle}>需要相機權限</Text>
            <Text style={styles.permissionText}>
              掃描卡牌需要使用相機功能，請允許存取相機以使用此功能。
            </Text>
            <TouchableOpacity 
              style={styles.permissionButton}
              onPress={requestPermission}
              activeOpacity={0.7}
            >
              <Text style={styles.permissionButtonText}>允許相機權限</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={openSettings}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsButtonText}>打開設定</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  }

  return (
    <View style={styles.container}>
      {/* 初始化中遮罩 — 相機在下面照常 mount，讓 getUserMedia 有機會啟動 */}
      {!isCameraReady && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>相機初始化中...</Text>
            {cameraError && (
              <View style={resultStyles.errorContainer}>
                <Text style={resultStyles.errorText}>❌ {cameraError}</Text>
                <TouchableOpacity 
                  style={resultStyles.retryButton}
                  onPress={() => {
                    setCameraError(null);
                    if (isWeb && webCameraRef.current) {
                      webCameraRef.current.retry();
                    } else {
                      setIsCameraReady(false);
                    }
                  }}
                >
                  <Text style={resultStyles.retryText}>重試</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
      {/* 相机预览 — 一定會 mount，不會被初始化中判斷擋住 */}
{isWeb ? (
        <WebCamera
          ref={webCameraRef}
          style={styles.camera}
          facing={facing}
          initialStream={webStreamRef.current}
          onCameraReady={handleCameraReady}
          onMountError={handleMountError}
        >
          {/* 遮罩层 — same content for both */}
          <View style={styles.overlay}>
            <View style={styles.overlayTop} />
            <View style={styles.scanAreaContainer}>
              <View style={styles.overlaySide} />
              <Animated.View 
                style={[
                  styles.scanArea,
                  { 
                    transform: [{ scale: pulseAnim }],
                    borderColor: borderAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [COLORS.primary, COLORS.primaryLight],
                    }),
                  }
                ]}
              >
                <Animated.View 
                  style={[
                    styles.scanLine,
                    {
                      transform: [{
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, SCAN_AREA_SIZE - 4],
                      }),
                    }],
                    opacity: scanLineAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 1, 0],
                    }),
                  }
                ]}
              />
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {isScanning && (
                <View style={styles.scanningIndicator}>
                  <Text style={styles.scanningText}>識別中...</Text>
                </View>
              )}
            </Animated.View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.hintText}>將卡牌置於掃描框內</Text>
            <View style={styles.controls}>
              <TouchableOpacity 
                style={[styles.controlBtn, flash && styles.controlBtnActive]}
                onPress={toggleFlash}
                activeOpacity={0.7}
              >
                <Text style={styles.controlIcon}>{flash ? '🔦' : '💡'}</Text>
                <Text style={styles.controlLabel}>{flash ? '閃光燈開' : '閃光燈'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
                onPress={handleScan}
                disabled={isScanning}
                activeOpacity={0.7}
              >
                <View style={styles.scanButtonInner}>
                  <Text style={styles.scanButtonIcon}>{isScanning ? '⏳' : '📷'}</Text>
                </View>
                <Text style={styles.scanButtonLabel}>{isScanning ? '識別中...' : '掃描'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.controlBtn}
                onPress={toggleCameraFacing}
                activeOpacity={0.7}
              >
                <Text style={styles.controlIcon}>🔄</Text>
                <Text style={styles.controlLabel}>翻轉</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </WebCamera>
      ) : (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          flash={flash ? 'on' : 'off'}
          onCameraReady={handleCameraReady}
          onMountError={handleMountError}
        >
          <View style={styles.overlay}>
            <View style={styles.overlayTop} />
            <View style={styles.scanAreaContainer}>
              <View style={styles.overlaySide} />
              <Animated.View 
                style={[
                  styles.scanArea,
                  { 
                    transform: [{ scale: pulseAnim }],
                    borderColor: borderAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [COLORS.primary, COLORS.primaryLight],
                    }),
                  }
                ]}
              >
                <Animated.View 
                  style={[
                    styles.scanLine,
                    {
                      transform: [{
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, SCAN_AREA_SIZE - 4],
                      }),
                    }],
                    opacity: scanLineAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 1, 0],
                    }),
                  }
                ]}
              />
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {isScanning && (
                <View style={styles.scanningIndicator}>
                  <Text style={styles.scanningText}>識別中...</Text>
                </View>
              )}
            </Animated.View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.hintText}>將卡牌置於掃描框內</Text>
            <View style={styles.controls}>
              <TouchableOpacity 
                style={[styles.controlBtn, flash && styles.controlBtnActive]}
                onPress={toggleFlash}
                activeOpacity={0.7}
              >
                <Text style={styles.controlIcon}>{flash ? '🔦' : '💡'}</Text>
                <Text style={styles.controlLabel}>{flash ? '閃光燈開' : '閃光燈'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
                onPress={handleScan}
                disabled={isScanning}
                activeOpacity={0.7}
              >
                <View style={styles.scanButtonInner}>
                  <Text style={styles.scanButtonIcon}>{isScanning ? '⏳' : '📷'}</Text>
                </View>
                <Text style={styles.scanButtonLabel}>{isScanning ? '識別中...' : '掃描'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.controlBtn}
                onPress={toggleCameraFacing}
                activeOpacity={0.7}
              >
                <Text style={styles.controlIcon}>🔄</Text>
                <Text style={styles.controlLabel}>翻轉</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </CameraView>
      )}
      
      {/* 最後掃描的卡牌確認提示 */}
      {lastScannedCard && (
        <View style={resultStyles.toastContainer}>
          <View style={resultStyles.toast}>
            <View style={resultStyles.toastContent}>
              <Text style={resultStyles.toastIcon}>✅</Text>
              <View style={resultStyles.toastTextContainer}>
                <Text style={resultStyles.toastName} numberOfLines={1}>
                  {lastScannedCard.name}
                </Text>
                <Text style={resultStyles.toastPrice}>
                  ¥{lastScannedCard.sellPrice?.toLocaleString() || '—'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setLastScannedCard(null)}
            >
              <Text style={resultStyles.toastClose}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* 錯誤提示 */}
      {searchError && !recognizedCard && (
        <View style={resultStyles.errorContainer}>
          <Text style={resultStyles.errorText}>❌ {searchError}</Text>
          <TouchableOpacity 
            style={resultStyles.retryButton}
            onPress={() => {
              setSearchError(null);
              setShowSearch(true);
            }}
          >
            <Text style={resultStyles.retryText}>重新搜尋</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* 搜尋建議列表 */}
      {searchResults.length > 0 && (
        <View style={resultStyles.suggestionsListContainer}>
          <Text style={resultStyles.suggestionsTitle}>搜尋結果:</Text>
          <ScrollView style={resultStyles.suggestionsList}>
            {searchResults.map((card, index) => (
              <TouchableOpacity 
                key={index}
                style={resultStyles.listItem}
                onPress={() => handleSelectSuggestion(card)}
              >
                <Text style={resultStyles.listItemName}>{card.name}</Text>
                <Text style={resultStyles.listItemPrice}>
                  ¥{card.sellPrice.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* 手動搜尋 Modal */}
      <Modal
        visible={showSearch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSearch(false)}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContent}>
            <Text style={modalStyles.modalTitle}>🔍 搜尋卡牌</Text>
            <TextInput
              style={modalStyles.searchInput}
              placeholder="輸入卡牌名稱或編號..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
            <View style={modalStyles.modalButtons}>
              <TouchableOpacity 
                style={modalStyles.searchButton}
                onPress={handleSearch}
              >
                <Text style={modalStyles.searchButtonText}>搜尋</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={modalStyles.cancelButton}
                onPress={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
              >
                <Text style={modalStyles.cancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 掃描估值面板 */}
      <ScanSessionPanel onContinueScanning={() => {
        setLastScannedCard(null);
        setScanComplete(false);
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  camera: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  permissionTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  permissionText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  settingsButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanAreaContainer: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE * 0.63, // 卡片比例
    position: 'relative',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 8,
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.primary,
  },
  topLeft: {
    top: -1,
    left: -1,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: -1,
    right: -1,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanningIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanningText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
  },
  overlayBottom: {
    flex: 1.2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingTop: 30,
    alignItems: 'center',
  },
  hintText: {
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  controlBtn: {
    alignItems: 'center',
    padding: 10,
  },
  controlBtnActive: {
    opacity: 1,
  },
  controlIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  controlLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  scanButton: {
    alignItems: 'center',
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonIcon: {
    fontSize: 32,
  },
  scanButtonLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});

// 結果顯示樣式
const resultStyles = StyleSheet.create({
  resultContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  resultCard: {
    alignItems: 'center',
  },
  resultTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cardInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  cardName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardId: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  priceLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginRight: 8,
  },
  priceValue: {
    color: '#00C853',
    fontSize: 28,
    fontWeight: 'bold',
  },
  timestamp: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  suggestions: {
    marginTop: 16,
    width: '100%',
  },
  suggestionsTitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  suggestionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginRight: 10,
    width: 100,
    alignItems: 'center',
  },
  suggestionName: {
    color: COLORS.text,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
  },
  suggestionPrice: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  resultActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  actionText: {
    color: COLORS.text,
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: COLORS.primary,
  },
  closeText: {
    color: '#fff',
    fontSize: 14,
  },
  // Toast notification for last scanned card
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 30,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  toastIcon: {
    fontSize: 20,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  toastPrice: {
    color: '#00C853',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  toastClose: {
    color: COLORS.textSecondary,
    fontSize: 16,
    paddingLeft: 8,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 82, 82, 0.9)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  retryText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionsListContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderRadius: 12,
    padding: 16,
    maxHeight: 250,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  listItemName: {
    color: COLORS.text,
    fontSize: 14,
    flex: 1,
  },
  listItemPrice: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

// Modal 樣式
const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 24,
    width: SCREEN_WIDTH * 0.85,
    alignItems: 'center',
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  searchInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
});