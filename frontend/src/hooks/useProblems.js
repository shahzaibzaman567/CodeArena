import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { problemApi } from "../api/problems";

const getErrorMessage = (error, fallback) =>
  error.response?.data?.error || error.response?.data?.message || fallback;

export const useProblems = (search) => {
  const result = useQuery({
    queryKey: ["problems", search],
    queryFn: () => problemApi.getProblems(search),
  });

  return result;
};

export const useProblemById = (id) => {
  const result = useQuery({
    queryKey: ["problem", id],
    queryFn: () => problemApi.getProblemById(id),
    enabled: !!id,
  });

  return result;
};

export const useCreateProblem = () => {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationKey: ["createProblem"],
    mutationFn: problemApi.createProblem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      toast.success("Problem created successfully!");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to create problem")),
  });

  return result;
};

export const useDeleteProblem = () => {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationKey: ["deleteProblem"],
    mutationFn: problemApi.deleteProblem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      toast.success("Problem deleted successfully!");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete problem")),
  });

  return result;
};
