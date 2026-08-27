// api/analyze-product.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeProduct(url: string) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });

  const result = await model.generateContent(`
  Analyze this ecommerce product:

  ${url}

  Return JSON:

  {
    "productName":"",
    "category":"",
    "demandScore":0,
    "competition":"Low",
    "recommendedSellPrice":0,
    "risk":"Low",
    "tags":[]
  }
  `);

  return result.response.text();
}