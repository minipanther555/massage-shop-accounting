# S3_Isolation - Proximal Cause Analysis

**Timestamp**: 2024-09-17  
**Trace**: TRACE4  
**Status**: COMPLETE - Proximal cause identified

## Toggle Matrix Results

| Test | Idempotent | Single-Flight | Result | Options | Unique | Status |
|------|------------|---------------|--------|---------|--------|--------|
| A: Base case | ❌ | ❌ | 7 options | 7 | 4 | ❌ RED |
| B: +Idempotent only | ✅ | ❌ | 4 options | 4 | 4 | ✅ GREEN |
| C: +Single-flight only | ❌ | ✅ | 7 options | 7 | 4 | ❌ RED |
| D: +Both | ✅ | ✅ | 4 options | 4 | 4 | ✅ GREEN |
| E: Stress test (50 calls) | ✅ | ✅ | 4 options | 4 | 4 | ✅ GREEN |

## Proximal Cause Identified

**Root Cause**: Non-idempotent DOM manipulation using `innerHTML +=` pattern

**Evidence**:
- Test B (idempotent only) fixes the issue completely
- Test C (single-flight only) does NOT fix the issue
- The problem is in the DOM manipulation, not API concurrency

**Mechanics**:
1. First call: `innerHTML = '<option>default</option>'`
2. Second call: `innerHTML += '<option>Alice</option><option>Bob</option><option>Charlie</option>'`
3. Result: Duplicate options because `+=` appends to existing content

**Fix Required**: Replace `innerHTML +=` with idempotent render pattern:
- Clear dropdown first: `innerHTML = ''`
- Build options in document fragment
- Replace all children: `replaceChildren(fragment)`

## Next Steps
- S4_Fix: Apply idempotent render pattern to `web-app/staff.ejs`
- Single-flight guard is optional but recommended for performance
- Focus on the DOM manipulation fix as the primary solution
