# Autonomous programme execution

**For:** Manuel / EMA — **you do not need to type “continue.”**

## How blocks run

1. Agent reads [`PROGRAMME_EXECUTION_STEPS.md`](./PROGRAMME_EXECUTION_STEPS.md) + [`BLOCK_DISCIPLINE_60MIN.md`](./BLOCK_DISCIPLINE_60MIN.md).  
2. Executes **one outcome** per block; **one themed commit** when docs/code ship.  
3. Writes [`BLOCK_REVIEW_*.md`](./) — your review is **optional**, batch when rested.  
4. **No new government web UI** until **R1 §9** is signed (steering checkbox).  
5. **Backend/mobile** only when block type = Build and R1 not blocking that slice.

## What you might see on GitHub

| Pattern | Meaning |
|---------|---------|
| `docs(study):` | International / principles |
| `docs(design):` | IA, verification, wireframes |
| `docs(data):` | Corpus metadata, import plans |
| `feat:` | Implementation (after design gate) |

## Single review path when you return

1. Latest `BLOCK_REVIEW_*.md` (newest date in filename)  
2. [`PROGRAMME_EXECUTION_STEPS.md`](./PROGRAMME_EXECUTION_STEPS.md) checkboxes  
3. Steering ticks: twinning, R1 sign-off, LDN-NAT-ALL Q1–Q2  

## Stop conditions (agent pauses without you)

- EMA steering answer required for **Area units** or **CEID join** before polygon load  
- R1 unsigned and task would be “new web shell”  
- Missing secrets for production Supabase apply (documents SQL only)