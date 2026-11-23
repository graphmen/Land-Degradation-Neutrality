# Steering pack — Word export (meeting attach)

**Requires:** `pip install python-docx`

```powershell
npm run export:steering-docx
```

Outputs (gitignored): `exports/steering-docx/*.docx`

| Source markdown | Word file |
|-----------------|-----------|
| R1_STEERING_SIGN_OFF_PACK | Facilitation + §9 sign-off |
| STEERING_GIS_SO1_DECISION_PACK | Q1/Q2 + S10–S12 |
| STEERING_MEETING_QUICK_BRIEF | 30 min brief |
| STEERING_DECISIONS_QUEUE | S1–S12 |
| EMA_STEERING_ONE_PAGER | Summary |
| ZIMBABWE_DIFFERENTIATOR_STEERING_ONE_PAGER | Ministerial one-pager |

Converter: root [`convert_to_docx.py`](../convert_to_docx.py).