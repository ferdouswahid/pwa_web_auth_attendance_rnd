export interface AttendanceRecord {
  id?: number;
  userId: number;
  type: 'in' | 'out';
  timestamp: Date;
  latitude: number;
  longitude: number;
  zoneName: string;
}
