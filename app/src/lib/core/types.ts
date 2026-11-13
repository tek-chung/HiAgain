export type ActionKind = "join_me" | "question" | "feedback";

export interface PublicAction {
  id: string;
  kind: ActionKind;
  prompt: string;
}

/** The complete set of fields a public profile response may contain (provisional allowlist). */
export interface PublicProfile {
  publicId: string;
  displayName: string;
  headline: string | null;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  actions: PublicAction[];
}

export interface SavedPerson {
  publicId: string;
  displayName: string;
  headline: string | null;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  savedAt: string;
  note: string;
  noteUpdatedAt: string | null;
}

export interface Contribution {
  id: string;
  actionId: string;
  kind: ActionKind;
  promptSnapshot: string;
  body: string;
  sentAt: string;
  editedAt: string | null;
  version: number;
}

export const ACTION_LABELS: Record<ActionKind, { title: string; done: string; send: string; placeholder: string; received: string; edit: string }> = {
  join_me: {
    received: "Wants to join",
    edit: "",
    title: "Join me",
    done: "Interest sent",
    send: "Send interest",
    placeholder: "Add a short note (optional)",
  },
  question: {
    received: "Answered your question",
    edit: "Edit answer",
    title: "Answer a question",
    done: "Answered",
    send: "Send answer",
    placeholder: "Write your answer",
  },
  feedback: {
    received: "Asked for feedback",
    edit: "Edit request",
    title: "Ask for feedback",
    done: "Request sent",
    send: "Send request",
    placeholder: "What would you like feedback on?",
  },
};

/** Join me interest may be sent without text; answers and requests need text. */
export function bodyRequired(kind: ActionKind): boolean {
  return kind !== "join_me";
}

/** Written contributions can be edited by their sender; Join me interest can't. */
export function isEditable(kind: ActionKind): boolean {
  return kind !== "join_me";
}
