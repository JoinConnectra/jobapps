// /src/app/api/analytics/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  fetchOverviewSnapshot,
  fetchPipelineFunnel,
  fetchJobPerformance,
  fetchApplicationsOverTime,
} from "@/app/dashboard/kpi/insights/_data";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgId = Number(searchParams.get("orgId"));

    if (!orgId || isNaN(orgId)) {
      return NextResponse.json(
        { error: "orgId is required" },
        { status: 400 }
      );
    }

    const [overview, pipeline, jobPerformance, applicationsOverTime] = await Promise.all([
      fetchOverviewSnapshot(orgId),
      fetchPipelineFunnel(orgId),
      fetchJobPerformance(orgId),
      fetchApplicationsOverTime(orgId, 6), // Last 6 months
    ]);

    return NextResponse.json(
      {
        overview,
        pipeline,
        jobPerformance,
        applicationsOverTime,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET /api/analytics/dashboard error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

