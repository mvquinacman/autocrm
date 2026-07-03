import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDateOnly,
  manilaDateString,
  todayDateString,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchAllFollowUps, type FollowUp } from "@/features/followups/api";
import {
  fetchTestDriveActivities,
  type TestDriveActivity,
} from "@/features/leads/api";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Builds a 'YYYY-MM-DD' key without going through Date/toISOString. */
function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type FollowUpBucket = "overdue" | "pending" | "done" | "missed";

function followUpBucket(fu: FollowUp, today: string): FollowUpBucket {
  if (fu.status === "pending") {
    return fu.dueDate < today ? "overdue" : "pending";
  }
  return fu.status;
}

const BUCKET_ORDER: FollowUpBucket[] = ["overdue", "pending", "done", "missed"];

const BUCKET_CHIP: Record<FollowUpBucket, string> = {
  overdue: "bg-destructive/10 text-destructive",
  pending: "bg-primary/10 text-primary",
  done: "bg-emerald-500/10 text-emerald-600",
  missed: "bg-muted text-muted-foreground",
};

const BUCKET_LABEL: Record<FollowUpBucket, string> = {
  overdue: "Overdue",
  pending: "Pending",
  done: "Done",
  missed: "Missed",
};

function groupByDay<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

export function AgentCalendarPage() {
  const navigate = useNavigate();
  const today = todayDateString();
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7)) - 1;

  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(today);

  const followUpsQuery = useQuery({
    queryKey: ["followups", "all"],
    queryFn: fetchAllFollowUps,
  });
  const testDrivesQuery = useQuery({
    queryKey: ["activities", "test_drive"],
    queryFn: fetchTestDriveActivities,
  });

  if (followUpsQuery.isPending || testDrivesQuery.isPending) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading calendar…
      </div>
    );
  }

  const queryError = followUpsQuery.error ?? testDrivesQuery.error;
  if (queryError) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load calendar: {queryError.message}
      </div>
    );
  }

  const followUps = followUpsQuery.data ?? [];
  const testDrives = testDrivesQuery.data ?? [];

  const followUpsByDay = groupByDay(followUps, (fu) => fu.dueDate);
  const testDrivesByDay = groupByDay(testDrives, (td) =>
    manilaDateString(td.createdAt),
  );

  // Calendar-shape math (not timezone-sensitive).
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const goToMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const goToToday = () => {
    setViewYear(todayYear);
    setViewMonth(todayMonth);
    setSelectedDate(today);
  };

  const selectedFollowUps = selectedDate
    ? (followUpsByDay.get(selectedDate) ?? [])
    : [];
  const selectedTestDrives = selectedDate
    ? (testDrivesByDay.get(selectedDate) ?? [])
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Follow-ups and logged test drives by day
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              aria-label="Previous month"
              onClick={() => goToMonth(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Next month"
              onClick={() => goToMonth(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="pb-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {day}
              </div>
            ))}
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={`blank-${i}`} className="min-h-20 rounded-md" />;
              }
              const key = dateKey(viewYear, viewMonth, day);
              const isToday = key === today;
              const isSelected = key === selectedDate;
              const dayFollowUps = followUpsByDay.get(key) ?? [];
              const dayTestDrives = testDrivesByDay.get(key) ?? [];

              const bucketCounts = new Map<FollowUpBucket, number>();
              for (const fu of dayFollowUps) {
                const bucket = followUpBucket(fu, today);
                bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
              }

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={cn(
                    "flex min-h-20 flex-col items-start gap-1 rounded-md border border-transparent p-1.5 text-left transition-colors hover:bg-muted",
                    isSelected && "border-border bg-muted",
                    isToday && "ring-2 ring-primary",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isToday ? "text-primary" : "text-foreground",
                    )}
                  >
                    {day}
                  </span>
                  <span className="flex flex-wrap gap-0.5">
                    {BUCKET_ORDER.map((bucket) => {
                      const count = bucketCounts.get(bucket);
                      if (!count) return null;
                      return (
                        <span
                          key={bucket}
                          title={`${count} ${BUCKET_LABEL[bucket].toLowerCase()} follow-up(s)`}
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
                            BUCKET_CHIP[bucket],
                          )}
                        >
                          {count}
                        </span>
                      );
                    })}
                    {dayTestDrives.length > 0 && (
                      <span
                        title={`${dayTestDrives.length} test drive(s)`}
                        className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-violet-600"
                      >
                        {dayTestDrives.length} TD
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        // Inline panel on md+, bottom sheet above the tab bar on mobile
        <Card className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 max-h-[60dvh] overflow-y-auto rounded-b-none rounded-t-xl shadow-lg md:static md:max-h-none md:overflow-visible md:rounded-xl md:shadow-sm">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1.5">
            <CardTitle className="text-base">
              {formatDateOnly(selectedDate)}
              {selectedDate === today ? " · Today" : ""}
            </CardTitle>
            <CardDescription>
              {selectedFollowUps.length} follow-up
              {selectedFollowUps.length === 1 ? "" : "s"} ·{" "}
              {selectedTestDrives.length} test drive
              {selectedTestDrives.length === 1 ? "" : "s"}
            </CardDescription>
            </div>
            <button
              type="button"
              aria-label="Close day details"
              onClick={() => setSelectedDate(null)}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent>
            {selectedFollowUps.length === 0 &&
            selectedTestDrives.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing scheduled this day.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {selectedFollowUps.map((fu) => {
                  const bucket = followUpBucket(fu, today);
                  return (
                    <li key={fu.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/app/agent/leads/${fu.leadId}`)}
                        className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-muted/50"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {fu.leadCustomerName}
                          </span>
                          <span className="block truncate text-sm text-muted-foreground">
                            {fu.leadModel ?? "No model"}
                            {fu.note ? ` · ${fu.note}` : ""}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                            BUCKET_CHIP[bucket],
                          )}
                        >
                          {BUCKET_LABEL[bucket]}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {selectedTestDrives.map((td: TestDriveActivity) => (
                  <li key={td.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/app/agent/leads/${td.leadId}`)}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-muted/50"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {td.customerName}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {td.model ?? "No model"}
                          {td.detail ? ` · ${td.detail}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-600">
                        Test drive
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
