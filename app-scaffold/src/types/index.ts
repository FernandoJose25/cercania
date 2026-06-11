/**
 * Tipos del dominio (espejo del esquema de Supabase).
 * Cuando agregues columnas en SQL, actualízalos aquí.
 */

export type MemberRole = 'owner' | 'admin' | 'member' | 'child' | 'elder';
export type HistoryRetention = '1_day' | '7_days' | '30_days' | 'never_save';
export type InvisibleReason = 'manual' | 'scheduled' | 'recovery_lock';
export type RecoveryStatus = 'pending' | 'approved' | 'cancelled' | 'completed' | 'expired';
export type SosStatus = 'active' | 'resolved' | 'false_alarm';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  backup_email: string | null;
  backup_phone: string | null;
  date_of_birth: string | null;
  is_minor: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  biometric_enabled: boolean;
  keep_session_days: 0 | 7 | 30;
  history_retention: HistoryRetention;
  allow_invisible_mode: boolean;
  tracking_enabled: boolean;
  battery_saver_enabled: boolean;
  notify_low_battery: boolean;
  notify_arrivals: boolean;
  notify_sos: boolean;
  push_token: string | null;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  color: string;
  owner_id: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: MemberRole;
  nickname: string | null;
  joined_at: string;
}

export interface Location {
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  battery_level: number | null;
  is_charging: boolean | null;
  is_moving: boolean;
  activity: string | null;
  updated_at: string;
}

export interface Geofence {
  id: string;
  group_id: string;
  created_by: string;
  name: string;
  emoji: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  notify_on_enter: boolean;
  notify_on_exit: boolean;
  created_at: string;
}

export interface SosAlert {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  audio_url: string | null;
  photo_url: string | null;
  message: string | null;
  status: SosStatus;
  triggered_at: string;
  resolved_at: string | null;
}

export interface TrustedContact {
  user_id: string;
  contact_id: string;
  added_at: string;
  contact_profile?: Profile; // join opcional
}

export interface RecoveryRequest {
  id: string;
  user_id: string;
  initiated_at: string;
  executable_at: string;
  expires_at: string;
  required_approvals: number;
  current_approvals: number;
  status: RecoveryStatus;
  cancelled_by_user: boolean;
}

export interface GroupLiveSnapshot {
  group: Group;
  members: Array<{
    user_id: string;
    role: MemberRole;
    nickname: string | null;
    profile: Profile;
    location: Location | null;
    is_invisible: boolean;
    active_sos: SosAlert | null;
  }>;
  geofences: Geofence[];
}
