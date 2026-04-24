import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { sessionApi } from "../api/sessions";

const getErrorMessage = (error, fallback) =>
  error.response?.data?.error || error.response?.data?.message || fallback;

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
    refetchInterval: 5000, // refetch every 5 seconds to detect session status changes
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
