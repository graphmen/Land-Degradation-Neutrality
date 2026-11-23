# Steering pack — Word export (meeting attach)

**Requires:** `pip install python-docx`

```powershell
npm run export:steering-docx
```

Outputs (gitignored): `exports/steering-docx/*.docx`

| Source markdown | Word file |
|-----------------|-----------|
| R1_STEERING_SIGN_OFF_PACK | Facilitation + §9 sign-off |
| STEERING_S1_S2_DECISION_PACK | Code lists + Supabase A+B |
| STEERING_GIS_SO1_DECISION_PACK | Q1/Q2 + S10–S12 |
| STEERING_Q2_CEID_WORKSHOP_ONE_PAGER | GIS 15 min CEID segment |
| CEID_UNMATCHED_STUDY | 54 unmatched taxonomy |
| CEID_JOIN_QC | Join QA summary |
| CEID_ALIAS_REGISTER | Alias schema (Q2) |
| S2_APPLY_PREFLIGHT | Local preflight (`backend/`) |
| SUPABASE_S2_STEERING_RUNBOOK | DBA phased apply |
| STEERING_MEETING_QUICK_BRIEF | 30 min brief |
| STEERING_DECISIONS_QUEUE | S1–S12 |
| EMA_STEERING_ONE_PAGER | Summary |
| ZIMBABWE_DIFFERENTIATOR_STEERING_ONE_PAGER | Ministerial one-pager |
| R1_API_DEMO_SCRIPT | Live API walkthrough |
| R1_CHAIR_RUN_OF_SHOW | Minute-by-minute facilitation |
| PROGRAMME_SESSION_SUMMARY_2026-11-23 | Day summary for leadership |
| corpus/CORPUS_QC_LINEAGE | QC script index |

Converter: root [`convert_to_docx.py`](../convert_to_docx.py).