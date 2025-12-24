import { Citation, VerificationResult } from './types';
import { validateCitationFormat, formatCitation } from './extractor';

const COURTLISTENER_API = 'https://www.courtlistener.com/api/rest/v3';

// CourtListener API token - get yours free at https://www.courtlistener.com/sign-in/
// Set COURTLISTENER_TOKEN environment variable or it will use limited unauthenticated access
const API_TOKEN = process.env.COURTLISTENER_TOKEN || '';

// CourtListener requires proper headers
const API_HEADERS: Record<string, string> = {
  'User-Agent': 'CiteCheck/1.0 (Legal Citation Verification Tool)',
  'Accept': 'application/json',
  ...(API_TOKEN ? { 'Authorization': `Token ${API_TOKEN}` } : {}),
};

interface CourtListenerCase {
  id: number;
  absolute_url: string;
  case_name: string;
  case_name_short: string;
  citation: string[];
  court: string;
  court_id: string;
  date_filed: string;
  docket_number: string;
  judges: string;
  status: string;
}

interface SearchResponse {
  count: number;
  results: CourtListenerCase[];
}

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // 500ms between requests

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
  return fetch(url, { headers: API_HEADERS });
}

// Build search query for CourtListener
function buildSearchQuery(citation: Citation): string {
  const params = new URLSearchParams();
  
  // Search by citation string
  const citationStr = `${citation.volume} ${citation.reporter} ${citation.page}`;
  params.set('citation', citationStr);
  
  // Add case name if available
  if (citation.caseName) {
    // Extract just the party names for search
    const simplified = citation.caseName
      .replace(/\s+v\.?\s+/i, ' v. ')
      .replace(/,.*$/, '')
      .trim();
    params.set('case_name', simplified);
  }

  return params.toString();
}

// Search CourtListener by citation
async function searchByCitation(citation: Citation): Promise<SearchResponse | null> {
  try {
    const query = buildSearchQuery(citation);
    const url = `${COURTLISTENER_API}/search/?${query}&type=o`;
    
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error(`CourtListener API error: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('CourtListener API request failed:', error);
    return null;
  }
}

// Alternative search by volume/reporter/page directly
async function searchByComponents(citation: Citation): Promise<SearchResponse | null> {
  try {
    const params = new URLSearchParams();
    params.set('q', `${citation.volume} ${citation.reporter} ${citation.page}`);
    params.set('type', 'o');
    
    const url = `${COURTLISTENER_API}/search/?${params.toString()}`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    return null;
  }
}

// Calculate match confidence
function calculateConfidence(citation: Citation, result: CourtListenerCase): number {
  let confidence = 0;
  
  // Citation string match (most important)
  const citationStr = `${citation.volume} ${citation.reporter} ${citation.page}`;
  const resultCitations = result.citation || [];
  
  for (const resCite of resultCitations) {
    if (resCite.toLowerCase().includes(citationStr.toLowerCase())) {
      confidence += 50;
      break;
    }
    // Partial match
    if (resCite.includes(citation.volume || '') && resCite.includes(citation.page || '')) {
      confidence += 30;
      break;
    }
  }
  
  // Case name match
  if (citation.caseName && result.case_name) {
    const citeName = citation.caseName.toLowerCase();
    const resultName = result.case_name.toLowerCase();
    
    // Extract party names
    const citeParties = citeName.split(/\s+v\.?\s+/i);
    const resultParties = resultName.split(/\s+v\.?\s+/i);
    
    let partyMatches = 0;
    for (const party of citeParties) {
      const simplified = party.replace(/[^\w\s]/g, '').trim();
      if (simplified && resultName.includes(simplified)) {
        partyMatches++;
      }
    }
    
    if (partyMatches >= 2) {
      confidence += 30;
    } else if (partyMatches === 1) {
      confidence += 15;
    }
  }
  
  // Year match
  if (citation.year && result.date_filed) {
    const resultYear = result.date_filed.substring(0, 4);
    if (citation.year === resultYear) {
      confidence += 20;
    } else if (Math.abs(parseInt(citation.year) - parseInt(resultYear)) <= 1) {
      confidence += 10; // Off by one year (common in citations)
    }
  }
  
  return Math.min(100, confidence);
}

// Verify a single citation
export async function verifyCitation(citation: Citation): Promise<VerificationResult> {
  const warnings: string[] = [];
  
  // First, validate format
  const formatValidation = validateCitationFormat(citation);
  if (!formatValidation.valid) {
    return {
      citation,
      status: 'format_error',
      confidence: 0,
      details: `Citation format issues: ${formatValidation.issues.join('; ')}`,
      warnings: formatValidation.issues,
    };
  }

  // Search CourtListener
  let searchResult = await searchByCitation(citation);
  
  // If no results, try component search
  if (!searchResult || searchResult.count === 0) {
    searchResult = await searchByComponents(citation);
  }

  // Handle API errors
  if (!searchResult) {
    return {
      citation,
      status: 'api_error',
      confidence: 0,
      details: 'Failed to query CourtListener API. Check your connection or try again later.',
      warnings: ['API request failed'],
    };
  }

  // No results found
  if (searchResult.count === 0) {
    return {
      citation,
      status: 'not_found',
      confidence: 0,
      details: `No matching case found for "${formatCitation(citation)}". This citation may be fabricated, from a state court not in CourtListener, or use a different citation format.`,
      warnings: ['No matching case in database'],
    };
  }

  // Evaluate results
  const results = searchResult.results;
  let bestMatch: CourtListenerCase | null = null;
  let bestConfidence = 0;

  for (const result of results) {
    const confidence = calculateConfidence(citation, result);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = result;
    }
  }

  if (!bestMatch) {
    return {
      citation,
      status: 'not_found',
      confidence: 0,
      details: 'Search returned results but none matched the citation.',
      warnings: ['No confident match found'],
    };
  }

  // Check for case name mismatch
  if (citation.caseName && bestMatch.case_name) {
    const citeName = citation.caseName.toLowerCase();
    const matchName = bestMatch.case_name.toLowerCase();
    
    // Check if party names are completely different
    const citeParties = citeName.split(/\s+v\.?\s+/i).map(p => p.replace(/[^\w]/g, '').trim());
    const matchParties = matchName.split(/\s+v\.?\s+/i).map(p => p.replace(/[^\w]/g, '').trim());
    
    let anyMatch = false;
    for (const cp of citeParties) {
      for (const mp of matchParties) {
        if (cp && mp && (cp.includes(mp) || mp.includes(cp))) {
          anyMatch = true;
          break;
        }
      }
    }
    
    if (!anyMatch) {
      warnings.push(`Case name mismatch: citation says "${citation.caseName}", database shows "${bestMatch.case_name}"`);
    }
  }

  // Determine status based on confidence
  if (bestConfidence >= 70) {
    return {
      citation,
      status: 'verified',
      confidence: bestConfidence,
      details: `Citation verified. Found matching case in CourtListener database.`,
      courtListenerUrl: `https://www.courtlistener.com${bestMatch.absolute_url}`,
      matchedCase: {
        caseName: bestMatch.case_name,
        citation: bestMatch.citation?.join(', ') || '',
        dateFiled: bestMatch.date_filed,
        court: bestMatch.court,
        docketNumber: bestMatch.docket_number,
      },
      warnings,
    };
  } else if (bestConfidence >= 40) {
    return {
      citation,
      status: 'partial_match',
      confidence: bestConfidence,
      details: `Possible match found, but confidence is low. Manual verification recommended.`,
      courtListenerUrl: `https://www.courtlistener.com${bestMatch.absolute_url}`,
      matchedCase: {
        caseName: bestMatch.case_name,
        citation: bestMatch.citation?.join(', ') || '',
        dateFiled: bestMatch.date_filed,
        court: bestMatch.court,
        docketNumber: bestMatch.docket_number,
      },
      warnings: [...warnings, 'Low confidence match - verify manually'],
    };
  } else {
    return {
      citation,
      status: 'not_found',
      confidence: bestConfidence,
      details: `Found potential result "${bestMatch.case_name}" but match confidence is too low.`,
      warnings: [...warnings, 'Very low confidence - likely not a match'],
    };
  }
}

// Verify multiple citations
export async function verifyCitations(
  citations: Citation[],
  onProgress?: (completed: number, total: number) => void
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  
  for (let i = 0; i < citations.length; i++) {
    const result = await verifyCitation(citations[i]);
    results.push(result);
    
    if (onProgress) {
      onProgress(i + 1, citations.length);
    }
  }
  
  return results;
}
