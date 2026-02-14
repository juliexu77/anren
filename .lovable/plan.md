

# Mom Brain — Your Smart Thought Capture App

A mobile-first "better Apple Notes" that catches your half-formed thoughts, screenshots, and voice memos and turns them into organized, beautiful cards.

## Design & Aesthetic
- **Light glass morphism** inspired by Aster's card-based layout — soft whites, frosted glass cards with subtle shadows, rose-gold and warm pastel accents
- **Fonts**: DM Sans (body) + Playfair Display (headers) — elegant but readable
- **Card grid layout** like Aster's Cosmos tiles — tappable cards in a responsive masonry/grid
- **Mobile-first** with a bottom tab navigation bar

## Tab Structure
1. **Brain Dump** (main tab) — Your card feed, organized by category
2. **Calendar** (placeholder tab) — Empty state with "Connect Google Calendar" prompt, ready for future integration

## Card Capture Methods
- **📸 Screenshot → Smart Card**: Upload or take a screenshot, AI reads it and extracts structured info (event details, recipe steps, to-do items, etc.) into a categorized card
- **✏️ Quick Text Note**: Tap to jot a half-formed thought — title optional, just start typing
- **🎙️ Voice Memo → Card**: Record a voice note, it gets transcribed and turned into a card

## Smart Card Features
- **Auto-categorization**: AI automatically tags cards into categories like Events, Tasks, Ideas, Recipes, Shopping, Kids, etc.
- **Category pills/filters** at the top of the feed to filter by type
- **Tap to expand & edit**: Tap any card to open it full-screen, edit text, change category, add notes
- **Card previews**: Each card shows a summary snippet, category badge, and timestamp

## Card Editing
- Tap into any card to edit title, body, category
- Add additional notes or context after creation
- Delete cards with swipe or from detail view

## Data Storage (v1)
- **localStorage** for all card data — no login required
- Architecture designed for easy migration to a cloud backend later

## AI Integration
- Powered by **Lovable AI** (via edge function) for screenshot parsing and auto-categorization
- Note: This will require enabling Lovable Cloud when we implement the AI features

## Future-Ready Design Decisions
- Tab bar accommodates adding a Calendar tab with Google Calendar integration
- Card data model includes fields for calendar event linking
- Component architecture supports a future Chrome extension companion

