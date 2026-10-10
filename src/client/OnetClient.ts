import type {
  ApprenticeshipSummary,
  DetailedWorkActivitiesSummary,
  EducationSummary,
  InterestsSummary,
  JobZoneSummary,
  MilitaryCareerSummariesResult,
  OccupationElementSummary,
  OccupationOverview,
  OccupationSearchParams,
  OccupationSearchResult,
  OccupationSummarySection,
  OccupationSummarySectionMap,
  PaginationParams,
  ProfessionalAssociationsSummary,
  RelatedOccupationsSummary,
  TasksSummary,
  TechnologySkillsSummary,
  WorkContextSummary,
} from '../types';
import {OnetValidationError} from './errors';
import {OnetTransport} from './OnetTransport';
import type {OnetClientOptions, RequestOptions} from './OnetTransport';

export {OnetApiError} from './errors';

/** O*NET-SOC codes look like `15-1252.00`: two digits, four digits, two-digit suffix. */
const ONET_SOC_CODE_PATTERN = /^\d{2}-\d{4}\.\d{2}$/;

/**
 * Runtime allowlist of summary section names. Typed as a full `Record` so the
 * compiler fails if a section is added to `OccupationSummarySectionMap`
 * without being listed here.
 */
const SUMMARY_SECTIONS: Readonly<Record<OccupationSummarySection, true>> = {
  abilities: true,
  skills: true,
  knowledge: true,
  work_styles: true,
  work_activities: true,
  work_context: true,
  tasks: true,
  technology_skills: true,
  related_occupations: true,
  job_zone: true,
  interests: true,
  education: true,
  detailed_work_activities: true,
  apprenticeship: true,
  professional_associations: true,
  military_career_summaries: true,
};

/**
 * Typed client for the O*NET Web Services `/online` portal.
 *
 * Create one instance per API key and share it; hooks and components take it
 * as an argument. Every method returns a promise that rejects with an
 * `OnetError` subclass:
 * - `OnetValidationError` — an argument such as `code` is malformed (no request is sent).
 * - `OnetApiError` — the API answered with a non-2xx status (see `.status`).
 * - `OnetRequestError` — the network call failed or the response was not JSON.
 *
 * Methods also accept a trailing {@link RequestOptions} with an `AbortSignal`.
 *
 * @example
 * const client = new OnetClient('YOUR_API_KEY');
 * const skills = await client.getOccupationSkills('15-1252.00', {start: 1, end: 10});
 */
export class OnetClient {
  private readonly transport: OnetTransport;

  /**
   * @param apiKey O*NET API key, sent as the `X-API-Key` header. Pass
   *     `undefined` when `options.baseUrl` points at a proxy that adds it.
   * @param options Base URL, custom `fetch`, and response caching settings.
   */
  constructor(apiKey?: string, options: OnetClientOptions = {}) {
    this.transport = new OnetTransport(apiKey, options);
  }

  /** Drops every cached response. Has no effect unless `cacheTtlMs` was set. */
  clearCache(): void {
    this.transport.clearCache();
  }

  // ── Search ────────────────────────────────────────────────────────────────

  /** Finds occupations matching a keyword (`GET /online/search`). */
  async searchOccupations(
    params: OccupationSearchParams,
    options?: RequestOptions
  ): Promise<OccupationSearchResult> {
    const {keyword, start, end} = params;
    if (keyword.trim() === '') {
      throw new OnetValidationError(
        'Invalid search keyword: it must contain at least one non-whitespace character.'
      );
    }
    validatePageBounds(start, end);
    return this.transport.get<OccupationSearchResult>(
      '/online/search',
      {keyword, start, end},
      options
    );
  }

  // ── Occupation overview ───────────────────────────────────────────────────

  /** Fetches an occupation's title, description, tags and section links. */
  async getOccupation(
    code: string,
    options?: RequestOptions
  ): Promise<OccupationOverview> {
    return this.transport.get<OccupationOverview>(
      `${occupationPath(code)}/`,
      undefined,
      options
    );
  }

  // ── Summary sections ──────────────────────────────────────────────────────

  /**
   * Fetches any summary section by name. The named methods below are
   * shortcuts for this; use it directly when the section is chosen at runtime.
   *
   * @param code O*NET-SOC code, e.g. `15-1252.00`.
   * @param section Section name, e.g. `'skills'`; it determines the return type.
   * @param params Optional page bounds. Ignored by non-paginated sections
   *     (`job_zone`, `interests`, `education`).
   */
  async getOccupationSummary<S extends OccupationSummarySection>(
    code: string,
    section: S,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<OccupationSummarySectionMap[S]> {
    validatePageBounds(params?.start, params?.end);
    return this.transport.get<OccupationSummarySectionMap[S]>(
      `${occupationPath(code)}/summary/${summarySectionPath(section)}`,
      {start: params?.start, end: params?.end},
      options
    );
  }

  /** Abilities ranked by importance for the occupation. */
  getOccupationAbilities(
    code: string,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<OccupationElementSummary> {
    return this.getOccupationSummary(code, 'abilities', params, options);
  }

  /** Skills ranked by importance for the occupation. */
  getOccupationSkills(
    code: string,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<OccupationElementSummary> {
    return this.getOccupationSummary(code, 'skills', params, options);
  }

  /** Knowledge areas ranked by importance for the occupation. */
  getOccupationKnowledge(
    code: string,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<OccupationElementSummary> {
    return this.getOccupationSummary(code, 'knowledge', params, options);
  }

  /** Personal characteristics that affect job performance. */
  getOccupationWorkStyles(
    code: string,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<OccupationElementSummary> {
    return this.getOccupationSummary(code, 'work_styles', params, options);
  }

  /** General types of work behaviour performed in the occupation. */
  getOccupationWorkActivities(
    code: string,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<OccupationElementSummary> {
    return this.getOccupationSummary(code, 'work_activities', params, options);
  }

  /** Physical and social working conditions, each with a response distribution. */
  getOccupationWorkContext(
    code: string,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<WorkContextSummary> {
    return this.getOccupationSummary(code, 'work_context', params, options);
  }

  /** Occupation-specific tasks. */
  getOccupationTasks(
    code: string,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<TasksSummary> {
    return this.getOccupationSummary(code, 'tasks', params, options);
  }

  /** Software and technology categories used, flagging hot and in-demand items. */
  getOccupationTechnologySkills(
    code: string,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<TechnologySkillsSummary> {
    return this.getOccupationSummary(
      code,
      'technology_skills',
      params,
      options
    );
  }

  /** Occupations with similar work. */
  getOccupationRelatedOccupations(
    code: string,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<RelatedOccupationsSummary> {
    return this.getOccupationSummary(
      code,
      'related_occupations',
      params,
      options
    );
  }

  /** Job Zone (1–5): how much education, experience and training is needed. */
  getOccupationJobZone(
    code: string,
    options?: RequestOptions
  ): Promise<JobZoneSummary> {
    return this.getOccupationSummary(code, 'job_zone', undefined, options);
  }

  /** RIASEC interest code and the interest profile behind it. */
  getOccupationInterests(
    code: string,
    options?: RequestOptions
  ): Promise<InterestsSummary> {
    return this.getOccupationSummary(code, 'interests', undefined, options);
  }

  /** Distribution of education levels reported by workers. */
  getOccupationEducation(
    code: string,
    options?: RequestOptions
  ): Promise<EducationSummary> {
    return this.getOccupationSummary(code, 'education', undefined, options);
  }

  /** Detailed work activities (more specific than `work_activities`). */
  getOccupationDetailedWorkActivities(
    code: string,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<DetailedWorkActivitiesSummary> {
    return this.getOccupationSummary(
      code,
      'detailed_work_activities',
      params,
      options
    );
  }

  /** Registered apprenticeship titles linked to the occupation. */
  getOccupationApprenticeship(
    code: string,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<ApprenticeshipSummary> {
    return this.getOccupationSummary(code, 'apprenticeship', params, options);
  }

  /** Professional associations relevant to the occupation. */
  getOccupationProfessionalAssociations(
    code: string,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<ProfessionalAssociationsSummary> {
    return this.getOccupationSummary(
      code,
      'professional_associations',
      params,
      options
    );
  }

  /** Related military career summaries. */
  getOccupationMilitaryCareerSummaries(
    code: string,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<MilitaryCareerSummariesResult> {
    return this.getOccupationSummary(
      code,
      'military_career_summaries',
      params,
      options
    );
  }
}

/**
 * Builds `/online/occupations/{code}` after checking the code's format, so a
 * malformed value fails fast with a clear message and can never rewrite the
 * request path (e.g. `../../about`).
 */
function occupationPath(code: string): string {
  if (!ONET_SOC_CODE_PATTERN.test(code)) {
    throw new OnetValidationError(
      `Invalid O*NET-SOC code "${code}": expected the form 00-0000.00 (e.g. 15-1252.00).`
    );
  }
  return `/online/occupations/${encodeURIComponent(code)}`;
}

/**
 * Accepts only known section names. `section` is a TypeScript type that
 * disappears at runtime, and callers may pass a route param or query value, so
 * values such as `..`, `skills?x=1` or `a#b` must never reach the URL.
 */
function summarySectionPath(section: string): string {
  if (!Object.hasOwn(SUMMARY_SECTIONS, section)) {
    throw new OnetValidationError(
      `Invalid occupation summary section "${section}": expected one of ` +
        `${Object.keys(SUMMARY_SECTIONS).join(', ')}.`
    );
  }
  return section;
}

/**
 * Checks `start`/`end` against the API schema (integers, `start >= 1`,
 * `end >= start`) so bad bounds fail locally instead of as a 422.
 */
function validatePageBounds(start?: number, end?: number): void {
  if (start !== undefined && (!Number.isInteger(start) || start < 1)) {
    throw new OnetValidationError(
      `Invalid start "${start}": it must be an integer greater than or equal to 1.`
    );
  }
  if (end !== undefined && (!Number.isInteger(end) || end < 1)) {
    throw new OnetValidationError(
      `Invalid end "${end}": it must be an integer greater than or equal to 1.`
    );
  }
  if (start !== undefined && end !== undefined && end < start) {
    throw new OnetValidationError(
      `Invalid page bounds: end (${end}) must be greater than or equal to start (${start}).`
    );
  }
}
