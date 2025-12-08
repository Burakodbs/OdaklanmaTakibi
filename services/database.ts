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
    // Skip SQLite initialization on web platform
    if (Platform.OS === 'web') {
      console.warn('SQLite is not supported on web platform. Using mock data.');
      this.initialized = true;
      return;
    }

    // Prevent multiple initializations
    if (this.initialized || this.initializing) {
      return;
    }

    this.initializing = true;
    
    try {
      // Dynamically import SQLite only on native platforms
      const SQLite = await import('expo-sqlite');
      this.db = await SQLite.openDatabaseAsync('focusapp.db');
      await this.createTables();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
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

    // Son 7 gün için fake veriler
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Her gün için 2-4 seans
      const sessionsCount = Math.floor(Math.random() * 3) + 2;
      
      for (let j = 0; j < sessionsCount; j++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const duration = Math.floor(Math.random() * 3600) + 600; // 10-70 dakika arası (saniye cinsinden)
        const distractions = Math.floor(Math.random() * 5); // 0-4 arası kaçış
        const completed = Math.random() > 0.3; // %70 tamamlanma oranı
        
        // Günün farklı saatlerine dağıt
        const hour = Math.floor(Math.random() * 12) + 8; // 08:00 - 20:00 arası
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
    
    console.log('✅ Fake data başarıyla eklendi!');
  }

  async clearAllData(): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Mock: All data cleared');
      return;
    }
    
    if (!this.db) await this.init();
    if (!this.db) return;

    await this.db.runAsync('DELETE FROM sessions');
    console.log('🗑️ Tüm veriler silindi!');
  }
}

export const database = new DatabaseService();

