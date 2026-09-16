import React, { useMemo, useState } from "react";
import {
  Outlet,
  useLocation,
  useNavigation,
} from "react-router-dom";

import NavBar from "../ui/NavBar";
import XPBar from "../ui/XPBar";
import MenuOverlay from "../ui/MenuOverlay";

import { useXpStore } from "../xp/useXpStore";
import { XP_CAPS } from "../xp/rank";

import type {
  Tier,
  XpCategory,
} from "../xp/types";

export default function Shell() {
  const loc = useLocation();
  const navigation = useNavigation();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const xpState = useXpStore(
    (s) => s.state
  );

  const path = loc.pathname;

  const assessmentGameNumber =
    useMemo(() => {
      const games: Record<
        string,
        number
      > = {
        "/skills-assessment/doubles": 1,
        "/skills-assessment/101": 2,
        "/skills-assessment/170": 3,
        "/skills-assessment/scoring": 4,
        "/skills-assessment/501": 5,
      };

      return games[path] ?? null;
    }, [path]);

  const isAssessmentGame =
    assessmentGameNumber !== null;

  const isResultPage =
    path.startsWith("/result");

  const footer = useMemo(() => {
    let label = "Overall XP";
    let value =
      xpState.totalXp ?? 0;
    let max =
      XP_CAPS.overallTierMax;
    let baseTier: Tier =
      "Bronze";

    /*
     * Category XP
     */
    if (
      path.startsWith(
        "/category/"
      )
    ) {
      const slug =
        path.split("/")[2] ?? "";

      let category:
        | XpCategory
        | null = null;

      if (slug === "scoring") {
        category = "scoring";
      } else if (
        slug === "finishing"
      ) {
        category = "finishing";
      } else if (
        slug === "doubles" ||
        slug === "bull"
      ) {
        category = "doubles";
      }

      if (category) {
        const categoryLabels:
          Record<
            XpCategory,
            string
          > = {
          scoring:
            "Category XP · Scoring",
          finishing:
            "Category XP · Finishing",
          doubles:
            "Category XP · Doubling",
          other:
            "Category XP",
        };

        label =
          categoryLabels[
            category
          ];

        value =
          xpState.categoryXp?.[
            category
          ] ?? 0;

        max =
          XP_CAPS.categoryTierMax;

        baseTier = "Bronze";
      }
    }

    /*
     * Drill XP
     */
    if (
      path.startsWith(
        "/drill/"
      )
    ) {
      const drillKey =
        path.split("/")[2] ?? "";

      label = drillKey
        ? `Drill XP · ${drillKey}`
        : "Drill XP";

      value =
        xpState.drillXp?.[
          drillKey
        ] ?? 0;

      max =
        XP_CAPS.drillTierMax;

      baseTier = "Bronze";
    }

    return {
      label,
      value,
      max,
      baseTier,
    };
  }, [
    path,
    xpState,
  ]);

  const isNavigating =
    navigation.state !== "idle";

  return (
    <div className="app-root">
      <div className="app-frame">
        <NavBar
          onMenu={() =>
            setMenuOpen(true)
          }
        />

        <main className="app-main">
          {isNavigating && (
            <div
              className="app-loading-overlay"
              aria-live="polite"
            >
              <div className="muted small">
                Loading...
              </div>
            </div>
          )}

          <Outlet />
        </main>

        {!isResultPage && (
          <footer className="app-footer">
            {isAssessmentGame ? (
              <div
                className="assessment-footer-progress"
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  minHeight: 32,
                  padding:
                    "5px 12px",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Game{" "}
                {assessmentGameNumber}{" "}
                of 5
              </div>
            ) : (
              <XPBar
                label={
                  footer.label
                }
                value={
                  footer.value
                }
                max={
                  footer.max
                }
                baseTier={
                  footer.baseTier
                }
              />
            )}
          </footer>
        )}
      </div>

      <MenuOverlay
        open={menuOpen}
        onClose={() =>
          setMenuOpen(false)
        }
      />
    </div>
  );
}