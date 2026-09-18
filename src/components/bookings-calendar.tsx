"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarClock, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type CalendarBooking = {
  id: string;
  date: Date;
  endDate?: Date | null;
  title: string;
  subtitle?: string;
  notes?: string | null;
  synced: boolean;
};

export type UnscheduledBooking = {
  id: string;
  title: string;
  subtitle?: string;
  notes?: string | null;
};

type ViewMode = "month" | "week" | "day";

const VIEW_LABELS: Record<ViewMode, string> = {
  month: "Mois",
  week: "Semaine",
  day: "Jour",
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MAX_CHIPS_PER_DAY = 3;
const DEFAULT_DURATION_MIN = 30;
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;
const HOUR_ROW_PX = 56;
const EVENT_MIN_HEIGHT_PX = 22;
const EVENT_COMPACT_BELOW_PX = 26;
const EVENT_TWO_LINES_MIN_PX = 40;

const WEEK_OPTS = { weekStartsOn: 1 } as const;

function bookingEnd(item: CalendarBooking): Date {
  if (item.endDate && item.endDate.getTime() > item.date.getTime()) {
    return item.endDate;
  }
  return new Date(item.date.getTime() + DEFAULT_DURATION_MIN * 60_000);
}

function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function layoutDay(items: CalendarBooking[]) {
  const columnEnds: number[] = [];
  const placed = items.map((item) => {
    const start = item.date.getTime();
    const end = bookingEnd(item).getTime();
    let col = columnEnds.findIndex((endTime) => endTime <= start);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(end);
    } else {
      columnEnds[col] = end;
    }
    return { item, col, start, end };
  });
  const totalCols = Math.max(1, columnEnds.length);
  return placed.map((p) => ({ ...p, totalCols }));
}

export function BookingsCalendar({
  scheduled,
  unscheduled = [],
}: {
  scheduled: CalendarBooking[];
  unscheduled?: UnscheduledBooking[];
}) {
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [detail, setDetail] = useState<CalendarBooking | null>(null);
  const [showOrders, setShowOrders] = useState(false);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const booking of scheduled) {
      const key = dayKey(booking.date);
      const list = map.get(key);
      if (list) list.push(booking);
      else map.set(key, [booking]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    return map;
  }, [scheduled]);

  const monthDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor), WEEK_OPTS),
        end: endOfWeek(endOfMonth(cursor), WEEK_OPTS),
      }),
    [cursor]
  );

  const timeDays = useMemo(
    () =>
      view === "day"
        ? [cursor]
        : eachDayOfInterval({
            start: startOfWeek(cursor, WEEK_OPTS),
            end: endOfWeek(cursor, WEEK_OPTS),
          }),
    [view, cursor]
  );

  const hours = useMemo(() => {
    let start = DEFAULT_START_HOUR;
    let end = DEFAULT_END_HOUR;
    for (const day of timeDays) {
      for (const item of byDay.get(dayKey(day)) ?? []) {
        start = Math.min(start, item.date.getHours());
        end = Math.max(end, Math.min(24, bookingEnd(item).getHours() + 1));
      }
    }
    return Array.from({ length: Math.max(1, end - start) }, (_, i) => start + i);
  }, [timeDays, byDay]);

  function shift(direction: 1 | -1) {
    setCursor((current) =>
      view === "month"
        ? addMonths(current, direction)
        : addDays(current, direction * (view === "week" ? 7 : 1))
    );
  }

  const heading =
    view === "month"
      ? format(cursor, "MMMM yyyy", { locale: fr })
      : view === "week"
        ? `Semaine du ${format(startOfWeek(cursor, WEEK_OPTS), "d MMMM", { locale: fr })}`
        : format(cursor, "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => shift(-1)}
            aria-label="Période précédente"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCursor(startOfDay(new Date()))}
          >
            Aujourd&apos;hui
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => shift(1)}
            aria-label="Période suivante"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
          <p className="ml-2 text-sm font-medium text-foreground capitalize">
            {heading}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unscheduled.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowOrders(true)}
            >
              <ShoppingBag aria-hidden="true" data-icon="inline-start" />
              {unscheduled.length} sans horaire
            </Button>
          )}
          <div className="flex shrink-0 items-center gap-0.5 rounded-4xl border border-border p-0.5">
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(view === mode && "bg-muted text-foreground")}
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
              >
                {VIEW_LABELS[mode]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {scheduled.length === 0 && unscheduled.length === 0 && (
        <p className="mb-3 shrink-0 text-sm text-muted-foreground">
          Aucun rendez-vous ni commande pris par téléphone pour l&apos;instant.
        </p>
      )}

      {view === "month" ? (
        <div
          className="grid min-h-0 flex-1 grid-cols-7 gap-px overflow-hidden rounded-2xl border border-border bg-border text-xs"
          style={{ gridTemplateRows: `auto repeat(${monthDays.length / 7}, minmax(0, 1fr))` }}
        >
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="bg-muted px-2 py-1.5 text-center font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
          {monthDays.map((day) => {
            const items = byDay.get(dayKey(day)) ?? [];
            const inMonth = isSameMonth(day, cursor);
            return (
              <button
                key={dayKey(day)}
                type="button"
                onClick={() => {
                  setCursor(startOfDay(day));
                  setView("day");
                }}
                className={cn(
                  "flex min-h-0 flex-col items-start gap-1 overflow-hidden bg-card p-1.5 text-left transition-colors hover:bg-muted/60",
                  !inMonth && "bg-card/50"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-xs",
                    isToday(day)
                      ? "bg-primary text-primary-foreground"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="flex w-full min-w-0 flex-col gap-0.5">
                  {items.slice(0, MAX_CHIPS_PER_DAY).map((item) => (
                    <span
                      key={item.id}
                      className="truncate rounded-sm bg-primary/10 px-1 py-px text-xs text-primary"
                    >
                      {format(item.date, "HH:mm")} {item.title}
                    </span>
                  ))}
                  {items.length > MAX_CHIPS_PER_DAY && (
                    <span className="text-xs text-muted-foreground">
                      +{items.length - MAX_CHIPS_PER_DAY}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border">
          <div className="flex shrink-0 border-b border-border bg-muted/40">
            <div className="w-14 shrink-0 border-r border-border" />
            {timeDays.map((day) => (
              <div
                key={dayKey(day)}
                className="flex-1 px-2 py-1.5 text-center text-xs"
              >
                <span className="text-muted-foreground">
                  {format(day, "EEE", { locale: fr })}{" "}
                </span>
                <span
                  className={cn(
                    "font-medium",
                    isToday(day) ? "text-primary" : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex" style={{ height: hours.length * HOUR_ROW_PX }}>
              <div className="w-14 shrink-0 border-r border-border">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: HOUR_ROW_PX }}
                    className="border-b border-border px-2 pt-1 text-right text-xs text-muted-foreground last:border-b-0"
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {timeDays.map((day) => {
                const items = byDay.get(dayKey(day)) ?? [];
                const dayStart = new Date(day).setHours(hours[0], 0, 0, 0);
                return (
                  <div
                    key={dayKey(day)}
                    className={cn(
                      "relative flex-1 border-r border-border last:border-r-0",
                      isToday(day) ? "bg-primary/3" : "bg-card"
                    )}
                  >
                    {hours.map((hour, i) => (
                      <div
                        key={hour}
                        className="absolute right-0 left-0 border-b border-border last:border-b-0"
                        style={{ top: i * HOUR_ROW_PX, height: HOUR_ROW_PX }}
                      />
                    ))}
                    {layoutDay(items).map(({ item, col, totalCols, start, end }) => {
                      const height = Math.max(
                        ((end - start) / 3_600_000) * HOUR_ROW_PX,
                        EVENT_MIN_HEIGHT_PX
                      );
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDetail(item)}
                          title={`${format(item.date, "HH:mm")} — ${item.title}${item.subtitle ? ` · ${item.subtitle}` : ""}`}
                          className={cn(
                            "absolute overflow-hidden rounded-lg border border-primary/30 bg-primary/10 px-1.5 text-left text-xs leading-tight text-primary transition-colors hover:bg-primary/20",
                            height < EVENT_COMPACT_BELOW_PX ? "py-0.5" : "py-1"
                          )}
                          style={{
                            top: ((start - dayStart) / 3_600_000) * HOUR_ROW_PX,
                            height,
                            left: `calc(${(col / totalCols) * 100}% + 2px)`,
                            width: `calc(${(1 / totalCols) * 100}% - 4px)`,
                          }}
                        >
                          <span className="block truncate font-medium">
                            {format(item.date, "HH:mm")} {item.title}
                          </span>
                          {item.subtitle && height >= EVENT_TWO_LINES_MIN_PX && (
                            <span className="block truncate text-primary/70">
                              {item.subtitle}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.title}</DialogTitle>
                <DialogDescription className="capitalize">
                  {format(detail.date, "EEEE d MMMM", { locale: fr })} ·{" "}
                  {format(detail.date, "HH:mm")} – {format(bookingEnd(detail), "HH:mm")}
                </DialogDescription>
              </DialogHeader>
              {detail.subtitle && (
                <p className="text-sm text-muted-foreground">{detail.subtitle}</p>
              )}
              {detail.notes && (
                <p className="text-sm whitespace-pre-wrap text-foreground">
                  {detail.notes}
                </p>
              )}
              {!detail.synced && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                  Non synchronisé à l&apos;agenda Google
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showOrders} onOpenChange={setShowOrders}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sans horaire</DialogTitle>
            <DialogDescription>
              Commandes prises par téléphone — elles n&apos;occupent pas de
              créneau et n&apos;apparaissent donc pas dans la grille.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-80 space-y-1.5 overflow-y-auto">
            {unscheduled.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-border bg-card p-3 text-sm"
              >
                <p className="font-medium text-foreground">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                )}
                {item.notes && (
                  <p className="mt-1 text-xs whitespace-pre-wrap text-muted-foreground">
                    {item.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
