import { create } from 'zustand';

interface BoardState {
  // Drag and drop state
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;

  // UI modal open states
  isCreateProjectOpen: boolean;
  setCreateProjectOpen: (open: boolean) => void;
  isCreateTaskOpen: boolean;
  setCreateTaskOpen: (open: boolean) => void;
  isCreateColumnOpen: boolean;
  setCreateColumnOpen: (open: boolean) => void;
  
  // Selected IDs for creations
  selectedColumnId: string | null;
  setSelectedColumnId: (id: string | null) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;

  // Search & Filters state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  priorityFilter: string | null;
  setPriorityFilter: (priority: string | null) => void;
  assigneeFilter: string | null;
  setAssigneeFilter: (assignee: string | null) => void;

  // Reset filters
  resetFilters: () => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  activeTaskId: null,
  setActiveTaskId: (id) => set({ activeTaskId: id }),

  isCreateProjectOpen: false,
  setCreateProjectOpen: (open) => set({ isCreateProjectOpen: open }),
  isCreateTaskOpen: false,
  setCreateTaskOpen: (open) => set({ isCreateTaskOpen: open }),
  isCreateColumnOpen: false,
  setCreateColumnOpen: (open) => set({ isCreateColumnOpen: open }),

  selectedColumnId: null,
  setSelectedColumnId: (id) => set({ selectedColumnId: id }),
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  priorityFilter: null,
  setPriorityFilter: (priority) => set({ priorityFilter: priority }),
  assigneeFilter: null,
  setAssigneeFilter: (assignee) => set({ assigneeFilter: assignee }),

  resetFilters: () => set({ searchQuery: '', priorityFilter: null, assigneeFilter: null }),
}));
