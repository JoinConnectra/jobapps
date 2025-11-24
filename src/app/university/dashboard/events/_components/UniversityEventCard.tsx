"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  MapPin,
  Globe2,
  Users,
  Eye,
  Edit3,
} from "lucide-react";
import type { EventItem } from "@/components/events/types";

// Extend EventItem with some optional fields we know exist on the university API
type UniEvent = EventItem & {
  is_employer_hosted?: boolean;
  status?: string | null;
  featured?: boolean;
  attendees_count?: number | null;
  capacity?: number | null;
  registration_url?: string | null;
};

export function UniversityEventCard({ event }: { event: UniEvent }) {
  const router = useRouter();

  const dateString = formatEventDate(event.startsAt);
  const temporalLabel = getTemporalLabel(event);

  const attendees =
    typeof event.attendees_count === "number"
      ? event.attendees_count
      : undefined;

  const capacity =
    typeof event.capacity === "number" && !Number.isNaN(event.capacity)
      ? event.capacity
      : undefined;

  const utilization =
    typeof attendees === "number" &&
    typeof capacity === "number" &&
    capacity > 0
      ? Math.min(100, (attendees / capacity) * 100)
      : null;

  const hostLabel = event.is_employer_hosted
    ? "Employer hosted"
    : "Career center";

  const statusLabel = event.status || "published";

  return (
    <Card
      className="h-full overflow-hidden border border-slate-200 bg-white shadow-sm flex flex-col transition hover:border-[#3d6a4a]/60 hover:shadow-md"
    >
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {/* Status */}
              <Badge
                variant="outline"
                className={
                  statusLabel === "published"
                    ? "text-[10px] px-1.5 py-0.5 border-[#3d6a4a] text-[#3d6a4a] bg-[#F5F1E8]"
                    : statusLabel === "draft"
                    ? "text-[10px] px-1.5 py-0.5 border-amber-300 text-amber-800 bg-amber-50"
                    : "text-[10px] px-1.5 py-0.5"
                }
              >
                {statusLabel}
              </Badge>

              {/* Temporal label */}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                {temporalLabel}
              </Badge>

              {/* Host */}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                {hostLabel}
              </Badge>

              {event.featured && (
                <Badge className="bg-[#3d6a4a] text-white text-[10px] px-1.5 py-0.5">
                  Featured
                </Badge>
              )}
            </div>

            <h3
              className="line-clamp-2 text-base font-semibold leading-snug"
              title={event.title}
            >
              {event.title}
            </h3>
            {event.location && (
              <p className="truncate text-xs text-muted-foreground mt-0.5">
                {event.location}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 flex-1">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {dateString}
          </span>

          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.location}
            </span>
          )}

          <span className="inline-flex items-center gap-1">
            <Globe2 className="h-3.5 w-3.5" />
            {event.medium === "VIRTUAL" ? "Virtual" : "In-person"}
          </span>

          {(typeof attendees === "number" || typeof capacity === "number") && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {typeof attendees === "number" ? attendees : 0} attending
              {typeof capacity === "number" && ` · cap ${capacity}`}
            </span>
          )}
        </div>

        {event.tags && event.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {event.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">
                {t}
              </Badge>
            ))}
            {event.tags.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{event.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {utilization !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Utilization</span>
              <span>
                {attendees}/{capacity} ({Math.round(utilization)}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-[#F5F1E8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3d6a4a]"
                style={{ width: `${utilization}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between px-4 py-3">
        <div className="text-[11px] text-muted-foreground">
          Starts {dateString}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[#3d6a4a] text-[#3d6a4a] hover:bg-[#F5F1E8]"
            onClick={() =>
              router.push(`/university/dashboard/events/${event.id}`)
            }
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View
          </Button>
          {!event.is_employer_hosted && (
            <Button
              size="sm"
              className="bg-[#3d6a4a] hover:bg-[#31553b] text-white"
              onClick={() =>
                router.push(
                  `/university/dashboard/events/${event.id}/edit`
                )
              }
            >
              <Edit3 className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

function formatEventDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function getTemporalLabel(event: UniEvent): "Upcoming" | "Ongoing" | "Past" {
  const now = Date.now();
  const start = new Date(event.startsAt).getTime();
  const end = event.endsAt ? new Date(event.endsAt).getTime() : start;

  if (end < now) return "Past";
  if (start <= now && end >= now) return "Ongoing";
  return "Upcoming";
}
