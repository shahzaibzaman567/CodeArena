import axiosInstance from "./axios";

const CODE_EXECUTION_PATH = "/execute";

const SUPPORTED_LANGUAGES = [
  "javascript",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "rust",
  "ruby",
  "typescript"
];

/**
 * @param {string} language
 * @param {string} code
 * @returns {Promise<{success:boolean, output?:string, error?:string, time?:number|string, memory?:number|string}>}
 */
export async function executeCode(language, code) {
  try {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return {
        success: false,
        error: `Unsupported language: ${language}`,
      };
    }

    const response = await axiosInstance.post(CODE_EXECUTION_PATH, {
      language,
      code,
      stdin: "",
      args: [],
    });

    const data = response.data;

    return {
      success: Boolean(data?.success),
      output: data?.output || "No output",
      error: data?.error || "",
      time: data?.time,
      memory: data?.memory,
    };
  } catch (error) {
    console.error("Code execution error:", error);
    return {
      success: false,
      error: error.response?.data?.message || error.message || "Failed to execute code",
    };
  }
}

export { SUPPORTED_LANGUAGES };
