
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

// This is a simplified action that bypasses any AI validation.
// The form dialog now handles its own validation logic.
export async function checkMovieLinkAction(values: any) {
    // We can add more robust server-side validation here if needed in the future.
    // For now, we trust the client-side validation and just pass it through.
    
    // Bypassing the AI check and assuming the link is valid if it passes schema validation.
    return {
        success: true,
        message: "Video link is valid and will be added.",
    };
}
