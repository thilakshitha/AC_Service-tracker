import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { createAcUnit, updateAcUnit } from "@/lib/firebase";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
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

const formSchema = z.object({
  location: z.string().min(1, { message: "Location is required" }),
  lastServiceDate: z.date().nullable(),
  nextServiceDate: z.date({
    required_error: "Next service date is required",
  }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddUnitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUnit: AcUnit | null;
}

export function AddUnitForm({ open, onOpenChange, editingUnit }: AddUnitFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const isEditing = !!editingUnit;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: "",
      lastServiceDate: null,
      nextServiceDate: new Date(),
      notes: "",
    },
  });

  // Update form when editing unit changes
  useEffect(() => {
    if (editingUnit) {
      form.reset({
        location: editingUnit.location,
        lastServiceDate: editingUnit.lastServiceDate ? new Date(editingUnit.lastServiceDate) : null,
        nextServiceDate: new Date(editingUnit.nextServiceDate),
        notes: editingUnit.notes || "",
      });
    } else {
      form.reset({
        location: "",
        lastServiceDate: null,
        nextServiceDate: new Date(),
        notes: "",
      });
    }
  }, [editingUnit, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      try {
        // Create AC unit in Firebase
        const acUnitId = await createAcUnit(user.id, {
          location: data.location,
          lastServiceDate: data.lastServiceDate,
          nextServiceDate: data.nextServiceDate,
          notes: data.notes || ""
        });
        
        return { id: acUnitId, location: data.location };
      } catch (error) {
        console.error("Error creating AC unit in Firebase:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Firebase doesn't need query invalidation in the same way
      // but we'll keep it for future API integration
      queryClient.invalidateQueries({ queryKey: ["ac-units"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      
      toast({
        title: "AC unit added",
        description: `Your ${form.getValues().location} AC unit has been added.`,
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error adding AC unit",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!editingUnit || !user?.id) {
        throw new Error("Unit information or user not found");
      }
      
      try {
        // Update AC unit in Firebase
        await updateAcUnit(user.id, editingUnit.id.toString(), {
          location: data.location,
          lastServiceDate: data.lastServiceDate,
          nextServiceDate: data.nextServiceDate,
          notes: data.notes || ""
        });
        
        return { id: editingUnit.id, location: data.location };
      } catch (error) {
        console.error("Error updating AC unit in Firebase:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Firebase doesn't need query invalidation in the same way
      // but we'll keep it for future API integration
      queryClient.invalidateQueries({ queryKey: ["ac-units"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      
      toast({
        title: "AC unit updated",
        description: `Your ${form.getValues().location} AC unit has been updated.`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating AC unit",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    
    try {
      if (isEditing) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit AC Unit" : "Add New AC Unit"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Edit the details of your air conditioning unit"
              : "Enter the details of your air conditioning unit to track its service schedule."
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Living Room, Office, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lastServiceDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Last Service Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>No previous service</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="nextServiceDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Next Service Date <span className="text-red-500">*</span></FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional details about this unit"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update Unit" : "Add Unit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
