export type DemoStudent = {
  id: number;
  name: string;
  publicName: string;
  className: string;
  initials: string;
  total: number;
  interactions: number;
  bonuses: number;
  progress: number;
  favorite?: boolean;
  recent?: boolean;
  eligible?: boolean;
};

export const demoStudents: DemoStudent[] = [
  { id: 1, name: "Amelia Carter", publicName: "Amelia C.", className: "8B", initials: "AC", total: 2.4, interactions: 16, bonuses: 4, progress: 92, favorite: true, recent: true, eligible: true },
  { id: 2, name: "Lucas Bennett", publicName: "Lucas B.", className: "8B", initials: "LB", total: 2.1, interactions: 14, bonuses: 4, progress: 78, favorite: true, recent: true, eligible: true },
  { id: 3, name: "Maya Rodrigues", publicName: "Maya R.", className: "8B", initials: "MR", total: 1.8, interactions: 15, bonuses: 2, progress: 72, favorite: true, recent: true, eligible: true },
  { id: 4, name: "Noah Almeida", publicName: "Noah A.", className: "8B", initials: "NA", total: 1.5, interactions: 11, bonuses: 2, progress: 65, recent: true },
  { id: 5, name: "Sofia Martins", publicName: "Sofia M.", className: "8B", initials: "SM", total: 1.4, interactions: 10, bonuses: 2, progress: 58, favorite: true },
  { id: 6, name: "Theo Ferreira", publicName: "Theo F.", className: "8B", initials: "TF", total: 1.2, interactions: 9, bonuses: 2, progress: 55 },
  { id: 7, name: "Chloe Santos", publicName: "Chloe S.", className: "8B", initials: "CS", total: 1.1, interactions: 10, bonuses: 1, progress: 51, recent: true },
  { id: 8, name: "Arthur Lima", publicName: "Arthur L.", className: "8B", initials: "AL", total: 0.9, interactions: 7, bonuses: 1, progress: 42 },
];

export const demoEntries = [
  { id: 1, action: "English Interaction", amount: "+0.1", subject: "English Language Arts", time: "Today, 10:42", status: "Active", by: "Ms. Olivia Grant" },
  { id: 2, action: "Initiative Bonus", amount: "+0.2", subject: "English Language Arts", time: "Yesterday, 14:10", status: "Active", by: "Ms. Olivia Grant" },
  { id: 3, action: "English Interaction", amount: "+0.1", subject: "English Language Arts", time: "Yesterday, 10:18", status: "Active", by: "Ms. Olivia Grant" },
  { id: 4, action: "English Interaction", amount: "+0.1", subject: "English Language Arts", time: "18 Aug, 09:36", status: "Corrected", by: "Ms. Olivia Grant" },
];

export const actionMeta = {
  "English Interaction": { amount: "+0.1", tone: "green" },
  "Initiative Bonus": { amount: "+0.2", tone: "blue" },
  "Portuguese Occurrence": { amount: "−0.1", tone: "red" },
} as const;

export type ChallengeAction = keyof typeof actionMeta;
