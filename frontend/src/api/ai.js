import axiosInstance from "../lib/axios";

export const aiApi = {
  // Get code suggestions and hints  //
  getCodeSuggestions: async (code, problemDescription, language, hint) => {
    const response = await axiosInstance.post("/ai/suggestions", {
      code,
      problemDescription,
      language,
      hint,
    });
    return response.data;
  },

  // Get code review and improvements
  getCodeReview: async (code, language) => {
    const response = await axiosInstance.post("/ai/review", {
      code,
      language,
    });
    return response.data;
  },

  // Translate code from one language to another
  translateCode: async (code, sourceLanguage, targetLanguage, problemDescription) => {
    const response = await axiosInstance.post("/ai/translate", {
      code,
      sourceLanguage,
      targetLanguage,
      problemDescription,
    });
    return response.data;
  },
};
