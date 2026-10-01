# app-navigation Specification

## Purpose
Defines how the user moves between the parts of the app and learns the rules of the learning schedule.

## Requirements

### Requirement: Global navigation
Every page SHALL show a header with links to Add Word, Review, Archive and How it works, and the link of the current page MUST be visually highlighted and marked as the current page for assistive technology.

#### Scenario: Active link on the review page
- **WHEN** the user opens the Review page
- **THEN** the header shows all four links and only "Review" is highlighted as current

### Requirement: How it works page
The system SHALL provide a page that explains how to use the app: adding words, the review routine, the meaning of Remembered and Forgot, the level schedule with its intervals, and the rules for archiving, restoring and deleting.

#### Scenario: Rules are visible
- **WHEN** the user opens "How it works"
- **THEN** the page shows the level table (0 today, 1 +1 day, 2 +2 days, 3 +14 days, 4 +60 days, then archive) and the Remembered/Forgot rules
