import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { getDashboardStats } from "@/lib/firebase";

interface DashboardStats {
  totalUnits: number;
  upcomingServices: number;
  overdueServices: number;
  servicesCompleted: number;
}

export function DashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function fetchStats() {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        const dashboardStats = await getDashboardStats(user.id);
        setStats(dashboardStats);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchStats();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4 sm:p-6 xl:p-8">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Skeleton className="h-8 w-12 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      value: stats?.totalUnits || 0,
      label: "Total AC Units",
      color: "text-primary-600",
    },
    {
      value: stats?.upcomingServices || 0,
      label: "Upcoming Services",
      color: "text-yellow-500",
    },
    {
      value: stats?.overdueServices || 0,
      label: "Overdue Services",
      color: "text-red-500",
    },
    {
      value: stats?.servicesCompleted || 0,
      label: "Services Completed",
      color: "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4 sm:p-6 xl:p-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className={`text-2xl sm:text-3xl leading-none font-bold ${stat.color}`}>
                  {stat.value}
                </span>
                <h3 className="text-base font-normal text-gray-500">{stat.label}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
