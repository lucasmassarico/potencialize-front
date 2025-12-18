export interface StudentResultsDTO {
    student: { id: number; name: string; class_id: number };
    assessment: { id: number; title: string };
    answers: Array<{
        answer_id: number;
        question_id: number;
        marked_option: "a" | "b" | "c" | "d" | "e";
        is_correct: boolean;
    }>;
    summary: {
        answered: number;
        correct: number;
        accuracy: number; // 0..1
    };
    score: {
        basis: "by_points" | "by_accuracy";
        percent: number; // 0..100
        totals: {
            questions: number;
            answered: number;
            correct: number;
            points_total: number;
            points_correct: number;
        };
    };
    predicted_level: {
        key: "ABAIXO_BASICO" | "BASICO" | "ADEQUADO" | "AVANCADO";
        label: string;
        color: string; // hex
    };
    policy: {
        basis: "by_points" | "by_accuracy";
        count_blank_as_wrong: boolean;
        advanced_min: number;
        adequate_min: number;
        basic_min: number;
    };
}
