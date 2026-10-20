import { toDay } from './dates';
import type { Milestone, ProjectData, Task } from './types';

export type Status = 'done' | 'late' | 'soon' | 'todo' | 'unplanned';

/** A task is "soon" when its deadline is within this many days. */
export const SOON_DAYS = 7;
/** Horizon of the "À surveiller" lists. */
export const WATCH_DAYS = 14;

export interface TaskView extends Task {
  status: Status;
  dueDay: number | null;
  doneDay: number | null;
  /** Parents not finished yet. */
  waitingOn: number[];
  children: number[];
  /** Done after the deadline (positive) or before (negative); open & overdue: days overdue. */
  slip: number;
  categoryIndex: number;
}

export interface Point { day: number; pct: number }

export interface CategoryStat {
  name: string;
  index: number;
  total: number;
  done: number;
  /** Weight that should be done by today according to the plan. */
  expected: number;
  count: number;
  doneCount: number;
  lateCount: number;
}

export interface Metrics {
  today: number;
  start: number;
  end: number;
  tasks: TaskView[];
  byId: Map<number, TaskView>;
  categories: CategoryStat[];
  totalWeight: number;
  actualPct: number;
  plannedPct: number;
  /** actual − planned, in percentage points. */
  gap: number;
  planned: Point[];
  actual: Point[];
  counts: Record<Status, number>;
  elapsedPct: number;
  milestones: (Milestone & { day: number; index: number })[];
  nextMilestone: (Milestone & { day: number; index: number }) | null;
}

function statusOf(t: Task, today: number): Status {
  if (t.done) return 'done';
  if (!t.due) return 'unplanned';
  const due = toDay(t.due);
  if (due < today) return 'late';
  if (due - today <= SOON_DAYS) return 'soon';
  return 'todo';
}

/** Cumulative step curve (percent of total weight) from (day, weight) events. */
function cumulative(events: { day: number; weight: number }[], total: number, start: number): Point[] {
  const sorted = [...events].sort((a, b) => a.day - b.day);
  const pts: Point[] = [{ day: start, pct: 0 }];
  let acc = 0;
  for (const e of sorted) {
    acc += e.weight;
    const day = Math.max(e.day, start);
    const pct = total ? (acc / total) * 100 : 0;
    if (pts[pts.length - 1].day === day) pts[pts.length - 1].pct = pct;
    else pts.push({ day, pct });
  }
  return pts;
}

/** Value of a step curve at `day`. */
export function valueAt(curve: Point[], day: number): number {
  let v = 0;
  for (const p of curve) {
    if (p.day > day) break;
    v = p.pct;
  }
  return v;
}

export function compute(data: ProjectData, today: number): Metrics {
  const start = toDay(data.project.start);
  const end = toDay(data.project.end);

  // Categories keep the order in which they first appear, so colors never shuffle.
  const categoryNames: string[] = [];
  for (const t of data.tasks) if (!categoryNames.includes(t.category)) categoryNames.push(t.category);

  const raw = new Map(data.tasks.map((t) => [t.id, t]));
  const tasks: TaskView[] = data.tasks.map((t) => {
    const dueDay = t.due ? toDay(t.due) : null;
    const doneDay = t.done ? toDay(t.done) : null;
    const status = statusOf(t, today);
    const parents = t.parents.filter((p) => raw.has(p));
    let slip = 0;
    if (dueDay !== null && doneDay !== null) slip = doneDay - dueDay;
    else if (status === 'late' && dueDay !== null) slip = today - dueDay;
    return {
      ...t,
      parents,
      status,
      dueDay,
      doneDay,
      slip,
      waitingOn: parents.filter((p) => !raw.get(p)!.done),
      children: data.tasks.filter((c) => c.parents.includes(t.id)).map((c) => c.id),
      categoryIndex: categoryNames.indexOf(t.category),
    };
  });
  const byId = new Map(tasks.map((t) => [t.id, t]));

  const weighted = tasks.filter((t) => t.weight && t.dueDay !== null);
  const totalWeight = weighted.reduce((s, t) => s + t.weight!, 0);

  const planned = cumulative(weighted.map((t) => ({ day: t.dueDay!, weight: t.weight! })), totalWeight, start);
  const actual = cumulative(
    weighted.filter((t) => t.doneDay !== null && t.doneDay <= today).map((t) => ({ day: t.doneDay!, weight: t.weight! })),
    totalWeight,
    start,
  );
  const plannedPct = valueAt(planned, today);
  const actualPct = valueAt(actual, today);

  const categories: CategoryStat[] = categoryNames.map((name, index) => {
    const own = tasks.filter((t) => t.category === name);
    const w = (t: TaskView) => t.weight ?? 0;
    return {
      name,
      index,
      total: own.reduce((s, t) => s + w(t), 0),
      done: own.filter((t) => t.status === 'done').reduce((s, t) => s + w(t), 0),
      expected: own.filter((t) => t.dueDay !== null && t.dueDay <= today).reduce((s, t) => s + w(t), 0),
      count: own.length,
      doneCount: own.filter((t) => t.status === 'done').length,
      lateCount: own.filter((t) => t.status === 'late').length,
    };
  });

  const counts: Record<Status, number> = { done: 0, late: 0, soon: 0, todo: 0, unplanned: 0 };
  for (const t of tasks) counts[t.status]++;

  const milestones = [...data.milestones]
    .map((m) => ({ ...m, day: toDay(m.date) }))
    .sort((a, b) => a.day - b.day)
    .map((m, index) => ({ ...m, index }));

  return {
    today,
    start,
    end,
    tasks,
    byId,
    categories,
    totalWeight,
    actualPct,
    plannedPct,
    gap: actualPct - plannedPct,
    planned,
    actual,
    counts,
    elapsedPct: Math.min(100, Math.max(0, ((today - start) / (end - start)) * 100)),
    milestones,
    nextMilestone: milestones.find((m) => m.day >= today) ?? null,
  };
}
