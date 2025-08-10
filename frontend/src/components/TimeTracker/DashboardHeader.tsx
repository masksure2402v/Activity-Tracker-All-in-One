import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Settings, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface DashboardHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export const DashboardHeader = ({ currentDate, onDateChange }: DashboardHeaderProps) => {
  const goToPreviousDay = () => {
    const previousDay = new Date(currentDate);
    previousDay.setDate(previousDay.getDate() - 1);
    onDateChange(previousDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    onDateChange(nextDay);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="glass-effect rounded-xl p-6 mb-8 shadow-sm border border-white/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold gradient-text">
              Activity Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your daily productivity and app usage patterns
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousDay}
              className="h-8 w-8 p-0 hover:bg-primary/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-2 px-4 py-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium min-w-[120px] text-center text-sm">
                {format(currentDate, "MMM dd, yyyy")}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextDay}
              className="h-8 w-8 p-0 hover:bg-primary/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="default"
            size="sm"
            onClick={goToToday}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Today
          </Button>
          
          <ThemeToggle />
          
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 w-9 p-0 border-border/50 hover:bg-accent"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};