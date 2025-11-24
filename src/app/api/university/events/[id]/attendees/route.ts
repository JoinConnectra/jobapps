import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  eventRegistrations,
  eventCheckins,
  users,
  studentProfiles,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// Next 15: params is a Promise
type RouteParams = { params: Promise<{ id: string }> };

type AttendeeRow = {
  userId: number | null;
  studentProfileId: number | null;
  name: string | null;
  email: string;
  program: string | null;
  gradYear: number | null;
  resumeUrl: string | null;
};

export type AttendeeResponse = AttendeeRow & {
  registered: boolean;
  checkedIn: boolean;
};

// GET /api/university/events/[id]/attendees
// Returns one row per unique email (student), with basic profile + registered/checkedIn flags
export async function GET(req: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const eventId = Number(id);
    if (!Number.isFinite(eventId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // 1) Collect registrations + check-ins by email
    const [regRows, checkRows] = await Promise.all([
      db
        .select({
          email: eventRegistrations.userEmail,
        })
        .from(eventRegistrations)
        .where(eq(eventRegistrations.eventId, eventId)),
      db
        .select({
          email: eventCheckins.userEmail,
        })
        .from(eventCheckins)
        .where(eq(eventCheckins.eventId, eventId)),
    ]);

    const emailMap = new Map<
      string,
      { registered: boolean; checkedIn: boolean }
    >();

    for (const r of regRows) {
      const email = (r.email || "").trim().toLowerCase();
      if (!email) continue;
      const prev = emailMap.get(email) || {
        registered: false,
        checkedIn: false,
      };
      prev.registered = true;
      emailMap.set(email, prev);
    }

    for (const c of checkRows) {
      const email = (c.email || "").trim().toLowerCase();
      if (!email) continue;
      const prev = emailMap.get(email) || {
        registered: false,
        checkedIn: false,
      };
      prev.checkedIn = true;
      emailMap.set(email, prev);
    }

    const emails = Array.from(emailMap.keys());
    if (emails.length === 0) {
      // nothing to return – empty JSON or empty CSV; JSON by default
      const format = req.nextUrl.searchParams.get("format");
      if (format === "csv") {
        return new NextResponse("Name,Email,Program,GradYear,Registered,CheckedIn,ResumeUrl\n", {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="event-${eventId}-attendees.csv"`,
          },
        });
      }
      return NextResponse.json<AttendeeResponse[]>([]);
    }

    // 2) Load user + student profile info for those emails
    const details = await db
      .select({
        userId: users.id,
        studentProfileId: studentProfiles.id,
        name: users.name,
        email: users.email,
        program: studentProfiles.program,
        gradYear: studentProfiles.gradYear,
        resumeUrl: studentProfiles.resumeUrl,
      })
      .from(users)
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(inArray(users.email, emails));

    const detailsByEmail = new Map<string, AttendeeRow>();

    for (const row of details) {
      const emailKey = (row.email || "").trim().toLowerCase();
      if (!emailKey) continue;
      detailsByEmail.set(emailKey, {
        userId: row.userId ?? null,
        studentProfileId: row.studentProfileId ?? null,
        name: row.name ?? null,
        email: row.email || "",
        program: row.program ?? null,
        gradYear: row.gradYear ?? null,
        resumeUrl: row.resumeUrl ?? null,
      });
    }

    // 3) Merge flags + profile into response
    const result: AttendeeResponse[] = emails.map((emailKey) => {
      const flags = emailMap.get(emailKey)!;
      const detail = detailsByEmail.get(emailKey);

      const canonicalEmail = detail?.email || emailKey;

      return {
        userId: detail?.userId ?? null,
        studentProfileId: detail?.studentProfileId ?? null,
        name: detail?.name ?? null,
        email: canonicalEmail,
        program: detail?.program ?? null,
        gradYear: detail?.gradYear ?? null,
        resumeUrl: detail?.resumeUrl ?? null,
        registered: flags.registered,
        checkedIn: flags.checkedIn,
      };
    });

    // Sort: checked-in first, then registered, then by name
    result.sort((a, b) => {
      if (a.checkedIn !== b.checkedIn) {
        return a.checkedIn ? -1 : 1;
      }
      if (a.registered !== b.registered) {
        return a.registered ? -1 : 1;
      }
      const nameA = (a.name || a.email).toLowerCase();
      const nameB = (b.name || b.email).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // 4) Decide JSON vs CSV
    const format = req.nextUrl.searchParams.get("format");

    if (format === "csv") {
      const header = [
        "Name",
        "Email",
        "Program",
        "GradYear",
        "Registered",
        "CheckedIn",
        "ResumeUrl",
      ];

      const escape = (v: unknown) => {
        let s = v === null || v === undefined ? "" : String(v);
        s = s.replace(/"/g, '""');
        return `"${s}"`;
      };

      const lines = [
        header.map(escape).join(","),
        ...result.map((r) =>
          [
            r.name ?? "",
            r.email,
            r.program ?? "",
            r.gradYear ?? "",
            r.registered ? "yes" : "no",
            r.checkedIn ? "yes" : "no",
            r.resumeUrl ?? "",
          ]
            .map(escape)
            .join(","),
        ),
      ];

      const csv = lines.join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="event-${eventId}-attendees.csv"`,
        },
      });
    }

    // Default: JSON
    return NextResponse.json(result);
  } catch (e) {
    console.error(
      "GET /api/university/events/[id]/attendees error:",
      e,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
