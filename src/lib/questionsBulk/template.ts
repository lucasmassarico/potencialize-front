import type { WorkBook } from "xlsx";
import type { DescriptorOut } from "../../types/descriptors";
import { FRIENDLY_HEADERS } from "./parse";

interface TemplateOptions {
    sampleDescriptorCode?: string | null;
    weightMode?: "per_question" | "by_skill" | string;
}

function buildSampleRows(opts: TemplateOptions): Array<Record<string, string>> {
    const code = opts.sampleDescriptorCode ?? "";
    const showSkill = opts.weightMode !== "per_question";
    const showWeight = opts.weightMode !== "by_skill";

    return [
        {
            [FRIENDLY_HEADERS.text]: "Quanto é 2 + 2?",
            [FRIENDLY_HEADERS.skill_level]: showSkill ? "Básico" : "",
            [FRIENDLY_HEADERS.weight]: showWeight ? "1" : "",
            [FRIENDLY_HEADERS.correct_option]: "A",
            [FRIENDLY_HEADERS.descriptor_code]: code,
        },
        {
            [FRIENDLY_HEADERS.text]: "Resolva o problema de multiplicação simples.",
            [FRIENDLY_HEADERS.skill_level]: showSkill ? "Adequado" : "",
            [FRIENDLY_HEADERS.weight]: showWeight ? "1.5" : "",
            [FRIENDLY_HEADERS.correct_option]: "C",
            [FRIENDLY_HEADERS.descriptor_code]: "",
        },
        {
            [FRIENDLY_HEADERS.text]: "Questão de raciocínio mais elaborada.",
            [FRIENDLY_HEADERS.skill_level]: showSkill ? "Avançado" : "",
            [FRIENDLY_HEADERS.weight]: showWeight ? "2" : "",
            [FRIENDLY_HEADERS.correct_option]: "E",
            [FRIENDLY_HEADERS.descriptor_code]: "",
        },
    ];
}

export async function buildTemplateWorkbook(
    descriptors: DescriptorOut[] | undefined,
    weightMode?: TemplateOptions["weightMode"],
): Promise<WorkBook> {
    const XLSX = await import("xlsx");
    const sampleCode = descriptors?.[0]?.code ?? "";
    const headers = [
        FRIENDLY_HEADERS.text,
        FRIENDLY_HEADERS.skill_level,
        FRIENDLY_HEADERS.weight,
        FRIENDLY_HEADERS.correct_option,
        FRIENDLY_HEADERS.descriptor_code,
    ];

    const rows = buildSampleRows({ sampleDescriptorCode: sampleCode, weightMode });
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    ws["!cols"] = [
        { wch: 50 },
        { wch: 18 },
        { wch: 8 },
        { wch: 18 },
        { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questões");

    if (descriptors && descriptors.length > 0) {
        const refRows = descriptors.map((d) => ({
            "Código": d.code,
            "Título": d.title,
            "Área": d.area ?? "",
            "Ano": d.grade_year ?? "",
            "Descrição": d.description ?? "",
        }));
        const refWs = XLSX.utils.json_to_sheet(refRows);
        refWs["!cols"] = [{ wch: 22 }, { wch: 40 }, { wch: 14 }, { wch: 8 }, { wch: 60 }];
        XLSX.utils.book_append_sheet(wb, refWs, "Descritores disponíveis");
    }

    return wb;
}

export async function downloadTemplate(
    descriptors: DescriptorOut[] | undefined,
    weightMode?: TemplateOptions["weightMode"],
    filename = "modelo-importacao-questoes.xlsx",
): Promise<void> {
    const XLSX = await import("xlsx");
    const wb = await buildTemplateWorkbook(descriptors, weightMode);
    XLSX.writeFile(wb, filename);
}
