
"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2 } from "lucide-react";
import type { Movie } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";


const episodeSchema = z.object({
  title: z.string().min(1, "Episode title is required."),
  url: z.string().min(1, "Episode URL is required."),
});

const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  category: z.enum(["movie", "podcast", "tv-channel", "other", "web-series"]),
  url: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  episodes: z.array(episodeSchema).optional(),
}).superRefine((data, ctx) => {
  if (data.category === 'web-series') {
    if (!data.episodes || data.episodes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["episodes"],
        message: "A web series must have at least one episode.",
      });
    }
  } else {
    if (!data.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message: "URL is required for this category.",
      });
    }
  }
});


type AddMovieFormValues = z.infer<typeof formSchema>;

interface AddMovieDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMovieAdded: (movie: Omit<Movie, "id" | "votes" | "createdAt">) => void;
}

export function AddMovieDialog({ isOpen, onOpenChange, onMovieAdded }: AddMovieDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<AddMovieFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      url: "",
      thumbnailUrl: "",
      category: "movie",
      episodes: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "episodes",
  });

  const category = form.watch("category");

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  const onSubmit = (values: AddMovieFormValues) => {
    startTransition(() => {
      const moviePayload: Omit<Movie, 'id' | 'votes' | 'createdAt'> = {
        title: values.title,
        category: values.category,
        thumbnailUrl: values.thumbnailUrl || undefined,
      };

      if (values.category === 'web-series') {
        moviePayload.episodes = values.episodes;
      } else {
        moviePayload.url = values.url;
      }
      
      onMovieAdded(moviePayload);
    });
  };

  const renderSingleUrlContent = () => (
     <div className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
    </div>
  );

  const renderWebSeriesContent = () => (
    <div className="space-y-4 py-4">
      <FormLabel>Episodes</FormLabel>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md">
            <div className="flex-1 grid grid-cols-2 gap-2">
               <FormField
                  control={form.control}
                  name={`episodes.${index}.title`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Ep. {index + 1} Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Episode Title" {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`episodes.${index}.url`}
                  render={({ field }) => (
                    <FormItem>
                       <FormLabel className="text-xs">Ep. {index + 1} URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => remove(index)}
              className="h-9 w-9"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => append({ title: "", url: "" })}
      >
        Add Episode
      </Button>
       {form.formState.errors.episodes && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.episodes.message}
          </p>
        )}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Content</DialogTitle>
              <DialogDescription>
                Select the category and enter the details for the new content.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., The Social Network" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="movie">Movie</SelectItem>
                            <SelectItem value="web-series">Web Series</SelectItem>
                            <SelectItem value="podcast">Podcast</SelectItem>
                            <SelectItem value="tv-channel">TV Channel</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                 <FormField
                  control={form.control}
                  name="thumbnailUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {category === 'web-series' ? renderWebSeriesContent() : renderSingleUrlContent()}
                
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => handleDialogClose(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Content
                  </Button>
                </DialogFooter>
              </form>
            </Form>
      </DialogContent>
    </Dialog>
  );
}

    