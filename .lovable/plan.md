

# Smarter "Thinking Partner" with Research

## Current State

The "thinking partner" suggestion shown in `CardDetailSheet` comes from the `smart-reorder` edge function -- it's a brief nudge generated during the "Help me get organized" flow. It has no web research capability and only sees the card's title/body.

## Proposed Design

Add a **"What's my next step?"** button inside each card's detail view. When tapped, it calls a new edge function that:

1. Takes the card's title, body, and type
2. Uses AI (Gemini 2.5 Flash) to reason about what the logical next step is
3. Optionally does web research via Perplexity (if connected) to ground the suggestion in real information -- e.g. looking up business hours, finding relevant links, checking prices
4. Returns a richer, more actionable suggestion that replaces the current thinking partner area

The user explicitly triggers this per card (not automatic), keeping costs controlled and making it feel intentional.

## Architecture

### New Edge Function: `research-next-step`

- Accepts `{ title, body, type, cardId }`
- Two-phase approach:
  - **Phase 1 (always)**: AI reasons about the card content and suggests a concrete next step with any research queries it would want answered
  - **Phase 2 (if Perplexity connected)**: Runs those queries through Perplexity search, then synthesizes a grounded answer
  - **Fallback**: If no Perplexity, just returns the AI's best reasoning without web grounding
- Returns `{ suggestion: string, sources?: string[] }`

### Frontend Changes

**`CardDetailSheet.tsx`**:
- Add a "What's my next step?" button (using the ✦ icon) above the "Add to Calendar" button
- On tap, shows a loading state, calls the edge function
- Displays the result in the existing thinking partner card area, replacing any prior suggestion
- If sources are returned, show them as small linked references

**`Index.tsx`**:
- Add state + handler for per-card research suggestions
- These persist in local state (same pattern as current `suggestions` record)

### Without Perplexity

The feature works without the Perplexity connector -- the AI will still reason about the card and suggest a next step based on its knowledge. If the user later connects Perplexity, research becomes grounded in real-time web data.

## Files to Create/Edit

1. **Create** `supabase/functions/research-next-step/index.ts` -- new edge function
2. **Edit** `supabase/config.toml` -- register function with `verify_jwt = false`
3. **Edit** `src/components/CardDetailSheet.tsx` -- add "What's my next step?" button and display
4. **Edit** `src/pages/Index.tsx` -- add state management for research suggestions

