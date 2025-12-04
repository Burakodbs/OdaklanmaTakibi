import {useCallback, useEffect, useRef, useState} from 'react';
import {
    Alert,
    Animated,
    AppState,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Picker} from '@react-native-picker/picker';
import {ThemedText} from '@/components/themed-text';
import {database} from '@/services/database';
import {CATEGORIES, DEFAULT_DURATION, formatTime} from '@/utils/constants';
import {Colors} from '@/constants/theme';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {MaterialCommunityIcons} from '@expo/vector-icons';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
const timerSize = Math.min(screenWidth * 0.6, screenHeight * 0.3, 280);

export default function TimerScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
    const [isRunning, setIsRunning] = useState(false);
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [distractions, setDistractions] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
    const [sessionDuration, setSessionDuration] = useState(0);
    const [sessionCompleted, setSessionCompleted] = useState(false);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const appStateRef = useRef(AppState.currentState);
    const isRunningRef = useRef(isRunning);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        isRunningRef.current = isRunning;
        if (isRunning) startPulse();
        else stopPulse();
    }, [isRunning]);

    const startPulse = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {toValue: 1.02, duration: 1200, useNativeDriver: true}),
                Animated.timing(pulseAnim, {toValue: 1, duration: 1200, useNativeDriver: true}),
            ])
        ).start();
    };

    const stopPulse = () => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
    };

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
                if (isRunningRef.current) {
                    setDistractions(prev => prev + 1);
                    handlePause();
                    Alert.alert('Dikkat Dağınıklığı', 'Uygulamadan ayrıldınız. Sayaç duraklatıldı.', [{text: 'Tamam'}]);
                }
            }
            appStateRef.current = nextAppState;
        });
        return () => subscription.remove();
    }, []);

    const saveSession = useCallback(async (duration: number, completed: boolean) => {
        try {
            await database.addSession({category, duration, distractions, date: new Date().toISOString(), completed});
        } catch (error) {
            console.error('Seans kaydedilemedi:', error);
        }
    }, [category, distractions]);

    const handleStart = useCallback(() => {
        if (isRunning) return;
        setIsRunning(true);
        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    const duration = DEFAULT_DURATION;
                    setSessionDuration(duration);
                    setSessionCompleted(true);
                    saveSession(duration, true);
                    setShowSummary(true);
                    setIsRunning(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [isRunning, saveSession]);

    const handlePause = useCallback(() => {
        setIsRunning(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const handleReset = useCallback(() => {
        handlePause();
        setTimeLeft(DEFAULT_DURATION);
        setDistractions(0);
        setShowSummary(false);
    }, [handlePause]);

    const handleStop = useCallback(() => {
        Alert.alert('Seansı Sonlandır', 'Seansı bitirmek istediğinize emin misiniz?',
            [
                {text: 'İptal', style: 'cancel'},
                {
                    text: 'Evet, Bitir',
                    onPress: () => {
                        handlePause();
                        const duration = DEFAULT_DURATION - timeLeft;
                        setSessionDuration(duration);
                        setSessionCompleted(false);
                        saveSession(duration, false);
                        setShowSummary(true);
                    },
                },
            ]
        );
    }, [timeLeft, handlePause, saveSession]);

    const closeSummary = useCallback(() => {
        setShowSummary(false);
        handleReset();
    }, [handleReset]);

  return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
          <ScrollView contentContainerStyle={styles.content}>
              <ThemedText type="title" style={styles.title}>Odaklanma Zamanı</ThemedText>

              <Animated.View style={[styles.timerCircle, {
                  backgroundColor: colors.card,
                  borderColor: colors.primary,
                  transform: [{scale: pulseAnim}]
              }]}>
                  <ThemedText style={[styles.timerText, {color: colors.text}]}>{formatTime(timeLeft)}</ThemedText>
              </Animated.View>

              <View style={styles.controlsContainer}>
                  <View style={[styles.card, {backgroundColor: colors.card}]}>
                      <View style={styles.pickerHeader}>
                          <MaterialCommunityIcons name="format-list-bulleted-type" size={20} color={colors.text}/>
                          <ThemedText style={styles.cardTitle}>Kategori</ThemedText>
                      </View>
                      <Picker
                          selectedValue={category}
                          onValueChange={setCategory}
                          enabled={!isRunning}
                          style={[styles.picker, {color: colors.text}]}
                          itemStyle={{color: colors.text, backgroundColor: colors.card}}
                      >
                          {CATEGORIES.map(cat => <Picker.Item key={cat} label={cat} value={cat}/>)}
                      </Picker>
                  </View>
              </View>

              <View style={styles.buttonsContainer}>
                  {!isRunning ? (
                      <TouchableOpacity style={[styles.button, {backgroundColor: colors.primary}]} onPress={handleStart}
                                        activeOpacity={0.7}>
                          <MaterialCommunityIcons name="play" size={24} color="#ffffff"/>
                          <ThemedText style={styles.buttonText}>Başlat</ThemedText>
                      </TouchableOpacity>
                  ) : (
                      <TouchableOpacity style={[styles.button, {backgroundColor: colors.accent}]} onPress={handlePause}
                                        activeOpacity={0.7}>
                          <MaterialCommunityIcons name="pause" size={24} color="#ffffff"/>
                          <ThemedText style={styles.buttonText}>Duraklat</ThemedText>
                      </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={handleStop}
                                    disabled={!isRunning && timeLeft === DEFAULT_DURATION} activeOpacity={0.7}>
                      <MaterialCommunityIcons name="stop" size={24} color="#ffffff"/>
                      <ThemedText style={styles.buttonText}>Bitir</ThemedText>
                  </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                  <ThemedText style={[styles.resetButtonText, {color: colors.text}]}>Sıfırla</ThemedText>
              </TouchableOpacity>

          </ScrollView>

          <Modal visible={showSummary} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                  <View style={[styles.modalContent, {backgroundColor: colors.card, borderColor: colors.border}]}>
                      <ThemedText type="title"
                                  style={styles.modalTitle}>{sessionCompleted ? 'Harika İş!' : 'Seans Özeti'}</ThemedText>
                      {sessionCompleted &&
                          <ThemedText style={[styles.modalSubtitle, {color: colors.success}]}>Odaklanma seansını
                              başarıyla tamamladın!</ThemedText>}
                      <View style={styles.summaryRow}><ThemedText
                          style={styles.summaryLabel}>Kategori:</ThemedText><ThemedText
                          style={[styles.summaryValue, {color: colors.primary}]}>{category}</ThemedText></View>
                      <View style={styles.summaryRow}><ThemedText
                          style={styles.summaryLabel}>Süre:</ThemedText><ThemedText
                          style={[styles.summaryValue, {color: colors.primary}]}>{formatTime(sessionDuration)}</ThemedText></View>
                      <View style={styles.summaryRow}><ThemedText
                          style={styles.summaryLabel}>Kaçış:</ThemedText><ThemedText
                          style={[styles.summaryValue, {color: colors.primary}]}>{distractions}</ThemedText></View>
                      <TouchableOpacity
                          style={[styles.button, {backgroundColor: colors.primary, marginTop: 24, width: '100%'}]}
                          onPress={closeSummary}><ThemedText
                          style={styles.buttonText}>Kapat</ThemedText></TouchableOpacity>
                  </View>
              </View>
          </Modal>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 40,
    },
    title: {
        textAlign: 'center',
        fontSize: 28,
        marginBottom: 15,
    },
    timerCircle: {
        width: timerSize,
        height: timerSize,
        borderRadius: timerSize / 2,
        borderWidth: 6,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginVertical: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 5},
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    timerText: {
        fontSize: Math.min(48, timerSize / 4.5),
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    controlsContainer: {
        marginVertical: 15,
    },
    card: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    pickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    picker: {
        width: '100%',
        height: 50,
    },
    buttonsContainer: {
    flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginVertical: 15,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        maxWidth: 160,
        paddingVertical: 16,
        borderRadius: 12,
    alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        gap: 10,
    },
    stopButton: {
        backgroundColor: '#d9534f',
  },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
  },
    resetButton: {
        alignSelf: 'center',
        padding: 10,
    },
    resetButtonText: {
        fontSize: 16,
        opacity: 0.7,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 350,
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    modalTitle: {
        marginBottom: 12,
        fontSize: 24,
    },
    modalSubtitle: {
        marginBottom: 24,
        fontSize: 16,
        textAlign: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
    },
    summaryLabel: {
        fontSize: 16,
        opacity: 0.8,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
  },
});
