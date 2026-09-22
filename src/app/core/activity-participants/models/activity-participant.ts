import {Activity} from '../../activities/models/activity';
import {UserProfile} from '../../auth/models/user-profile';
import {AttendanceStatus} from './attendance-status';

export interface ActivityParticipant {

  id: number;

  activity: Activity;

  user: UserProfile;

  attendanceStatus: AttendanceStatus;

  observations: string | null;
}