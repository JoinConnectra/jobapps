"use client";

import { useEffect, useState } from "react";
import { Clock, User, Mail, Phone, CheckCircle2, XCircle } from "lucide-react";

interface ActivityItem {
  id: number;
  type: string;
  createdAt: string;
  createdBy: number | null;
  payload: any;
}

interface ActivityTimelineProps {
  applicationId: number;
}

export function ActivityTimeline({ applicationId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [applicationId]);

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(
        `/api/applications/${applicationId}/actions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "reject":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "move_to_phone":
        return <Phone className="w-4 h-4 text-primary" />;
      case "email_sent":
        return <Mail className="w-4 h-4 text-accent" />;
      case "exported":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case "reject":
        return "Rejected candidate";
      case "move_to_phone":
        return "Moved to phone screen";
      case "email_sent":
        return "Email sent";
      case "exported":
        return "Data exported";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-full flex-shrink-0">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {getActivityLabel(activity.type)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {new Date(activity.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
