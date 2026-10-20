/** ISO calendar date, `YYYY-MM-DD`. */
export type ISODate = string;

export interface Task {
  id: number;
  category: string;
  name: string;
  description?: string;
  /** Relative effort; `null` for tasks added after planning. */
  weight: number | null;
  due: ISODate | null;
  /** Ids of tasks that must be finished first. */
  parents: number[];
  /** Completion date; `null` while open. */
  done: ISODate | null;
}

export interface Milestone {
  label: string;
  date: ISODate;
}

export interface ProjectData {
  project: {
    title: string;
    subtitle: string;
    code?: string;
    start: ISODate;
    end: ISODate;
  };
  milestones: Milestone[];
  tasks: Task[];
}

export type DataSource = 'demo' | 'local' | 'live';
