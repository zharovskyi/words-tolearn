# word-archive Specification

## Purpose
Defines how learned words leave the active learning loop and how users can find or bring them back.

## Requirements

### Requirement: Manually mark as learned
The system SHALL let the user mark any active entry as "Learned", archiving it immediately with reason "manual".

#### Scenario: Mark learned
- **WHEN** the user marks a level 1 entry as Learned
- **THEN** the entry leaves the active list and review queue and appears in the archive

### Requirement: Archived entries are inactive
Archived entries MUST NOT appear in the review queue or active list and MUST have no due date.

#### Scenario: Archived entry excluded
- **WHEN** the review queue is computed
- **THEN** no archived entry is included

### Requirement: Browse the archive
The system SHALL provide an archive view listing archived entries with translation, examples, archive date and reason, newest first.

#### Scenario: Archive listed
- **WHEN** the user opens the archive
- **THEN** each archived entry shows its text, translation, examples, archive date and reason

### Requirement: Restore from archive
The system SHALL let the user restore an archived entry, returning it to level 0 and due today.

#### Scenario: Restore
- **WHEN** the user restores an archived entry
- **THEN** it is active at level 0, due today, and its archive date and reason are cleared
