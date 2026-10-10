// Response field names are snake_case on purpose: they mirror the O*NET JSON
// payloads exactly, so responses are returned without any key remapping.

// ── Hook return types ─────────────────────────────────────────────────────────

/** State returned by every declarative data hook. */
export interface OnetQueryResult<T> {
  /**
   * Latest successful response. While a refetch is loading, and after a
   * refetch fails, this still holds the previous response, so check `loading`
   * and `error` before treating it as current.
   */
  data: T | null;
  /** True while a request is in flight. */
  loading: boolean;
  /** Error from the most recent request, or `null` if it succeeded. */
  error: Error | null;
}

// ── Shared ────────────────────────────────────────────────────────────────────

export interface OccupationTags {
  bright_outlook?: boolean;
}

export interface OccupationReference {
  href: string;
  code: string;
  title: string;
  tags: OccupationTags;
}

export interface PaginatedResponse {
  start: number;
  end: number;
  total: number;
  prev?: string;
  next?: string;
}

/** Selects a page of results. Both bounds are 1-based and inclusive. */
export interface PaginationParams {
  /** Index of the first result to return. @defaultValue `1` */
  start?: number;
  /** Index of the last result to return. The API default is `20`. */
  end?: number;
}

export interface ContentLink {
  href: string;
  title: string;
}

/** A Bright Outlook category on an occupation overview (no `href`, unlike {@link ContentLink}). */
export interface BrightOutlookCategory {
  code: string;
  title: string;
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface OccupationSearchParams extends PaginationParams {
  keyword: string;
}

export interface OccupationSearchResult extends PaginatedResponse {
  occupation: OccupationReference[];
}

// ── Occupation overview ────────────────────────────────────────────────────────

export interface OccupationUpdatedContent {
  title: string;
  source?: string;
  year?: number;
}

export interface OccupationUpdated {
  year: number;
  contents: OccupationUpdatedContent[];
}

export interface OccupationOverview {
  code: string;
  title: string;
  tags: OccupationTags;
  description: string;
  sample_of_reported_titles?: string[];
  also_see?: OccupationReference[];
  bright_outlook?: BrightOutlookCategory[];
  updated?: OccupationUpdated;
  summary_contents: ContentLink[];
  details_contents: ContentLink[];
  custom_contents: ContentLink[];
}

// ── Summary sections ──────────────────────────────────────────────────────────

// Shared element — abilities, skills, knowledge, work_styles, work_activities
export interface OccupationElement {
  id: string;
  related: string;
  name: string;
  description: string;
}

export interface OccupationElementSummary extends PaginatedResponse {
  element: OccupationElement[];
}

// Job zone
export interface JobZoneSummary {
  code: number;
  title: string;
  education: string;
  related_experience: string;
  job_training: string;
  job_zone_examples: string;
  svp_range: string;
}

// Tasks
export interface OccupationTask {
  id: string;
  related: string;
  title: string;
}

export interface TasksSummary extends PaginatedResponse {
  task: OccupationTask[];
}

// Interests
export interface InterestsSummary {
  interest_code: string;
  element: OccupationElement[];
}

// Education
export interface EducationResponse {
  code: number;
  title: string;
  description?: string;
  percentage_of_respondents?: number;
}

export interface EducationSummary {
  response: EducationResponse[];
}

// Work context (elements carry a response distribution)
export interface WorkContextResponse {
  percentage_of_respondents: number;
  description: string;
}

export interface WorkContextElement extends OccupationElement {
  response: WorkContextResponse[];
}

export interface WorkContextSummary extends PaginatedResponse {
  element: WorkContextElement[];
}

// Technology skills
export interface TechnologyExample {
  title: string;
  href: string;
  hot_technology?: boolean;
  in_demand?: boolean;
  percentage?: number;
}

export interface TechnologyCategory {
  code: number;
  related: string;
  title: string;
  example: TechnologyExample[];
  example_more?: TechnologyExample[];
}

export interface TechnologySkillsRef {
  total: number;
  href: string;
}

export interface TechnologySkillsSummary extends PaginatedResponse {
  hot_technology?: TechnologySkillsRef;
  in_demand_skills?: TechnologySkillsRef;
  category: TechnologyCategory[];
}

// Related occupations
export interface RelatedOccupation extends OccupationReference {
  supplemental?: boolean;
}

export interface RelatedOccupationsSummary extends PaginatedResponse {
  occupation: RelatedOccupation[];
}

// Professional associations
export type AssociationCategory = 'national' | 'regional' | 'other';

export interface AssociationCategoryRef {
  code: AssociationCategory;
  title: string;
}

export interface ProfessionalAssociation {
  url: string;
  name: string;
  ally?: boolean;
  category: AssociationCategoryRef;
}

export interface ProfessionalAssociationsSummary extends PaginatedResponse {
  source: ProfessionalAssociation[];
}

// Military career summaries
export interface MilitaryCareerSummary {
  url: string;
  title: string;
}

export interface MilitaryCareerSummariesResult extends PaginatedResponse {
  career_summary: MilitaryCareerSummary[];
}

// Detailed work activities
export interface DetailedWorkActivity {
  id: string;
  title: string;
  related: string;
}

export interface DetailedWorkActivitiesSummary extends PaginatedResponse {
  activity: DetailedWorkActivity[];
}

// Apprenticeship
export interface ApprenticeshipSummary extends PaginatedResponse {
  example_title: string[];
}

// ── Summary section lookup ────────────────────────────────────────────────────

/** Maps each `/online/occupations/{code}/summary/{section}` name to its response type. */
export interface OccupationSummarySectionMap {
  abilities: OccupationElementSummary;
  skills: OccupationElementSummary;
  knowledge: OccupationElementSummary;
  work_styles: OccupationElementSummary;
  work_activities: OccupationElementSummary;
  work_context: WorkContextSummary;
  tasks: TasksSummary;
  technology_skills: TechnologySkillsSummary;
  related_occupations: RelatedOccupationsSummary;
  job_zone: JobZoneSummary;
  interests: InterestsSummary;
  education: EducationSummary;
  detailed_work_activities: DetailedWorkActivitiesSummary;
  apprenticeship: ApprenticeshipSummary;
  professional_associations: ProfessionalAssociationsSummary;
  military_career_summaries: MilitaryCareerSummariesResult;
}

/** Name of an occupation summary section, e.g. `'skills'` or `'job_zone'`. */
export type OccupationSummarySection = keyof OccupationSummarySectionMap;
