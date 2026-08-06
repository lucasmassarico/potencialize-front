import type { BulkQuestionPayload, MockApi } from "./fixtures/api.fixture";
import { expect, test } from "./fixtures/api.fixture";
import { QuestionsBulkPage } from "./pages/questions-bulk.page";

const CSV_HEADER = "Enunciado;Nivel;Peso;Alternativa correta;Codigo do descritor";

function expectSingleItemWithoutDescriptor(
    mockApi: MockApi,
    expected: Pick<BulkQuestionPayload, "text" | "correct_option">,
): void {
    expect(mockApi.bulkRequests).toHaveLength(1);
    expect(mockApi.bulkRequests[0].items).toHaveLength(1);

    const [item] = mockApi.bulkRequests[0].items;
    expect(item).toMatchObject(expected);
    expect(item).not.toHaveProperty("descriptor_id");
}

test.describe("importação de questões em lote", () => {
    test("tabela editável cria questão sem enviar descriptor_id", async ({ page, mockApi }) => {
        const bulk = new QuestionsBulkPage(page);
        await bulk.goto();
        await bulk.openImporter();
        await bulk.fillManualQuestion("Questão criada pela tabela", "C");
        await bulk.submitOneQuestion();

        expectSingleItemWithoutDescriptor(mockApi, {
            text: "Questão criada pela tabela",
            correct_option: "c",
        });
    });

    test("colagem CSV cria questão sem enviar descriptor_id", async ({ page, mockApi }) => {
        const bulk = new QuestionsBulkPage(page);
        await bulk.goto();
        await bulk.openImporter();
        await bulk.pasteCsv(
            `${CSV_HEADER}\nQuestão criada por colagem;Basico;1;B;`,
            "Questão criada por colagem",
        );
        await bulk.submitOneQuestion();

        expectSingleItemWithoutDescriptor(mockApi, {
            text: "Questão criada por colagem",
            correct_option: "b",
        });
    });

    test("upload CSV cria questão sem enviar descriptor_id", async ({ page, mockApi }) => {
        const bulk = new QuestionsBulkPage(page);
        await bulk.goto();
        await bulk.openImporter();
        await bulk.uploadCsv("Questao criada por arquivo");
        await bulk.submitOneQuestion();

        expectSingleItemWithoutDescriptor(mockApi, {
            text: "Questao criada por arquivo",
            correct_option: "d",
        });
    });

    test("seleciona descritor carregado da segunda página", async ({ page, mockApi }) => {
        const bulk = new QuestionsBulkPage(page);
        await bulk.goto();
        await bulk.openImporter();
        await bulk.fillManualQuestion("Questão com descritor paginado", "A");
        await bulk.selectDescriptorFromSecondPage();
        await bulk.submitOneQuestion();

        expect(mockApi.requestedDescriptorPages).toContain(2);
        expect(mockApi.bulkRequests).toHaveLength(1);
        expect(mockApi.bulkRequests[0].items).toEqual([
            expect.objectContaining({
                text: "Questão com descritor paginado",
                correct_option: "a",
                descriptor_id: 202,
            }),
        ]);
    });
});
