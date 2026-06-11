// features/work-sessions/types.ts

export type WorkSession = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  created_at: string;
};

export type ActiveSession = WorkSession & {
  ended_at: null;
  duration_minutes: null;
};

export type CompletedSession = WorkSession & {
  ended_at: string;
  duration_minutes: number;
};
