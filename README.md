<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js 14"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License"/>
</p>

<h1 align="center">CiteCheck</h1>

<p align="center">
  <strong>Catch AI-hallucinated legal citations before they become sanctions.</strong>
</p>

<p align="center">
  <a href="https://verify.alexgallefrom.io">Live Demo</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#cli-usage">CLI Usage</a>
</p>

---

## The Problem

In 2023, attorneys in the infamous *Mata v. Avianca* case faced **$5,000 in sanctions** for submitting AI-generated citations to nonexistent cases. As AI tools become standard in legal research, hallucinated case law is a ticking time bomb.

**CiteCheck** verifies your citations against the CourtListener federal database before you file.

## Features

- **Multi-format support** — PDF, DOCX, TXT, Markdown
- **Smart extraction** — Bluebook-aware parsing with 80+ reporter types
- **Real verification** — Each citation checked against CourtListener
- **Confidence scoring** — Know exactly how certain each match is
- **Risk assessment** — Document-level scoring (Low/Medium/High/Critical)
- **Beautiful UI** — Glass morphism design with animations
- **Dark mode** — Easy on the eyes
- **CLI tool** — Batch verify from the command line
- **Export** — JSON and Markdown reports

## Quick Start

```bash
# Clone it
git clone https://github.com/substrateagnostic/citecheck.git
cd citecheck

# Install
npm install

# Get your free CourtListener API token at:
# https://www.courtlistener.com/sign-in/
echo "COURTLISTENER_TOKEN=your_token_here" > .env.local

# Run it
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## CLI Usage

```bash
# Verify a document
npm run cli -- brief.pdf

# Output as markdown
npm run cli -- motion.docx -o report.md -f markdown

# Output as JSON
npm run cli -- filing.pdf -o results.json -f json

# Extract citations only (no verification)
npm run cli -- document.pdf --extract-only
```

## Supported Reporters

<details>
<summary><strong>Federal Reporters</strong></summary>

- U.S. (United States Reports)
- S. Ct. (Supreme Court Reporter)
- L. Ed., L. Ed. 2d (Lawyers' Edition)
- F., F.2d, F.3d, F.4th (Federal Reporter)
- F. Supp., F. Supp. 2d, F. Supp. 3d (Federal Supplement)
- B.R. (Bankruptcy Reporter)
- Fed. Cl. (Federal Claims Reporter)
- F.R.D. (Federal Rules Decisions)

</details>

<details>
<summary><strong>Regional Reporters</strong></summary>

- A., A.2d, A.3d (Atlantic)
- N.E., N.E.2d, N.E.3d (North Eastern)
- N.W., N.W.2d (North Western)
- P., P.2d, P.3d (Pacific)
- S.E., S.E.2d (South Eastern)
- S.W., S.W.2d, S.W.3d (South Western)
- So., So. 2d, So. 3d (Southern)

</details>

<details>
<summary><strong>State Reporters</strong></summary>

- N.Y., N.Y.2d, N.Y.3d, A.D., A.D.2d, A.D.3d (New York)
- Cal., Cal. 2d-5th, Cal. App., Cal. App. 2d-5th (California)
- Ill., Ill. 2d, Ill. App., Ill. App. 2d-3d (Illinois)
- Tex. (Texas)
- Pa. (Pennsylvania)
- Ohio St., Ohio St. 2d, Ohio St. 3d (Ohio)
- And many more...

</details>

## API

```bash
curl -X POST https://verify.alexgallefrom.io/api/verify \
  -F "file=@brief.pdf"
```

Returns:
```json
{
  "documentName": "brief.pdf",
  "totalCitations": 15,
  "verified": 12,
  "notFound": 2,
  "partialMatches": 1,
  "results": [...],
  "processedAt": "2024-12-24T12:00:00.000Z"
}
```

## Verification Statuses

| Status | Meaning |
|--------|---------|
| `verified` | Found in CourtListener with high confidence |
| `partial_match` | Possible match, manual review recommended |
| `not_found` | No match—may be fabricated or from uncovered jurisdiction |
| `format_error` | Invalid citation format |
| `api_error` | API request failed |

## Deploy Your Own

### Vercel (One Click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fagallefrom%2Fcitecheck&env=COURTLISTENER_TOKEN&envDescription=Get%20your%20free%20API%20token%20at%20courtlistener.com)

### Manual

```bash
npm install -g vercel
vercel --prod
# Add COURTLISTENER_TOKEN in project settings
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `COURTLISTENER_TOKEN` | CourtListener API token | Yes |

Get your free token: [courtlistener.com/sign-in](https://www.courtlistener.com/sign-in/)

## Limitations

- **Federal focus** — CourtListener has comprehensive federal coverage; state varies
- **Existence only** — Verifies citations exist, not that they support your argument
- **Not legal advice** — Always perform independent verification

## Tech Stack

- [Next.js 14](https://nextjs.org/) — React framework
- [TypeScript](https://www.typescriptlang.org/) — Type safety
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) — PDF extraction
- [mammoth](https://www.npmjs.com/package/mammoth) — DOCX extraction
- [CourtListener](https://www.courtlistener.com/) — Citation database

## Contributing

Ideas welcome:

- [ ] State court database integration
- [ ] Holding verification (does the case support the proposition?)
- [ ] Parallel verification with smarter rate limiting
- [ ] Citation format auto-correction
- [ ] Browser extension

## License

MIT — do whatever you want.

## Credits

Citation data from [CourtListener](https://www.courtlistener.com) by the [Free Law Project](https://free.law).

---

<p align="center">
  <strong>Verify before you file. Your bar license will thank you.</strong>
</p>
