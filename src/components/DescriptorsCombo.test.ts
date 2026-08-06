import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DescriptorOut } from "../types/descriptors";

const { useAllDescriptorsMock } = vi.hoisted(() => ({
    useAllDescriptorsMock: vi.fn(),
}));

vi.mock("../hooks/useDescriptors", () => ({
    useAllDescriptors: useAllDescriptorsMock,
}));

import DescriptorsCombo, { filterDescriptorOptions } from "./DescriptorsCombo";

function descriptor(id: number): DescriptorOut {
    return {
        id,
        code: `D${id}`,
        title: `Descritor ${id}`,
        description: id === 120 ? "Leitura e interpretação" : undefined,
        area: id === 120 ? "Língua Portuguesa" : "Matemática",
        grade_year: id === 120 ? 5 : undefined,
    };
}

interface ComboElementProps {
    filterOptions: (
        options: DescriptorOut[],
        state: { inputValue: string },
    ) => DescriptorOut[];
    getOptionLabel: (option: DescriptorOut) => string;
    isOptionEqualToValue: (left: DescriptorOut, right: DescriptorOut) => boolean;
    loading: boolean;
    noOptionsText: React.ReactNode;
    onChange: (event: unknown, value: DescriptorOut | null) => void;
    options: DescriptorOut[];
    renderInput: (params: {
        InputProps: { endAdornment: React.ReactNode };
    }) => React.ReactElement<{
        error: boolean;
        helperText: React.ReactNode;
        InputProps: { endAdornment: React.ReactNode };
    }>;
    renderOption: (
        props: React.HTMLAttributes<HTMLLIElement>,
        option: DescriptorOut,
    ) => React.ReactNode;
}

function renderCombo(onChange = vi.fn()) {
    return DescriptorsCombo({
        onChange,
        value: null,
    }) as React.ReactElement<ComboElementProps>;
}

describe("descriptor option filtering", () => {
    const descriptors = Array.from({ length: 120 }, (_, index) => descriptor(index + 1));

    beforeEach(() => {
        useAllDescriptorsMock.mockReset();
        useAllDescriptorsMock.mockReturnValue({
            data: descriptors,
            isError: false,
            isFetching: false,
            isLoading: false,
            refetch: vi.fn(),
        });
    });

    it("searches the complete catalog before limiting rendered options", () => {
        expect(filterDescriptorOptions(descriptors, "D120")).toEqual([descriptor(120)]);
    });

    it("matches case and accents consistently", () => {
        expect(filterDescriptorOptions(descriptors, "lingua PORTUGUESA")).toEqual([
            descriptor(120),
        ]);
    });

    it("limits an unfiltered menu without truncating the source catalog", () => {
        expect(filterDescriptorOptions(descriptors, "")).toHaveLength(50);
        expect(descriptors).toHaveLength(120);
    });

    it("wires catalog options and selection through the autocomplete", () => {
        const onChange = vi.fn();
        const combo = renderCombo(onChange);

        expect(combo.props.options).toBe(descriptors);
        expect(combo.props.loading).toBe(false);
        expect(combo.props.getOptionLabel(descriptor(120))).toBe("D120 — Descritor 120");
        expect(combo.props.isOptionEqualToValue(descriptor(120), descriptor(120))).toBe(true);
        expect(combo.props.filterOptions(descriptors, { inputValue: "D120" })).toEqual([
            descriptor(120),
        ]);
        expect(
            combo.props.renderOption({ id: "descriptor-120" }, descriptor(120)),
        ).toBeTruthy();

        combo.props.onChange(null, descriptor(120));
        expect(onChange).toHaveBeenCalledWith(descriptor(120));
    });

    it("shows a retryable loading error without hiding the caller error state", () => {
        const refetch = vi.fn();
        useAllDescriptorsMock.mockReturnValue({
            data: undefined,
            isError: true,
            isFetching: false,
            isLoading: false,
            refetch,
        });
        const combo = renderCombo();
        const input = combo.props.renderInput({
            InputProps: { endAdornment: null },
        });

        expect(combo.props.noOptionsText).toBe("Não foi possível carregar os descritores.");
        expect(input.props.error).toBe(true);
        expect(input.props.helperText).toBe(
            "Falha ao carregar os descritores. Tente novamente.",
        );

        const adornment = input.props.InputProps.endAdornment as React.ReactElement<{
            children: React.ReactNode;
        }>;
        const [tooltip] = React.Children.toArray(adornment.props.children) as React.ReactElement<{
            children: React.ReactElement<{
                onClick: () => void;
                onMouseDown: (event: { preventDefault: () => void }) => void;
            }>;
        }>[];
        const preventDefault = vi.fn();
        tooltip.props.children.props.onMouseDown({ preventDefault });
        tooltip.props.children.props.onClick();

        expect(preventDefault).toHaveBeenCalledOnce();
        expect(refetch).toHaveBeenCalledOnce();
    });

    it("keeps existing options usable while a background refresh runs", () => {
        useAllDescriptorsMock.mockReturnValue({
            data: descriptors,
            isError: false,
            isFetching: true,
            isLoading: false,
            refetch: vi.fn(),
        });
        const combo = renderCombo();

        expect(combo.props.loading).toBe(false);
        expect(
            combo.props.renderInput({ InputProps: { endAdornment: null } }),
        ).toBeTruthy();
    });
});
