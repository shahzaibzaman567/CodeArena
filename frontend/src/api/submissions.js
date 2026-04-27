import axiosInstance from "../lib/axios";

export const submissionApi = {
    saveProgress: async (problemId, problemTitle, language, code, status = "draft") => {
        const response = await axiosInstance.post("/submissions/save", {
            problemId,
            problemTitle,
            language,
            code,
            status
        });
        return response.data;
    },

    getSavedProgress: async (problemId, language) => {
        const response = await axiosInstance.get("/submissions/get", {
            params: { problemId, language }
        });
        return response.data;
    },

    getAllSubmissions: async () => {
        const response = await axiosInstance.get("/submissions/all");
        return response.data;
    }
};
