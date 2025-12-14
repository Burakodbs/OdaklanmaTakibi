import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { database } from '@/services/database';
import { ACHIEVEMENTS, formatDuration } from '@/utils/constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GoalsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();

    const [dailyGoal, setDailyGoal] = useState(2 * 60 * 60);
    const [todayDuration, setTodayDuration] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [longestStreak, setLongestStreak] = useState(0);
    const [weeklyProgress, setWeeklyProgress] = useState<number[]>([]);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [goalInput, setGoalInput] = useState('2');
    const [refreshing, setRefreshing] = useState(false);
    const [totalSessions, setTotalSessions] = useState(0);
    const [completedDays, setCompletedDays] = useState(0);
    const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
    const [showAchievementsModal, setShowAchievementsModal] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const todaySessions = await database.getTodaySessions();
            const todayTotal = todaySessions.reduce((sum, s) => sum + s.duration, 0);
            setTodayDuration(todayTotal);

            const streak = await database.getCurrentStreak();
            setCurrentStreak(streak.current);
            setLongestStreak(streak.longest);

            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                return date.toISOString().split('T')[0];
            });

            const weeklyData = await Promise.all(
                last7Days.map(async (date) => {
                    const sessions = await database.getSessionsByDate(date);
                    return sessions.reduce((sum, s) => sum + s.duration, 0);
                })
            );
            setWeeklyProgress(weeklyData);

            const allSessions = await database.getAllSessions();
            setTotalSessions(allSessions.length);

            const completedDaysCount = weeklyData.filter(d => d >= dailyGoal).length;
            setCompletedDays(completedDaysCount);

            const unlocked = await database.getUnlockedAchievements();
            setUnlockedAchievements(unlocked);
            
            await database.checkAndUnlockAchievements();
        } catch (error) {
            console.error('Failed to load goals data:', error);
        }
    }, [dailyGoal]);

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

    const handleSaveGoal = () => {
        const hours = parseFloat(goalInput);
        if (isNaN(hours) || hours <= 0 || hours > 24) {
            Alert.alert('Error', 'Please enter a valid hour value (0-24)');
            return;
        }
        setDailyGoal(hours * 60 * 60);
        setShowGoalModal(false);
        Alert.alert('Success', `Daily goal set to ${hours} hours!`);
    };

    const progressPercentage = Math.min((todayDuration / dailyGoal) * 100, 100);
    const isGoalCompleted = todayDuration >= dailyGoal;

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}> 
            <ScrollView
                contentContainerStyle={[styles.container, { paddingBottom: 80 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                <ThemedText type="title" style={styles.title}>Hedefler & İlerleme</ThemedText>

                <View style={[styles.goalCard, { backgroundColor: colors.card }]}>
                    <View style={styles.goalHeader}>
                        <View style={styles.goalHeaderLeft}>
                            <MaterialCommunityIcons
                                name="target"
                                size={28}
                                color={isGoalCompleted ? colors.success : colors.primary}
                            />
                            <View>
                                <ThemedText style={[styles.goalTitle, { color: colors.text }]}>
                                    Günlük Hedef
                                </ThemedText>
                                <ThemedText style={[styles.goalSubtitle, { color: colors.text }]}>
                                    {formatDuration(todayDuration)} / {formatDuration(dailyGoal)}
                                </ThemedText>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.editButton, { backgroundColor: colors.primary }]}
                            onPress={() => {
                                setGoalInput((dailyGoal / 3600).toString());
                                setShowGoalModal(true);
                            }}
                        >
                            <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBarBg, { backgroundColor: colors.background }]}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        backgroundColor: isGoalCompleted ? colors.success : colors.primary,
                                        width: `${progressPercentage}%`,
                                    },
                                ]}
                            />
                        </View>
                        <ThemedText style={[styles.progressText, { color: colors.text }]}>
                            %{Math.round(progressPercentage)}
                        </ThemedText>
                    </View>

                    {isGoalCompleted && (
                        <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
                            <MaterialCommunityIcons name="check-circle" size={16} color="#fff" />
                            <ThemedText style={styles.completedText}>
                                🎉 Günlük hedef tamamlandı!
                            </ThemedText>
                        </View>
                    )}
                </View>

                <View style={[styles.streakCard, { backgroundColor: colors.card }]}>
                    <View style={styles.streakHeader}>
                        <MaterialCommunityIcons name="fire" size={32} color="#FF6B35" />
                        <ThemedText style={[styles.streakTitle, { color: colors.text }]}>
                            Streak (Ardışık Günler)
                        </ThemedText>
                    </View>

                    <View style={styles.streakContent}>
                        <View style={styles.streakBox}>
                            <ThemedText style={[styles.streakValue, { color: colors.primary }]}>
                                {currentStreak}
                            </ThemedText>
                            <ThemedText style={[styles.streakLabel, { color: colors.text }]}>
                                Güncel
                            </ThemedText>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <View style={styles.streakBox}>
                            <ThemedText style={[styles.streakValue, { color: colors.accent }]}>
                                {longestStreak}
                            </ThemedText>
                            <ThemedText style={[styles.streakLabel, { color: colors.text }]}>
                                En Uzun
                            </ThemedText>
                        </View>
                    </View>

                    <View style={[styles.streakInfo, { backgroundColor: colors.background }]}>
                        <MaterialCommunityIcons name="information" size={16} color={colors.text} />
                        <ThemedText style={[styles.streakInfoText, { color: colors.text }]}>
                            Her gün hedefini tamamlayarak streakini artır!
                        </ThemedText>
                    </View>
                </View>

                <View style={[styles.weeklyCard, { backgroundColor: colors.card }]}>
                    <ThemedText style={[styles.weeklyTitle, { color: colors.text }]}>
                        Son 7 Gün
                    </ThemedText>
                    <View style={styles.weeklyBarsContainer}>
                        {weeklyProgress.map((duration, index) => {
                            const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
                            const last7Days = Array.from({ length: 7 }, (_, i) => {
                                const date = new Date();
                                date.setDate(date.getDate() - (6 - i));
                                date.setHours(0, 0, 0, 0);
                                return date.toISOString().split('T')[0];
                            });
                            const dateObj = new Date(last7Days[index]);
                            const dayName = dayNames[dateObj.getDay()];
                            const percentage = dailyGoal > 0 ? Math.min((duration / dailyGoal) * 100, 100) : 0;
                            const achieved = duration >= dailyGoal;
                            const hasActivity = duration > 0;

                            return (
                                <View style={styles.weeklyBarContainer} key={index}>
                                    <View style={[styles.weeklyBarWrapper, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7' }]}> 
                                        {hasActivity && (
                                            <View
                                                style={[
                                                    styles.weeklyBar,
                                                    {
                                                        height: `${Math.max(percentage, 10)}%`,
                                                        backgroundColor: achieved ? colors.success : colors.primary,
                                                    },
                                                ]}
                                            />
                                        )}
                                    </View>
                                    <View style={styles.weeklyDayInfo}>
                                        <ThemedText style={[styles.weeklyDay, { color: colors.text }]}>
                                            {dayName}
                                        </ThemedText>
                                        <View style={styles.checkIconContainer}>
                                            {achieved && (
                                                <MaterialCommunityIcons
                                                    name="check-circle"
                                                    size={14}
                                                    color={colors.success}
                                                />
                                            )}
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={[styles.statBox, { backgroundColor: colors.card }]}>
                        <MaterialCommunityIcons name="clock-check" size={24} color={colors.primary} />
                        <ThemedText style={[styles.statValue, { color: colors.text }]}>
                            {totalSessions}
                        </ThemedText>
                        <ThemedText style={[styles.statLabel, { color: colors.text }]}>
                            Toplam Seans
                        </ThemedText>
                    </View>

                    <View style={[styles.statBox, { backgroundColor: colors.card }]}>
                        <MaterialCommunityIcons name="calendar-check" size={24} color={colors.success} />
                        <ThemedText style={[styles.statValue, { color: colors.text }]}>
                            {completedDays}
                        </ThemedText>
                        <ThemedText style={[styles.statLabel, { color: colors.text }]}>
                            Hedef Tamamlanan
                        </ThemedText>
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.achievementsCard, { backgroundColor: colors.card }]}
                    onPress={() => setShowAchievementsModal(true)}
                >
                    <View style={styles.achievementsHeader}>
                        <View style={styles.achievementsHeaderLeft}>
                            <MaterialCommunityIcons name="trophy" size={28} color="#FFD700" />
                            <View>
                                <ThemedText style={[styles.achievementsTitle, { color: colors.text }]}>
                                    Rozetler & Başarılar
                                </ThemedText>
                                <ThemedText style={[styles.achievementsSubtitle, { color: colors.text }]}>
                                    {unlockedAchievements.length}/{ACHIEVEMENTS.length} Açıldı
                                </ThemedText>
                            </View>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text} />
                    </View>
                    
                    <View style={styles.achievementPreview}>
                        {ACHIEVEMENTS.slice(0, 6).map((achievement) => {
                            const isUnlocked = unlockedAchievements.includes(achievement.id);
                            return (
                                <View 
                                    style={[
                                        styles.achievementBadge,
                                        { 
                                            backgroundColor: colors.background,
                                            opacity: isUnlocked ? 1 : 0.3,
                                        }
                                    ]}
                                    key={achievement.id}
                                >
                                    <MaterialCommunityIcons 
                                        name={achievement.icon as any} 
                                        size={24} 
                                        color={isUnlocked ? '#FFD700' : colors.text} 
                                    />
                                </View>
                            );
                        })}
                    </View>
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={showGoalModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { backgroundColor: colors.primary }]}>
                            <MaterialCommunityIcons name="target" size={32} color="#fff" />
                            <ThemedText style={styles.modalTitle}>Günlük Hedef Belirle</ThemedText>
                        </View>

                        <View style={styles.modalBody}>
                            <ThemedText style={[styles.modalLabel, { color: colors.text }]}>
                                Kaç saat çalışmak istiyorsun?
                            </ThemedText>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor: colors.background,
                                            color: colors.text,
                                            borderColor: colors.border,
                                        },
                                    ]}
                                    value={goalInput}
                                    onChangeText={setGoalInput}
                                    keyboardType="decimal-pad"
                                    placeholder="2.5"
                                    placeholderTextColor={colors.icon}
                                />
                                <ThemedText style={[styles.inputUnit, { color: colors.text }]}>
                                    saat
                                </ThemedText>
                            </View>

                            <View style={styles.presetButtons}>
                                {[1, 2, 3, 4].map((hours) => (
                                    <TouchableOpacity
                                        key={hours}
                                        style={[styles.presetButton, { borderColor: colors.primary }]}
                                        onPress={() => setGoalInput(hours.toString())}
                                    >
                                        <ThemedText style={[styles.presetButtonText, { color: colors.text }]}>
                                            {hours}s
                                        </ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.border }]}
                                onPress={() => setShowGoalModal(false)}
                            >
                                <ThemedText style={styles.modalButtonTextSecondary}>İptal</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                onPress={handleSaveGoal}
                            >
                                <ThemedText style={styles.modalButtonText}>Kaydet</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            <Modal visible={showAchievementsModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.achievementsModalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { backgroundColor: '#FFD700' }]}>
                            <MaterialCommunityIcons name="trophy-award" size={32} color="#fff" />
                            <ThemedText style={styles.modalTitle}>Rozetler & Başarılar</ThemedText>
                            <ThemedText style={styles.modalSubtitle}>
                                {unlockedAchievements.length}/{ACHIEVEMENTS.length} Tamamlandı
                            </ThemedText>
                        </View>

                        <ScrollView style={styles.achievementsScroll} showsVerticalScrollIndicator={false}>
                            {['time', 'sessions', 'streak', 'special'].map((type) => {
                                const achievementsOfType = ACHIEVEMENTS.filter(a => a.type === type);
                                const typeTitle = 
                                    type === 'time' ? '⏱️ Zaman Bazlı' :
                                    type === 'sessions' ? '🎯 Seans Bazlı' :
                                    type === 'streak' ? '🔥 Streak Bazlı' :
                                    '⭐ Özel Başarılar';

                                return (
                                    <View style={styles.achievementSection} key={type}>
                                        <ThemedText style={[styles.achievementSectionTitle, { color: colors.text }]}>
                                            {typeTitle}
                                        </ThemedText>
                                        {achievementsOfType.map((achievement) => {
                                            const isUnlocked = unlockedAchievements.includes(achievement.id);
                                            return (
                                                <View 
                                                    style={[
                                                        styles.achievementItem,
                                                        { 
                                                            backgroundColor: colors.background,
                                                            opacity: isUnlocked ? 1 : 0.5,
                                                        }
                                                    ]}
                                                    key={achievement.id}
                                                >
                                                    <View style={[
                                                        styles.achievementIcon,
                                                        { backgroundColor: isUnlocked ? '#FFD700' : colors.border }
                                                    ]}>
                                                        <MaterialCommunityIcons 
                                                            name={achievement.icon as any} 
                                                            size={28} 
                                                            color={isUnlocked ? '#fff' : colors.text} 
                                                        />
                                                    </View>
                                                    <View style={styles.achievementInfo}>
                                                        <ThemedText style={[styles.achievementName, { color: colors.text }]}>
                                                            {achievement.title}
                                                        </ThemedText>
                                                        <ThemedText style={[styles.achievementDesc, { color: colors.text }]}>
                                                            {achievement.description}
                                                        </ThemedText>
                                                    </View>
                                                    {isUnlocked && (
                                                        <MaterialCommunityIcons 
                                                            name="check-circle" 
                                                            size={24} 
                                                            color="#4CAF50" 
                                                        />
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.closeModalButton, { backgroundColor: colors.primary }]}
                            onPress={() => setShowAchievementsModal(false)}
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
    safeArea: {
        flex: 1,
    },
    container: {
        padding: 16,
        paddingBottom: 100,
    },
    title: {
        textAlign: 'center',
        marginBottom: 20,
        fontSize: 22,
    },
    goalCard: {
        padding: 16,
        borderRadius: 14,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    goalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    goalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    goalSubtitle: {
        fontSize: 14,
        opacity: 0.7,
        marginTop: 2,
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    progressBarBg: {
        flex: 1,
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 6,
    },
    progressText: {
        fontSize: 14,
        fontWeight: 'bold',
        minWidth: 40,
        textAlign: 'right',
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
        padding: 8,
        borderRadius: 8,
    },
    completedText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    streakCard: {
        padding: 16,
        borderRadius: 14,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    streakHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    streakTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    streakContent: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    streakBox: {
        alignItems: 'center',
    },
    streakValue: {
        fontSize: 36,
        fontWeight: 'bold',
        lineHeight: 44,
        includeFontPadding: false,
    },
    streakLabel: {
        fontSize: 14,
        opacity: 0.7,
        marginTop: 4,
    },
    divider: {
        width: 1,
        height: '100%',
    },
    streakInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 8,
    },
    streakInfoText: {
        fontSize: 12,
        opacity: 0.8,
        flex: 1,
    },
    weeklyCard: {
        padding: 16,
        borderRadius: 14,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    weeklyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    weeklyBarsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 150,
        gap: 8,
        paddingHorizontal: 4,
    },
    weeklyBarContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: '100%',
    },
    weeklyBarWrapper: {
        width: '100%',
        height: 110,
        justifyContent: 'flex-end',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 8,
    },
    weeklyBar: {
        width: '100%',
        borderRadius: 8,
        minHeight: 10,
    },
    weeklyDayInfo: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 32,
    },
    weeklyDay: {
        fontSize: 12,
        fontWeight: '600',
    },
    checkIconContainer: {
        height: 16,
        width: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    weeklyCheck: {
        marginTop: 2,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    statBox: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        gap: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
        opacity: 0.7,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        maxWidth: 400,
        width: '100%',
        alignSelf: 'center',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    modalHeader: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 6,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    modalSubtitle: {
        fontSize: 12,
        color: '#fff',
        opacity: 0.9,
        textAlign: 'center',
        marginTop: 2,
    },
    modalBody: {
        padding: 16,
    },
    modalLabel: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    input: {
        flex: 1,
        height: 48,
        borderRadius: 10,
        borderWidth: 2,
        paddingHorizontal: 14,
        fontSize: 16,
        fontWeight: 'bold',
    },
    inputUnit: {
        fontSize: 15,
        fontWeight: '600',
    },
    presetButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    presetButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 2,
        alignItems: 'center',
    },
    presetButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 10,
        padding: 16,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    closeModalButton: {
        marginHorizontal: 16,
        marginBottom: 16,
        marginTop: 8,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    modalButtonTextSecondary: {
        color: '#666',
        fontSize: 15,
        fontWeight: '600',
    },
    achievementsCard: {
        padding: 16,
        borderRadius: 14,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    achievementsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    achievementsHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    achievementsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    achievementsSubtitle: {
        fontSize: 13,
        opacity: 0.7,
        marginTop: 2,
    },
    achievementPreview: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    achievementBadge: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    achievementsModalContent: {
        flex: 1,
        marginTop: 60,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    achievementsScroll: {
        flex: 1,
        padding: 16,
        paddingBottom: 8,
    },
    achievementSection: {
        marginBottom: 20,
    },
    achievementSectionTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    achievementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
        gap: 10,
    },
    achievementIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    achievementInfo: {
        flex: 1,
    },
    achievementName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    achievementDesc: {
        fontSize: 11,
        opacity: 0.7,
        lineHeight: 16,
    },
});
