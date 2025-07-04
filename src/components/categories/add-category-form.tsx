"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Category } from "@/types";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Category name must be at least 2 characters." }).max(50, { message: "Category name must be at most 50 characters." }),
});

interface AddCategoryFormProps {
  onCategoryAdded: (newCategory: Category) => void;
}

export function AddCategoryForm({ onCategoryAdded }: AddCategoryFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 500));
    const newCategory: Category = {
      id: Date.now().toString(), // Mock ID
      name: values.name,
      userId: "1", // Mock user ID
      createdAt: new Date(),
    };
    onCategoryAdded(newCategory);
    toast({
      title: "Category Added",
      description: `Category "${values.name}" has been successfully created.`,
    });
    form.reset();
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Groceries, Utilities" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Category
        </Button>
      </form>
    </Form>
  );
}
