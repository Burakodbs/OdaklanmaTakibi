import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

// Bildirimlerin nasıl gösterileceğini yapılandır
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  private initialized = false;
  private scheduledNotificationId: string | null = null;

  async init() {
    if (this.initialized) return;

    if (Platform.OS === 'web') {
      console.warn('Notifications not available on web');
      this.initialized = true;
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }

      // Android için notification channel oluştur
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Odaklanma Bildirimleri',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      this.initialized = true;
    } catch (error) {
      console.error('Notification initialization failed:', error);
    }
  }

  async sendSessionCompleteNotification(duration: number, distractions: number) {
    if (Platform.OS === 'web') return;

    try {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      const timeText = minutes > 0 
        ? (seconds > 0 ? `${minutes}dk ${seconds}sn` : `${minutes}dk`)
        : `${seconds}sn`;
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Tebrikler!',
          body: `${timeText} odaklanma seansını tamamladın! Dikkat dağınıklığı: ${distractions}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Hemen gönder
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  // Timer başladığında çağrılacak - süre bittiğinde bildirim gönderecek
  async scheduleTimerCompleteNotification(timeLeftInSeconds: number, totalDurationInSeconds: number) {
    if (Platform.OS === 'web') return null;

    try {
      // Önce varsa eski zamanlanmış bildirimi iptal et
      await this.cancelScheduledNotification();

      // Bildirim mesajı için TOPLAM süreyi kullan
      const minutes = Math.floor(totalDurationInSeconds / 60);
      const seconds = totalDurationInSeconds % 60;
      const timeText = minutes > 0 
        ? (seconds > 0 ? `${minutes}dk ${seconds}sn` : `${minutes}dk`)
        : `${seconds}sn`;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Tebrikler!',
          body: `${timeText} odaklanma seansını tamamladın!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'timer_complete' },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: timeLeftInSeconds, // Trigger için KALAN süreyi kullan
        },
      });

      this.scheduledNotificationId = notificationId;
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  async cancelScheduledNotification() {
    if (Platform.OS === 'web') return;
    
    try {
      if (this.scheduledNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(this.scheduledNotificationId);
        this.scheduledNotificationId = null;
      }
    } catch (error) {
      console.error('Failed to cancel scheduled notification:', error);
    }
  }

  async sendSessionStoppedNotification(duration: number, distractions: number) {
    if (Platform.OS === 'web') return;

    try {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      const timeText = minutes > 0 ? `${minutes}dk ${seconds}sn` : `${seconds}sn`;
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏸️ Seans Durduruldu',
          body: `${timeText} odaklandın. Dikkat dağınıklığı: ${distractions}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async cancelAllNotifications() {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export const notificationService = new NotificationService();
