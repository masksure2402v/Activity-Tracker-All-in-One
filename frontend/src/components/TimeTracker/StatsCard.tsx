import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
}

export const StatsCard = ({ title, value, description, icon: Icon, trend }: StatsCardProps) => {
  return (
    <Card className="card-hover glass-effect border-white/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="p-2 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold gradient-text mb-2">{value}</div>
        {description && (
          <p className="text-sm text-muted-foreground mb-2">
            {description}
          </p>
        )}
        {trend && (
          <div className="flex items-center space-x-1">
            {trend.value >= 0 ? (
              <TrendingUp className="h-3 w-3 text-productivity" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
            <span className={`text-xs font-medium ${
              trend.value >= 0 ? "text-productivity" : "text-destructive"
            }`}>
              {trend.value >= 0 ? "+" : ""}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">
              {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};