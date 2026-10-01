# Project: English Vocabulary Spaced Repetition App

## 1. Goal
Create a Next.js web application for learning English words and phrases using a Spaced Repetition System (SRS). When a user adds a word, the app automatically fetches its Ukrainian translation and generates 2-3 contextual example sentences. 

## 2. Core Features
- **Add a Word/Phrase:** A simple input field to add new vocabulary.
- **AI Enrichment:** Upon adding a word, the app calls an LLM API (e.g., OpenAI or Anthropic API) to automatically generate:
  - Accurate Ukrainian translation.
  - 2 to 3 distinct sentences showing how the word is used in context.
- **Spaced Repetition System (SRS):** 
  - Words need to be reviewed based on a strict schedule.
  - Custom intervals: 
    - Level 0: Today (Initial learning)
    - Level 1: Next day (+1 day)
    - Level 2: The day after (+2 days)
    - Level 3: In 2-3 weeks (+14 to 21 days)
    - Level 4: In 2 months (+60 days)
- **Review Mode:** A daily dashboard showing words scheduled for review today.
- **Archiving:** Once a word passes the final stage (or is manually marked as "Learned"), it is moved to an "Archive" and removed from the active learning loop.

## 3. Tech Stack
- Framework: Next.js (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Database: SQLite 
- ORM: Prisma (or Drizzle)
- AI Integration: Server Actions with AI SDK (to fetch translations & context)