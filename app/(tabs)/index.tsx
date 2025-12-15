import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { database } from '@/services/database';
import { notificationService } from '@/services/notifications';
import { CATEGORIES, DEFAULT_DURATION, formatTime, TIMER_DURATIONS } from '@/utils/constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
const timerSize = Math.min(screenWidth * 0.7, screenHeight * 0.35, 300);

export default function TimerScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    // Initialize notification service
    useEffect(() => {
        notificationService.init();
    }, []);

    const [selectedDuration, setSelectedDuration] = useState(DEFAULT_DURATION);
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
    const backgroundTimeRef = useRef<number | null>(null);
    const timeLeftRef = useRef(timeLeft);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const startPulse = useCallback(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {toValue: 1.02, duration: 1200, useNativeDriver: true}),
                Animated.timing(pulseAnim, {toValue: 1, duration: 1200, useNativeDriver: true}),
            ])
        ).start();
    }, [pulseAnim]);

    const stopPulse = useCallback(() => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
    }, [pulseAnim]);

    useEffect(() => {
        isRunningRef.current = isRunning;
        if (isRunning) startPulse();
        else stopPulse();
    }, [isRunning, startPulse, stopPulse]);

    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

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
                    const duration = selectedDuration;
                    setSessionDuration(duration);
                    setSessionCompleted(true);
                    saveSession(duration, true);
                    setShowSummary(true);
                    setIsRunning(false);
                    // Hemen bildirim gönder
                    notificationService.sendSessionCompleteNotification(duration, distractions);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [isRunning, saveSession, selectedDuration, distractions]);

    const handlePause = useCallback(() => {
        setIsRunning(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
                // Arka plana geçince zamanı kaydet, dikkat dağınıklığını say ve bildirim zamanla
                if (isRunningRef.current) {
                    backgroundTimeRef.current = Date.now();
                    setDistractions(prev => prev + 1);
                    // Kalan süre kadar sonra bildirim gönder, ama mesajda toplam süreyi göster
                    notificationService.scheduleTimerCompleteNotification(timeLeftRef.current, selectedDuration);
                }
            } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
                // Ön plana döndüğünde geçen süreyi hesapla ve timer'ı güncelle
                if (isRunningRef.current && backgroundTimeRef.current) {
                    const elapsedSeconds = Math.floor((Date.now() - backgroundTimeRef.current) / 1000);
                    const newTimeLeft = Math.max(0, timeLeftRef.current - elapsedSeconds);
                    
                    // Zamanlanmış bildirimi iptal et (çünkü artık ön plandayız)
                    notificationService.cancelScheduledNotification();
                    
                    setTimeLeft(newTimeLeft);
                    
                    // Süre bittiyse
                    if (newTimeLeft <= 0) {
                        if (intervalRef.current) clearInterval(intervalRef.current);
                        setIsRunning(false);
                        setSessionDuration(selectedDuration);
                        setSessionCompleted(true);
                        saveSession(selectedDuration, true);
                        setShowSummary(true);
                        // Hemen bildirim gönder
                        notificationService.sendSessionCompleteNotification(selectedDuration, distractions);
                    }
                    
                    backgroundTimeRef.current = null;
                }
            }
            appStateRef.current = nextAppState;
        });
        return () => subscription.remove();
    }, [selectedDuration, saveSession, distractions]);

    const handleReset = useCallback(() => {
        handlePause();
        setTimeLeft(selectedDuration);
        setDistractions(0);
        setShowSummary(false);
    }, [handlePause, selectedDuration]);

    const handleStop = useCallback(() => {
        if (!isRunning && timeLeft === selectedDuration) return;
        handlePause();
        const duration = selectedDuration - timeLeft;
        setSessionDuration(duration);
        setSessionCompleted(false);
        saveSession(duration, false);
        setShowSummary(true);
        // Durdurma bildirimi gönder
        notificationService.sendSessionStoppedNotification(duration, distractions);
    }, [isRunning, timeLeft, handlePause, saveSession, selectedDuration, distractions]);

    const closeSummary = useCallback(() => {
        setShowSummary(false);
        handleReset();
    }, [handleReset]);

    const handleDurationChange = useCallback((duration: number) => {
        if (isRunning) {
            Alert.alert('Uyarı', 'Sayaç çalışırken süre değiştiremezsiniz.');
            return;
        }
        setSelectedDuration(duration);
        setTimeLeft(duration);
    }, [isRunning]);

    const adjustTime = useCallback((minutes: number) => {
        if (isRunning) {
            Alert.alert('Uyarı', 'Sayaç çalışırken süre değiştiremezsiniz.');
            return;
        }
        const newDuration = selectedDuration + (minutes * 60);
        if (newDuration < 60) {
            Alert.alert('Uyarı', 'Süre en az 1 dakika olmalıdır.');
            return;
        }
        if (newDuration > 3600) {
            Alert.alert('Uyarı', 'Süre en fazla 60 dakika olabilir.');
            return;
        }
        setSelectedDuration(newDuration);
        setTimeLeft(newDuration);
    }, [isRunning, selectedDuration]);

  return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
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
                          <MaterialCommunityIcons name="clock-outline" size={20} color={colors.text}/>
                          <ThemedText style={styles.cardTitle}>Süre</ThemedText>
                      </View>
                      
                      <View style={styles.pickerWrapper}>
                          <Picker
                              selectedValue={selectedDuration}
                              onValueChange={handleDurationChange}
                              enabled={!isRunning}
                              mode="dropdown"
                              dropdownIconColor={colors.text}
                              style={[styles.picker, {color: colors.text, backgroundColor: colors.card}]}
                          >
                              {TIMER_DURATIONS.map(duration => (
                                  <Picker.Item 
                                      key={duration.value} 
                                      label={duration.label} 
                                      value={duration.value} 
                                      color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
                                      style={{backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#ffffff'}}
                                  />
                              ))}
                          </Picker>
                      </View>
                      
                      <View style={styles.durationButtonsRow}>
                          <TouchableOpacity 
                              style={[styles.adjustButton, {backgroundColor: colors.primary, opacity: isRunning ? 0.5 : 1}]} 
                              onPress={() => adjustTime(-5)}
                              disabled={isRunning}
                              activeOpacity={0.7}
                          >
                              <MaterialCommunityIcons name="minus" size={18} color="#ffffff"/>
                              <ThemedText style={styles.adjustButtonText}>5dk</ThemedText>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                              style={[styles.adjustButton, {backgroundColor: colors.primary, opacity: isRunning ? 0.5 : 1}]} 
                              onPress={() => adjustTime(-1)}
                              disabled={isRunning}
                              activeOpacity={0.7}
                          >
                              <MaterialCommunityIcons name="minus" size={18} color="#ffffff"/>
                              <ThemedText style={styles.adjustButtonText}>1dk</ThemedText>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                              style={[styles.adjustButton, {backgroundColor: colors.primary, opacity: isRunning ? 0.5 : 1}]} 
                              onPress={() => adjustTime(1)}
                              disabled={isRunning}
                              activeOpacity={0.7}
                          >
                              <MaterialCommunityIcons name="plus" size={18} color="#ffffff"/>
                              <ThemedText style={styles.adjustButtonText}>1dk</ThemedText>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                              style={[styles.adjustButton, {backgroundColor: colors.primary, opacity: isRunning ? 0.5 : 1}]} 
                              onPress={() => adjustTime(5)}
                              disabled={isRunning}
                              activeOpacity={0.7}
                          >
                              <MaterialCommunityIcons name="plus" size={18} color="#ffffff"/>
                              <ThemedText style={styles.adjustButtonText}>5dk</ThemedText>
                          </TouchableOpacity>
                      </View>
                  </View>

                  <View style={[styles.card, {backgroundColor: colors.card, marginTop: 12}]}>
                      <View style={styles.pickerHeader}>
                          <MaterialCommunityIcons name="format-list-bulleted-type" size={20} color={colors.text}/>
                          <ThemedText style={styles.cardTitle}>Kategori</ThemedText>
                      </View>
                      <Picker
                          selectedValue={category}
                          onValueChange={setCategory}
                          enabled={!isRunning}
                          mode="dropdown"
                          dropdownIconColor={colors.text}
                          style={[styles.picker, {color: colors.text, backgroundColor: colors.card}]}
                      >
                          {CATEGORIES.map(cat => (
                              <Picker.Item 
                                  key={cat} 
                                  label={cat} 
                                  value={cat} 
                                  color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
                                  style={{backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#ffffff'}}
                              />
                          ))}
                      </Picker>
                  </View>
              </View>

              <View style={styles.buttonsContainer}>
                  {!isRunning ? (
                      <TouchableOpacity style={[styles.button, {backgroundColor: colors.primary}]} onPress={handleStart}
                                        activeOpacity={0.7}>
                          <MaterialCommunityIcons name="play" size={24} color="#ffffff"/>
                          <ThemedText style={[styles.buttonText, {marginLeft: 8}]}>Başlat</ThemedText>
                      </TouchableOpacity>
                  ) : (
                      <TouchableOpacity style={[styles.button, {backgroundColor: colors.accent}]} onPress={handlePause}
                                        activeOpacity={0.7}>
                          <MaterialCommunityIcons name="pause" size={24} color="#ffffff"/>
                          <ThemedText style={[styles.buttonText, {marginLeft: 8}]}>Duraklat</ThemedText>
                      </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={handleStop}
                                    disabled={!isRunning && timeLeft === selectedDuration} activeOpacity={0.7}>
                      <MaterialCommunityIcons name="stop" size={24} color="#ffffff"/>
                      <ThemedText style={[styles.buttonText, {marginLeft: 8}]}>Bitir</ThemedText>
                  </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                  <ThemedText style={[styles.resetButtonText, {color: colors.text}]}>Sıfırla</ThemedText>
              </TouchableOpacity>

          </ScrollView>

          <Modal visible={showSummary} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                  <View style={[styles.modalContent, {backgroundColor: colors.card}]}>
                      <View style={[styles.modalHeader, {backgroundColor: sessionCompleted ? colors.success : colors.primary}]}>
                          <MaterialCommunityIcons 
                              name={sessionCompleted ? "check-circle" : "information"} 
                              size={40} 
                              color="#ffffff" 
                          />
                          <ThemedText style={styles.modalTitle}>
                              {sessionCompleted ? 'Harika İş!' : 'Seans Özeti'}
                          </ThemedText>
                          {sessionCompleted && (
                              <ThemedText style={styles.modalSubtitle}>
                                  Odaklanma seansını başarıyla tamamladın!
                              </ThemedText>
                          )}
                      </View>
                      
                      <View style={styles.modalBody}>
                          <View style={[styles.summaryCard, {backgroundColor: colors.background}]}>
                              <MaterialCommunityIcons name="format-list-bulleted-type" size={18} color={colors.text} />
                              <View style={styles.summaryCardContent}>
                                  <ThemedText style={[styles.summaryLabel, {color: colors.text}]}>Kategori</ThemedText>
                                  <ThemedText style={[styles.summaryValue, {color: colors.text}]}>{category}</ThemedText>
                              </View>
                          </View>
                          
                          <View style={[styles.summaryCard, {backgroundColor: colors.background}]}>
                              <MaterialCommunityIcons name="clock-outline" size={18} color={colors.text} />
                              <View style={styles.summaryCardContent}>
                                  <ThemedText style={[styles.summaryLabel, {color: colors.text}]}>Süre</ThemedText>
                                  <ThemedText style={[styles.summaryValue, {color: colors.text}]}>{formatTime(sessionDuration)}</ThemedText>
                              </View>
                          </View>
                          
                          <View style={[styles.summaryCard, {backgroundColor: colors.background}]}>
                              <MaterialCommunityIcons name="exit-run" size={18} color={colors.text} />
                              <View style={styles.summaryCardContent}>
                                  <ThemedText style={[styles.summaryLabel, {color: colors.text}]}>Kaçış</ThemedText>
                                  <ThemedText style={[styles.summaryValue, {color: colors.text}]}>{distractions}</ThemedText>
                              </View>
                          </View>
                      </View>
                      
                      <TouchableOpacity
                          style={[styles.modalButton, {backgroundColor: colors.primary}]}
                          onPress={closeSummary}
                          activeOpacity={0.8}
                      >
                          <ThemedText style={styles.modalButtonText}>Kapat</ThemedText>
                      </TouchableOpacity>
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
        paddingTop: 20,
        paddingBottom: 100,
    },
    title: {
        textAlign: 'center',
        fontSize: 24,
        marginBottom: 10,
    },
    timerCircle: {
        width: timerSize,
        height: timerSize,
        borderRadius: timerSize / 2,
        borderWidth: 6,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginVertical: 15,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 5},
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    timerText: {
        fontSize: Math.min(56, timerSize / 4),
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
        lineHeight: Math.min(72, timerSize / 3.2),
    },
    controlsContainer: {
        marginVertical: 15,
    },
    card: {
        paddingVertical: 16,
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
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    durationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
    },
    durationButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
        marginTop: 10,
    },
    adjustButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
        minWidth: 50,
    },
    adjustButtonText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: 'bold',
        marginLeft: 2,
    },
    pickerWrapper: {
        width: '100%',
    },
    picker: {
        width: '100%',
        height: 60,
        marginTop: 4,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 12,
        paddingHorizontal: 10,
    },
    button: {
        width: '48%',
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    stopButton: {
        backgroundColor: '#d9534f',
  },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
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
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 300,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    modalHeader: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginTop: 8,
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#ffffff',
        textAlign: 'center',
        opacity: 0.95,
        paddingHorizontal: 10,
        marginTop: 8,
    },
    modalBody: {
        padding: 16,
    },
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
    },
    summaryCardContent: {
        flex: 1,
        marginLeft: 10,
    },
    summaryLabel: {
        fontSize: 12,
        opacity: 0.7,
        marginBottom: 3,
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    modalButton: {
        marginHorizontal: 16,
        marginBottom: 16,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    modalButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
  },
});
