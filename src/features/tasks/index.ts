/**
 * The tasks feature's public, client-safe surface for other rooms (Planner, Orbit, …).
 * Server reads stay in `./server/queries` and are imported by `app/` pages.
 */
export { TaskCheck, TaskTitle } from "./components/task-check";
export { CoverImage } from "./components/task-cover";
export { TaskDetail, type StageChoice } from "./components/task-detail";
export { DateMenu, PriorityMenu, TaskMenu } from "./components/task-menus";
export {
  DetailHints,
  DueLabel,
  priorityMeta,
  PriorityLabel,
  ProjectLabel,
} from "./components/task-meta";
export { useTasks, type TaskActions } from "./hooks/use-tasks";
export { KeywordChip } from "./components/keyword-chip";
export { useShellProjects } from "./components/shell-projects";
export { KEYWORD_LIMITS, keywordProblem, normalizeKeyword } from "./keywords";
export { compareTasks, lastKey, placeAt, type Placement } from "./order";
export { parseTaskInput, type Priority } from "./parse";
export {
  colorOf,
  nextProjectColor,
  PROJECT_COLORS,
  projectColors,
  type ProjectColor,
} from "./projects";
export { describeRepeat } from "./repeat";
export {
  PROJECT_STATUSES,
  type CreateTaskInput,
  type ProjectItem,
  type ProjectStatus,
  type TaskItem,
  type UpdateProjectInput,
} from "./schema";
export { createProject, deleteProject, updateProject } from "./server/project-actions";
