import { ENV } from "../lib/env.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Feature 2: AI Code Helper - provides code suggestions, hints, and improvements
export async function getCodeSuggestions(req, res) {
  try {
    const { code, problemDescription, language, hint } = req.body;

    if (!code && !hint) {
      return res.status(400).json({ message: "Code or prompt is required" });
    }

    const apiKey = ENV.GEMINI_API_KEY || ENV.CLAUDE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "AI service not configured" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Models ordered by preference
    const modelsToTry = [
      "gemini-1.5-pro",
      "gemini-1.5-flash"
    ];
    
    let lastError = null;
    let responseText = "";

    const systemPrompt = `You are "Arena AI", the expert coding assistant for CodeArena. 
    Help the user with coding problems, debugging, or explaining features.
    Respond ONLY in JSON format: { "suggestion": "...", "hint": "...", "error": "...", "improvement": "..." }`;

    const userPrompt = `
Problem Context: ${problemDescription || "General"}
Language: ${language || "JavaScript"}
Current Code:
\`\`\`
${code || "// No code provided"}
\`\`\`
User Question/Hint Request: ${hint || "Analyze my code"}
    `;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([systemPrompt, userPrompt]);
        const response = await result.response;
        responseText = response.text();
        if (responseText) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!responseText) {
      return res.status(500).json({ 
        message: "AI Error: Failed to generate response with any available model. " + (lastError ? lastError.message : ""),
        error: lastError?.message 
      });
    }

    const cleanText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    let parsedSuggestion;
    try {
      parsedSuggestion = JSON.parse(cleanText);
    } catch {
      parsedSuggestion = { suggestion: responseText, hint: "", error: "", improvement: "" };
    }

    res.status(200).json({ suggestion: parsedSuggestion });
  } catch (err) {
    console.error("Error in getCodeSuggestions:", err);
    res.status(500).json({ message: "AI Error: " + err.message });
  }
}

export async function getCodeReview(req, res) {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ message: "Code is required" });

    const apiKey = ENV.GEMINI_API_KEY || ENV.CLAUDE_API_KEY;
    if (!apiKey) return res.status(500).json({ message: "AI service not configured" });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent(`Review this ${language} code and return JSON {quality, performance, bestPractices, risks}: \n${code}`);
    const responseText = (await result.response).text();
    const cleanText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    res.status(200).json({ review: JSON.parse(cleanText) });
  } catch (err) {
    res.status(500).json({ message: "AI Error: " + err.message });
  }
}

export async function translateCode(req, res) {
  try {
    const { code, sourceLanguage, targetLanguage, problemDescription } = req.body;
    if (!code || !targetLanguage) return res.status(400).json({ message: "Code and target language are required" });

    const apiKey = ENV.GEMINI_API_KEY || ENV.CLAUDE_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use rotation for translation too
    const modelsToTry = ["gemini-1.5-pro", "gemini-1.5-flash"];
    let translatedCode = "";
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const prompt = `Translate the following ${sourceLanguage} source code to ${targetLanguage}.
            
            Problem Description: ${problemDescription || "General coding problem"}
            
            IMPORTANT:
            1. If the target language is a compiled language like C#, Java, or C++, you MUST provide a complete, RUNNABLE program with all necessary boilerplate.
            2. For Java, use "Solution" as the class name with a public static void main(String[] args) entry point.
            3. For C#, use "Solution" as the class name (NOT "Main") and "Main" as the static entry method inside it. Example: class Solution { static void Main(string[] args) { ... } }
            4. For C++, wrap code in a standard main() function.
            5. ONLY output the raw source code. No markdown formatting, no explanations, no code fences.
            
            Source Code to Translate:
            ${code}`;

            const result = await model.generateContent(prompt);
            translatedCode = (await result.response).text().trim();
            if (translatedCode) break;
        } catch (err) {
            lastError = err;
        }
    }

    if (!translatedCode) throw lastError || new Error("Translation failed");

    // Strip markdown code blocks if present
    const cleanedCode = translatedCode
      .replace(/```[a-zA-Z0-9+#]*\n?/g, "")
      .replace(/```\s*$/g, "")
      .trim();

    res.status(200).json({ translatedCode: cleanedCode });
  } catch (err) {
    res.status(500).json({ message: "AI Error: " + err.message });
  }
}

