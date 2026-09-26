import { AttendanceStatus } from './attendance-status';

export interface UpdateAttendanceStatusRequest {
    attendanceStatus: AttendanceStatus;
    observations: string | null;
}