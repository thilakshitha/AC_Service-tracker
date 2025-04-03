import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { Edit2, Trash2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { sendServiceReminder, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface AcUnit {
  id: number | string;
  userId: number | string;
  location: string;
  lastServiceDate: string | null;
  nextServiceDate: string;
  notes?: string;
  createdAt: string;
}

interface AcUnitCardProps {
  acUnit: AcUnit;
  userId: number | string;
  userEmail: string;
  onEdit: (acUnit: AcUnit) => void;
}

export function AcUnitCard({ acUnit, userId, userEmail, onEdit }: AcUnitCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Format dates
  const lastServiceDate = acUnit.lastServiceDate 
    ? format(new Date(acUnit.lastServiceDate), "MMM dd, yyyy")
    : "Not Available";
  
  const nextServiceDate = format(new Date(acUnit.nextServiceDate), "MMM dd, yyyy");
  
  // Calculate days remaining
  const now = new Date();
  const nextService = new Date(acUnit.nextServiceDate);
  const daysRemaining = differenceInDays(nextService, now);
  
  // Determine status
  const isOverdue = daysRemaining < 0;
  const isUpcoming = daysRemaining >= 0 && daysRemaining <= 7;
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Try Supabase delete first
      const { error } = await supabase
        .from('ac_units')
        .delete()
        .eq('id', acUnit.id);
      
      if (error) {
        console.error("Supabase delete error:", error);
        // Fall back to API delete if Supabase fails
        await apiRequest("DELETE", `/api/ac-units/${typeof acUnit.id === 'string' ? parseInt(acUnit.id) : acUnit.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ac-units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "AC unit deleted",
        description: `${acUnit.location} AC unit has been removed.`,
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error deleting AC unit",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  });

  // Set reminder mutation
  const setReminderMutation = useMutation({
    mutationFn: async () => {
      return await sendServiceReminder(
        typeof userId === 'string' ? parseInt(userId) : userId, 
        typeof acUnit.id === 'string' ? parseInt(acUnit.id.toString()) : acUnit.id, 
        userEmail, 
        acUnit.location, 
        new Date(acUnit.nextServiceDate)
      );
    },
    onSuccess: () => {
      toast({
        title: "Reminder set",
        description: `You will be notified before the service date.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error setting reminder",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  });

  let statusStyles = "";
  let statusSection = null;

  if (isOverdue) {
    statusStyles = "border-t-4 border-red-500";
    statusSection = (
      <div className="bg-red-50 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-sm font-medium text-red-700">
              Overdue by {Math.abs(daysRemaining)} days
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs bg-red-100 hover:bg-red-200 text-red-800 border-red-200"
            onClick={() => setReminderMutation.mutate()}
            disabled={setReminderMutation.isPending}
          >
            Schedule Now
          </Button>
        </div>
      </div>
    );
  } else if (isUpcoming) {
    statusStyles = "border-t-4 border-yellow-500";
    statusSection = (
      <div className="bg-yellow-50 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="text-sm font-medium text-yellow-700">
              {daysRemaining} days remaining
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-200"
            onClick={() => setReminderMutation.mutate()}
            disabled={setReminderMutation.isPending}
          >
            Schedule Now
          </Button>
        </div>
      </div>
    );
  } else {
    statusSection = (
      <div className="bg-gray-50 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="text-sm font-medium">
              {daysRemaining} days remaining
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs bg-primary-100 hover:bg-primary-200 text-primary-800 border-primary-200"
            onClick={() => setReminderMutation.mutate()}
            disabled={setReminderMutation.isPending}
          >
            Set Reminder
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg shadow overflow-hidden", statusStyles)}>
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{acUnit.location}</h3>
            <p className="text-sm text-gray-500">AC Unit #{acUnit.id}</p>
          </div>
          <div className="flex space-x-2">
            <button 
              className="text-gray-400 hover:text-primary-600 focus:outline-none"
              onClick={() => onEdit(acUnit)}
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              className="text-gray-400 hover:text-red-600 focus:outline-none"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-500">Last Service:</span>
            <span className="text-sm text-gray-900">{lastServiceDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-500">Next Service:</span>
            <span className="text-sm text-gray-900">{nextServiceDate}</span>
          </div>
          {acUnit.notes && (
            <div className="mt-2">
              <span className="text-sm font-medium text-gray-500">Notes:</span>
              <p className="text-sm text-gray-700 mt-1">{acUnit.notes}</p>
            </div>
          )}
        </div>
      </div>
      
      {statusSection}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete AC Unit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the AC unit in {acUnit.location}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
