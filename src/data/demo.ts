export type DemoProject = {
  id: string;
  name: string;
  location: string;
  status: "planning" | "in_progress" | "completed";
  description: string;
  progress: number;
  currentStage: string;
  image: string;
};

export const statusLabels = {
  planning: "Planejamento",
  in_progress: "Em andamento",
  completed: "Finalizada",
} as const;

export const scheduleLabels = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
  delayed: "Atrasada",
} as const;

export const demoProjects: DemoProject[] = [
  {
    id: "demo-1",
    name: "Residencial Aurora",
    location: "Joinville, SC",
    status: "in_progress",
    description: "Torre residencial com execução estrutural avançada, controle semanal de qualidade e entrega planejada por etapas.",
    progress: 68,
    currentStage: "Estrutura e vedação",
    image: "/placeholder.svg",
  },
  {
    id: "demo-2",
    name: "Centro Empresarial Norte",
    location: "Curitiba, PR",
    status: "planning",
    description: "Complexo corporativo em fase de compatibilização de projetos, orçamento executivo e planejamento logístico.",
    progress: 24,
    currentStage: "Projetos executivos",
    image: "/placeholder.svg",
  },
  {
    id: "demo-3",
    name: "Condomínio Vista Parque",
    location: "Florianópolis, SC",
    status: "completed",
    description: "Empreendimento entregue com áreas comuns completas, documentação finalizada e atendimento pós-obra ativo.",
    progress: 100,
    currentStage: "Entregue",
    image: "/placeholder.svg",
  },
];

export const demoReports = [
  { id: "r1", title: "Concretagem da laje técnica", date: "2026-04-22", stage: "Estrutura", description: "Concretagem concluída com registro fotográfico e validação da equipe técnica." },
  { id: "r2", title: "Instalações hidráulicas", date: "2026-04-15", stage: "Instalações", description: "Distribuição dos pontos hidráulicos executada no pavimento tipo." },
  { id: "r3", title: "Alvenaria do bloco B", date: "2026-04-08", stage: "Vedação", description: "Avanço de alvenaria, conferência de prumo e liberação parcial." },
];

export const demoSchedule = [
  { stage: "Fundação", start: "2026-01-10", end: "2026-02-20", status: "completed" as const, progress: 100 },
  { stage: "Estrutura", start: "2026-02-21", end: "2026-05-30", status: "in_progress" as const, progress: 72 },
  { stage: "Instalações", start: "2026-05-05", end: "2026-07-18", status: "in_progress" as const, progress: 38 },
  { stage: "Acabamento", start: "2026-07-20", end: "2026-10-15", status: "pending" as const, progress: 0 },
];
