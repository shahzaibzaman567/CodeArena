import axiosInstance from "../lib/axios";

export const problemApi = {
  getProblems: async (search) => {
    const response = await axiosInstance.get("/problems", { params: { search } });
    return response.data;
  },
  getProblemById: async (id) => {
    const response = await axiosInstance.get(`/problems/${id}`);
    return response.data;
  },
  createProblem: async (problemData) => {
    const response = await axiosInstance.post("/problems", problemData);
    return response.data;
  },
  deleteProblem: async (id) => {
    const response = await axiosInstance.delete(`/problems/${id}`);
    return response.data;
  },
};
