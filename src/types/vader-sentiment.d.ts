// The vader-sentiment package (a JavaScript port of NLTK's VADER) ships no types.
declare module "vader-sentiment" {
  export const SentimentIntensityAnalyzer: {
    polarity_scores(text: string): { neg: number; neu: number; pos: number; compound: number };
  };
}
