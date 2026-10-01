# Spec Delta

## Purpose

Defines the automatic generation of a Ukrainian translation and contextual example sentences for each added word, and how failures are surfaced and recovered.

## ADDED Requirements

### Requirement: Enrich a word on creation
When an entry is added, the system SHALL generate one Ukrainian translation and between 2 and 3 distinct English example sentences showing the word or phrase used in context, and store them with the entry.

#### Scenario: Successful enrichment
- **WHEN** the user adds "reluctant"
- **THEN** the entry is stored with a non-empty Ukrainian translation and 2 or 3 distinct example sentences, and its enrichment state is "ready"

### Requirement: Validate generated content
The system SHALL accept generated content only if the translation is non-empty, there are 2 to 3 examples, every example is non-empty, at most 200 characters, and no two examples are identical. Invalid output MUST be treated as an enrichment failure.

#### Scenario: Model returns one example
- **WHEN** the model response contains only one example sentence
- **THEN** the content is rejected and the entry's enrichment state becomes "failed"

### Requirement: Entry survives enrichment failure
The system MUST persist the entry before requesting enrichment. If enrichment fails (provider error, timeout after 30 seconds, invalid output, missing API key), the entry SHALL remain with state "failed", a user-visible error message, and no translation or examples.

#### Scenario: Provider unavailable
- **WHEN** the AI provider returns an error while a word is being added
- **THEN** the word is still in the list, marked "enrichment failed", with a Retry control

### Requirement: Retry enrichment
The system SHALL let the user retry enrichment for an entry in the "failed" state. A successful retry MUST fill in the translation and examples without changing the entry's level or due date.

#### Scenario: Retry succeeds
- **WHEN** the user retries a failed entry and the provider responds validly
- **THEN** the entry becomes "ready" with translation and examples

### Requirement: Failed entries are not reviewed
Entries whose enrichment is not "ready" SHALL NOT appear in the daily review queue.

#### Scenario: Failed entry due today
- **WHEN** a failed entry is due today
- **THEN** it is absent from the review queue until enrichment succeeds

### Requirement: Keep credentials server-side
The AI provider key and all provider calls MUST remain on the server; the key MUST NOT be sent to the browser.

#### Scenario: Client bundle inspected
- **WHEN** the production client bundle is inspected
- **THEN** it contains no provider key and no direct provider calls

### Requirement: Correct spelling mistakes
When enriching, the system SHALL also obtain a corrected spelling of the entered text and store the corrected text instead of the typed one, only if the change is small (a typo fix: at most 2 characters or 30% of the length, whichever is larger). A word that is already spelled correctly MUST be left unchanged. The user MUST be told when the text was changed.

#### Scenario: Typo is corrected
- **WHEN** the user adds "aple"
- **THEN** the entry is stored as "apple" with its translation, and the user sees that "aple" was corrected to "apple"

#### Scenario: Correction would replace the word with a different one
- **WHEN** the model suggests a text that differs from the input by more than the allowed amount
- **THEN** the suggestion is ignored and the text stays as typed

### Requirement: Corrected spelling that already exists
If the corrected spelling matches an existing entry, the system MUST NOT create a new entry and SHALL tell the user which existing word they probably meant, offering restore when that entry is archived.

#### Scenario: Corrected word is already in the list
- **WHEN** "apple" exists and the user adds "aple"
- **THEN** no new entry is kept and the user is told the word already exists as "apple"
