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
  PaginationParams,
  ProfessionalAssociationsSummary,
  RelatedOccupationsSummary,
  TasksSummary,
  TechnologySkillsSummary,
  WorkContextSummary,
} from '../types'

const BASE_URL = 'https://services.onetcenter.org/ws'

export class OnetApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'OnetApiError'
  }
}

export class OnetClient {
  constructor(private readonly apiKey: string) {}

  private async get<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value))
        }
      }
    }
    const response = await fetch(url.toString(), {
      headers: {
        'X-API-Key': this.apiKey,
        Accept: 'application/json',
      },
    })
    if (!response.ok) {
      throw new OnetApiError(response.status, await response.text())
    }
    return response.json() as Promise<T>
  }

  private summaryPath(code: string, section: string): string {
    return `/online/occupations/${code}/summary/${section}`
  }

  private getSummary<T>(path: string, params?: PaginationParams): Promise<T> {
    return this.get<T>(path, params as Record<string, string | number | undefined>)
  }

  // ── Search ────────────────────────────────────────────────────────────────

  searchOccupations(params: OccupationSearchParams): Promise<OccupationSearchResult> {
    const { keyword, start, end } = params
    return this.get<OccupationSearchResult>('/online/search', { keyword, start, end })
  }

  // ── Occupation overview ───────────────────────────────────────────────────

  getOccupation(code: string): Promise<OccupationOverview> {
    return this.get<OccupationOverview>(`/online/occupations/${code}/`)
  }

  // ── Summary sections ──────────────────────────────────────────────────────

  getOccupationAbilities(code: string, params?: PaginationParams): Promise<OccupationElementSummary> {
    return this.getSummary(this.summaryPath(code, 'abilities'), params)
  }

  getOccupationSkills(code: string, params?: PaginationParams): Promise<OccupationElementSummary> {
    return this.getSummary(this.summaryPath(code, 'skills'), params)
  }

  getOccupationKnowledge(code: string, params?: PaginationParams): Promise<OccupationElementSummary> {
    return this.getSummary(this.summaryPath(code, 'knowledge'), params)
  }

  getOccupationWorkStyles(code: string, params?: PaginationParams): Promise<OccupationElementSummary> {
    return this.getSummary(this.summaryPath(code, 'work_styles'), params)
  }

  getOccupationWorkActivities(code: string, params?: PaginationParams): Promise<OccupationElementSummary> {
    return this.getSummary(this.summaryPath(code, 'work_activities'), params)
  }

  getOccupationWorkContext(code: string, params?: PaginationParams): Promise<WorkContextSummary> {
    return this.getSummary(this.summaryPath(code, 'work_context'), params)
  }

  getOccupationTasks(code: string, params?: PaginationParams): Promise<TasksSummary> {
    return this.getSummary(this.summaryPath(code, 'tasks'), params)
  }

  getOccupationTechnologySkills(code: string, params?: PaginationParams): Promise<TechnologySkillsSummary> {
    return this.getSummary(this.summaryPath(code, 'technology_skills'), params)
  }

  getOccupationRelatedOccupations(code: string, params?: PaginationParams): Promise<RelatedOccupationsSummary> {
    return this.getSummary(this.summaryPath(code, 'related_occupations'), params)
  }

  getOccupationJobZone(code: string): Promise<JobZoneSummary> {
    return this.getSummary(this.summaryPath(code, 'job_zone'))
  }

  getOccupationInterests(code: string): Promise<InterestsSummary> {
    return this.getSummary(this.summaryPath(code, 'interests'))
  }

  getOccupationEducation(code: string): Promise<EducationSummary> {
    return this.getSummary(this.summaryPath(code, 'education'))
  }

  getOccupationDetailedWorkActivities(code: string, params?: PaginationParams): Promise<DetailedWorkActivitiesSummary> {
    return this.getSummary(this.summaryPath(code, 'detailed_work_activities'), params)
  }

  getOccupationApprenticeship(code: string, params?: PaginationParams): Promise<ApprenticeshipSummary> {
    return this.getSummary(this.summaryPath(code, 'apprenticeship'), params)
  }

  getOccupationProfessionalAssociations(code: string, params?: PaginationParams): Promise<ProfessionalAssociationsSummary> {
    return this.getSummary(this.summaryPath(code, 'professional_associations'), params)
  }

  getOccupationMilitaryCareerSummaries(code: string, params?: PaginationParams): Promise<MilitaryCareerSummariesResult> {
    return this.getSummary(this.summaryPath(code, 'military_career_summaries'), params)
  }
}
