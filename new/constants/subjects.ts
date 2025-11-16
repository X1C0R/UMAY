export type SubjectMode = "visual" | "audio" | "text";

export type Subject = {
  id: string;
  title: string;
  progress: number;
  colors: [string, string];
  icon: string;
  summary: string;
  nextQuiz: string;
  recommendedModes: SubjectMode[];
};

export const SUBJECTS: Subject[] = [
  {
    id: "math",
    title: "Mathematics",
    progress: 65,
    colors: ["#2491FF", "#58CBFF"],
    icon: "calculator-variant",
    summary: "Geometry foundations and visual problem breakdowns.",
    nextQuiz: "Geometry Level 2",
    recommendedModes: ["visual", "text"],
  },
  {
    id: "science",
    title: "Science",
    progress: 80,
    colors: ["#4ADE80", "#16A34A"],
    icon: "atom",
    summary: "Concept simulations for upcoming lab activities.",
    nextQuiz: "Lab Prep: Photosynthesis",
    recommendedModes: ["visual", "audio"],
  },
  {
    id: "history",
    title: "History",
    progress: 45,
    colors: ["#FB923C", "#F97316"],
    icon: "scroll",
    summary: "Narrative timelines of key ancient civilizations.",
    nextQuiz: "Quiz: Mediterranean Empires",
    recommendedModes: ["audio", "text"],
  },
  {
    id: "language",
    title: "Language",
    progress: 90,
    colors: ["#A855F7", "#6366F1"],
    icon: "book-open-variant",
    summary: "Vocabulary retention and grammar refinement drills.",
    nextQuiz: "Writing Clinic",
    recommendedModes: ["text", "audio"],
  },
];

export const SUBJECT_LOOKUP = Object.fromEntries(SUBJECTS.map((subject) => [subject.id, subject]));



