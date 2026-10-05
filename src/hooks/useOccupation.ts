import {useMemo} from 'react';
import {useOnetQuery} from './useOnetQuery';
import type {OnetClient} from '../client/OnetClient';
import type {
  ApprenticeshipSummary,
  DetailedWorkActivitiesSummary,
  EducationSummary,
  InterestsSummary,
  JobZoneSummary,
  MilitaryCareerSummariesResult,
  OccupationElementSummary,
  OccupationOverview,
  OccupationSummarySection,
  OccupationSummarySectionMap,
  OnetQueryResult,
  PaginationParams,
  ProfessionalAssociationsSummary,
  RelatedOccupationsSummary,
  TasksSummary,
  TechnologySkillsSummary,
  WorkContextSummary,
} from '../types';

// All hooks in this file are declarative: they fetch when `code` (or the page
// bounds) change, abort superseded requests, and stay idle while `code` is null.

/**
 * Loads an occupation's overview: title, description, tags and section links.
 *
 * @param client Shared `OnetClient` instance.
 * @param code O*NET-SOC code such as `15-1252.00`, or `null` to stay idle.
 */
export function useOccupation(
  client: OnetClient,
  code: string | null
): OnetQueryResult<OccupationOverview> {
  const fetcher = useMemo(
    () =>
      code === null
        ? null
        : (signal: AbortSignal) => client.getOccupation(code, {signal}),
    [client, code]
  );
  return useOnetQuery(fetcher);
}

/**
 * Loads any occupation summary section by name. The section-specific hooks
 * below wrap this; use it directly when the section is chosen at runtime.
 *
 * @param client Shared `OnetClient` instance.
 * @param code O*NET-SOC code such as `15-1252.00`, or `null` to stay idle.
 * @param section Section name, e.g. `'skills'`; it determines the data type.
 * @param params Optional 1-based, inclusive page bounds. Only `start` and
 *     `end` are compared between renders, so an inline object literal does
 *     not cause a refetch.
 */
export function useOccupationSummary<S extends OccupationSummarySection>(
  client: OnetClient,
  code: string | null,
  section: S,
  params?: PaginationParams
): OnetQueryResult<OccupationSummarySectionMap[S]> {
  const start = params?.start;
  const end = params?.end;
  const fetcher = useMemo(
    () =>
      code === null
        ? null
        : (signal: AbortSignal) =>
            client.getOccupationSummary(code, section, {start, end}, {signal}),
    [client, code, section, start, end]
  );
  return useOnetQuery(fetcher);
}

/** Skills ranked by importance. See {@link useOccupationSummary}. */
export function useOccupationSkills(
  client: OnetClient,
  code: string | null,
  params?: PaginationParams
): OnetQueryResult<OccupationElementSummary> {
  return useOccupationSummary(client, code, 'skills', params);
}

/** Abilities ranked by importance. See {@link useOccupationSummary}. */
export function useOccupationAbilities(
  client: OnetClient,
  code: string | null,
  params?: PaginationParams
): OnetQueryResult<OccupationElementSummary> {
  return useOccupationSummary(client, code, 'abilities', params);
}

/** Knowledge areas ranked by importance. See {@link useOccupationSummary}. */
export function useOccupationKnowledge(
  client: OnetClient,
  code: string | null,
  params?: PaginationParams
): OnetQueryResult<OccupationElementSummary> {
  return useOccupationSummary(client, code, 'knowledge', params);
}

/** Work styles (personal characteristics). See {@link useOccupationSummary}. */
export function useOccupationWorkStyles(
  client: OnetClient,
  code: string | null,
  params?: PaginationParams
): OnetQueryResult<OccupationElementSummary> {
  return useOccupationSummary(client, code, 'work_styles', params);
}

/** General work activities. See {@link useOccupationSummary}. */
export function useOccupationWorkActivities(
  client: OnetClient,
  code: string | null,
  params?: PaginationParams
): OnetQueryResult<OccupationElementSummary> {
  return useOccupationSummary(client, code, 'work_activities', params);
}

/** Working conditions with response distributions. See {@link useOccupationSummary}. */
export function useOccupationWorkContext(
  client: OnetClient,
  code: string | null,
  params?: PaginationParams
): OnetQueryResult<WorkContextSummary> {
  return useOccupationSummary(client, code, 'work_context', params);
}

/** Occupation-specific tasks. See {@link useOccupationSummary}. */
export function useOccupationTasks(
  client: OnetClient,
  code: string | null,
  params?: PaginationParams
): OnetQueryResult<TasksSummary> {
  return useOccupationSummary(client, code, 'tasks', params);
}

/** Technology and software used. See {@link useOccupationSummary}. */
export function useOccupationTechnologySkills(
  client: OnetClient,
  code: string | null,
  params?: PaginationParams
): OnetQueryResult<TechnologySkillsSummary> {
  return useOccupationSummary(client, code, 'technology_skills', params);
}

/** Occupations with similar work. See {@link useOccupationSummary}. */
export function useOccupationRelatedOccupations(
  client: OnetClient,
  code: string | null,
  params?: PaginationParams
): OnetQueryResult<RelatedOccupationsSummary> {
  return useOccupationSummary(client, code, 'related_occupations', params);
}

/** Job Zone (1–5 preparation level). See {@link useOccupationSummary}. */
export function useOccupationJobZone(
  client: OnetClient,
  code: string | null
): OnetQueryResult<JobZoneSummary> {
  return useOccupationSummary(client, code, 'job_zone');
}

/** RIASEC interest profile. See {@link useOccupationSummary}. */
export function useOccupationInterests(
  client: OnetClient,
  code: string | null
): OnetQueryResult<InterestsSummary> {
  return useOccupationSummary(client, code, 'interests');
}

/** Education levels reported by workers. See {@link useOccupationSummary}. */
export function useOccupationEducation(
  client: OnetClient,
  code: string | null
): OnetQueryResult<EducationSummary> {
  return useOccupationSummary(client, code, 'education');
}

/** Detailed work activities. See {@link useOccupationSummary}. */
export function useOccupationDetailedWorkActivities(
  client: OnetClient,
  code: string | null,
  params?: PaginationParams
): OnetQueryResult<DetailedWorkActivitiesSummary> {
  return useOccupationSummary(client, code, 'detailed_work_activities', params);
}

/** Registered apprenticeship titles. See {@link useOccupationSummary}. */
export function useOccupationApprenticeship(
  client: OnetClient,
  code: string | null,
  params?: PaginationParams
): OnetQueryResult<ApprenticeshipSummary> {
  return useOccupationSummary(client, code, 'apprenticeship', params);
}

/** Professional associations. See {@link useOccupationSummary}. */
export function useOccupationProfessionalAssociations(
  client: OnetClient,
  code: string | null,
  params?: PaginationParams
): OnetQueryResult<ProfessionalAssociationsSummary> {
  return useOccupationSummary(
    client,
    code,
    'professional_associations',
    params
  );
}

/** Related military career summaries. See {@link useOccupationSummary}. */
export function useOccupationMilitaryCareerSummaries(
  client: OnetClient,
  code: string | null,
  params?: PaginationParams
): OnetQueryResult<MilitaryCareerSummariesResult> {
  return useOccupationSummary(
    client,
    code,
    'military_career_summaries',
    params
  );
}
