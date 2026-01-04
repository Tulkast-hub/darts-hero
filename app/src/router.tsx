import React from "react";
import { createHashRouter, RouterProvider, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import DrillPage from "./pages/DrillPage";
import StatsPage from "./pages/StatsPage";
import ProfilePage from "./pages/ProfilePage";
import RewardsPage from "./pages/RewardsPage";
import Shell from "./shell/Shell";
import ResultsPage from "./pages/ResultsPage";   // 👈 add this
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import { useAuthStore } from "./auth/useAuthStore";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const status = useAuthStore((s) => s.status);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const deferred = useAuthStore((s) => s.deferOnboardingThisSession);
  const path = window.location.hash.replace(/^#/, "");

  if (status !== "authed") {
    return <Navigate to="/login" replace />;
  }

  // Force onboarding for new users unless they chose to defer for this session.
  if (needsOnboarding && !deferred && !path.startsWith("/onboarding")) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function ErrorPage() {
  return (
    <div className="page">
      <h2 className="page-title">Something went wrong</h2>
      <div className="card">
        <p className="muted">That route wasn’t found or failed to load.</p>
        <a className="btn" href="#/">Go Home</a>
      </div>
    </div>
  );
}

const router = createHashRouter([
  { path: "/login", element: <LoginPage /> },
      { path: "/onboarding", element: <RequireAuth><OnboardingPage /></RequireAuth> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <Shell />
      </RequireAuth>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "category/:slug", element: <CategoryPage /> },
      { path: "drill/:key", element: <DrillPage /> },
      { path: "result/:key", element: <ResultsPage /> },   // 👈 new
      { path: "stats", element: <StatsPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "rewards", element: <RewardsPage /> }
    ]
  }
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
