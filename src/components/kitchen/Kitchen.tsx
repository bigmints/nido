"use client";

import { useState } from "react";
import type { Recipe } from "@/lib/recipes/types";
import { useApp } from "../AppProvider";
import { currentWeekStart } from "../hooks";
import { PageHeader, Tabs } from "../ui";
import { Fridge } from "./Fridge";
import { Planner } from "./Planner";
import { RecipeBrowser } from "./RecipeBrowser";
import { RecipeDetail } from "./RecipeDetail";
import { Shopping } from "./Shopping";

type Tab = "fridge" | "recipes" | "week" | "shopping";

export function Kitchen() {
  const { t } = useApp();
  const [tab, setTab] = useState<Tab>("fridge");
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [open, setOpen] = useState<Recipe | null>(null);

  return (
    <div>
      <PageHeader title={t("nav.kitchen")} subtitle={t("kitchen.subtitle")} />
      <Tabs<Tab>
        label={t("nav.kitchen")}
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "fridge", label: t("kitchen.tab.fridge"), icon: "fridge" },
          { id: "recipes", label: t("kitchen.tab.recipes"), icon: "search" },
          { id: "week", label: t("kitchen.tab.week"), icon: "calendar" },
          { id: "shopping", label: t("kitchen.tab.shopping"), icon: "cart" },
        ]}
      />
      <div role="tabpanel" className="animate-rise">
        {tab === "fridge" && <Fridge onOpen={setOpen} onRecipeCreated={setOpen} />}
        {tab === "recipes" && <RecipeBrowser onOpen={setOpen} />}
        {tab === "week" && (
          <Planner weekStart={weekStart} setWeekStart={setWeekStart} onOpen={setOpen} />
        )}
        {tab === "shopping" && <Shopping weekStart={weekStart} />}
      </div>
      <RecipeDetail recipe={open} onClose={() => setOpen(null)} />
    </div>
  );
}
