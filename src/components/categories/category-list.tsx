"use client";

import type { Category } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit3 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface CategoryListProps {
  categories: Category[];
  onDeleteCategory: (categoryId: string) => void;
  // onEditCategory: (category: Category) => void; // Future enhancement
}

export function CategoryList({ categories, onDeleteCategory }: CategoryListProps) {
  const { toast } = useToast();

  const handleDelete = (category: Category) => {
    // Mock API call
    onDeleteCategory(category.id);
    toast({
      title: "Category Deleted",
      description: `Category "${category.name}" has been deleted.`,
      variant: "destructive"
    });
  };

  if (categories.length === 0) {
    return (
      <p className="text-muted-foreground mt-4">
        No categories defined yet. Add some to get started!
      </p>
    );
  }

  return (
    <div className="space-y-3 mt-6">
      {categories.map((category) => (
        <Card key={category.id} className="flex items-center justify-between p-4 shadow-sm hover:shadow-md transition-shadow">
          <span className="font-medium text-foreground">{category.name}</span>
          <div className="flex items-center gap-2">
            {/* <Button variant="ghost" size="icon" onClick={() => onEditCategory(category)} className="text-muted-foreground hover:text-primary">
              <Edit3 className="h-4 w-4" />
              <span className="sr-only">Edit {category.name}</span>
            </Button> */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete {category.name}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the category
                    "{category.name}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(category)} className="bg-destructive hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      ))}
    </div>
  );
}
