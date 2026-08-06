import {
    test as base,
    expect,
    type BrowserContext,
    type Page,
    type Route,
} from "@playwright/test";

export interface BulkQuestionPayload {
    text: string;
    skill_level: string;
    weight: number;
    correct_option: string;
    assessment_id?: number;
    descriptor_id?: number;
    display_order?: number;
}

export interface BulkRequestPayload {
    items: BulkQuestionPayload[];
}

const assessment = {
    id: 11,
    title: "Avaliação E2E",
    date: "2026-08-06",
    weight_mode: "fixed_all",
    class_id: 1,
    subject_kind: "matematica",
};

const descriptorPageOne = {
    id: 101,
    code: "D-PAG-1",
    title: "Descritor da primeira página",
    area: "Matemática",
    grade_year: 6,
    owner_teacher_id: null,
};

const descriptorPageTwo = {
    id: 202,
    code: "D-PAG-2",
    title: "Descritor da segunda página",
    area: "Matemática",
    grade_year: 6,
    owner_teacher_id: null,
};

async function addSessionCookies(context: BrowserContext, baseURL: string): Promise<void> {
    await context.addCookies([
        {
            name: "csrf_access_token",
            value: "e2e-access-csrf",
            url: baseURL,
            httpOnly: false,
            sameSite: "Lax",
        },
        {
            name: "csrf_refresh_token",
            value: "e2e-refresh-csrf",
            url: baseURL,
            httpOnly: false,
            sameSite: "Lax",
        },
    ]);
}

export class MockApi {
    readonly bulkRequests: BulkRequestPayload[] = [];
    readonly requestedDescriptorPages: number[] = [];

    constructor(private readonly page: Page) {}

    async install(): Promise<void> {
        await this.page.route("**/api/v1/**", (route) => this.handle(route));
    }

    private async handle(route: Route): Promise<void> {
        const request = route.request();
        const url = new URL(request.url());
        const { pathname } = url;
        const method = request.method();

        if (method === "OPTIONS") {
            await route.fulfill({ status: 204 });
            return;
        }

        if (method === "GET" && pathname === "/api/v1/auth/me") {
            await route.fulfill({ json: { role: "admin" } });
            return;
        }

        if (method === "POST" && pathname === "/api/v1/auth/refresh") {
            await route.fulfill({ json: { role: "admin" } });
            return;
        }

        if (method === "GET" && pathname === "/api/v1/assessments/11") {
            await route.fulfill({ json: assessment });
            return;
        }

        if (method === "GET" && pathname === "/api/v1/classes/1") {
            await route.fulfill({
                json: {
                    id: 1,
                    name: "Turma E2E",
                    year: 2026,
                    teacher_id: 1,
                    students: [],
                    assessments: [assessment],
                },
            });
            return;
        }

        if (method === "GET" && pathname === "/api/v1/questions/") {
            await route.fulfill({
                json: {
                    items: [],
                    page: 1,
                    per_page: 20,
                    total: 0,
                    total_pages: 1,
                    has_next: false,
                    has_prev: false,
                },
            });
            return;
        }

        if (method === "GET" && pathname === "/api/v1/descriptors/") {
            const page = Number(url.searchParams.get("page") ?? "1");
            this.requestedDescriptorPages.push(page);
            const isLastPage = page >= 2;

            await route.fulfill({
                json: {
                    items: isLastPage ? [descriptorPageTwo] : [descriptorPageOne],
                    page,
                    per_page: 100,
                    total: 2,
                    total_pages: 2,
                    has_next: !isLastPage,
                    has_prev: page > 1,
                },
            });
            return;
        }

        if (method === "POST" && pathname === "/api/v1/questions/bulk/11") {
            const payload = request.postDataJSON() as BulkRequestPayload;
            this.bulkRequests.push(payload);
            await route.fulfill({
                status: 201,
                json: {
                    items: payload.items.map((item, index) => ({
                        id: 1_000 + index,
                        ...item,
                    })),
                },
            });
            return;
        }

        await route.fulfill({
            status: 404,
            json: { message: `Endpoint E2E sem mock: ${method} ${pathname}` },
        });
    }
}

interface ApiFixtures {
    mockApi: MockApi;
}

export const test = base.extend<ApiFixtures>({
    mockApi: async ({ page, context, baseURL }, provide) => {
        if (!baseURL) throw new Error("Playwright baseURL não configurada.");

        await addSessionCookies(context, baseURL);
        const mockApi = new MockApi(page);
        await mockApi.install();
        await provide(mockApi);
    },
});

export { expect };
