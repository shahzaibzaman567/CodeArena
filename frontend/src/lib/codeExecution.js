const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const CODE_EXECUTION_API = baseUrl ? `${baseUrl}/api/execute` : '/api/execute';

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

    const response = await fetch(CODE_EXECUTION_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language,
        code,
        stdin: "",
        args: [],
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: data?.error || data?.message || `HTTP error! status: ${response.status}`,
      };
    }

    return {
      success: Boolean(data?.success),
      output: data?.output || "No output",
      error: data?.error || "",
      time: data?.time,
      memory: data?.memory,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to execute code: ${error.message}`,
    };
  }
}

export { SUPPORTED_LANGUAGES };
