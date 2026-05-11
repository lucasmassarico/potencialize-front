import React from "react";

import type { AnswerOption } from "../../../../types/studentAnswers";

const SELECT_STYLE: React.CSSProperties = {
    fontWeight: 700,
    border: "none",
    background: "transparent",
    outline: "none",
};

interface MatrixCellEditorProps {
    studentName: string;
    questionLabel: string;
    shown: string;
    disabled: boolean;
    onChange: (next: AnswerOption | null) => Promise<void>;
}

function MatrixCellEditor({ studentName, questionLabel, shown, disabled, onChange }: MatrixCellEditorProps) {
    const [value, setValue] = React.useState(shown);

    React.useEffect(() => {
        setValue(shown);
    }, [shown]);

    const handleChange: React.ChangeEventHandler<HTMLSelectElement> = async (event) => {
        const raw = event.target.value;
        const next = raw === "-" ? null : (raw.toLowerCase() as AnswerOption);
        setValue(raw);
        await onChange(next);
    };

    return (
        <select
            aria-label={`Resposta de ${studentName} em ${questionLabel}`}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            style={{
                ...SELECT_STYLE,
                cursor: disabled ? "default" : "pointer",
            }}
        >
            <option value="-">—</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
            <option value="E">E</option>
        </select>
    );
}

export default React.memo(MatrixCellEditor);
