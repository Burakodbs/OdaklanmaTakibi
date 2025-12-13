import type * as SQLiteType from 'expo-sqlite';
import { Platform } from 'react-native';

export interface FocusSession {
  id?: number;
  category: string;
  duration: number;
  distractions: number;
  date: string;
  completed: boolean;
}

class DatabaseService {
  private db: SQLiteType.SQLiteDatabase | null = null;
  private initialized = false;
  private initializing = false;

  async init() {
    if (Platform.OS === 'web') {
      console.warn('SQLite not available on web. Using mock data.');
      this.initialized = true;
      return;
    }

    if (this.initialized || this.initializing) {
      return;
    }

    this.initializing = true;
    
    try {
      const SQLite = await import('expo-sqlite');
      this.db = await SQLite.openDatabaseAsync('focusapp.db');
      await this.createTables();
      this.initialized = true;
    } catch (error) {
      console.error('Database initialization failed:', error);
    } finally {
      this.initializing = false;
    }
  }

  private async createTables() {
    if (!this.db) return;

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        duration INTEGER NOT NULL,
        distractions INTEGER NOT NULL,
        date TEXT NOT NULL,
        completed INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        unlockedAt TEXT NOT NULL
      );
    `);
  }

  async addSession(session: FocusSession): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Mock: Session added', session);
      return;
    }
    
    if (!this.db) await this.init();
    if (!this.db) return;

    await this.db.runAsync(
      'INSERT INTO sessions (category, duration, distractions, date, completed) VALUES (?, ?, ?, ?, ?)',
      session.category,
      session.duration,
      session.distractions,
      session.date,
      session.completed ? 1 : 0
    );
  }

  async getAllSessions(): Promise<FocusSession[]> {
    if (Platform.OS === 'web') {
      return [];
    }
    
    if (!this.db) await this.init();
    if (!this.db) return [];

    const result = await this.db.getAllAsync<FocusSession>(
      'SELECT * FROM sessions ORDER BY date DESC'
    );

    return result;
  }

  async getTodaySessions(): Promise<FocusSession[]> {
    if (Platform.OS === 'web') {
      return [];
    }
    
    if (!this.db) await this.init();
    if (!this.db) return [];

    const today = new Date().toISOString().split('T')[0];
    const result = await this.db.getAllAsync<FocusSession>(
      'SELECT * FROM sessions WHERE date LIKE ? ORDER BY date DESC',
      `${today}%`
    );

    return result;
  }

  async getSessionsByDateRange(days: number): Promise<FocusSession[]> {
    if (Platform.OS === 'web') {
      return [];
    }
    
    if (!this.db) await this.init();
    if (!this.db) return [];

    const date = new Date();
    date.setDate(date.getDate() - days);
    const dateStr = date.toISOString();

    const result = await this.db.getAllAsync<FocusSession>(
      'SELECT * FROM sessions WHERE date >= ? ORDER BY date DESC',
      dateStr
    );

    return result;
  }

  async addFakeData(): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Mock: Fake data added');
      return;
    }
    
    if (!this.db) await this.init();
    if (!this.db) return;

    const categories = ['Ders Çalışma', 'Kodlama', 'Proje', 'Kitap Okuma', 'Diğer'];
    const now = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const sessionsCount = Math.floor(Math.random() * 4) + 2;
      
      for (let j = 0; j < sessionsCount; j++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const duration = Math.floor(Math.random() * 3600) + 900;
        const distractions = Math.floor(Math.random() * 5);
        const completed = Math.random() > 0.25;
        
        const hour = Math.floor(Math.random() * 14) + 7;
        date.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

        await this.addSession({
          category,
          duration,
          distractions,
          date: date.toISOString(),
          completed
        });
      }
    }
    
    console.log('✅ 30 days of test data added');
  }

  async clearAllData(): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Mock: All data cleared');
      return;
    }
    
    if (!this.db) await this.init();
    if (!this.db) return;

    await this.db.runAsync('DELETE FROM sessions');
    console.log('🗑️ All data cleared');
  }

  async getSessionsByDate(date: string): Promise<FocusSession[]> {
    if (Platform.OS === 'web') {
      return [];
    }
    
    if (!this.db) await this.init();
    if (!this.db) return [];

    const result = await this.db.getAllAsync<FocusSession>(
      'SELECT * FROM sessions WHERE date LIKE ? ORDER BY date DESC',
      `${date}%`
    );

    return result;
  }

  async getCurrentStreak(): Promise<{ current: number; longest: number }> {
    if (Platform.OS === 'web') {
      return { current: 0, longest: 0 };
    }
    
    if (!this.db) await this.init();
    if (!this.db) return { current: 0, longest: 0 };

    const allSessions = await this.getAllSessions();
    
    const dayMap = new Map<string, number>();
    allSessions.forEach(session => {
      const date = session.date.split('T')[0];
      dayMap.set(date, (dayMap.get(date) || 0) + session.duration);
    });

    const sortedDates = Array.from(dayMap.keys()).sort().reverse();
    
    if (sortedDates.length === 0) {
      return { current: 0, longest: 0 };
    }

    const dailyGoal = 2 * 60 * 60;

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let checkDate = new Date();
    let foundToday = false;

    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const duration = dayMap.get(dateStr) || 0;

      if (duration >= dailyGoal) {
        currentStreak++;
        if (dateStr === today) foundToday = true;
      } else {
        if (dateStr !== today && dateStr !== yesterdayStr) {
          break;
        }
        if (dateStr === today && !foundToday) {
        } else {
          break;
        }
      }

      checkDate.setDate(checkDate.getDate() - 1);
    }

    let currentDate = '';
    for (const date of sortedDates) {
      const duration = dayMap.get(date) || 0;
      
      if (duration >= dailyGoal) {
        if (currentDate === '') {
          tempStreak = 1;
        } else {
          const prevDate = new Date(currentDate);
          const currDate = new Date(date);
          const diffTime = Math.abs(prevDate.getTime() - currDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        currentDate = date;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
        currentDate = '';
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { current: currentStreak, longest: longestStreak };
  }

  async unlockAchievement(achievementId: string): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Mock: Achievement unlocked', achievementId);
      return;
    }
    
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      await this.db.runAsync(
        'INSERT OR IGNORE INTO achievements (id, unlockedAt) VALUES (?, ?)',
        achievementId,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Achievement unlock error:', error);
    }
  }

  async getUnlockedAchievements(): Promise<string[]> {
    if (Platform.OS === 'web') {
      return [];
    }
    
    if (!this.db) await this.init();
    if (!this.db) return [];

    const result = await this.db.getAllAsync<{ id: string }>(
      'SELECT id FROM achievements'
    );

    return result.map(r => r.id);
  }

  async checkAndUnlockAchievements(): Promise<string[]> {
    if (Platform.OS === 'web') {
      return [];
    }
    
    const allSessions = await this.getAllSessions();
    const unlockedIds = await this.getUnlockedAchievements();
    const newlyUnlocked: string[] = [];

    const totalTime = allSessions.reduce((sum, s) => sum + s.duration, 0);
    const timeAchievements = [
      { id: 'first_hour', req: 3600 },
      { id: 'five_hours', req: 18000 },
      { id: 'ten_hours', req: 36000 },
      { id: 'twenty_hours', req: 72000 },
      { id: 'fifty_hours', req: 180000 },
      { id: 'hundred_hours', req: 360000 },
    ];

    for (const ach of timeAchievements) {
      if (!unlockedIds.includes(ach.id) && totalTime >= ach.req) {
        await this.unlockAchievement(ach.id);
        newlyUnlocked.push(ach.id);
      }
    }

    const completedSessions = allSessions.filter(s => s.completed).length;
    const sessionAchievements = [
      { id: 'first_session', req: 1 },
      { id: 'ten_sessions', req: 10 },
      { id: 'fifty_sessions', req: 50 },
      { id: 'hundred_sessions', req: 100 },
    ];

    for (const ach of sessionAchievements) {
      if (!unlockedIds.includes(ach.id) && completedSessions >= ach.req) {
        await this.unlockAchievement(ach.id);
        newlyUnlocked.push(ach.id);
      }
    }

    const streak = await this.getCurrentStreak();
    const streakAchievements = [
      { id: 'three_day_streak', req: 3 },
      { id: 'week_streak', req: 7 },
      { id: 'two_week_streak', req: 14 },
      { id: 'month_streak', req: 30 },
    ];

    for (const ach of streakAchievements) {
      if (!unlockedIds.includes(ach.id) && streak.current >= ach.req) {
        await this.unlockAchievement(ach.id);
        newlyUnlocked.push(ach.id);
      }
    }

    if (!unlockedIds.includes('no_distraction')) {
      const perfectSession = allSessions.find(s => s.completed && s.distractions === 0);
      if (perfectSession) {
        await this.unlockAchievement('no_distraction');
        newlyUnlocked.push('no_distraction');
      }
    }

    if (!unlockedIds.includes('early_bird')) {
      const earlySession = allSessions.find(s => {
        const hour = new Date(s.date).getHours();
        return hour < 7;
      });
      if (earlySession) {
        await this.unlockAchievement('early_bird');
        newlyUnlocked.push('early_bird');
      }
    }

    if (!unlockedIds.includes('night_owl')) {
      const nightSession = allSessions.find(s => {
        const hour = new Date(s.date).getHours();
        return hour >= 22;
      });
      if (nightSession) {
        await this.unlockAchievement('night_owl');
        newlyUnlocked.push('night_owl');
      }
    }

    return newlyUnlocked;
  }
}

export const database = new DatabaseService();

