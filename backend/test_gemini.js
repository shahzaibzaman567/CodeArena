import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data.models) {
        console.log("No models found. Error:", data);
        return;
    }
    const flashModels = data.models.filter(m => m.name.includes("flash") && m.supportedGenerationMethods.includes("generateContent"));
    console.log("Available Flash Models:", flashModels.map(m => m.name));
    
    const proModels = data.models.filter(m => m.name.includes("pro") && m.supportedGenerationMethods.includes("generateContent"));
    console.log("Available Pro Models:", proModels.map(m => m.name));
  } catch (error) {
    console.error("Fetch Error:", error);
  }
}

test();
