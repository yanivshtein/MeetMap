export const meetMapIntentPrompt = `
You are helping MeetMap understand a user's activity-discovery request.

Extract intent from the user query and return JSON only in this exact shape:
{
  "city": string | null,
  "dateText": string | null,
  "categories": string[],
  "vibe": string | null
}

Rules:
- Return JSON only.
- If the city is not clearly stated, set city to null.
- If the date or time is not clearly stated, set dateText to null.
- categories should be broad activity labels like "music", "food", "art", "social", "sports", "outdoor".
- If no categories are clearly implied, return an empty array.
- vibe should be a short phrase like "casual social", "quiet cultural", or null.
`.trim();

export function buildMeetMapRankingPrompt(input: {
  query: string;
  usedCity: string;
  categories: string[];
  eventsJson: string;
}) {
  return `
You are MeetMap's AI discovery assistant.

You must help rank real MeetMap activities for the user without inventing anything.

User query:
${input.query}

Resolved city:
${input.usedCity}

Resolved categories:
${input.categories.length > 0 ? input.categories.join(", ") : "none"}

Available MeetMap events JSON:
${input.eventsJson}

Choose the best 3 to 5 events from the provided list only.
Return JSON only in this exact shape:
{
  "summary": string,
  "events": EventCard[]
}

Rules:
- Never invent events.
- Only use events from the provided JSON list.
- Keep the summary concise and useful.
- If there are fewer than 3 events, return all reasonable events from the list.
`.trim();
}
