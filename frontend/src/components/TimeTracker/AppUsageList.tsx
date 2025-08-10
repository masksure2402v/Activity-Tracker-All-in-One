import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface AppUsageData {
  name: string;
  time: number;
  percentage: number;
  category: string;
}

interface AppUsageListProps {
  data: AppUsageData[];
  title: string;
}

const getCategoryColor = (category: string): string => {
  const colors: { [key: string]: string } = {
    'Development': 'hsl(var(--chart-1))',
    'Communication': 'hsl(var(--chart-2))',
    'Entertainment': 'hsl(var(--chart-3))',
    'Productivity': 'hsl(var(--productivity))',
    'Social Media': 'hsl(var(--chart-4))',
    'Other': 'hsl(var(--chart-5))'
  };
  return colors[category] || 'hsl(var(--chart-5))';
};

export const AppUsageList = ({ data, title }: AppUsageListProps) => {
  return (
    <Card className="card-hover glass-effect border-white/20">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((app, index) => (
          <div key={index} className="space-y-3 p-3 rounded-lg bg-card/30 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full shadow-sm" 
                  style={{ backgroundColor: getCategoryColor(app.category) }}
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">{app.name}</p>
                  <p className="text-xs text-muted-foreground">{app.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">
                  {app.time.toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground">{app.percentage}%</p>
              </div>
            </div>
            <Progress 
              value={app.percentage} 
              className="h-2 bg-muted/50"
              style={{
                '--progress-foreground': getCategoryColor(app.category)
              } as React.CSSProperties}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};