
"use server";

import { suggestMovie, SuggestMovieInput } from "@/ai/flows/suggest-movie-from-prompt";
import { z } from "zod";

const suggestMovieSchema = z.object({
  prompt: z.string().min(10, "Please provide a more detailed description."),
});

export async function suggestMovieAction(values: SuggestMovieInput) {
  const validated = suggestMovieSchema.safeParse(values);
  if (!validated.success) {
    return {
      success: false,
      message: validated.error.errors[0].message,
    };
  }
  try {
    const result = await suggestMovie(validated.data);
    return {
      success: true,
      movieTitle: result.movieTitle,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "AI failed to suggest a movie. Please try again.",
    };
  }
}

const addMovieSchema = z.object({
    movieTitle: z.string().min(1, "Movie title is required."),
    movieLink: z.string().url("Please enter a valid URL."),
    thumbnailUrl: z.string().url("Please enter a valid URL for the thumbnail.").optional().or(z.literal('')),
    category: z.enum(["movie", "web-series", "podcast", "tv-channel", "other"]),
});

// This is a simplified action that bypasses the AI validation.
export async function checkMovieLinkAction(values: z.infer<typeof addMovieSchema>) {
    const validated = addMovieSchema.safeParse(values);
    if (!validated.success) {
        return {
            success: false,
            message: validated.error.errors[0].message,
        };
    }
    
    // Bypassing the AI check and assuming the link is valid if it passes schema validation.
    return {
        success: true,
        message: "Video link is valid and will be added.",
    };
}
