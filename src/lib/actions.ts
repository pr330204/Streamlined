
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
