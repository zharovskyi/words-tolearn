# Spec Delta

## Purpose

Defines the fixed review schedule, the daily queue of due words, and how review outcomes move a word between levels.

## ADDED Requirements

### Requirement: Fixed level schedule
The system SHALL assign each active entry a level from 0 to 4. A new entry starts at level 0 and is due on the day it was added. Passing a review at level N schedules the entry at level N+1 for: level 1 → 1 day later, level 2 → 2 days later, level 3 → 14 days later, level 4 → 60 days later, counted from the review date.

#### Scenario: Pass at level 0
- **WHEN** the user passes a level 0 entry on 2026-10-01
- **THEN** the entry is level 1 and due 2026-10-02

#### Scenario: Pass at level 2
- **WHEN** the user passes a level 2 entry on 2026-10-03
- **THEN** the entry is level 3 and due 2026-10-17

#### Scenario: Pass at level 3
- **WHEN** the user passes a level 3 entry on 2026-10-17
- **THEN** the entry is level 4 and due 2026-12-16

#### Scenario: Overdue review
- **WHEN** an entry due 2026-10-02 is passed on 2026-10-09 at level 1
- **THEN** its next due date is 2026-10-11, counted from the review date, not the original due date

### Requirement: Completing the final level archives the word
Passing a review at level 4 SHALL archive the entry instead of scheduling another review.

#### Scenario: Final pass
- **WHEN** the user passes a level 4 entry
- **THEN** the entry is archived with reason "completed" and has no due date

### Requirement: Failed review resets the word
A failed review SHALL set the entry to level 0 and due the same day, so it reappears in the current session.

#### Scenario: Fail at level 3
- **WHEN** the user fails a level 3 entry
- **THEN** the entry is level 0 and due today

### Requirement: Daily review queue
The system SHALL provide a dashboard listing every active, enriched entry whose due date is today or earlier, ordered by due date ascending (most overdue first), with the count of remaining reviews. "Today" MUST be evaluated in the configured application time zone.

#### Scenario: Mixed due dates
- **WHEN** entries are due yesterday, today and tomorrow
- **THEN** the queue shows the yesterday entry first, then the today entry, and not the tomorrow entry

#### Scenario: Nothing due
- **WHEN** no entries are due
- **THEN** the dashboard shows an empty-state message and the date of the next scheduled review

### Requirement: Review interaction
The review mode SHALL show the English word first, let the user reveal the translation and examples, and then record "Remembered" or "Forgot".

#### Scenario: Reveal and answer
- **WHEN** the user reveals the answer and selects "Remembered"
- **THEN** the outcome is applied per the schedule and the next due entry is shown

### Requirement: Only due entries can be reviewed
The system MUST reject a review submission for an entry that is not active or not yet due, and MUST apply each submission at most once.

#### Scenario: Not yet due
- **WHEN** a review is submitted for an entry due tomorrow
- **THEN** the submission is rejected and the entry is unchanged

#### Scenario: Double submit
- **WHEN** the same pass is submitted twice in quick succession
- **THEN** the entry advances only one level

### Requirement: Review history
The system SHALL record each applied review with its time, outcome, previous level, resulting level and resulting due date.

#### Scenario: History written
- **WHEN** a review is applied
- **THEN** a history record with those values exists for the entry
