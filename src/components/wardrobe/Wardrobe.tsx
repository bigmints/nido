"use client";

import { useState } from "react";
import { useApp } from "../AppProvider";
import { PageHeader, Tabs } from "../ui";
import { Builder } from "./Builder";
import { Closet } from "./Closet";
import { OutfitCalendar } from "./OutfitCalendar";
import { Suggestions } from "./Suggestions";

type Tab = "closet" | "builder" | "suggest" | "calendar";

export function Wardrobe() {
  const { t } = useApp();
  const [tab, setTab] = useState<Tab>("closet");
  return (
    <div>
      <PageHeader title={t("nav.wardrobe")} subtitle={t("wardrobe.subtitle")} />
      <Tabs<Tab>
        label={t("nav.wardrobe")}
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "closet", label: t("wardrobe.tab.closet"), icon: "hanger" },
          { id: "builder", label: t("wardrobe.tab.builder"), icon: "heart" },
          { id: "suggest", label: t("wardrobe.tab.suggest"), icon: "sparkle" },
          { id: "calendar", label: t("wardrobe.tab.calendar"), icon: "calendar" },
        ]}
      />
      <div role="tabpanel" className="animate-rise">
        {tab === "closet" && <Closet />}
        {tab === "builder" && <Builder />}
        {tab === "suggest" && <Suggestions />}
        {tab === "calendar" && <OutfitCalendar />}
      </div>
    </div>
  );
}
