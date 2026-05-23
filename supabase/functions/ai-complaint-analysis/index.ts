import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, category, guestHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an AI assistant that analyzes hotel guest complaints. Your job is to:
1. Detect sentiment and urgency
2. Categorize the complaint accurately
3. Suggest priority level
4. Recommend resolution approaches

Return your response as a JSON object with this structure:
{
  "analysis": {
    "sentiment": "negative" | "very_negative" | "neutral",
    "urgency": "low" | "medium" | "high" | "critical",
    "emotionalState": "frustrated" | "angry" | "disappointed" | "concerned" | "calm"
  },
  "categorization": {
    "primaryCategory": "string",
    "subcategory": "string",
    "affectedService": "string"
  },
  "suggestedPriority": "low" | "medium" | "high" | "critical",
  "priorityReason": "string (brief explanation)",
  "resolutionSuggestions": [
    {
      "action": "string",
      "timeframe": "immediate" | "within_hour" | "today" | "follow_up",
      "owner": "front_desk" | "housekeeping" | "maintenance" | "management" | "food_service"
    }
  ],
  "compensationSuggestion": "string or null (e.g., 'Complimentary breakfast' or null if not needed)",
  "escalationNeeded": boolean,
  "escalationReason": "string or null"
}

Consider guest history and VIP status when making recommendations.`;

    const userPrompt = `Complaint description: "${description}"
Category (if provided): ${category || 'Not specified'}
Guest history: ${JSON.stringify(guestHistory || { isVip: false, previousComplaints: 0 })}

Please analyze this complaint and provide recommendations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/({[\s\S]*})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      analysis = JSON.parse(jsonStr);
    } catch {
      analysis = {
        analysis: { sentiment: "negative", urgency: "medium", emotionalState: "concerned" },
        suggestedPriority: "medium",
        priorityReason: "Unable to analyze - please review manually",
        resolutionSuggestions: [{ action: "Review and assess manually", timeframe: "today", owner: "management" }],
        escalationNeeded: false
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Complaint analysis error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
