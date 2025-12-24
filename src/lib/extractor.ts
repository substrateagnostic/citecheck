import { Citation, ALL_REPORTERS } from './types';

// Build reporter pattern from all known reporters
const reporterNames = Object.keys(ALL_REPORTERS)
  .sort((a, b) => b.length - a.length) // Sort by length descending to match longer patterns first
  .map(r => r.replace(/\./g, '\\.').replace(/\s/g, '\\s*'));

const REPORTER_PATTERN = reporterNames.join('|');

// Main citation patterns
const PATTERNS = {
  // Full case citation: "Case Name, 123 F.3d 456 (Court Year)"
  fullCitation: new RegExp(
    `([A-Z][\\w.'\\-]+(?:\\s+(?:v\\.?|vs\\.?)\\s+[A-Z][\\w.'\\-]+[\\w\\s,'\\-]*?))` + // Case name with v./vs.
    `,?\\s*` +
    `(\\d{1,4})\\s*` + // Volume
    `(${REPORTER_PATTERN})\\s*` + // Reporter
    `(\\d{1,5})` + // Page
    `(?:\\s*,\\s*(\\d{1,5}))?` + // Optional pinpoint
    `(?:\\s*\\(([^)]+?)\\s*(\\d{4})\\))?`, // Optional (Court Year)
    'gi'
  ),

  // Short citation: "123 F.3d 456"
  shortCitation: new RegExp(
    `(?<!\\w)` + // Not preceded by word char
    `(\\d{1,4})\\s*` + // Volume
    `(${REPORTER_PATTERN})\\s*` + // Reporter  
    `(\\d{1,5})` + // Page
    `(?:\\s*,\\s*(\\d{1,5}))?` + // Optional pinpoint
    `(?:\\s*\\(([^)]+?)\\s*(\\d{4})\\))?`, // Optional (Court Year)
    'gi'
  ),

  // Case name only pattern for context extraction
  caseNamePattern: /([A-Z][\w.'\-]+(?:\s+(?:v\.?|vs\.?)\s+[A-Z][\w.'\-]+[\w\s,'\-]*?))\s*,?\s*\d/gi,
};

// Extract citations from text
export function extractCitations(text: string): Citation[] {
  const citations: Citation[] = [];
  const seen = new Set<string>();

  // First pass: full citations with case names
  let match: RegExpExecArray | null;
  const fullPattern = new RegExp(PATTERNS.fullCitation.source, 'gi');
  
  while ((match = fullPattern.exec(text)) !== null) {
    const raw = match[0].trim();
    const normalizedRaw = normalizeWhitespace(raw);
    
    if (seen.has(normalizedRaw)) continue;
    seen.add(normalizedRaw);

    const citation: Citation = {
      raw,
      caseName: cleanCaseName(match[1]),
      volume: match[2],
      reporter: normalizeReporter(match[3]),
      page: match[4],
      court: match[6]?.trim(),
      year: match[7],
      startIndex: match.index,
      endIndex: match.index + raw.length,
    };

    citations.push(citation);
  }

  // Second pass: short citations (volume + reporter + page)
  const shortPattern = new RegExp(PATTERNS.shortCitation.source, 'gi');
  
  while ((match = shortPattern.exec(text)) !== null) {
    const raw = match[0].trim();
    const normalizedRaw = normalizeWhitespace(raw);
    const matchIndex = match.index;
    
    // Skip if we already captured this as part of a full citation
    if (seen.has(normalizedRaw)) continue;
    
    // Check if this position is within an already-captured citation
    const isOverlapping = citations.some(
      c => matchIndex >= c.startIndex && matchIndex < c.endIndex
    );
    if (isOverlapping) continue;
    
    seen.add(normalizedRaw);

    // Try to find case name in preceding text
    const precedingText = text.substring(Math.max(0, matchIndex - 200), matchIndex);
    const caseName = extractPrecedingCaseName(precedingText);

    const citation: Citation = {
      raw,
      caseName,
      volume: match[1],
      reporter: normalizeReporter(match[2]),
      page: match[3],
      court: match[5]?.trim(),
      year: match[6],
      startIndex: matchIndex,
      endIndex: matchIndex + raw.length,
    };

    citations.push(citation);
  }

  // Sort by position in document
  citations.sort((a, b) => a.startIndex - b.startIndex);

  return citations;
}

// Clean up case name
function cleanCaseName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  
  return name
    .replace(/\s+/g, ' ')
    .replace(/,\s*$/, '')
    .replace(/^\s*,/, '')
    .trim();
}

// Normalize reporter abbreviation
function normalizeReporter(reporter: string): string {
  return reporter.replace(/\s+/g, ' ').trim();
}

// Normalize whitespace
function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim().toLowerCase();
}

// Extract case name from preceding text
function extractPrecedingCaseName(text: string): string | undefined {
  // Look for "Case v. Case" pattern
  const patterns = [
    /([A-Z][\w.'\-]+\s+v\.?\s+[A-Z][\w.'\-]+[\w\s,'\-]*?)\s*,?\s*$/i,
    /See\s+([A-Z][\w.'\-]+\s+v\.?\s+[A-Z][\w.'\-]+)/i,
    /in\s+([A-Z][\w.'\-]+\s+v\.?\s+[A-Z][\w.'\-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return cleanCaseName(match[1]);
    }
  }

  return undefined;
}

// Validate citation format
export function validateCitationFormat(citation: Citation): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check volume is reasonable
  const volume = parseInt(citation.volume || '0');
  if (volume < 1 || volume > 2000) {
    issues.push(`Unusual volume number: ${citation.volume}`);
  }

  // Check page is reasonable
  const page = parseInt(citation.page || '0');
  if (page < 1 || page > 10000) {
    issues.push(`Unusual page number: ${citation.page}`);
  }

  // Check year is reasonable
  if (citation.year) {
    const year = parseInt(citation.year);
    const currentYear = new Date().getFullYear();
    if (year < 1789 || year > currentYear) {
      issues.push(`Year out of range: ${citation.year}`);
    }
  }

  // Check reporter is known
  const normalizedReporter = citation.reporter.replace(/\s+/g, ' ');
  if (!ALL_REPORTERS[normalizedReporter]) {
    issues.push(`Unknown reporter: ${citation.reporter}`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// Format citation for display
export function formatCitation(citation: Citation): string {
  const parts: string[] = [];
  
  if (citation.caseName) {
    parts.push(citation.caseName + ',');
  }
  
  parts.push(`${citation.volume} ${citation.reporter} ${citation.page}`);
  
  if (citation.court || citation.year) {
    const parens: string[] = [];
    if (citation.court) parens.push(citation.court);
    if (citation.year) parens.push(citation.year);
    parts.push(`(${parens.join(' ')})`);
  }

  return parts.join(' ');
}
