// src/lib/apiErrors.ts
export type HttpStatus = 401 | 403 | 404 | 409 | 422;

type RouteRule = {
    name: string;
    re: RegExp; // expressa o path SEM basePath (ex.: /api/v1)
    methods?: string[];
    messages?: Partial<Record<HttpStatus, string>>;
};

export const DEFAULT_MESSAGES: Partial<Record<HttpStatus, string>> = {
    401: "Não autenticado.",
    403: "Proibido.",
    404: "Não encontrado.",
    409: "Conflito/Duplicado.",
    422: "Validação: verifique os campos.",
};

export const ROUTE_ERROR_RULES: RouteRule[] = [
    { name: "auth_login", re: /^\/auth\/login$/, methods: ["POST"], messages: { 401: "E-mail ou senha incorretos." } },

    { name: "classes_list", re: /^\/classes\/?$/, methods: ["GET"], messages: { 403: "Permissão negada para professores." } },

    { name: "classes_detail", re: /^\/classes\/\d+$/, methods: ["GET"], messages: { 404: "Turma não encontrada." } },

    { name: "teachers_post", re: /^\/teachers\/?$/, methods: ["POST"], messages: { 409: "E-mail já utilizado." } },
    { name: "teachers_put", re: /^\/teachers\/\d+$/, methods: ["PUT"], messages: { 409: "E-mail já utilizado." } },

    { name: "student_answers_post", re: /^\/student-answers\/?$/, methods: ["POST"], messages: { 409: "Duplicado.", 404: "Aluno/Questão não encontrado(s)." } },
    {
        name: "student_answers_bulk",
        re: /^\/student-answers\/bulk$/,
        methods: ["POST"],
        messages: { 409: "Duplicado (payload ou BD).", 404: "Aluno/Questão não encontrado(s)." },
    },
    { name: "student_answer_detail", re: /^\/student-answers\/\d+$/, methods: ["GET", "PUT", "DELETE"], messages: { 404: "Resposta não encontrada." } },

    { name: "students_bulk", re: /^\/students\/bulk$/, methods: ["POST"], messages: { 404: "Turma não encontrada." } },

    { name: "questions_bulk", re: /^\/questions\/bulk(?:\/\d+)?$/, methods: ["POST"], messages: { 404: "Avaliação não encontrada." } },
    { name: "questions_detail", re: /^\/questions\/\d+$/, methods: ["GET", "PUT", "DELETE"], messages: { 404: "Questão não encontrada." } },

    { name: "assessments_matrix", re: /^\/assessments\/\d+\/analytics\/matrix$/, methods: ["GET"], messages: { 404: "Avaliação não encontrada." } },
    { name: "assessments_overview", re: /^\/assessments\/\d+\/analytics\/overview$/, methods: ["GET"], messages: { 404: "Avaliação não encontrada." } },
];

function stripOriginAndBasePath(url: string) {
    // remove https://host e o /api/vN (o seu basePath é /api/v1)
    const noOrigin = url.replace(/^https?:\/\/[^/]+/i, "");
    return noOrigin.replace(/^\/api\/v\d+/, "") || "/";
}

export function messageFor(method: string | undefined, url: string | undefined, status: number, serverMsg?: string) {
    const m = (method ?? "GET").toUpperCase();
    const path = stripOriginAndBasePath(url ?? "");
    const rule = ROUTE_ERROR_RULES.find((r) => r.re.test(path) && (!r.methods || r.methods.includes(m)));
    const specific = (rule?.messages as any)?.[status];
    const base = (DEFAULT_MESSAGES as any)[status];

    // Preferimos a mensagem útil do servidor, se houver
    let msg = serverMsg && serverMsg.trim() ? serverMsg : specific || base || "Erro inesperado.";

    // Lapidação extra para login 401 genérico
    if (status === 401 && rule?.name === "auth_login" && /não autenticado|unauthorized/i.test(msg)) {
        msg = "E-mail ou senha incorretos.";
    }
    return msg;
}
