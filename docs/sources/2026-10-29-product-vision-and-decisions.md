# Hi-Again — Product Vision & Decisions

Consolidated product brief · 29 October 2026

I've brought together this conversation and the relevant earlier discussions about the networking app, including the original concept, branding, user journeys, authentication, technical architecture and decisions we've subsequently changed.

I'll distinguish between agreed decisions, working proposals, and questions still open so this can serve as a reliable reference for building the MVP.

## 1. The core idea

# Hi-Again

## Don't just meet. Meet again.

Share Experiences. Share Ideas. Share Value.

Hi-Again is a mobile-first networking application that turns brief, in-person encounters into meaningful, lasting relationships.

The problem is familiar: you meet someone interesting at a conference, meetup or professional event, exchange LinkedIn details, and then nothing happens.

LinkedIn makes it easy to connect, but making a connection doesn't necessarily lead to a conversation, collaboration, friendship or second encounter.

Hi-Again aims to bridge that gap.

The core philosophy is:

Meeting someone is the beginning, not the outcome.

Rather than encouraging users to accumulate connections, Hi-Again gives them specific reasons to interact with someone they've met.

The ultimate measure of success isn't how many people someone connects with. It's how many first encounters lead to a second meaningful interaction.

### What Hi-Again is — and isn't

| Hi-Again is                               | Hi-Again isn't               |
| ----------------------------------------- | ---------------------------- |
| A relationship-building layer             | A LinkedIn replacement       |
| An interactive QR profile                 | Just a digital business card |
| A way to initiate meaningful interactions | Another messaging platform   |
| A tool for real-world follow-ups          | A social media feed          |
| A lightweight record of encounters        | A complicated personal CRM   |

## 2. Target audience and positioning

The initial audience is deliberately narrow:

Existing LinkedIn users who already scan QR codes to connect at professional events.

Examples include conference attendees, founders, product managers, students, professionals and people attending networking meetups.

This matters because Hi-Again doesn't need to teach people a completely new networking behaviour. They're already comfortable scanning codes and exchanging profiles.

Instead, Hi-Again improves what happens after the scan.

The intended journey is:

Meet someone

A real-world introduction

Scan their Hi-Again QR

Immediately open their public profile

Share something meaningful

An experience, idea or value

Meet again

Continue the relationship in the real world or on an existing platform

## 3. The brand system

This is one of the clearest outcomes of our discussions.

### Brand identity

| Element                       | Current direction                                        |
| ----------------------------- | -------------------------------------------------------- |
| Name                          | Hi-Again                                                 |
| Main tagline                  | Don't just meet. Meet again.                             |
| Three pillars                 | Share Experiences · Share Ideas · Share Value            |
| Signature relationship action | Again                                                    |
| Brand personality             | Welcoming, thoughtful, social, simple, modern            |
| Visual direction              | Minimalist, mobile-first, clean and lightly colour-coded |

We considered several earlier action systems, including Join, Ask, Help, Meet, See, and then Invite, Discuss and Offer.

You ultimately preferred the consistent Share wording, specifically the imperative Share, not Shared.

That creates three recognisable actions, each with a different purpose.

## 4. The three signature sharing actions

## Share Experiences

Do something together.

The profile owner shares an event or activity they're already attending and invites others to join.

Example: "I'm going to London Product Meetup next Thursday. Fancy joining?"

A visitor can express interest in joining. Hi-Again records that one-off interaction without requiring a messaging conversation.

## Share Ideas

Start an interesting conversation.

The profile owner poses a question or conversation starter.

Example: "What's one product everyone loves that you think is overrated?"

A visitor submits a single answer. The owner receives the contribution privately, and the visitor can be prompted to connect on LinkedIn.

No chat thread is created.

## Share Value

Help each other grow.

The profile owner offers something useful: advice, expertise, feedback, introductions or resources.

Example: "Happy to give feedback on your startup idea."

A visitor can make a specific one-off request, which the owner can review and potentially follow up on externally.

### Why these three work together

They cover three complementary ways to build a relationship:

- Experiences create shared memories and opportunities to meet.
- Ideas reveal personality, interests and intellectual compatibility.
- Value creates reciprocity, trust and practical reasons to stay in touch.

These aren't just generic links or contact buttons. They're invitations to participate.

### Fixed structure versus customisation

You expressed a preference for a fixed three-part structure, rather than allowing users to choose any three unrelated CTA categories.

That gives Hi-Again a consistent, recognisable experience.

The proposed model is that everyone has the same three sections, but customises their content: which event they're attending, what question they're asking and what value they're offering.

The exact limits on how many events, prompts or offers can be active at once haven't been settled.

## 5. Again — the fourth, separate interaction

Again is the app's signature expression of interest in reconnecting.

It's inspired by the mutual-interest mechanic found in dating apps, adapted for professional and social networking.

The agreed concept:

1. You visit someone's profile and privately indicate that you'd like to meet them again.
2. The other person can independently indicate the same.
3. Neither person's interest is revealed unless it's reciprocated.
4. Once mutual, Hi-Again reveals the shared interest and encourages a next step.

The button itself must be visible to both people; it's the interest signal that remains private until mutual.

Again is deliberately separate from the three sharing actions. Someone might enjoy answering a question without wanting to meet again, or want to reconnect without having submitted a contribution.

The mutual-interest experience should lead to an external contact method, event or meeting — not a new Hi-Again chat.

## 6. No native messaging

This is an important product boundary that we reached later in the discussion.

You were concerned that native messaging would introduce substantial complexity around data storage, privacy, controls, moderation and notification infrastructure, while effectively reinventing LinkedIn.

We therefore moved towards one-off, structured interactions.

| Feature                       | Decision            |
| ----------------------------- | ------------------- |
| Native direct messages        | Excluded            |
| Ongoing chat threads          | Excluded            |
| Inbox-style messaging         | Excluded            |
| One-off question answers      | Included in concept |
| Event-interest submissions    | Included in concept |
| Requests for help or feedback | Included in concept |
| Private mutual Again interest | Included in concept |
| External LinkedIn handoff     | Preferred           |

The guiding principle is:

Hi-Again creates the opportunity. Existing platforms handle the conversation.

For example, after someone answers a Share Ideas prompt, they see a confirmation and an option to connect on LinkedIn.

The profile owner sees that contribution in Hi-Again, but doesn't reply through a native messaging thread.

This is still user-generated data, so privacy, retention and basic abuse controls will be necessary. But the scope is considerably smaller than operating a messaging service.

We also explored opening LinkedIn messaging with a prefilled template. Because LinkedIn doesn't provide a generally supported public mechanism for reliably opening a particular conversation with a prefilled message, we decided not to depend on that.

## 7. Authentication — LinkedIn first, extensible later

Latest decision

After considering several alternatives, the current decision is:

LinkedIn-only authentication for the MVP, with an architecture that makes adding Google and other authentication providers straightforward later.

This supersedes earlier proposals for Google-only or LinkedIn-plus-Google sign-in.

The reasoning is audience fit. Your first users already use LinkedIn professionally, so a single LinkedIn sign-in option makes onboarding feel natural and keeps the interface simple.

### Authentication requirements

| Requirement                   | Decision                                               |
| ----------------------------- | ------------------------------------------------------ |
| MVP sign-in                   | LinkedIn only                                          |
| Google sign-in                | Not at launch; easy to add later                       |
| Other authentication methods  | Architecturally supported later                        |
| Guest profile viewing         | No sign-in required                                    |
| Account creation              | Minimal, using permitted LinkedIn identity data        |
| Manual name entry             | Avoid; use provider identity data                      |
| Internal account ID           | Independent of LinkedIn                                |
| Multiple linked providers     | Supported by account model                             |
| Preserve drafts through login | Required                                               |
| Account merging               | Explicit, secure linking; not automatic email matching |

A key distinction: LinkedIn Sign-In can provide basic identity information subject to permissions, but it does not automatically grant access to the user's connection graph, messaging or full professional history.

### Proposed identity model

Hi-Again account

Permanent internal user ID

LinkedIn

MVP

Google

Later

Others

Later

One permanent Hi-Again profile

QR · Sharing actions · Contributions · Again

Using a stable internal user ID is essential. If someone signs in with LinkedIn today and adds Google later, they should retain their profile, saved people and interactions.

The actual LinkedIn OAuth configuration and identity-provider support still need technical verification before implementation.

## 8. QR codes and frictionless onboarding

This has been a consistent priority from the beginning.

Scanning someone's QR code must immediately open their profile.

There should be no compulsory registration wall just to see who someone is or what they're sharing.

### Visitor journey

1\. Scan

Open the permanent, shareable Hi-Again profile URL using the phone's camera.

2\. Explore

View the person's introduction, LinkedIn link, three sharing actions and Again button.

3\. Act first

Choose an event, compose an answer or describe a request for help before being interrupted by sign-in.

4\. Authenticate when necessary

Use LinkedIn Sign-In for an identity-dependent action. Preserve the visitor's draft and intended action.

5\. Complete and continue

Submit the one-off interaction, show confirmation and offer an appropriate next step.

### Saving profiles before signing in

We also discussed a common conference scenario: someone scans ten profiles but doesn't want to register while they're networking.

The proposed solution is a guest collection:

- Anonymous visitors can save scanned profiles in local browser storage.
- The collection persists in that browser until cleared or otherwise lost.
- When the visitor eventually signs in, Hi-Again can import those saved profiles into their account.

This avoids requiring people to register before they've experienced the product's value.

It also means we don't need a universal connection-request flow.

An important earlier decision was to scrap the bulk profile-exchange/request system. It felt too much like rebuilding LinkedIn.

Hi-Again should distinguish between saving someone privately, interacting with them and expressing mutual interest through Again. These aren't the same thing.

## 9. Profiles and user identity

The proposed public profile is intentionally lightweight.

# Alex Chen

Product Manager · London

Building better financial products. Always interested in meeting curious people.

Fintech

Product

Let's...

&#x20;Share Experiences

Join me at London Product Meetup

&#x20;Share Ideas

What's one product you'd redesign?

&#x20;Share Value

Happy to review your startup idea

Again

I'd like to meet again

### Profile information discussed

The profile may include a name, photo, brief introduction, professional description, optional interests, LinkedIn profile link, three configured sharing actions, and a permanent QR code.

The emphasis is on what someone can do with you, rather than an exhaustive professional résumé.

We also discussed generating a minimal starter profile immediately after authentication, with customisation optional rather than mandatory.

## 10. People, interactions and follow-ups

An earlier design explored three lightweight organisational areas.

| Area         | Purpose                                                          | Status                        |
| ------------ | ---------------------------------------------------------------- | ----------------------------- |
| People       | Saved profiles and people you've interacted with                 | Strong working proposal       |
| Interactions | Record of specific shared experiences, ideas and value exchanges | Strong working proposal       |
| Follow-ups   | Reminders and next steps for reconnecting                        | Proposed; MVP scope undecided |

A central design principle was action before administration.

The user should not have to fill in an encounter form, add tags or write notes before doing something meaningful.

Instead:

Scan → Act → Record context automatically → Optionally add notes later.

Potential automatically recorded information includes the person involved, interaction type, timestamp and associated event.

A person can have multiple interactions over time. Their relationship history should not be reduced to a single connection record.

### Context and calendar integration

We explored using calendar permissions to suggest where people met, recognise shared event attendance and support future follow-ups.

Examples include noticing that two acquaintances plan to attend the same conference, or offering to add a follow-up to a calendar.

These remain future possibilities, not committed MVP requirements.

Similarly, voice notes, AI follow-up suggestions, wallet passes and weekly digests were ideas discussed, not agreed launch features.

## 11. Technical direction

The working stack discussed earlier was:

| Layer                    | Proposed technology                             |
| ------------------------ | ----------------------------------------------- |
| Frontend                 | Next.js                                         |
| Database/backend         | Supabase                                        |
| Authentication           | LinkedIn OAuth, provider-agnostic account model |
| Delivery                 | Mobile-first responsive web app / PWA           |
| Profile sharing          | Permanent URLs and QR codes                     |
| Guest profile collection | Browser-local storage                           |
| Interaction storage      | Structured records, not chat threads            |
| External networking      | LinkedIn profile handoff                        |

This is a proposed architecture, rather than a finalised implementation.

The key technical requirements are more important than the precise frameworks: modular authentication, minimal data collection, reliable QR navigation, secure access to private contributions, and preservation of in-progress actions through login.

## 12. Design direction

You responded positively to the minimalist wireframes we developed.

The emerging visual style is:

- Clean, white or light-neutral mobile screens.
- Rounded cards and straightforward typography.
- Three visually recognisable sharing sections.
- Subtle colour differentiation: blue for Experiences, green for Ideas, and pink for Value.
- Again as a separate, quieter relationship action.
- Simple navigation and minimal forms.

The latest interactive prototype also demonstrated a profile, each sharing action, one-off submission confirmations, a People view and a simulated mutual Again state.

The prototype was illustrative; it wasn't a functioning backend or LinkedIn integration.

## 13. Decisions that have changed

Some earlier discussions reached conclusions that we've since deliberately replaced. These shouldn't be carried forward into the MVP specification.

| Earlier direction                         | Current direction                               |
| ----------------------------------------- | ----------------------------------------------- |
| LinkedIn + Google sign-in                 | LinkedIn only at launch, extensible later       |
| Google-only sign-in                       | Superseded                                      |
| Choose any three CTAs                     | Three fixed Share categories                    |
| Join · Ask · Help · Meet · See            | Superseded by Share Experiences · Ideas · Value |
| Invite · Discuss · Offer                  | Superseded as user-facing labels                |
| Exchange profiles / connection requests   | Removed                                         |
| Native conversations or messaging         | Removed                                         |
| LinkedIn prefilled messaging as core flow | Avoid relying on unsupported integration        |
| Mandatory context or encounter forms      | Action first, optional context later            |
| Portfolio as a signature action           | Normal profile link or section instead          |
| Public discussion threads                 | Private one-off contributions                   |

## 14. Outstanding decisions

These are the areas I would still consider genuinely open, rather than settled.

Product questions to resolve

0/8 reviewed

What happens after a contribution?

Does the recipient get an email notification, in-app activity entry, or both?

How is Share Experiences fulfilled?

Is Hi-Again merely recording interest, or also facilitating event registration and attendance?

How does Share Value conclude?

Can the owner acknowledge or decline a request without creating a messaging workflow?

What happens after mutual Again?

Which contact information is revealed, and what does the next-step interface look like?

How much content can users configure?

One active item per Share category, or multiple events, prompts and offers?

What is the minimum MVP navigation?

Just Profile and People, or also Activity and Follow-ups?

How are profiles saved?

Guest local collection, signed-in bookmarks, and their eventual syncing rules.

How will the brand/domain be finalised?

Hi-Again naming and domain choice, plus trademark and existing-app checks.

One naming detail to preserve: both `hi-again.link` and `hiagain.link` appeared in earlier discussions, with the latter emerging as a preference in one naming conversation. I would treat the final domain as unconfirmed. We also discussed an existing HiAgain-branded app and similar services, so the name's legal and commercial availability has not been established.

## 15. Recommended MVP boundary

Based on all our decisions, I would define the first real release as follows.

Core MVP

LinkedIn authentication, permanent QR profiles, public guest viewing, three configurable Share sections, one-off contributions, private mutual Again interest, saved people and basic contribution viewing.

Potential next phase

Calendar integration, richer follow-up management, event-attendance discovery, smarter reminders, additional sign-in providers and improved relationship context.

Deliberately outside scope

Native messaging, LinkedIn-style connection requests, social feeds, follower counts, social-graph imports, elaborate profile verification and a full CRM.

## 16. The product thesis in one paragraph

Hi-Again — Don't just meet. Meet again.

Hi-Again is a LinkedIn-first networking companion that helps people turn brief real-world encounters into lasting relationships. Through a simple QR profile, people can Share Experiences by inviting others to events, Share Ideas through thought-provoking questions, and Share Value by offering knowledge, feedback or help. A separate, private Again feature allows two people to express mutual interest in reconnecting. Rather than becoming another social network or messaging platform, Hi-Again focuses on initiating meaningful interactions and helping relationships continue through the tools people already use.

### My assessment

The most important evolution in these discussions has been moving away from a general-purpose networking app towards a specific interaction model.

You now have four elements that reinforce one another:

A clear problem: People meet, connect on LinkedIn, and never interact again.

A memorable brand: Don't just meet. Meet again.

A recognisable mechanism: Share Experiences. Share Ideas. Share Value.

A focused product boundary: Facilitate the next interaction without owning the entire relationship or conversation.

That's the foundation I'd carry into the product specification and implementation.&#x20;