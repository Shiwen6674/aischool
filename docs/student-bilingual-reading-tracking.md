# Student Bilingual Reading Tracking

This contract is used by `student_science_bilingual.html` for science bilingual reading analytics and lightweight reading checks.

## Target Spreadsheet

- Spreadsheet ID: `1cDOsaa7E0EwD1R9CeCWoGf8_9ZMcFv8fxQ5d-LWUKu8`
- Recommended worksheet: `BilingualReadingEvents`
- Frontend endpoint key: `studentBilingualTracking` in `assets/js/aischool-shared.js`

## Event Names

- `page_enter`
- `page_leave`
- `unit_selected`
- `unit_leave`
- `unit_completed`
- `reading_progress`
- `block_played`
- `term_clicked`
- `vocab_spoken`
- `mode_changed`
- `voice_changed`
- `quick_check_started`
- `quick_check_answered`
- `quick_check_completed`

## Columns

Use these columns in the receiving worksheet. The Apps Script example at `docs/examples/student-bilingual-tracking-proxy.gs` creates them automatically.

```text
timestamp
schema_version
client_time
session_id
student_id
student_name
studentId
studentName
account
userName
event
stage
grade
version
publisher
semester
unit
unitName
mode
language
detail
value
duration
page
block_index
block_role
text_length
progress_percent
check_total
check_answered
check_correct
question_index
selected_answer
correct_answer
score_percent
extra_json
```

## Analytics Uses

- Reading progress: group by `session_id`, `unitName`, and `reading_progress`.
- Time on task: use `unit_leave.duration` and `page_leave.duration`.
- Reading behavior: use `block_played.block_role` to see whether students listen to titles, paragraphs, captions, or tables.
- Vocabulary engagement: count `term_clicked` and `vocab_spoken`.
- Formative assessment: use `quick_check_answered`, `quick_check_completed`, `score_percent`, and `selected_answer`.
- Content diagnosis: compare wrong answers by `unitName`, `question_index`, and `correct_answer`.
