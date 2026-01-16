
import { GoogleGenAI, Type } from "@google/genai";
import { Product, Transaction } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getInventoryInsights = async (products: Product[], transactions: Transaction[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Analyze this inventory data for 2 warehouses (Gudang Utama and Gudang Cabang).
        Current Products: ${JSON.stringify(products)}
        Recent Transactions: ${JSON.stringify(transactions.slice(-10))}

        Provide a short executive summary of:
        1. Low stock warnings.
        2. Movement trends.
        3. Recommendation for stock transfers if needed.
        
        Return the response in a structured clear format.
      `,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Could not generate AI insights at this moment.";
  }
};
