import {useCallback, useState} from 'react';
import {Dimensions, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {BarChart, PieChart} from 'react-native-chart-kit';
import {ThemedText} from '@/components/themed-text';
import {database, FocusSession} from '@/services/database';
import {formatDuration} from '@/utils/constants';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {Colors} from '@/constants/theme';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MaterialCommunityIcons} from '@expo/vector-icons';

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

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    const loadData = async () => {
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
    };

    const processWeeklyData = (sessions: FocusSession[]) => {
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
            return daySessions.reduce((sum, s) => sum + s.duration, 0) / 60; // minutes
        });

        setWeeklyData({labels: dayLabels, datasets: [{data: durations}]});
    };

    const processCategoryData = (sessions: FocusSession[]) => {
        const categoryColors = [colors.primary, colors.secondary, '#FF6F00', '#2962FF', '#00BFA5', '#D500F9'];
        const categoryMap = new Map<string, number>();

        sessions.forEach(s => {
            categoryMap.set(s.category, (categoryMap.get(s.category) || 0) + s.duration);
        });

        const data = Array.from(categoryMap.entries())
            .filter(([_, duration]) => duration > 0)
            .map(([name, duration], index) => ({
                name,
                population: duration / 60, // minutes
                color: categoryColors[index % categoryColors.length],
                legendFontColor: colors.text,
                legendFontSize: 12,
            }));

        setCategoryData(data);
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
      <SafeAreaView style={[styles.safeArea, {backgroundColor: colors.background}]}>
          <ScrollView
              contentContainerStyle={styles.container}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]}
                                              tintColor={colors.primary}/>}
          >
              <ThemedText type="title" style={styles.title}>Raporlar</ThemedText>

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
                      {weeklyData.datasets[0].data.some(v => v > 0) && (
                          <View style={[styles.chartWrapper, {backgroundColor: colors.card}]}>
                              <ThemedText style={[styles.chartTitle, {color: colors.text}]}>Haftalık Aktivite
                                  (dakika)</ThemedText>
                              <BarChart
                                  data={weeklyData}
                                  width={screenWidth - 40}
                                  height={280}
                                  chartConfig={chartConfig}
                                  style={styles.chart}
                                  yAxisLabel=""
                                  yAxisSuffix=" dk"
                                  yAxisInterval={1}
                                  fromZero
                                  showValuesOnTopOfBars
                                  verticalLabelRotation={0}
                              />
                          </View>
                      )}

                      {categoryData.length > 0 && (
                          <View style={[styles.chartWrapper, {backgroundColor: colors.card}]}>
                              <ThemedText style={[styles.chartTitle, {color: colors.text}]}>Kategori
                                  Dağılımı</ThemedText>
                              <PieChart
                                  data={categoryData}
                                  width={screenWidth - 40}
                                  height={280}
                                  chartConfig={chartConfig}
                                  accessor={"population"}
                                  backgroundColor={"transparent"}
                                  paddingLeft={"40"}
                                  center={[10, 0]}
                                  absolute
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
        paddingBottom: 40,
  },
    title: {
        textAlign: 'center',
        marginBottom: 30,
        fontSize: 28,
    },
    statsGrid: {
    flexDirection: 'row',
        gap: 12,
        marginBottom: 30,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.05,
        shadowRadius: 2,
    gap: 8,
  },
    statLabel: {
        fontSize: 14,
        fontWeight: '500',
        opacity: 0.7,
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    chartWrapper: {
        borderRadius: 16,
        paddingVertical: 16,
        marginBottom: 20,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        paddingHorizontal: 16,
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
