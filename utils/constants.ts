export const CATEGORIES = [
  'Ders Çalışma',
  'Kodlama',
  'Proje',
  'Kitap Okuma',
  'Diğer'
] as const;

export const DEFAULT_DURATION = 25 * 60;

export const TIMER_DURATIONS = [
  { label: '5 dakika', value: 5 * 60 },
  { label: '10 dakika', value: 10 * 60 },
  { label: '15 dakika', value: 15 * 60 },
  { label: '20 dakika', value: 20 * 60 },
  { label: '25 dakika', value: 25 * 60 },
  { label: '30 dakika', value: 30 * 60 },
  { label: '45 dakika', value: 45 * 60 },
  { label: '60 dakika', value: 60 * 60 },
] as const;

export const NORMAL_DURATIONS = [
  { label: '15 dakika', value: 15 * 60 },
  { label: '25 dakika', value: 25 * 60 },
  { label: '30 dakika', value: 30 * 60 },
  { label: '45 dakika', value: 45 * 60 },
  { label: '60 dakika', value: 60 * 60 },
] as const;

export const POMODORO_DURATIONS = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
} as const;

export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak' | 'custom';
export type TimerMode = 'normal' | 'pomodoro';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  type: 'time' | 'sessions' | 'streak' | 'special';
  unlockedAt?: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_hour', title: 'İlk Adım', description: '1 saat odaklandın', icon: 'baby-face', requirement: 3600, type: 'time' },
  { id: 'five_hours', title: 'Azimli', description: '5 saat odaklandın', icon: 'trophy', requirement: 18000, type: 'time' },
  { id: 'ten_hours', title: 'Kararlı', description: '10 saat odaklandın', icon: 'medal', requirement: 36000, type: 'time' },
  { id: 'twenty_hours', title: 'Uzman', description: '20 saat odaklandın', icon: 'star', requirement: 72000, type: 'time' },
  { id: 'fifty_hours', title: 'Usta', description: '50 saat odaklandın', icon: 'diamond', requirement: 180000, type: 'time' },
  { id: 'hundred_hours', title: 'Efsane', description: '100 saat odaklandın', icon: 'crown', requirement: 360000, type: 'time' },
  
  { id: 'first_session', title: 'Başlangıç', description: 'İlk seansını tamamladın', icon: 'flag', requirement: 1, type: 'sessions' },
  { id: 'ten_sessions', title: 'Alışkanlık', description: '10 seans tamamladın', icon: 'hand-okay', requirement: 10, type: 'sessions' },
  { id: 'fifty_sessions', title: 'Düzenli', description: '50 seans tamamladın', icon: 'check-all', requirement: 50, type: 'sessions' },
  { id: 'hundred_sessions', title: 'Disiplinli', description: '100 seans tamamladın', icon: 'medal-outline', requirement: 100, type: 'sessions' },
  
  { id: 'three_day_streak', title: '3 Gün Streak', description: '3 gün üst üste hedefe ulaştın', icon: 'fire', requirement: 3, type: 'streak' },
  { id: 'week_streak', title: 'Haftalık Streak', description: '7 gün üst üste hedefe ulaştın', icon: 'fire-circle', requirement: 7, type: 'streak' },
  { id: 'two_week_streak', title: '2 Hafta Streak', description: '14 gün üst üste hedefe ulaştın', icon: 'flame', requirement: 14, type: 'streak' },
  { id: 'month_streak', title: 'Aylık Streak', description: '30 gün üst üste hedefe ulaştın', icon: 'fire-alert', requirement: 30, type: 'streak' },
  
  { id: 'no_distraction', title: 'Lazerli Odak', description: 'Hiç kaçmadan bir seans tamamladın', icon: 'bullseye-arrow', requirement: 0, type: 'special' },
  { id: 'early_bird', title: 'Erken Kuş', description: 'Sabah 7\'den önce odaklandın', icon: 'weather-sunset-up', requirement: 0, type: 'special' },
  { id: 'night_owl', title: 'Gece Kuşu', description: 'Gece 22\'den sonra odaklandın', icon: 'weather-night', requirement: 0, type: 'special' },
];

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}s ${mins}dk`;
  }
  return `${mins}dk`;
};

