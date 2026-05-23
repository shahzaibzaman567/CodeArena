import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../lib/axios";

export const useAdminAccess = (enabled = true) =>
  useQuery({
    queryKey: ["adminAccess"],
    queryFn: async () => {
      const response = await axiosInstance.get("/admin/access");
      return response.data;
    },
    enabled,
    staleTime: 60 * 1000,
    retry: false,
  });
