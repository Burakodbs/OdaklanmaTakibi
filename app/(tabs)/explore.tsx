import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { database, FocusSession } from '@/services/database';
import { formatDuration } from '@/utils/constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
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
    const [refreshing, setRefreshing] = useState(false);

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
        const categoryColors = [colors.primary, colors.secondary, '#FF6F00', '#2962FF', '#00BFA5', '#D500F9'];
        const categoryMap = new Map<string, number>();

        sessions.forEach(s => {
            categoryMap.set(s.category, (categoryMap.get(s.category) || 0) + s.duration);
        });

        const total = Array.from(categoryMap.values()).reduce((sum, duration) => sum + duration, 0);

        const data = Array.from(categoryMap.entries())
            .filter(([_, duration]) => duration > 0)
            .map(([name, duration], index) => {
                const minutes = Math.round(duration / 60);
                const percentage = ((duration / total) * 100).toFixed(1);
                return {
                    name: `${name}: ${minutes}dk`,
                    population: parseFloat(percentage),
                    color: categoryColors[index % categoryColors.length],
                    legendFontColor: colorScheme === 'dark' ? '#FFFFFF' : '#1C1C1E',
                    legendFontSize: 12,
                };
            });

        setCategoryData(data);
    }, [colors.primary, colors.secondary, colorScheme]);

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
        } catch (error) {
            console.error('Veri yüklenemedi:', error);
        }
    }, [processWeeklyData, processCategoryData]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    const handleAddFakeData = async () => {
        Alert.alert(
            'Test Verisi Ekle',
            'Son 7 gün için fake veriler eklenecek. Onaylıyor musunuz?',
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
        gap: 10,
        marginBottom: 20,
        paddingHorizontal: 5,
    },
    devButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6,
    },
    devButtonText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '600',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 25,
    },
    statCard: {
        flex: 1,
        minWidth: 100,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.05,
        shadowRadius: 2,
        gap: 6,
  },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.7,
        textAlign: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
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
});
