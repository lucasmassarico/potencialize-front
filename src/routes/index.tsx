// src/routes/index.tsx
import type { ComponentType } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import CenteredLoader from "../components/CenteredLoader";
import ProtectedRoute from "./Protected";

type LazyRouteModule = {
    default: ComponentType;
};

const lazyPage =
    (load: () => Promise<LazyRouteModule>) =>
    async () => {
        const { default: Component } = await load();
        return { Component };
    };

function RouteLoadingFallback() {
    return <CenteredLoader label="Carregando pagina..." />;
}

const router = createBrowserRouter([
    { path: "/login", lazy: lazyPage(() => import("../pages/Login")), HydrateFallback: RouteLoadingFallback },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: "/",
                lazy: lazyPage(() => import("../components/AppLayout")),
                HydrateFallback: RouteLoadingFallback,
                children: [
                    { index: true, lazy: lazyPage(() => import("../pages/Dashboard")) },
                    { path: "descriptors", lazy: lazyPage(() => import("../pages/descriptors/DescriptorsList")) },
                    { path: "classes", lazy: lazyPage(() => import("../pages/classes/ClassesList")) },
                    {
                        path: "classes/:id",
                        lazy: lazyPage(() => import("../pages/classes/ClassDetail")),
                        children: [
                            { index: true, lazy: lazyPage(() => import("../pages/classes/tabs/ClassOverview")) },
                            {
                                path: "assessments",
                                lazy: lazyPage(() => import("../pages/classes/tabs/ClassAssessments")),
                            },
                            { path: "students", lazy: lazyPage(() => import("../pages/classes/tabs/ClassStudents")) },
                        ],
                    },
                    {
                        path: "assessments/:assessmentId",
                        lazy: lazyPage(() => import("../pages/assessments/AssessmentDetail")),
                        children: [
                            { index: true, lazy: lazyPage(() => import("../pages/assessments/tabs/AssessmentOverview")) },
                            { path: "matrix", lazy: lazyPage(() => import("../pages/assessments/tabs/AssessmentMatrix")) },
                            { path: "weights", lazy: lazyPage(() => import("../pages/assessments/tabs/AssessmentWeights")) },
                            {
                                path: "questions",
                                lazy: lazyPage(() => import("../pages/assessments/tabs/AssessmentQuestions")),
                            },
                            {
                                path: "grading-policy",
                                lazy: lazyPage(() => import("../pages/assessments/tabs/AssessmentGradingPolicyTab")),
                            },
                        ],
                    },
                ],
            },
        ],
    },
    { path: "*", lazy: lazyPage(() => import("../pages/NotFound")), HydrateFallback: RouteLoadingFallback },
]);

export default function AppRoutes() {
    return <RouterProvider router={router} />;
}
