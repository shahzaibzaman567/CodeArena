import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { submissionApi } from "../api/submissions";
import toast from "react-hot-toast";

export const useSaveProgress = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ problemId, problemTitle, language, code, status }) =>
            submissionApi.saveProgress(problemId, problemTitle, language, code, status),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["submission", variables.problemId, variables.language] });
            toast.success("Progress saved successfully!");
        },
        onError: (error) => {
            console.error("Save error:", error);
            toast.error("Failed to save progress");
        }
    });
};

export const useSavedProgress = (problemId, language) => {
    return useQuery({
        queryKey: ["submission", problemId, language],
        queryFn: () => submissionApi.getSavedProgress(problemId, language),
        enabled: !!problemId && !!language,
    });
};

export const useAllSubmissions = () => {
    return useQuery({
        queryKey: ["submissions", "all"],
        queryFn: submissionApi.getAllSubmissions,
    });
};
