
"use client";

import { useState, useTransition, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import type { Movie, Episode } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "./ui/scroll-area";
import { Label } from "./ui/label";

const episodeSchema = z.object({
  title: z.string().min(1, "Episode title is required."),
  url: z.string().min(1, "Please enter a valid URL."),
});

const formSchema = z.object({
  movieTitle: z.string().min(1, "Movie title is required."),
  movieLink: z.string().optional(),
  thumbnailUrl: z.string().url("Please enter a valid URL for the thumbnail.").optional().or(z.literal('')),
  category: z.enum(["movie", "web-series", "podcast", "tv-channel", "other"]),
  episodes: z.array(episodeSchema).optional(),
});

type AddMovieFormValues = z.infer<typeof formSchema>;

interface AddMovieDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMovieAdded: (movie: Omit<Movie, "id" | "votes" | "createdAt" | "duration">) => void;
}

export function AddMovieDialog({ isOpen, onOpenChange, onMovieAdded }: AddMovieDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("youtube");
  const { toast } = useToast();

  const form = useForm<AddMovieFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      movieTitle: "",
      movieLink: "",
      thumbnailUrl: "",
      category: "movie",
      episodes: [{ title: "Episode 1", url: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "episodes",
  });

  const category = form.watch("category");

  useEffect(() => {
    const currentTitle = form.getValues("movieTitle");
    const currentCategory = form.getValues("category");
    form.reset({
      movieTitle: currentTitle,
      category: currentCategory,
      movieLink: "",
      thumbnailUrl: "",
      episodes: [{ title: "Episode 1", url: "" }],
    });
  }, [category, form]);


  const handleDialogClose = (open: boolean) => {
    if (!open) {
      form.reset();
      setActiveTab("youtube");
    }
    onOpenChange(open);
  };

  const onSubmit = (values: AddMovieFormValues) => {
    startTransition(() => {
      let moviePayload: Omit<Movie, "id" | "votes" | "createdAt" | "duration">;

      if (values.category === 'web-series') {
        if (!values.episodes || values.episodes.length === 0 || !values.episodes.every(ep => ep.url)) {
          form.setError("episodes", { type: "manual", message: "At least one episode with a valid URL is required for a web series." });
          return;
        }
        moviePayload = { 
            title: values.movieTitle,
            url: '', // Main URL is not needed for web series container
            thumbnailUrl: values.thumbnailUrl || undefined,
            category: values.category,
            episodes: values.episodes,
        };
      } else {
        if (!values.movieLink) {
          form.setError("movieLink", { type: "manual", message: "A valid Movie Link URL is required for this category." });
          return;
        }
        moviePayload = { 
            title: values.movieTitle,
            url: values.movieLink,
            thumbnailUrl: values.thumbnailUrl || undefined,
            category: values.category,
        };
      }

      onMovieAdded(moviePayload);
    });
  };

  const renderSingleUrlContent = () => (
     <TabsContent value={activeTab} className="space-y-4 py-4">
       <FormField
          control={form.control}
          name="movieTitle"
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
          name="movieLink"
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
        <FormField
          control={form.control}
          name="thumbnailUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thumbnail URL (Optional for YouTube)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/image.png" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
    </TabsContent>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add a New Video</DialogTitle>
              <DialogDescription>
                Select the category and enter the details.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                {category === 'web-series' ? (
                  <div className="space-y-4">
                     <FormField
                        control={form.control}
                        name="movieTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Series Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Breaking Bad" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="thumbnailUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Series Thumbnail URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/series-poster.png" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Label>Episodes</Label>
                      <ScrollArea className="h-48 w-full rounded-md border p-4">
                        <div className="space-y-4">
                          {fields.map((field, index) => (
                            <div key={field.id} className="flex items-end gap-2 p-2 rounded-md border">
                                <div className="flex-1 space-y-2">
                                  <FormField
                                    control={form.control}
                                    name={`episodes.${index}.title`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Ep {index + 1} Title</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
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
                                        <FormLabel className="text-xs">URL</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => append({ title: `Episode ${fields.length + 1}`, url: "" })}
                        >
                          Add Episode
                      </Button>
                      <FormMessage>{form.formState.errors.episodes?.message || form.formState.errors.episodes?.[0]?.url?.message}</FormMessage>
                  </div>
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="youtube">YouTube</TabsTrigger>
                      <TabsTrigger value="google-drive">Google Drive</TabsTrigger>
                      <TabsTrigger value="live-stream">Live Stream</TabsTrigger>
                    </TabsList>
                    {renderSingleUrlContent()}
                  </Tabs>
                )}
                
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => handleDialogClose(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Video
                  </Button>
                </DialogFooter>
              </form>
            </Form>
      </DialogContent>
    </Dialog>
  );
}
    

    