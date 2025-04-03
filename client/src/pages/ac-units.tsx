import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { AcUnitCard } from "@/components/dashboard/ac-unit-card";
import { AddUnitForm } from "@/components/dashboard/add-unit-form";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getAcUnits } from "@/lib/firebase";

interface AcUnit {
  id: number | string;
  userId: number | string;
  location: string;
  lastServiceDate: string | null;
  nextServiceDate: string;
  notes?: string;
  createdAt: string;
}

export default function AcUnits() {
  const { user } = useAuth();
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<AcUnit | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [firebaseAcUnits, setFirebaseAcUnits] = useState<AcUnit[]>([]);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  // Fetch data from Firebase when user is available
  useEffect(() => {
    async function fetchAcUnits() {
      if (!user?.id) return;
      
      setIsFirebaseLoading(true);
      try {
        const units = await getAcUnits(user.id);
        setFirebaseAcUnits(units || []);
      } catch (err) {
        console.error('Failed to fetch AC units from Firebase:', err);
      } finally {
        setIsFirebaseLoading(false);
      }
    }
    
    fetchAcUnits();
  }, [user?.id]);
  
  const isLoading = isFirebaseLoading;
  const acUnits = firebaseAcUnits;

  const handleAddUnit = () => {
    setEditingUnit(null);
    setIsAddUnitModalOpen(true);
  };

  const handleEditUnit = (unit: AcUnit) => {
    setEditingUnit(unit);
    setIsAddUnitModalOpen(true);
  };

  const filteredUnits = acUnits.filter((unit) => 
    unit.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">AC Units</h1>
        <p className="mt-2 text-sm text-gray-700">
          Manage all your air conditioning units in one place.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search units..."
            className="pl-8 w-full sm:w-[300px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          onClick={handleAddUnit}
          className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center justify-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Unit
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-5 space-y-4">
              <div className="flex justify-between">
                <div>
                  <Skeleton className="h-6 w-32 mb-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : filteredUnits && filteredUnits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.map((unit) => (
            <AcUnitCard 
              key={unit.id} 
              acUnit={unit} 
              userId={user?.id || 0}
              userEmail={user?.email || ""}
              onEdit={handleEditUnit}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          {searchQuery ? (
            <>
              <h3 className="text-lg font-medium text-gray-900">No Matching AC Units</h3>
              <p className="mt-1 text-sm text-gray-500">
                No units found matching "{searchQuery}".
              </p>
              <Button 
                onClick={() => setSearchQuery("")}
                variant="outline"
                className="mt-4"
              >
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900">No AC Units Found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add your first AC unit to start tracking service dates.
              </p>
              <Button 
                onClick={handleAddUnit}
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First AC Unit
              </Button>
            </>
          )}
        </div>
      )}

      {/* Add/Edit Unit Modal */}
      <AddUnitForm 
        open={isAddUnitModalOpen} 
        onOpenChange={setIsAddUnitModalOpen}
        editingUnit={editingUnit}
      />
    </div>
  );
}
