# CiteCheck — Claude Code Project

## What This Is
Legal citation verification tool to catch AI-hallucinated case law before filing.

## The Problem
Avianca case (2023): $5,000 sanctions for submitting ChatGPT-generated fake citations.
AI tools hallucinate cases. This tool catches them.

## Core Flow
1. User uploads document (PDF/DOCX/TXT)
2. Extract text with pdf-parse / mammoth
3. Parse citations with regex patterns (federal + state reporters)
4. Query CourtListener API for each citation
5. Generate verification report with confidence scores

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- pdf-parse (PDF extraction)
- mammoth (DOCX extraction)
- CourtListener API (Free Law Project — no key needed)

## Key Files
- `src/lib/extractor.ts` — Citation regex patterns + extraction
- `src/lib/verifier.ts` — CourtListener API verification
- `src/lib/report.ts` — Report generation
- `src/lib/document-parser.ts` — PDF/DOCX text extraction
- `src/cli.ts` — CLI tool for batch verification
- `src/app/page.tsx` — Upload UI
- `src/app/results/page.tsx` — Results display
- `src/app/api/verify/route.ts` — API endpoint

## Supported Reporters
Federal: U.S., S. Ct., F., F.2d, F.3d, F.4th, F. Supp., etc.
Regional: A., A.2d, N.E., N.W., P., S.E., S.W., So., etc.
State: N.Y., Cal., Ill., Tex., Pa., and many more.

## CLI Usage
```bash
npm run cli -- brief.pdf
npm run cli -- motion.docx -o report.md -f markdown
npm run cli -- filing.pdf -o results.json -f json
```

## API Rate Limiting
CourtListener: 500ms delay between requests (built into verifier.ts)

## Known Limitations
- Federal coverage comprehensive; state coverage varies
- Old cases (pre-1900) may have gaps
- Verifies existence only — not whether case supports claimed proposition

## Potential Enhancements
1. State court database integration (Casetext, Fastcase APIs)
2. Holding verification (check if case actually supports the proposition)
3. Parallel verification with rate limiting
4. Citation format auto-correction suggestions
5. Integration with practice management tools
