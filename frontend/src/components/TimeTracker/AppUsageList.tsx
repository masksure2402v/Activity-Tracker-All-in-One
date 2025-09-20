import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface AppUsageData {
  name: string;
  time: number; // in minutes now
  percentage: number;
}

interface AppUsageListProps {
  data: AppUsageData[];
  title: string;
}

export const AppUsageList = ({ data, title }: AppUsageListProps) => {
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes.toFixed(0)}m`;
    }
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  return (
    <Card className="card-hover glass-effect border-white/20">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((app, index) => (
          <div
            key={index}
            className="space-y-3 p-3 rounded-lg bg-card/30 border border-white/10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {app.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">
                  {formatTime(app.time)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {app.percentage}%
                </p>
              </div>
            </div>
            <Progress
              value={app.percentage}
              className="h-2 bg-muted/50"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
