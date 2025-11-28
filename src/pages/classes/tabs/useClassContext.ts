// src/pages/classes/tabs/ClassOverview.tsx
import { useOutletContext } from "react-router-dom";
import type { ClassOut } from "../../../types/classes";

type Ctx = { classId: number; klass: ClassOut };
export function useClassContext() {
    return useOutletContext<Ctx>();
}
