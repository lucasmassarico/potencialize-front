//src/routes/index.tsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import ProtectedRoute from "./Protected";
import AppLayout from "../components/AppLayout";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import NotFound from "../pages/NotFound";

import ClassesList from "../pages/classes/ClassesList";
import ClassDetail from "../pages/classes/ClassDetail.tsx";
import ClassAssessments from "../pages/classes/tabs/ClassAssessments.tsx";
import ClassStudents from "../pages/classes/tabs/ClassStudents.tsx";
import ClassOverview from "../pages/classes/tabs/ClassOverview.tsx";

import AssessmentDetail from "../pages/assessments/AssessmentDetail";
import AssessmentOverview from "../pages/assessments/tabs/AssessmentOverview";
import AssessmentMatrix from "../pages/assessments/tabs/AssessmentMatrix";
import AssessmentWeights from "../pages/assessments/tabs/AssessmentWeights";
import AssessmentQuestions from "../pages/assessments/tabs/AssessmentQuestions";
import AssessmentGradingPolicyTab from "../pages/assessments/tabs/AssessmentGradingPolicyTab.tsx";

const router = createBrowserRouter([
    { path: "/login", element: <Login /> },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: "/",
                element: <AppLayout />,
                children: [
                    { index: true, element: <Dashboard /> },
                    { path: "classes", element: <ClassesList /> },
                    {
                        path: "classes/:id",
                        element: <ClassDetail />, // pai com sub-navbar
                        children: [
                            { index: true, element: <ClassOverview /> }, // /classes/:id
                            {
                                path: "assessments",
                                element: <ClassAssessments />,
                            }, // /classes/:id/assessments
                            { path: "students", element: <ClassStudents /> }, // /classes/:id/students
                        ],
                    },
                    {
                        path: "assessments/:assessmentId",
                        element: <AssessmentDetail />,
                        children: [
                            { index: true, element: <AssessmentOverview /> },
                            { path: "matrix", element: <AssessmentMatrix /> },
                            { path: "weights", element: <AssessmentWeights /> },
                            { path: "questions", element: <AssessmentQuestions /> },
                            { path: "grading-policy", element: <AssessmentGradingPolicyTab />}
                        ],
                    },
                ],
            },
        ],
    },
    { path: "*", element: <NotFound /> },
]);

export default function AppRoutes() {
    return <RouterProvider router={router} />;
}
