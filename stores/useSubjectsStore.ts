import { create } from "zustand";
import { getAllSubjects, getTopicsWithProgress, Subject, TopicWithProgress } from "../lib/db/subjectsRepo";

interface SubjectsState {
  subjects: Subject[];
  topicsBySubject: Record<string, TopicWithProgress[]>;
  refreshSubjects: () => void;
  refreshTopics: (subjectId: string) => void;
}

export const useSubjectsStore = create<SubjectsState>((set, get) => ({
  subjects: [],
  topicsBySubject: {},

  refreshSubjects: () => {
    set({ subjects: getAllSubjects() });
  },

  refreshTopics: (subjectId: string) => {
    const topics = getTopicsWithProgress(subjectId);
    set({ topicsBySubject: { ...get().topicsBySubject, [subjectId]: topics } });
  },
}));
