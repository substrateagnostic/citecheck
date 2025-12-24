#!/usr/bin/env npx tsx

import { extractTextFromPath } from './lib/document-parser';
import { extractCitations } from './lib/extractor';
import { verifyCitations } from './lib/verifier';
import { generateReport, formatReportAsText, formatReportAsMarkdown } from './lib/report';
import * as fs from 'fs/promises';
import * as path from 'path';

const HELP = `
╔═══════════════════════════════════════════════════════════════════════╗
║                         CITE-CHECK v1.0                                ║
║           AI-Generated Citation Verification Tool                      ║
╚═══════════════════════════════════════════════════════════════════════╝

USAGE:
  npx tsx src/cli.ts <file> [options]
  npm run cli -- <file> [options]

ARGUMENTS:
  <file>              Path to document (PDF, DOCX, or TXT)

OPTIONS:
  --output, -o        Output file path (default: stdout)
  --format, -f        Output format: text, markdown, json (default: text)
  --extract-only      Only extract citations, don't verify
  --help, -h          Show this help message

EXAMPLES:
  # Verify citations in a PDF
  npm run cli -- brief.pdf

  # Save report as markdown
  npm run cli -- motion.docx -o report.md -f markdown

  # Extract citations without verification
  npm run cli -- contract.txt --extract-only

  # Verify and save as JSON for programmatic use
  npm run cli -- filing.pdf -o results.json -f json

SUPPORTED REPORTERS:
  Federal: U.S., S. Ct., F., F.2d, F.3d, F.4th, F. Supp., F. Supp. 2d, etc.
  Regional: A.2d, A.3d, N.E.2d, N.W.2d, P.2d, P.3d, S.E.2d, S.W.3d, etc.
  State: N.Y., Cal., Ill., Tex., Pa., and more

NOTE:
  This tool uses the CourtListener API (Free Law Project) for verification.
  Federal case coverage is comprehensive; state case coverage varies.
  Always manually verify citations marked as "not found" before filing.
`;

interface CliArgs {
  file: string;
  output?: string;
  format: 'text' | 'markdown' | 'json';
  extractOnly: boolean;
  help: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    file: '',
    format: 'text',
    extractOnly: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--output' || arg === '-o') {
      result.output = args[++i];
    } else if (arg === '--format' || arg === '-f') {
      const format = args[++i];
      if (format === 'text' || format === 'markdown' || format === 'json') {
        result.format = format;
      } else {
        console.error(`Invalid format: ${format}. Use text, markdown, or json.`);
        process.exit(1);
      }
    } else if (arg === '--extract-only') {
      result.extractOnly = true;
    } else if (!arg.startsWith('-') && !result.file) {
      result.file = arg;
    }
  }

  return result;
}

function printProgress(completed: number, total: number): void {
  const percent = Math.round((completed / total) * 100);
  const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
  process.stderr.write(`\rVerifying: [${bar}] ${percent}% (${completed}/${total})`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.file) {
    console.log(HELP);
    process.exit(args.help ? 0 : 1);
  }

  // Check file exists
  try {
    await fs.access(args.file);
  } catch {
    console.error(`Error: File not found: ${args.file}`);
    process.exit(1);
  }

  const filename = path.basename(args.file);
  
  console.error(`\n📄 Processing: ${filename}`);
  console.error('─'.repeat(50));

  // Extract text
  console.error('📖 Extracting text from document...');
  let text: string;
  try {
    text = await extractTextFromPath(args.file);
  } catch (error) {
    console.error(`Error extracting text: ${error}`);
    process.exit(1);
  }
  console.error(`   Found ${text.length.toLocaleString()} characters`);

  // Extract citations
  console.error('🔍 Extracting citations...');
  const citations = extractCitations(text);
  console.error(`   Found ${citations.length} citation(s)`);

  if (citations.length === 0) {
    console.error('\n⚠️  No citations found in document.');
    console.error('   Make sure the document contains legal citations in standard format.');
    process.exit(0);
  }

  // If extract-only mode, just output citations
  if (args.extractOnly) {
    console.error('\n📋 Extracted Citations:');
    console.error('─'.repeat(50));
    
    const output = citations.map((c, i) => ({
      index: i + 1,
      raw: c.raw,
      caseName: c.caseName,
      volume: c.volume,
      reporter: c.reporter,
      page: c.page,
      year: c.year,
      court: c.court,
    }));

    if (args.format === 'json') {
      const jsonOutput = JSON.stringify(output, null, 2);
      if (args.output) {
        await fs.writeFile(args.output, jsonOutput);
        console.error(`\n✅ Saved to ${args.output}`);
      } else {
        console.log(jsonOutput);
      }
    } else {
      for (const c of output) {
        console.log(`${c.index}. ${c.raw}`);
        if (c.caseName) console.log(`   Case: ${c.caseName}`);
        console.log(`   ${c.volume} ${c.reporter} ${c.page}${c.year ? ` (${c.year})` : ''}`);
        console.log('');
      }
    }
    process.exit(0);
  }

  // Verify citations
  console.error('\n🔎 Verifying against CourtListener database...');
  const results = await verifyCitations(citations, printProgress);
  console.error('\n');

  // Generate report
  const report = generateReport(filename, results);

  // Format output
  let output: string;
  switch (args.format) {
    case 'json':
      output = JSON.stringify(report, null, 2);
      break;
    case 'markdown':
      output = formatReportAsMarkdown(report);
      break;
    default:
      output = formatReportAsText(report);
  }

  // Write output
  if (args.output) {
    await fs.writeFile(args.output, output);
    console.error(`✅ Report saved to ${args.output}`);
  } else {
    console.log(output);
  }

  // Exit with appropriate code
  if (report.notFound > 0 || report.formatErrors > 0) {
    console.error(`\n⚠️  ${report.notFound + report.formatErrors} citation(s) need manual review.`);
    process.exit(2); // Non-zero exit for CI/CD integration
  } else {
    console.error('\n✅ All citations verified successfully.');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
