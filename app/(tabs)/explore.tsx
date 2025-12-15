import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { database, FocusSession } from '@/services/database';
import { formatDuration } from '@/utils/constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, Dimensions, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReportsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [todayDuration, setTodayDuration] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const [totalDistractions, setTotalDistractions] = useState(0);
    const [weeklyData, setWeeklyData] = useState<{ labels: string[]; datasets: { data: number[] }[] }>({
        labels: [],
        datasets: [{data: []}]
    });
    const [categoryData, setCategoryData] = useState<{
        name: string;
        population: number;
        color: string;
        legendFontColor: string
    }[]>([]);
    const [monthlyCalendar, setMonthlyCalendar] = useState<{date: string; hasSessions: boolean; duration: number}[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [dailyGoal, setDailyGoal] = useState(2 * 60 * 60);
    const [refreshing, setRefreshing] = useState(false);
    const [longestSession, setLongestSession] = useState(0);
    const [bestDay, setBestDay] = useState({ date: '', duration: 0 });
    const [bestWeek, setBestWeek] = useState(0);
    const [totalSessions, setTotalSessions] = useState(0);
    const [perfectSessions, setPerfectSessions] = useState(0);

    const processWeeklyData = useCallback((sessions: FocusSession[]) => {
        const dayLabels: string[] = [];
        const last7Days = Array.from({length: 7}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
            dayLabels.push(dayNames[date.getDay()]);
            return date.toISOString().split('T')[0];
        });

        const durations = last7Days.map(day => {
            const daySessions = sessions.filter(s => s.date.startsWith(day));
            const minutes = Math.round(daySessions.reduce((sum, s) => sum + s.duration, 0) / 60);
            return minutes > 0 ? minutes : 0;
        });

        setWeeklyData({labels: dayLabels, datasets: [{data: durations}]});
    }, []);

    const processCategoryData = useCallback((sessions: FocusSession[]) => {
        const categoryColors = ['#FF3B30', '#34C759', '#007AFF', '#FF9500', '#AF52DE', '#FF2D55'];
        const categoryMap = new Map<string, number>();

        sessions.forEach(s => {
            categoryMap.set(s.category, (categoryMap.get(s.category) || 0) + s.duration);
        });

        const total = Array.from(categoryMap.values()).reduce((sum, duration) => sum + duration, 0);

        const data = Array.from(categoryMap.entries())
            .filter(([_, duration]) => duration > 0)
            .map(([name, duration], index) => {
                const percentage = ((duration / total) * 100).toFixed(1);
                return {
                    name: `${name}`,
                    population: parseFloat(percentage),
                    color: categoryColors[index % categoryColors.length],
                    legendFontColor: colorScheme === 'dark' ? '#FFFFFF' : '#1C1C1E',
                    legendFontSize: 12,
                };
            });

        setCategoryData(data);
    }, [colorScheme]);

    const processMonthlyCalendar = useCallback((sessions: FocusSession[], month: Date) => {
        const year = month.getFullYear();
        const monthIndex = month.getMonth();
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        
        const calendar: {date: string; hasSessions: boolean; duration: number}[] = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, monthIndex, day);
            const dateStr = date.toISOString().split('T')[0];
            const daySessions = sessions.filter(s => s.date.startsWith(dateStr));
            const duration = daySessions.reduce((sum, s) => sum + s.duration, 0);
            
            calendar.push({
                date: dateStr,
                hasSessions: daySessions.length > 0,
                duration
            });
        }
        
        setMonthlyCalendar(calendar);
    }, []);

    const processRecords = useCallback((sessions: FocusSession[]) => {
        if (sessions.length === 0) {
            setLongestSession(0);
            setBestDay({ date: '', duration: 0 });
            setBestWeek(0);
            setTotalSessions(0);
            setPerfectSessions(0);
            return;
        }
        const longest = Math.max(...sessions.map(s => s.duration));
        setLongestSession(longest);
        setTotalSessions(sessions.length);

        const perfect = sessions.filter(s => s.distractions === 0).length;
        setPerfectSessions(perfect);

        const dailyMap = new Map<string, number>();
        sessions.forEach(s => {
            const date = s.date.split('T')[0];
            dailyMap.set(date, (dailyMap.get(date) || 0) + s.duration);
        });

        let maxDay = { date: '', duration: 0 };
        dailyMap.forEach((duration, date) => {
            if (duration > maxDay.duration) {
                maxDay = { date, duration };
            }
        });
        setBestDay(maxDay);

        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0];
        }).reverse();

        let maxWeekDuration = 0;
        for (let i = 0; i <= last30Days.length - 7; i++) {
            const weekDays = last30Days.slice(i, i + 7);
            const weekDuration = weekDays.reduce((sum, day) => sum + (dailyMap.get(day) || 0), 0);
            maxWeekDuration = Math.max(maxWeekDuration, weekDuration);
        }
        setBestWeek(maxWeekDuration);
    }, []);

    const loadData = useCallback(async () => {
        try {
            const todaySessions = await database.getTodaySessions();
            const allSessions = await database.getAllSessions();
            const weeklySessions = await database.getSessionsByDateRange(7);

            const todayTotal = todaySessions.reduce((sum, s) => sum + s.duration, 0);
            const allTotal = allSessions.reduce((sum, s) => sum + s.duration, 0);
            const allDistractions = allSessions.reduce((sum, s) => sum + s.distractions, 0);

            setTodayDuration(todayTotal);
            setTotalDuration(allTotal);
            setTotalDistractions(allDistractions);

            processWeeklyData(weeklySessions);
            processCategoryData(allSessions);
            processMonthlyCalendar(allSessions, selectedMonth);
            processRecords(allSessions);
        } catch (error) {
            console.error('Veri yüklenemedi:', error);
        }
    }, [processWeeklyData, processCategoryData, processMonthlyCalendar, processRecords, selectedMonth]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    React.useEffect(() => {
        loadData();
    }, [loadData, selectedMonth]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    const handleAddFakeData = async () => {
        Alert.alert(
            'Test Verisi Ekle',
            'Son 30 gün için fake veriler eklenecek. Onaylıyor musunuz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Ekle',
                    onPress: async () => {
                        await database.addFakeData();
                        await loadData();
                        Alert.alert('Başarılı', 'Test verileri eklendi!');
                    }
                }
            ]
        );
    };

    const handleClearData = async () => {
        Alert.alert(
            'Tüm Verileri Sil',
            'Tüm kayıtlar silinecek. Bu işlem geri alınamaz!',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        await database.clearAllData();
                        await loadData();
                        Alert.alert('Başarılı', 'Tüm veriler silindi!');
                    }
                }
            ]
        );
    };

    const screenWidth = Dimensions.get('window').width;

    const chartConfig = {
        backgroundGradientFrom: colors.card,
        backgroundGradientTo: colors.card,
        color: (opacity = 1) => colorScheme === 'dark' ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(${colorScheme === 'dark' ? '255, 255, 255' : '0, 0, 0'}, ${opacity * 0.7})`,
        strokeWidth: 2,
        barPercentage: 0.8,
        useShadowsForBars: false,
        propsForDots: {r: '4', strokeWidth: '2', stroke: colors.primary},
    };

    const hasData = weeklyData.datasets[0].data.some(v => v > 0) || categoryData.length > 0;

  return (
      <SafeAreaView style={[styles.safeArea, {backgroundColor: colors.background}]} edges={['top']}>
          <ScrollView
              contentContainerStyle={styles.container}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]}
                                              tintColor={colors.primary}/>}
          >
              <ThemedText type="title" style={styles.title}>Raporlar</ThemedText>

              <View style={styles.devButtonsContainer}>
                  <TouchableOpacity 
                      style={[styles.devButton, {backgroundColor: colors.primary}]} 
                      onPress={handleAddFakeData}
                  >
                      <MaterialCommunityIcons name="database-plus" size={18} color="#fff" />
                      <ThemedText style={styles.devButtonText}>Test Verisi Ekle</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                      style={[styles.devButton, {backgroundColor: '#d9534f'}]} 
                      onPress={handleClearData}
                  >
                      <MaterialCommunityIcons name="delete-sweep" size={18} color="#fff" />
                      <ThemedText style={styles.devButtonText}>Tümünü Sil</ThemedText>
                  </TouchableOpacity>
              </View>

              <View style={styles.statsGrid}>
                  <View style={[styles.statCard, {backgroundColor: colors.card}]}>
                      <MaterialCommunityIcons name="calendar-today" size={24} color={colors.primary}/>
                      <ThemedText style={[styles.statLabel, {color: colors.text}]}>Bugün</ThemedText>
                      <ThemedText
                          style={[styles.statValue, {color: colors.primary}]}>{formatDuration(todayDuration)}</ThemedText>
                  </View>
                  <View style={[styles.statCard, {backgroundColor: colors.card}]}>
                      <MaterialCommunityIcons name="timer-sand" size={24} color={colors.primary}/>
                      <ThemedText style={[styles.statLabel, {color: colors.text}]}>Toplam Süre</ThemedText>
                      <ThemedText
                          style={[styles.statValue, {color: colors.primary}]}>{formatDuration(totalDuration)}</ThemedText>
                  </View>
                  <View style={[styles.statCard, {backgroundColor: colors.card}]}>
                      <MaterialCommunityIcons name="walk" size={24} color={colors.primary}/>
                      <ThemedText style={[styles.statLabel, {color: colors.text}]}>Toplam Kaçış</ThemedText>
                      <ThemedText style={[styles.statValue, {color: colors.primary}]}>{totalDistractions}</ThemedText>
                  </View>
              </View>

              {!hasData && !refreshing ? (
                  <View style={styles.emptyContainer}>
                      <ThemedText style={styles.emptyText}>Henüz görüntülenecek veri yok.</ThemedText>
                      <ThemedText style={[styles.emptySubText, {color: colors.text}]}>
                          İlk odaklanma seansınızı tamamladığınızda raporlarınız burada görünecektir.
                      </ThemedText>
                  </View>
              ) : (
                  <>
                      <View style={[styles.chartWrapper, {backgroundColor: colors.card}]}>
                          <ThemedText style={[styles.chartTitle, {color: colors.text}]}>Haftalık Aktivite</ThemedText>
                          <BarChart
                              data={weeklyData}
                              width={screenWidth - 60}
                              height={220}
                              chartConfig={chartConfig}
                              style={styles.chart}
                              yAxisLabel=""
                              yAxisSuffix="dk"
                              yAxisInterval={1}
                              fromZero
                              showValuesOnTopOfBars
                              verticalLabelRotation={0}
                          />
                      </View>

                      {categoryData.length > 0 && (
                          <View style={[styles.chartWrapper, {backgroundColor: colors.card}]}>
                              <ThemedText style={[styles.chartTitle, {color: colors.text}]}>Kategori Dağılımı</ThemedText>
                              <PieChart
                                  data={categoryData}
                                  width={screenWidth - 60}
                                  height={200}
                                  chartConfig={{
                                      ...chartConfig,
                                      color: (opacity = 1) => colorScheme === 'dark' ? `rgba(255, 255, 255, ${opacity})` : `rgba(28, 28, 30, ${opacity})`,
                                  }}
                                  accessor={"population"}
                                  backgroundColor={"transparent"}
                                  paddingLeft={"5"}
                                  center={[10, 0]}
                                  hasLegend={true}
                                  avoidFalseZero={true}
                                  absolute={false}
                              />
                          </View>
                      )}

                      {/* Liderlik Tablosu / Rekorlar */}
                      <View style={[styles.chartWrapper, {backgroundColor: colors.card}]}>
                          <View style={styles.recordsHeader}>
                              <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />
                              <ThemedText style={[styles.chartTitle, {color: colors.text, marginLeft: 8}]}>
                                  Rekorlar
                              </ThemedText>
                          </View>
                          
                          <View style={styles.recordsGrid}>
                              <View style={[styles.recordCard, {backgroundColor: colors.background}]}>
                                  <MaterialCommunityIcons name="timer" size={32} color="#FF3B30" />
                                  <ThemedText style={[styles.recordLabel, {color: colors.text}]}>En Uzun Seans</ThemedText>
                                  <ThemedText style={[styles.recordValue, {color: colors.primary}]}>
                                      {formatDuration(longestSession)}
                                  </ThemedText>
                              </View>

                              <View style={[styles.recordCard, {backgroundColor: colors.background}]}>
                                  <MaterialCommunityIcons name="calendar-star" size={32} color="#34C759" />
                                  <ThemedText style={[styles.recordLabel, {color: colors.text}]}>En İyi Gün</ThemedText>
                                  <ThemedText style={[styles.recordValue, {color: colors.primary}]}>
                                      {bestDay.duration > 0 ? formatDuration(bestDay.duration) : '-'}
                                  </ThemedText>
                                  {bestDay.date && (
                                      <ThemedText style={[styles.recordDate, {color: colors.text}]}>
                                          {new Date(bestDay.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                      </ThemedText>
                                  )}
                              </View>

                              <View style={[styles.recordCard, {backgroundColor: colors.background}]}>
                                  <MaterialCommunityIcons name="calendar-week" size={32} color="#007AFF" />
                                  <ThemedText style={[styles.recordLabel, {color: colors.text}]}>En İyi Hafta</ThemedText>
                                  <ThemedText style={[styles.recordValue, {color: colors.primary}]}>
                                      {formatDuration(bestWeek)}
                                  </ThemedText>
                              </View>

                              <View style={[styles.recordCard, {backgroundColor: colors.background}]}>
                                  <MaterialCommunityIcons name="format-list-numbered" size={32} color="#FF9500" />
                                  <ThemedText style={[styles.recordLabel, {color: colors.text}]}>Toplam Seans</ThemedText>
                                  <ThemedText style={[styles.recordValue, {color: colors.primary}]}>
                                      {totalSessions}
                                  </ThemedText>
                              </View>

                              <View style={[styles.recordCard, {backgroundColor: colors.background}]}>
                                  <MaterialCommunityIcons name="check-circle" size={32} color="#AF52DE" />
                                  <ThemedText style={[styles.recordLabel, {color: colors.text}]}>Mükemmel Seans</ThemedText>
                                  <ThemedText style={[styles.recordValue, {color: colors.primary}]}>
                                      {perfectSessions}
                                  </ThemedText>
                                  <ThemedText style={[styles.recordSubtext, {color: colors.text}]}>
                                      Kaçış: 0
                                  </ThemedText>
                              </View>

                              <View style={[styles.recordCard, {backgroundColor: colors.background}]}>
                                  <MaterialCommunityIcons name="percent" size={32} color="#FF2D55" />
                                  <ThemedText style={[styles.recordLabel, {color: colors.text}]}>Başarı Oranı</ThemedText>
                                  <ThemedText style={[styles.recordValue, {color: colors.primary}]}>
                                      {totalSessions > 0 ? `%${Math.round((perfectSessions / totalSessions) * 100)}` : '%0'}
                                  </ThemedText>
                              </View>
                          </View>
                      </View>

                      {monthlyCalendar.length > 0 && (
                          <View style={[styles.chartWrapper, {backgroundColor: colors.card}]}>
                              <View style={styles.calendarHeader}>
                                  <TouchableOpacity 
                                      onPress={() => {
                                          const newMonth = new Date(selectedMonth);
                                          newMonth.setMonth(newMonth.getMonth() - 1);
                                          setSelectedMonth(newMonth);
                                      }}
                                      style={styles.monthButton}
                                  >
                                      <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
                                  </TouchableOpacity>
                                  
                                  <ThemedText style={[styles.chartTitle, {color: colors.text}]}>
                                      {selectedMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                                  </ThemedText>
                                  
                                  <TouchableOpacity 
                                      onPress={() => {
                                          const newMonth = new Date(selectedMonth);
                                          newMonth.setMonth(newMonth.getMonth() + 1);
                                          setSelectedMonth(newMonth);
                                      }}
                                      style={styles.monthButton}
                                  >
                                      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text} />
                                  </TouchableOpacity>
                              </View>
                              
                              <View style={styles.calendarContainer}>
                                  <View style={styles.weekDaysRow}>
                                      {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, i) => (
                                          <ThemedText key={i} style={[styles.weekDay, {color: colors.text}]}>{day}</ThemedText>
                                      ))}
                                  </View>
                                  <View style={styles.calendarGrid}>
                                      {(() => {
                                          const today = new Date();
                                          const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
                                          const startDayOfWeek = (firstDay.getDay() + 6) % 7; // 0 = Pazartesi
                                          
                                          const days = [];
                                          
                                          for (let i = 0; i < startDayOfWeek; i++) {
                                              days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
                                          }
                                          
                                          monthlyCalendar.forEach((dayData) => {
                                              const date = new Date(dayData.date);
                                              const dayNumber = date.getDate();
                                              const isToday = dayData.date === today.toISOString().split('T')[0];
                                              
                                              let backgroundColor = 'transparent';
                                              if (dayData.hasSessions && dayData.duration > 0) {
                                                  const goalRatio = dayData.duration / dailyGoal;
                                                  
                                                  if (goalRatio >= 1) {
                                                      const intensity = Math.min((goalRatio - 1) * 0.5 + 0.5, 1);
                                                      backgroundColor = `rgba(52, 199, 89, ${intensity})`; 
                                                  } else if (goalRatio >= 0.5) {
                                                      const intensity = 0.3 + (goalRatio * 0.5);
                                                      backgroundColor = `rgba(255, 204, 0, ${intensity})`; 
                                                  } else {
                                                      const intensity = 0.3 + (goalRatio * 0.4);
                                                      backgroundColor = `rgba(255, 59, 48, ${intensity})`; 
                                                  }
                                              }
                                              
                                              days.push(
                                                  <View 
                                                      key={dayData.date} 
                                                      style={[
                                                          styles.dayCell,
                                                          { backgroundColor },
                                                          isToday && styles.todayCell
                                                      ]}
                                                  >
                                                      <ThemedText style={[
                                                          styles.dayNumber,
                                                          {color: colors.text},
                                                          isToday && styles.todayText
                                                      ]}>
                                                          {dayNumber}
                                                      </ThemedText>
                                                  </View>
                                              );
                                          });
                                          
                                          return days;
                                      })()}
                                  </View>
                              </View>
                          </View>
                      )}
                  </>
              )}
          </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        padding: 20,
        paddingBottom: 100,
  },
    title: {
        textAlign: 'center',
        marginBottom: 25,
        fontSize: 24,
    },
    devButtonsContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        paddingHorizontal: 5,
        justifyContent: 'space-between',
    },
    devButton: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    devButtonText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 25,
        justifyContent: 'space-between',
    },
    statCard: {
        width: '31%',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.05,
        shadowRadius: 2,
        marginBottom: 10,
  },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.7,
        textAlign: 'center',
        marginTop: 6,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 6,
    },
    chartWrapper: {
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 8,
        marginBottom: 18,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        paddingHorizontal: 12,
        alignSelf: 'flex-start',
    },
    chart: {
        borderRadius: 12,
    },
    recordsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    recordsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        width: '100%',
        justifyContent: 'space-between',
    },
    recordCard: {
        width: '48%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.03,
        shadowRadius: 2,
    },
    recordLabel: {
        fontSize: 12,
        fontWeight: '600',
        opacity: 0.7,
        textAlign: 'center',
        marginTop: 8,
    },
    recordValue: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 4,
    },
    recordDate: {
        fontSize: 11,
        opacity: 0.6,
        textAlign: 'center',
        marginTop: 2,
    },
    recordSubtext: {
        fontSize: 10,
        opacity: 0.5,
        textAlign: 'center',
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    emptySubText: {
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.7,
    },
    calendarContainer: {
        width: '100%',
        paddingHorizontal: 12,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 12,
        width: '100%',
    },
    monthButton: {
        padding: 8,
        borderRadius: 8,
    },
    weekDaysRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: 8,
        paddingHorizontal: 4,
        gap: 4,
    },
    weekDay: {
        width: 40,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        opacity: 0.6,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        justifyContent: 'flex-start',
        paddingHorizontal: 4,
    },
    dayCell: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        position: 'relative',
    },
    todayCell: {
        borderWidth: 2,
        borderColor: '#007AFF',
    },
    dayNumber: {
        fontSize: 13,
        fontWeight: '500',
    },
    todayText: {
        fontWeight: 'bold',
    },
});
