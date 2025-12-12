/** Available focus session categories */
export const CATEGORIES = [
  'Ders Çalışma',
  'Kodlama',
  'Proje',
  'Kitap Okuma',
  'Diğer'
] as const;

/** Default timer duration in seconds (25 minutes) */
export const DEFAULT_DURATION = 25 * 60;

/** Duration options for normal mode timer */
export const NORMAL_DURATIONS = [
  { label: '15 dakika', value: 15 * 60 },
  { label: '25 dakika', value: 25 * 60 },
  { label: '30 dakika', value: 30 * 60 },
  { label: '45 dakika', value: 45 * 60 },
  { label: '60 dakika', value: 60 * 60 },
] as const;

/** Pomodoro mode timing configuration */
export const POMODORO_DURATIONS = {
  work: 25 * 60,       // 25 minutes focused work
  shortBreak: 5 * 60,  // 5 minutes short break
  longBreak: 15 * 60,  // 15 minutes long break
} as const;

export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak' | 'custom';
export type TimerMode = 'normal' | 'pomodoro';

/** Achievement system configuration and data */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  type: 'time' | 'sessions' | 'streak' | 'special';
  unlockedAt?: string;
}

/** All available achievements with categories: time, sessions, streaks, and special accomplishments */
export const ACHIEVEMENTS: Achievement[] = [
  // Time-based achievements
  { id: 'first_hour', title: 'İlk Adım', description: '1 saat odaklandın', icon: 'baby-face', requirement: 3600, type: 'time' },
  { id: 'five_hours', title: 'Azimli', description: '5 saat odaklandın', icon: 'trophy', requirement: 18000, type: 'time' },
  { id: 'ten_hours', title: 'Kararlı', description: '10 saat odaklandın', icon: 'medal', requirement: 36000, type: 'time' },
  { id: 'twenty_hours', title: 'Uzman', description: '20 saat odaklandın', icon: 'star', requirement: 72000, type: 'time' },
  { id: 'fifty_hours', title: 'Usta', description: '50 saat odaklandın', icon: 'diamond', requirement: 180000, type: 'time' },
  { id: 'hundred_hours', title: 'Efsane', description: '100 saat odaklandın', icon: 'crown', requirement: 360000, type: 'time' },
  
  // Session count achievements
  { id: 'first_session', title: 'Başlangıç', description: 'İlk seansını tamamladın', icon: 'flag', requirement: 1, type: 'sessions' },
  { id: 'ten_sessions', title: 'Alışkanlık', description: '10 seans tamamladın', icon: 'hand-okay', requirement: 10, type: 'sessions' },
  { id: 'fifty_sessions', title: 'Düzenli', description: '50 seans tamamladın', icon: 'check-all', requirement: 50, type: 'sessions' },
  { id: 'hundred_sessions', title: 'Disiplinli', description: '100 seans tamamladın', icon: 'medal-outline', requirement: 100, type: 'sessions' },
  
  // Streak achievements
  { id: 'three_day_streak', title: '3 Gün Streak', description: '3 gün üst üste hedefe ulaştın', icon: 'fire', requirement: 3, type: 'streak' },
  { id: 'week_streak', title: 'Haftalık Streak', description: '7 gün üst üste hedefe ulaştın', icon: 'fire-circle', requirement: 7, type: 'streak' },
  { id: 'two_week_streak', title: '2 Hafta Streak', description: '14 gün üst üste hedefe ulaştın', icon: 'flame', requirement: 14, type: 'streak' },
  { id: 'month_streak', title: 'Aylık Streak', description: '30 gün üst üste hedefe ulaştın', icon: 'fire-alert', requirement: 30, type: 'streak' },
  
  // Special achievements
  { id: 'no_distraction', title: 'Lazerli Odak', description: 'Hiç kaçmadan bir seans tamamladın', icon: 'bullseye-arrow', requirement: 0, type: 'special' },
  { id: 'early_bird', title: 'Erken Kuş', description: 'Sabah 7\'den önce odaklandın', icon: 'weather-sunset-up', requirement: 0, type: 'special' },
  { id: 'night_owl', title: 'Gece Kuşu', description: 'Gece 22\'den sonra odaklandın', icon: 'weather-night', requirement: 0, type: 'special' },
];

/** Formats seconds to MM:SS display format */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/** Formats seconds to human-readable duration (e.g., "2s 30dk") */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}s ${mins}dk`;
  }
  return `${mins}dk`;
};

