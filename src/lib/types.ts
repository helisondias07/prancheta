export type ApplicationStatus =
  | "rascunho"
  | "candidatou"
  | "aguardando"
  | "feedback-pedido"
  | "encerrada";

export type JobSource = "manual" | "greenhouse" | "remotar";

export type Job = {
  id: string;
  title: string;
  company: string;
  url: string;
  location: string;
  text: string;
  source: JobSource;
  addedAt: string;
};

export type Project = {
  id: string;
  name: string;
  url: string;
  whatIDid: string;
  confirmedSkills?: string[];
};

export type Application = {
  id: string;
  jobId: string;
  title: string;
  company: string;
  url: string;
  /** Origem informada ao registrar; ausente em registros antigos. */
  source?: JobSource;
  /** Job.addedAt capturado ao registrar; ausente em registros antigos. */
  jobAddedAt?: string;
  status: ApplicationStatus;
  appliedAt: string | null;
  notes: string;
  feedbackDueAt: string | null;
};

export type Profile = {
  displayName: string;
  headline: string;
  cvText: string;
  portfolioUrl: string;
  projects: Project[];
};

export type Store = {
  version: 1;
  profile: Profile;
  jobs: Job[];
  applications: Application[];
};

export const emptyStore = (): Store => ({
  version: 1,
  profile: {
    displayName: "",
    headline: "",
    cvText: "",
    portfolioUrl: "",
    projects: [],
  },
  jobs: [],
  applications: [],
});
