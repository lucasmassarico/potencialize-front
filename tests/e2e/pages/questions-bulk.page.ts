import { expect, type Locator, type Page } from "@playwright/test";

const assessmentQuestionsPath = "/classes/1/assessments/11/questions";

export class QuestionsBulkPage {
    readonly dialog: Locator;

    constructor(private readonly page: Page) {
        this.dialog = page.getByRole("dialog", { name: /Importar questões em lote/i });
    }

    async goto(): Promise<void> {
        await this.page.goto(assessmentQuestionsPath);
        await expect(this.page.getByRole("heading", { name: "Questões", exact: true })).toBeVisible();
    }

    async openImporter(): Promise<void> {
        await this.page.getByRole("button", { name: "Importar em lote" }).click();
        await expect(this.dialog).toBeVisible();
    }

    async fillManualQuestion(text: string, correctOption: string): Promise<void> {
        await this.dialog.getByPlaceholder(/Digite o enunciado da questão/i).fill(text);
        await this.dialog.getByRole("button", { name: correctOption, exact: true }).click();
        await this.expectOneQuestionReady();
    }

    async pasteCsv(csv: string, expectedText: string): Promise<void> {
        await this.dialog.getByRole("tab", { name: "Colar texto" }).click();
        await this.dialog.getByRole("textbox", { name: "Conteúdo colado" }).fill(csv);
        await this.dialog.getByRole("button", { name: "Carregar na tabela" }).click();
        await expect(this.dialog.getByPlaceholder(/Digite o enunciado da questão/i)).toHaveValue(expectedText);
        await this.expectOneQuestionReady();
    }

    async uploadCsv(expectedText: string): Promise<void> {
        await this.dialog.getByRole("tab", { name: "Importar planilha" }).click();

        const fileChooserPromise = this.page.waitForEvent("filechooser");
        await this.dialog.getByRole("button", { name: "Selecionar arquivo", exact: true }).click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles("tests/e2e/fixtures/files/questions-no-descriptor.csv");

        await expect(this.dialog.getByPlaceholder(/Digite o enunciado da questão/i)).toHaveValue(expectedText);
        await this.expectOneQuestionReady();
    }

    async selectDescriptorFromSecondPage(): Promise<void> {
        const descriptorSearch = this.dialog.getByPlaceholder(/Buscar descritor/i);
        await descriptorSearch.fill("D-PAG-2");
        await this.page.getByRole("option", { name: /D-PAG-2/ }).click();
    }

    async submitOneQuestion(): Promise<void> {
        const responsePromise = this.page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname === "/api/v1/questions/bulk/11",
        );

        await this.dialog.getByRole("button", { name: /^Importar 1 questão$/ }).click();
        const response = await responsePromise;
        expect(response.ok()).toBe(true);
        await expect(this.dialog).toBeHidden();
    }

    private async expectOneQuestionReady(): Promise<void> {
        await expect(this.dialog.getByRole("button", { name: /^Importar 1 questão$/ })).toBeEnabled();
    }
}
