import React from "react";
import {
  createHashRouter,
  RouterProvider,
  Navigate,
  useLocation,
} from "react-router-dom";

import HomePage from "./pages/HomePage";
import TrainingHomePage from "./pages/TrainingHomePage";
import VersusSetupPage from "./pages/VersusSetupPage";
import VersusPlayPage from "./pages/VersusPlayPage";
import VersusResultPage from "./pages/VersusResultPage";
import CategoryPage from "./pages/CategoryPage";
import DrillPage from "./pages/DrillPage";
import StatsPage from "./pages/StatsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import RewardsPage from "./pages/RewardsPage";
import ResultsPage from "./pages/ResultsPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import OnboardingPage from "./pages/OnboardingPage";
import CreateUserPage from "./pages/CreateUserPage";
import SkillsAssessmentPage from "./pages/SkillsAssessmentPage";
import AssessmentDoubles from "./pages/assessment-games/AssessmentDoubles";
import Assessment101 from "./pages/assessment-games/Assessment101";
import Assessment170 from "./pages/assessment-games/Assessment170";
import AssessmentScoring from "./pages/assessment-games/AssessmentScoring";
import Assessment501 from "./pages/assessment-games/Assessment501";

import Shell from "./shell/Shell";
import { useAuthStore } from "./auth/useAuthStore";
import { initInstallPromptCapture } from "./pwa/installPrompt";

initInstallPromptCapture();

function RequireAuth({ children }: { children: React.ReactElement }) {
  const status = useAuthStore((s) => s.status);

  if (status !== "authed") {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireTrainingOnboarding({
  children,
}: {
  children: React.ReactElement;
}) {
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const location = useLocation();

  const skipOnboarding = location.state?.skipOnboarding === true;

  if (needsOnboarding && !skipOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function ErrorPage() {
  return (
    <div className="page">
      <h2 className="page-title">Something went wrong</h2>

      <div className="card">
        <p className="muted">
          That route wasn’t found or failed to load.
        </p>

        <a className="btn" href="#/">
          Go Home
        </a>
      </div>
    </div>
  );
}

const router = createHashRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },

  {
    path: "/password/reset",
    element: <ResetPasswordPage />,
  },

  {
    path: "/admin/create-user",
    element: <CreateUserPage />,
  },

  {
    path: "/",
    element: (
      <RequireAuth>
        <Shell />
      </RequireAuth>
    ),
    errorElement: <ErrorPage />,

    children: [
      {
        index: true,
        element: <HomePage />,
      },

      {
        path: "onboarding",
        element: <OnboardingPage />,
      },

      {
        path: "training",
        element: (
          <RequireTrainingOnboarding>
            <TrainingHomePage />
          </RequireTrainingOnboarding>
        ),
      },

      {
        path: "versus",
        element: <VersusSetupPage />,
      },

      {
        path: "versus/play/:key",
        element: <VersusPlayPage />,
      },

      {
        path: "versus/result",
        element: <VersusResultPage />,
      },

      {
        path: "category/:slug",
        element: <CategoryPage />,
      },

      {
        path: "drill/:key",
        element: <DrillPage />,
      },

      {
        path: "result/:key",
        element: <ResultsPage />,
      },

      {
        path: "stats",
        element: <StatsPage />,
      },

      {
        path: "leaderboard",
        element: <LeaderboardPage />,
      },

      {
        path: "profile",
        element: <ProfilePage />,
      },

      {
        path: "rewards",
        element: <RewardsPage />,
      },
      {
        path: "skills-assessment",
        element: <SkillsAssessmentPage />,
      },
      {
        path: "skills-assessment/doubles",
        element: <AssessmentDoubles />,
      },
      {
        path: "skills-assessment/101",
        element: <Assessment101 />,
      },
      {
        path: "skills-assessment/170",
        element: <Assessment170 />,
      },
      {
        path: "skills-assessment/scoring",
        element: <AssessmentScoring />,
      },
      {
        path: "skills-assessment/501",
        element: <Assessment501 />,
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}