import * as SQLite from 'expo-sqlite';

export interface FocusSession {
  id?: number;
  category: string;
  duration: number;
  distractions: number;
  date: string;
  completed: boolean;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    this.db = await SQLite.openDatabaseAsync('focusapp.db');
    await this.createTables();
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
    if (!this.db) await this.init();

    await this.db!.runAsync(
      'INSERT INTO sessions (category, duration, distractions, date, completed) VALUES (?, ?, ?, ?, ?)',
      session.category,
      session.duration,
      session.distractions,
      session.date,
      session.completed ? 1 : 0
    );
  }

  async getAllSessions(): Promise<FocusSession[]> {
    if (!this.db) await this.init();

    const result = await this.db!.getAllAsync<FocusSession>(
      'SELECT * FROM sessions ORDER BY date DESC'
    );

    return result;
  }

  async getTodaySessions(): Promise<FocusSession[]> {
    if (!this.db) await this.init();

    const today = new Date().toISOString().split('T')[0];
    const result = await this.db!.getAllAsync<FocusSession>(
      'SELECT * FROM sessions WHERE date LIKE ? ORDER BY date DESC',
      `${today}%`
    );

    return result;
  }

  async getSessionsByDateRange(days: number): Promise<FocusSession[]> {
    if (!this.db) await this.init();

    const date = new Date();
    date.setDate(date.getDate() - days);
    const dateStr = date.toISOString();

    const result = await this.db!.getAllAsync<FocusSession>(
      'SELECT * FROM sessions WHERE date >= ? ORDER BY date DESC',
      dateStr
    );

    return result;
  }
}

export const database = new DatabaseService();

