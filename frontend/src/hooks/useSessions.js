import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { sessionApi } from "../api/sessions";

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  // Guard: data might be a Vercel 404 object {code, message} or a string
  if (data) {
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
  }
  if (typeof error?.message === 'string') return error.message;
  return fallback;
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationKey: ["createSession"],
    mutationFn: sessionApi.createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
      toast.success("Session created successfully!");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to create room")),
  });

  return result;
};

export const useActiveSessions = () => {
  const result = useQuery({
    queryKey: ["activeSessions"],
    queryFn: sessionApi.getActiveSessions,
  });

  return result;
};

export const useMyRecentSessions = () => {
  const result = useQuery({
    queryKey: ["myRecentSessions"],
    queryFn: sessionApi.getMyRecentSessions,
  });

  return result;
};

export const useSessionById = (id) => {
  const result = useQuery({
    queryKey: ["session", id],
    queryFn: () => sessionApi.getSessionById(id),
    enabled: !!id,
    refetchInterval: 5000,
    retry: (failureCount, error) => {
      // Don't retry on 404 - session doesn't exist
      if (error.response?.status === 404) return false;
      return failureCount < 3;
    },
    staleTime: 2000, // Consider data fresh for 2 seconds
  });

  return result;
};

export const useJoinSession = () => {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationKey: ["joinSession"],
    mutationFn: sessionApi.joinSession,
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      toast.success("Joined session successfully!");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to join session")),
  });

  return result;
};

export const useEndSession = () => {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationKey: ["endSession"],
    mutationFn: sessionApi.endSession,
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
      queryClient.invalidateQueries({ queryKey: ["myRecentSessions"] });
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
      toast.success("Session ended successfully!");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to end session")),
  });

  return result;
};

export const useDeleteSession = () => {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationKey: ["deleteSession"],
    mutationFn: sessionApi.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRecentSessions"] });
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
      toast.success("Session deleted successfully!");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to delete session")),
  });

  return result;
};

export const useUpdateSession = () => {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationKey: ["updateSession"],
    mutationFn: ({ id, data }) => sessionApi.updateSession(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      // No toast here — this fires on every debounced code sync
    },
    onError: (error) => toast.error(getErrorMessage(error, "Failed to update session")),
  });

  return result;
};
