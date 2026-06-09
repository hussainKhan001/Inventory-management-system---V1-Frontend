var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { GoogleGenAI } from "@google/genai";
let aiInstance = null;
const getAiInstance = /* @__PURE__ */ __name(() => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined.");
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}, "getAiInstance");
const getAIInsights = /* @__PURE__ */ __name(async (stats, recentOrders, retries = 2, delay = 1e3) => {
  try {
    const ai = getAiInstance();
    if (!ai) {
      return "AI insights are unavailable (missing API key).";
    }
    const prompt = `
      You are an expert Inventory Analyst for "Garden City" Store. 
      Analyze the following current stats and recent activity:
      
      Stats:
      ${JSON.stringify(stats, null, 2)}
      
      Recent Activity:
      ${JSON.stringify(recentOrders, null, 2)}
      
      Provide 3-4 concise, actionable insights in bullet points for the dashboard. 
      Focus on stock levels, budget, and efficiency.
      Keep each point under 15 words.
      Return the response in plain text.
    `;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text || "Unable to parse AI insights.";
  } catch (error) {
    console.error("AI Insights error:", error);
    if (error?.status === 429 || error?.code === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
      if (retries > 0) {
        console.log(`AI service busy, retrying in ${delay}ms... (${retries} left)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return getAIInsights(stats, recentOrders, retries - 1, delay * 2);
      }
      return "The AI analyst is currently busy. Please refresh in a moment for new insights.";
    }
    return "Unable to load AI insights at this time.";
  }
}, "getAIInsights");
export {
  getAIInsights
};
