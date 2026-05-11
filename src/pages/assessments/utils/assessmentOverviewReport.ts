import type {
    AssessmentOverviewDTO,
    OverviewByQuestion,
    OverviewRankCriteria,
    OverviewRankedItem,
    SkillLevel,
} from "../../../types/assessments";

const SKILL_LABELS: Record<SkillLevel, string> = {
    abaixo: "Abaixo do Básico",
    basico: "Básico",
    adequado: "Adequado",
    avancado: "Avançado",
};

const SKILL_ORDER: Record<SkillLevel, number> = {
    abaixo: 1,
    basico: 2,
    adequado: 3,
    avancado: 4,
};

const SUBJECT_LABELS: Record<string, string> = {
    portugues: "Português",
    matematica: "Matemática",
    ciencias: "Ciências",
    historia: "História",
    geografia: "Geografia",
    ingles: "Inglês",
    artes: "Artes",
    educacao_fisica: "Educação Física",
    tecnologia: "Tecnologia",
    redacao: "Redação",
    geral: "Geral",
    outro: "Outro",
};

const OPTION_LETTERS = ["a", "b", "c", "d", "e"] as const;

export interface ReportSummaryItem {
    label: string;
    value: string;
    detail: string;
}

export interface ReportSkillRow {
    skillLevel: SkillLevel;
    level: string;
    questions: number;
    answers: number;
    correct: number;
    accuracyLabel: string;
    accuracyValue: number;
    studentsAnswered: number;
}

export interface ReportQuestionRow {
    id: number;
    number: string;
    text: string;
    skillLevel: SkillLevel;
    level: string;
    descriptor: string;
    descriptorTitle: string;
    descriptorLabel: string;
    weight: number;
    correctOption: string;
    answers: number;
    correct: number;
    accuracyLabel: string;
    accuracyValue: number;
    distribution: string;
    distributionValues: ReportOptionDistribution[];
    distributionTotal: number;
}

export type ReportOptionLabel = Uppercase<(typeof OPTION_LETTERS)[number]> | "Branco";

export interface ReportOptionDistribution {
    option: ReportOptionLabel;
    count: number;
    isCorrect: boolean;
}

export interface ReportRankingRow {
    id: number;
    number: string;
    text: string;
    level: string;
    descriptor: string;
    accuracyLabel: string;
    accuracyValue: number;
    answers: number;
}

export interface ReportRankingSection {
    title: string;
    criteria: string;
    items: ReportRankingRow[];
}

export interface AssessmentOverviewReport {
    title: string;
    fileName: string;
    dateLabel: string;
    subjectLabel: string;
    generatedAtLabel: string;
    summary: ReportSummaryItem[];
    skills: ReportSkillRow[];
    hardest: ReportRankingSection;
    easiest: ReportRankingSection;
    questions: ReportQuestionRow[];
}

const safeNumber = (value: number | null | undefined): number =>
    Number.isFinite(value as number) ? (value as number) : 0;

const clampRatio = (value: number): number => Math.max(0, Math.min(1, value));

export const formatPercent = (value: number | null | undefined, digits = 1): string => {
    if (value == null || !Number.isFinite(value)) return "-";
    return `${(clampRatio(value) * 100).toFixed(digits)}%`;
};

export const questionNumberLabel = (question: { display_order?: number | null; question_id: number }): string =>
    `Questão ${question.display_order ?? question.question_id}`;

export const subjectLabel = (kind?: string, other?: string | null): string => {
    if (!kind) return "-";
    if (kind === "outro") return other?.trim() || "Outro";
    return SUBJECT_LABELS[kind] ?? kind;
};

export const slugify = (value: string): string => {
    const cleaned = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
    return cleaned || "avaliacao";
};

export const formatDate = (value?: string | null): string => {
    if (!value) return "-";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("pt-BR");
};

const rankBasisLabel = (basis: string): string => {
    const map: Record<string, string> = {
        accuracy_asc: "menor taxa de acerto",
        accuracy_desc: "maior taxa de acerto",
        accuracy: "taxa de acerto",
    };
    return map[basis] ?? basis;
};

export const formatRankCriteria = (criteria: OverviewRankCriteria | undefined): string => {
    if (!criteria) return "";
    return `Top ${criteria.top_n ?? 3} por ${rankBasisLabel(criteria.basis)}; mínimo de ${criteria.min_answers ?? 5} respostas.`;
};

export const formatDistribution = (question: OverviewByQuestion): string =>
    [
        ...OPTION_LETTERS.map((option) => {
            const marker = option === question.correct_option ? "*" : "";
            return `${option.toUpperCase()}${marker}: ${safeNumber(question.option_distribution[option])}`;
        }),
        `Branco: ${safeNumber(question.option_distribution.blank)}`,
    ].join(" | ");

export const formatDescriptorLabel = (code?: string | null, title?: string | null): string => {
    const cleanCode = code?.trim();
    const cleanTitle = title?.trim();

    if (cleanCode && cleanTitle) return `${cleanCode} - ${cleanTitle}`;
    return cleanCode || cleanTitle || "-";
};

const toDistributionValues = (question: OverviewByQuestion): ReportOptionDistribution[] => [
    ...OPTION_LETTERS.map((option) => ({
        option: option.toUpperCase() as ReportOptionLabel,
        count: safeNumber(question.option_distribution[option]),
        isCorrect: option === question.correct_option,
    })),
    {
        option: "Branco",
        count: safeNumber(question.option_distribution.blank),
        isCorrect: false,
    },
];

const toSkillRows = (overview: AssessmentOverviewDTO): ReportSkillRow[] =>
    [...overview.by_skill]
        .sort((a, b) => SKILL_ORDER[a.skill_level] - SKILL_ORDER[b.skill_level])
        .map((skill) => ({
            skillLevel: skill.skill_level,
            level: SKILL_LABELS[skill.skill_level],
            questions: safeNumber(skill.questions),
            answers: safeNumber(skill.answers),
            correct: safeNumber(skill.correct),
            accuracyLabel: formatPercent(skill.accuracy),
            accuracyValue: clampRatio(safeNumber(skill.accuracy)),
            studentsAnswered: safeNumber(skill.students_answered),
        }));

const toQuestionRows = (overview: AssessmentOverviewDTO): ReportQuestionRow[] =>
    [...overview.by_question]
        .sort((a, b) => (a.display_order ?? a.question_id) - (b.display_order ?? b.question_id))
        .map((question) => {
            const distributionValues = toDistributionValues(question);
            const distributionTotal = distributionValues.reduce((total, item) => total + item.count, 0);

            return {
                id: question.question_id,
                number: questionNumberLabel(question),
                text: question.text_short?.trim() || "(sem enunciado)",
                skillLevel: question.skill_level,
                level: SKILL_LABELS[question.skill_level],
                descriptor: question.descriptor_code?.trim() || "-",
                descriptorTitle: question.descriptor_title?.trim() || "",
                descriptorLabel: formatDescriptorLabel(question.descriptor_code, question.descriptor_title),
                weight: safeNumber(question.weight),
                correctOption: question.correct_option.toUpperCase(),
                answers: safeNumber(question.answers),
                correct: safeNumber(question.correct),
                accuracyLabel: formatPercent(question.accuracy),
                accuracyValue: clampRatio(safeNumber(question.accuracy)),
                distribution: formatDistribution(question),
                distributionValues,
                distributionTotal,
            };
        });

const toRankingRows = (items: OverviewRankedItem[]): ReportRankingRow[] =>
    [...items]
        .sort((a, b) => (a.display_order ?? a.question_id) - (b.display_order ?? b.question_id))
        .map((item) => ({
            id: item.question_id,
            number: questionNumberLabel(item),
            text: item.text_short?.trim() || "(sem enunciado)",
            level: SKILL_LABELS[item.skill_level],
            descriptor: item.descriptor_code?.trim() || "-",
            accuracyLabel: formatPercent(item.accuracy),
            accuracyValue: clampRatio(safeNumber(item.accuracy)),
            answers: safeNumber(item.answers),
        }));

export const buildAssessmentOverviewReport = (
    overview: AssessmentOverviewDTO,
    generatedAt = new Date(),
): AssessmentOverviewReport => {
    const totalQuestions = safeNumber(overview.overall.total_questions);
    const totalAnswers = safeNumber(overview.overall.total_answers);
    const totalStudents = safeNumber(overview.population.students_in_class);
    const studentsAnswered = safeNumber(overview.population.students_answered_any);
    const correct = safeNumber(overview.overall.correct);
    const expectedAnswers = totalQuestions * totalStudents;
    const hardestTop = overview.hardest[0];

    const title = overview.assessment.title?.trim() || `Avaliação ${overview.assessment.id}`;
    const coverage = expectedAnswers > 0 ? formatPercent(totalAnswers / expectedAnswers) : "-";

    return {
        title,
        fileName: `${slugify(title)}-overview.pdf`,
        dateLabel: formatDate(overview.assessment.date),
        subjectLabel: subjectLabel(overview.assessment.subject_kind, overview.assessment.subject_other ?? null),
        generatedAtLabel: generatedAt.toLocaleString("pt-BR"),
        summary: [
            {
                label: "Taxa de acerto",
                value: formatPercent(overview.overall.accuracy),
                detail: `${correct} de ${totalAnswers} respostas`,
            },
            {
                label: "Participação",
                value: formatPercent(overview.population.participation_rate),
                detail: `${studentsAnswered} de ${totalStudents} alunos responderam`,
            },
            {
                label: "Questões",
                value: `${totalAnswers}/${expectedAnswers || totalQuestions}`,
                detail: `${coverage} de cobertura`,
            },
            {
                label: "Questão crítica",
                value: hardestTop ? questionNumberLabel(hardestTop) : "-",
                detail: hardestTop
                    ? `${formatPercent(hardestTop.accuracy)} de acerto - ${safeNumber(hardestTop.answers)} respostas`
                    : "Sem dados suficientes",
            },
        ],
        skills: toSkillRows(overview),
        hardest: {
            title: "Questões com pior desempenho",
            criteria: formatRankCriteria(overview.hardest_criteria),
            items: toRankingRows(overview.hardest),
        },
        easiest: {
            title: "Questões com melhor desempenho",
            criteria: formatRankCriteria(overview.easiest_criteria),
            items: toRankingRows(overview.easiest),
        },
        questions: toQuestionRows(overview),
    };
};
