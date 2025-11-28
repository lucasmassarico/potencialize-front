import React from "react";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";
import { useTeacherSearch } from "../hooks/useTeachers";
import type { TeacherOut } from "../types/teachers";

interface Props {
    label?: string;
    value: TeacherOut | null;
    onChange: (teacher: TeacherOut | null) => void;
}

export default function TeachersCombo({
    label = "Professor(a)",
    value,
    onChange,
}: Props) {
    const [inputValue, setInputValue] = React.useState("");
    const { data, isLoading } = useTeacherSearch(inputValue);
    const options = data?.items || [];

    return (
        <Autocomplete
            options={options}
            getOptionLabel={(o) => o.name}
            value={value}
            onChange={(_, v) => onChange(v)}
            onInputChange={(_, v) => setInputValue(v)}
            loading={isLoading}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {isLoading ? (
                                    <CircularProgress size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                />
            )}
        />
    );
}
