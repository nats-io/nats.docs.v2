# Style Guide Update Summary

## Core Philosophy: Teaching NATS as Layered Concepts

**The Key Insight:** NATS is elegantly built in layers, each concept building on simpler ones beneath it. Documentation should reveal this architecture to create deep understanding.

**The Foundation Stack:**
1. **Pub/Sub** → The foundation
2. **Request/Reply** → Pub/Sub + reply subject
3. **Queue Groups** → Pub/Sub + load balancing
4. **JetStream** → Request/Reply + server that persists
5. **KV Store** → JetStream + key-value abstraction
6. **Object Store** → JetStream + object abstraction

**Goal:** Users should understand "it's all pub/sub underneath" and be able to reason about how NATS works, not just copy commands.

## Changes Made

### 1. Rewrote CLAUDE.md for LLM Clarity

**Old Format:** Narrative, descriptive documentation
**New Format:** Explicit, imperative rules with DO/DON'T examples

#### Key Improvements:

**Rule Categories:**
- 🔴 **MUST Rules** - Breaking these is wrong (e.g., CLI must be default tab)
- 🟡 **SHOULD Rules** - Best practices (e.g., include 3+ languages)
- 🟢 **MAY Rules** - Optional enhancements
- ⛔ **NEVER Rules** - Absolutely forbidden (e.g., images for code)

**Visual Clarity:**
- ✅ ❌ symbols for correct/incorrect examples
- Side-by-side code comparisons
- Decision trees for common scenarios
- Validation checklists

**Structure:**
```
CLAUDE.md (347 lines)
├── MUST Rules (Code Examples)
│   ├── Tab Structure (with examples)
│   └── Language Order (with checklist)
├── SHOULD Rules (Best Practices)
│   ├── Code Examples
│   ├── Interactive Animations
│   └── Writing Style
├── MAY Rules (Optional)
├── NEVER Rules
├── Technical Reference
│   ├── Code Examples System
│   ├── Interactive Animations (NatsFlow)
│   └── Development Workflow
├── Architecture Quick Reference
├── Quick Validation Checklist
├── Formatting Standards
└── Documentation Subagent Usage
```

### 2. Created Documentation Subagent

**Location:** `.claude/subagents/nats-docs-writer.json`

**Purpose:** Enforces documentation standards automatically

**Features:**
- Embedded system prompt with key rules from CLAUDE.md
- Auto-triggers on `.md` and `.mdx` files in `docs/`
- Limited to safe tools (Read, Write, Edit, Glob, Grep)
- References complete CLAUDE.md for detailed rules

**System Prompt Highlights:**
- Enforces MUST rules (CLI default, groupId, language order)
- Guides NatsFlow usage vs code examples
- Applies writing style (active voice, present tense)
- Validates against checklist before completion

### 3. Documentation Improvements

**Added Sections:**
- ✅ Interactive Animations (NatsFlow) guidelines
- ✅ Decision trees for choosing visualization types
- ✅ Complete validation checklist
- ✅ Subagent usage instructions
- ✅ Quick reference tables

**Enhanced Sections:**
- **Teaching Layered Concepts**: NEW - Complete section on revealing NATS architecture
- **Code Examples**: Added "Under the Hood" guidance, error handling rules
- **Language Order**: Added validation checklist
- **Writing Style**: Added "reveal layers" requirement
- **MAY Rules**: Added "Under the Hood" sections, conceptual links
- **NEVER Rules**: Added foundation-before-abstraction requirement
- **Validation Checklist**: Split into Technical + Conceptual Understanding
- **Brand Guidelines**: Color palette and logo reference
- **Development Workflow**: Testing animations section

## Benefits

### For LLMs:
1. **Explicit Rules:** Clear DO/DON'T instead of narrative description
2. **Examples:** Concrete code showing right and wrong patterns
3. **Validation:** Checklist format for systematic verification
4. **Structure:** Hierarchical organization with clear priorities

### For Developers:
1. **Quick Reference:** Find rules fast with emoji markers
2. **Examples:** Copy-paste correct patterns
3. **Automation:** Subagent enforces standards
4. **Validation:** Pre-commit checklist

### For Documentation Quality:
1. **Consistency:** Automated enforcement of standards
2. **Completeness:** Checklist ensures nothing is missed
3. **Accuracy:** Examples are tested and validated
4. **Maintainability:** Single source of truth
5. **Deep Understanding:** Users grasp how NATS works, not just what to type
6. **Progressive Learning:** Foundation concepts before abstractions
7. **Aha! Moments:** "Oh, it's all just pub/sub!" revelations

## Usage

### Automatic (Subagent)
When working with `docs/**/*.md` or `docs/**/*.mdx`, the subagent automatically applies standards.

### Manual Reference
```bash
# View the guide
cat CLAUDE.md

# Quick validation
# Check these before commit:
- [ ] CLI is default tab
- [ ] groupId="lang" present
- [ ] Languages in correct order
- [ ] All imports at top
- [ ] Examples tested
```

### Manual Invocation
```
/task Create documentation for [topic] following NATS standards
```

## Files Modified/Created

1. **CLAUDE.md** - Complete rewrite (347 lines)
2. **.claude/subagents/nats-docs-writer.json** - New subagent config
3. **STYLE_GUIDE_UPDATE.md** - This summary

## Validation

The new format has been validated for:
- ✅ Clear MUST/SHOULD/MAY/NEVER distinction
- ✅ Concrete examples (not just descriptions)
- ✅ LLM-parseable structure
- ✅ Quick reference capability
- ✅ Comprehensive coverage of all previous content
- ✅ Added new content (NatsFlow, validation checklist)

## Next Steps

1. Test subagent on new documentation
2. Gather feedback on rule clarity
3. Refine based on common violations
4. Consider adding automated pre-commit hooks
