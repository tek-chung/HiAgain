import type { PublicProfile } from "@/lib/core/types";

// Fictional development fixtures (no real people). Used only when Supabase is not configured.
export const FIXTURE_OWNER_ID = "DevAlexM0rgn";

export const FIXTURE_PROFILES: PublicProfile[] = [
  {
    publicId: FIXTURE_OWNER_ID,
    handle: "alex-morgan",
    displayName: "Alex Morgan",
    headline: "Product builder · London",
    avatarUrl: null,
    linkedinUrl: null,
    actions: [
      { id: "00000000-0000-4000-8000-0000000000a1", kind: "join_me", prompt: "Coffee and a catch-up?" },
      { id: "00000000-0000-4000-8000-0000000000a2", kind: "question", prompt: "What would you like to know about my work?" },
      { id: "00000000-0000-4000-8000-0000000000a3", kind: "feedback", prompt: "A fresh perspective on a project or idea?" },
    ],
  },
  {
    publicId: "DevJamieChen",
    handle: "jamie-chen",
    displayName: "Jamie Chen",
    headline: "Product designer · London",
    avatarUrl: null,
    linkedinUrl: null,
    actions: [
      { id: "00000000-0000-4000-8000-0000000000b1", kind: "join_me", prompt: "Coffee and a catch-up?" },
      { id: "00000000-0000-4000-8000-0000000000b2", kind: "question", prompt: "What would you like to know about my work?" },
    ],
  },
  {
    publicId: "DevSamPatel1",
    handle: "sam-patel",
    displayName: "Sam Patel",
    headline: null,
    avatarUrl: null,
    linkedinUrl: null,
    actions: [],
  },
];
