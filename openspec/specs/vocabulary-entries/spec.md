# vocabulary-entries Specification

## Purpose
Defines how a learner adds, views and removes English words or phrases that they want to study.

## Requirements

### Requirement: Add a word or phrase
The system SHALL let the user add an English word or phrase through a single text input. The text MUST be trimmed, MUST be between 1 and 100 characters after trimming, and MUST NOT be empty.

#### Scenario: Valid word is added
- **WHEN** the user submits "run out of"
- **THEN** a new entry is created at level 0 and due today, and it appears in the active word list

#### Scenario: Empty or whitespace-only input
- **WHEN** the user submits an empty or whitespace-only value
- **THEN** no entry is created and a validation message is shown

#### Scenario: Input too long
- **WHEN** the user submits text longer than 100 characters
- **THEN** no entry is created and a validation message is shown

### Requirement: Reject duplicate entries
The system SHALL treat entries as duplicates when their text is equal after trimming, collapsing internal whitespace and lower-casing. A duplicate MUST NOT be created, regardless of whether the existing entry is active or archived.

#### Scenario: Duplicate of an active word
- **WHEN** "Ambiguous" exists and the user submits "  ambiguous "
- **THEN** no new entry is created and the user is told the word already exists

#### Scenario: Duplicate of an archived word
- **WHEN** "ambiguous" exists in the archive and the user submits "ambiguous"
- **THEN** no new entry is created and the user is offered to restore the archived entry

### Requirement: List active words
The system SHALL show all non-archived entries with their translation, example sentences, current level and next review date, newest first.

#### Scenario: Entries listed
- **WHEN** the user opens the word list
- **THEN** each active entry shows its text, translation, examples, level and next review date

### Requirement: Delete a word
The system SHALL let the user permanently delete an entry, including its examples and review history, after a confirmation.

#### Scenario: Delete confirmed
- **WHEN** the user confirms deletion of an entry
- **THEN** the entry, its examples and its review history are removed

#### Scenario: Delete cancelled
- **WHEN** the user cancels the confirmation
- **THEN** nothing is removed
