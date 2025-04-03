import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { format, isBefore, differenceInDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Bell,
  Calendar,
  Check,
  Clock,
  Mail,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  getAcUnits, 
  getNotificationPreferences, 
  createOrUpdateNotificationPreferences,
  sendServiceReminder 
} from "@/lib/firebase";

interface AcUnit {
  id: number | string;
  userId: number | string;
  location: string;
  lastServiceDate: string | null;
  nextServiceDate: string;
  notes?: string;
  createdAt: string;
}

interface NotificationPreference {
  id: number | string;
  userId: number | string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  daysBeforeService: number;
}

const notificationsSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  daysBeforeService: z.number().min(1).max(30),
});

type NotificationsFormValues = z.infer<typeof notificationsSchema>;

export default function Reminders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use state to store AC units and notification preferences
  const [acUnits, setAcUnits] = useState<AcUnit[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreference | null>(null);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  
  // Fetch data from Firebase when user is available
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      
      setIsLoadingUnits(true);
      setIsLoadingPreferences(true);
      
      try {
        // Get AC units
        const units = await getAcUnits(user.id);
        setAcUnits(units || []);
        
        // Get notification preferences
        const prefs = await getNotificationPreferences(user.id);
        setNotificationPreferences({
          id: '1', // Local ID since we're not using a relational database
          userId: user.id,
          emailEnabled: prefs.emailEnabled,
          smsEnabled: prefs.smsEnabled,
          daysBeforeService: prefs.daysBeforeService
        });
      } catch (err) {
        console.error('Failed to fetch data from Firebase:', err);
      } finally {
        setIsLoadingUnits(false);
        setIsLoadingPreferences(false);
      }
    }
    
    fetchData();
  }, [user?.id]);
  
  // Set up form for notification preferences
  const notificationsForm = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      emailEnabled: notificationPreferences?.emailEnabled || true,
      smsEnabled: notificationPreferences?.smsEnabled || false,
      daysBeforeService: notificationPreferences?.daysBeforeService || 7,
    },
  });
  
  // Update form when preferences load
  useEffect(() => {
    if (notificationPreferences) {
      notificationsForm.reset({
        emailEnabled: notificationPreferences.emailEnabled,
        smsEnabled: notificationPreferences.smsEnabled,
        daysBeforeService: notificationPreferences.daysBeforeService,
      });
    }
  }, [notificationPreferences, notificationsForm]);
  
  // Update notification preferences mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: NotificationsFormValues) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      // Save to Firebase
      await createOrUpdateNotificationPreferences(user.id, {
        emailEnabled: data.emailEnabled,
        smsEnabled: data.smsEnabled,
        daysBeforeService: data.daysBeforeService
      });
      
      // Update local state
      setNotificationPreferences(prev => {
        if (!prev) return null;
        return {
          ...prev,
          emailEnabled: data.emailEnabled,
          smsEnabled: data.smsEnabled,
          daysBeforeService: data.daysBeforeService
        };
      });
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Notification preferences updated",
        description: "Your reminder settings have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating preferences",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  });
  
  // Send reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async ({ acUnitId, location, nextServiceDate }: { acUnitId: number | string, location: string, nextServiceDate: string }) => {
      return await sendServiceReminder(
        user?.id || '', 
        acUnitId, 
        user?.email || "", 
        user?.fullName || user?.username || "",
        location, 
        new Date(nextServiceDate)
      );
    },
    onSuccess: () => {
      toast({
        title: "Service Reminder Sent",
        description: "An email reminder has been sent to your email address and the reminder has been logged.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error sending reminder",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const onSubmit = async (data: NotificationsFormValues) => {
    updateNotificationsMutation.mutate(data);
  };
  
  // Filter and sort units by date
  const sortedUnits = acUnits
    ? [...acUnits].sort((a, b) => {
        const dateA = new Date(a.nextServiceDate);
        const dateB = new Date(b.nextServiceDate);
        return dateA.getTime() - dateB.getTime();
      })
    : [];
  
  // Get overdue and upcoming units
  const today = new Date();
  const overdueUnits = sortedUnits.filter(unit => isBefore(new Date(unit.nextServiceDate), today));
  const upcomingUnits = sortedUnits.filter(unit => {
    const nextDate = new Date(unit.nextServiceDate);
    const daysRemaining = differenceInDays(nextDate, today);
    return !isBefore(nextDate, today) && daysRemaining <= 30;
  });
  
  // Units that need attention (overdue + upcoming)
  const attentionUnits = [...overdueUnits, ...upcomingUnits];
  
  // Send a reminder
  const handleSendReminder = (acUnit: AcUnit) => {
    sendReminderMutation.mutate({
      acUnitId: acUnit.id,
      location: acUnit.location,
      nextServiceDate: acUnit.nextServiceDate
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Service Reminders</h1>
        <p className="mt-2 text-sm text-gray-700">
          Manage and track upcoming air conditioning service reminders.
        </p>
      </div>
      
      {/* Email notifications banner */}
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-700">
              <strong>Email Notification System:</strong> You can now send real email notifications to remind yourself about upcoming air conditioning service appointments. Emails will be sent to your registered email address.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Preferences Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5 text-primary" />
            Reminder Settings
          </CardTitle>
          <CardDescription>
            Configure how and when you want to receive service reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPreferences ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Form {...notificationsForm}>
              <form onSubmit={notificationsForm.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={notificationsForm.control}
                    name="emailEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center">
                            <Mail className="mr-2 h-4 w-4 text-primary" />
                            Email Notifications
                          </FormLabel>
                          <FormDescription>
                            Receive service reminders via email
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notificationsForm.control}
                    name="smsEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center">
                            <MessageSquare className="mr-2 h-4 w-4 text-primary" />
                            SMS Notifications
                          </FormLabel>
                          <FormDescription>
                            Receive service reminders via text message
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={notificationsForm.control}
                  name="daysBeforeService"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-primary" />
                        Send reminders before service date
                      </FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <input
                            type="range"
                            min="1"
                            max="30"
                            className="w-full"
                            value={field.value}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <span className="font-medium w-10 text-center">{field.value}</span>
                        <span className="text-gray-500">days</span>
                      </div>
                      <FormDescription>
                        You will be notified this many days before the scheduled service date.
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button 
                    type="submit"
                    disabled={updateNotificationsMutation.isPending}
                  >
                    {updateNotificationsMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Reminders that need attention */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
            Units Needing Attention
          </CardTitle>
          <CardDescription>
            AC units that require service soon or are overdue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUnits ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : attentionUnits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Service Date</TableHead>
                  <TableHead>Time Left</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attentionUnits.map((unit) => {
                  const nextDate = new Date(unit.nextServiceDate);
                  const daysRemaining = differenceInDays(nextDate, today);
                  const isOverdue = daysRemaining < 0;
                  
                  return (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.location}</TableCell>
                      <TableCell>
                        {isOverdue ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Overdue
                          </span>
                        ) : daysRemaining <= 7 ? (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                            <Clock className="mr-1 h-3 w-3" />
                            Urgent
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            <Calendar className="mr-1 h-3 w-3" />
                            Upcoming
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{format(nextDate, "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {isOverdue ? (
                          <span className="text-red-600 font-medium">
                            {Math.abs(daysRemaining)} days overdue
                          </span>
                        ) : (
                          <span className={daysRemaining <= 7 ? "text-yellow-600 font-medium" : ""}>
                            {daysRemaining} days remaining
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className={
                            isOverdue 
                              ? "text-xs bg-red-100 hover:bg-red-200 text-red-800 border-red-200" 
                              : daysRemaining <= 7
                                ? "text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-200"
                                : "text-xs bg-primary-100 hover:bg-primary-200 text-primary-800 border-primary-200"
                          }
                          onClick={() => handleSendReminder(unit)}
                          disabled={sendReminderMutation.isPending}
                        >
                          {isOverdue ? "Send Overdue Reminder" : "Send Reminder"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">All Units Up to Date</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have any AC units that need immediate attention.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-primary" />
            All Service Schedules
          </CardTitle>
          <CardDescription>
            Complete list of all your AC units and their service dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUnits ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : sortedUnits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Service</TableHead>
                  <TableHead>Next Service</TableHead>
                  <TableHead>Remaining Time</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUnits.map((unit) => {
                  const nextDate = new Date(unit.nextServiceDate);
                  const daysRemaining = differenceInDays(nextDate, today);
                  const isOverdue = daysRemaining < 0;
                  
                  return (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.location}</TableCell>
                      <TableCell>
                        {unit.lastServiceDate 
                          ? format(new Date(unit.lastServiceDate), "MMM dd, yyyy")
                          : "Not available"}
                      </TableCell>
                      <TableCell>{format(nextDate, "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {isOverdue ? (
                          <span className="text-red-600 font-medium">
                            {Math.abs(daysRemaining)} days overdue
                          </span>
                        ) : (
                          <span className={daysRemaining <= 7 ? "text-yellow-600 font-medium" : ""}>
                            {daysRemaining} days remaining
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className={
                            isOverdue 
                              ? "text-xs bg-red-100 hover:bg-red-200 text-red-800 border-red-200" 
                              : daysRemaining <= 7
                                ? "text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-200"
                                : "text-xs bg-primary-100 hover:bg-primary-200 text-primary-800 border-primary-200"
                          }
                          onClick={() => handleSendReminder(unit)}
                          disabled={sendReminderMutation.isPending}
                        >
                          {isOverdue ? "Send Overdue Reminder" : "Send Reminder"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <h3 className="text-sm font-medium text-gray-900">No AC Units Found</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have any AC units yet. Add one from the dashboard to start tracking service dates.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
