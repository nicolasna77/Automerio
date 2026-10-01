"use client";

import { CalendarDays, PhoneIncoming } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";

// Activité d'une solution de prise de rendez-vous : appels reçus et calendrier
// dans une même carte, chacun dans son onglet. Les panneaux restent montés :
// la liste d'appels continue de se mettre à jour, le calendrier garde sa vue.
export function ServiceActivityTabs({ calls, calendar }: { calls: React.ReactNode; calendar: React.ReactNode }) {
  return (
    <Card>
      <CardContent>
        <Tabs defaultValue="calls">
          <TabsList aria-label="Activité de la solution">
            <TabsTab value="calls">
              <PhoneIncoming className="size-4" aria-hidden="true" />
              Appels reçus
            </TabsTab>
            <TabsTab value="calendar">
              <CalendarDays className="size-4" aria-hidden="true" />
              Calendrier
            </TabsTab>
          </TabsList>
          <TabsPanel value="calls" keepMounted className="pt-5 data-[hidden]:hidden">
            {calls}
          </TabsPanel>
          <TabsPanel value="calendar" keepMounted className="h-[30rem] pt-5 data-[hidden]:hidden sm:h-[34rem]">
            {calendar}
          </TabsPanel>
        </Tabs>
      </CardContent>
    </Card>
  );
}
