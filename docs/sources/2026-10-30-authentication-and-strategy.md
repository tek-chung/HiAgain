# Hi-Again — Authentication & Product Strategy Reference

Decision record · 30 October 2026 · MVP planning

## 1. Executive summary

Hi-Again is a networking app designed to help people turn real-world encounters into meaningful, ongoing relationships.

The initial target audience is professionals meeting at conferences, networking events, business meetings and similar settings.

The agreed MVP authentication strategy is LinkedIn Sign-In as the primary option, with Google Sign-In as an alternative. Both are passwordless from Hi-Again's perspective, and no other authentication methods are planned initially.

The overarching product principle is:

> Meeting someone is the beginning, not the outcome.

Hi-Again should help people remember why they met, follow up, and turn encounters into conversations, collaborations and opportunities.

## 2. Discussion history

| Stage | Discussion                                | Outcome                                                                                            |
| ----- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1     | Does LinkedIn support SSO like Google?    | Confirmed LinkedIn supports OpenID Connect authentication.                                         |
| 2     | Which provider is better?                 | Initially favoured Google for familiar, low-friction onboarding.                                   |
| 3     | Why can't LinkedIn provide a profile URL? | Clarified that standard LinkedIn OIDC does not return the public profile URL.                      |
| 4     | Should LinkedIn be prioritised?           | Shifted towards LinkedIn because of Hi-Again's professional audience.                              |
| 5     | Could LinkedIn-only reduce complexity?    | Considered appropriate for a tightly focused professional MVP.                                     |
| 6     | Is Hi-Again only for professionals?       | Established that the initial audience is professional, but the longer-term opportunity is broader. |
| 7     | What's the actual product objective?      | Confirmed the priority is making something happen after meeting, not merely exchanging details.    |
| 8     | Should email login be offered?            | Briefly considered LinkedIn plus passwordless email.                                               |
| 9     | Why not Google instead?                   | Google judged a better fallback for fast QR-based onboarding.                                      |
| 10    | Final decision                            | LinkedIn + Google only for MVP.                                                                    |

## 3. Confirmed MVP decisions

Authentication providers

Agreed

[image](https://www.google.com/s2/favicons?domain=https://www.linkedin.com\&sz=32)

LinkedIn Sign-In

Primary option for professional networking

[image](https://www.google.com/s2/favicons?domain=https://www.google.com\&sz=32)

Google Sign-In

Alternative for users who prefer Google

Not included initially: email/password, magic links, email one-time codes, Apple Sign-In.

### Onboarding behaviour

1. Someone scans a Hi-Again QR code.
2. The recipient's public profile opens immediately, without authentication.
3. The visitor can choose to exchange profiles.
4. If not authenticated, they sign in with LinkedIn or Google.
5. Hi-Again creates a minimal starter profile using available identity information.
6. The original exchange is completed without requiring another scan.
7. The user can subsequently enrich their profile and record the context of the encounter.

The QR scan should not itself require login.

### LinkedIn API limitations

LinkedIn's standard OpenID Connect integration can return identity fields such as a unique account identifier, name, email and profile picture, subject to permissions and availability.

It does not ordinarily provide the user's public `linkedin.com/in/...` URL, employment history or connections list.

Consequently:

- LinkedIn profile URLs remain optional and can be entered manually.
- The LinkedIn OIDC subject identifier must not be treated as a public LinkedIn username.
- LinkedIn authentication establishes account control, not independent verification of professional claims.
- Deeper LinkedIn integration is not required for the MVP.

## 4. Product positioning

The conversation clarified that Hi-Again should not simply replicate LinkedIn or become another digital business card.

| LinkedIn                                   | Hi-Again                             |
| ------------------------------------------ | ------------------------------------ |
| Establishes a professional network         | Captures real-world encounters       |
| Maintains a list of connections            | Remembers why people connected       |
| Provides professional identity and context | Helps initiate meaningful follow-ups |
| Supports ongoing professional presence     | Encourages concrete next steps       |

The agreed direction is to build around the relationship lifecycle:

Meet

Connect

Follow up

Act

Potential functionality discussed includes recording where people met, capturing conversation context, agreeing next steps and prompting follow-ups. These are product directions, not all confirmed MVP deliverables.

The proposed tagline was “Make more of the people you meet.” It remains a positioning proposal rather than a formally finalised brand decision.

## 5. Technical requirements and considerations

| Area             | Direction                                                              |
| ---------------- | ---------------------------------------------------------------------- |
| Authentication   | LinkedIn OIDC and Google OAuth/OIDC                                    |
| Backend          | Supabase Auth was discussed as a suitable implementation               |
| User identity    | Use an internal Hi-Again user ID independent of providers              |
| Account linking  | Support linking multiple providers to prevent duplicate profiles       |
| QR exchange      | Preserve intended recipient and exchange action through authentication |
| Profile creation | Populate available name, photo and email; tolerate missing fields      |
| Public access    | Allow unauthenticated profile viewing                                  |
| Future expansion | Keep architecture open to other providers without committing to them   |

Account linking needs particular care: matching email addresses alone should not automatically merge accounts without a secure verification process.

## 6. Decisions deliberately deferred

The following were considered but not adopted for the MVP:

- Email-only authentication, passwords or magic links.
- Apple Sign-In.
- Automatic LinkedIn profile URL discovery.
- Importing LinkedIn employment history or connections.
- Restricted LinkedIn APIs or partnership-dependent features.
- Expanding authentication to accommodate non-professional audiences immediately.

The broader ambition remains open: Hi-Again could eventually support university events, volunteering, communities and social encounters. That possibility should influence architecture and branding without expanding initial scope unnecessarily.

## 7. Final decision record

Primary authentication: LinkedIn Sign-In

Secondary authentication: Google Sign-In

Public profile access: No login required

Profile exchange: Authentication required, with seamless continuation

LinkedIn URL: Optional, manually supplied initially

Product focus: Meaningful follow-up and relationship development after in-person meetings

Implementation priority: Build the simplest reliable LinkedIn + Google authentication flow that allows someone to scan a QR code, view a profile, exchange details and continue the relationship with minimal friction.

This document captures the decisions reached in this conversation and can serve as a reference for Hi-Again's MVP specification and future development discussions.