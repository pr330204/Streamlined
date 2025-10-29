
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
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
import { Loader2 } from "lucide-react";
import type { Movie } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  category: z.enum(["movie", "podcast", "tv-channel", "other", "web-series"]),
  url: z.string().min(1, "URL is required."),
  thumbnailUrl: z.string().optional(),
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

  const form = useForm<AddMovieFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      url: "",
      thumbnailUrl: "",
      category: "movie",
    },
  });

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      form.reset();
      setActiveTab("youtube");
    }
    onOpenChange(open);
  };

  const onSubmit = (values: AddMovieFormValues) => {
    startTransition(() => {
      onMovieAdded({
        title: values.title,
        category: values.category,
        url: values.url,
        thumbnailUrl: values.thumbnailUrl || undefined,
      });
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
    </div>
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
                          <SelectItem value="podcast">Podcast</SelectItem>
                          <SelectItem value="tv-channel">TV Channel</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="youtube">YouTube</TabsTrigger>
                      <TabsTrigger value="google-drive">Google Drive</TabsTrigger>
                      <TabsTrigger value="live-stream">Live Stream</TabsTrigger>
                    </TabsList>
                    <TabsContent value="youtube">{renderSingleUrlContent()}</TabsContent>
                    <TabsContent value="google-drive">{renderSingleUrlContent()}</TabsContent>
                    <TabsContent value="live-stream">{renderSingleUrlContent()}</TabsContent>
                  </Tabs>
                
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
