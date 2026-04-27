import express from "express";
const router = express.Router();

// Judge0 API Configuration - RapidAPI Version
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

// Judge0 Language IDs (official mapping)
const LANGUAGE_IDS = {
  python: 71,           // Python 3.11.0
  javascript: 63,       // JavaScript (Node.js 18.15.0)
  typescript: 74,       // TypeScript (5.0.3)
  java: 91,             // Java 17.0.6
  c: 50,                // C (GCC 9.4.0)
  cpp: 54,              // C++ (GCC 9.4.0)
  csharp: 51,           // C# (.NET 6.0)
  go: 60,               // Go 1.18.1
  rust: 73,             // Rust 1.68.0
  php: 68,              // PHP 8.1.10
  ruby: 72,             // Ruby 3.1.2
  swift: 83,            // Swift 5.7.1
  kotlin: 75,           // Kotlin 1.8.0
  dart: 69,             // Dart 2.19.1
  bash: 46,             // Bash 5.1.16
  r: 80,                // R 4.2.1
  scala: 81,            // Scala 3.2.2
  perl: 85,             // Perl 5.36.0
  lua: 62,              // Lua 5.4.4
};

/**
 * POST /
 * Execute code using Judge0 API (RapidAPI)
 */
router.post("/", async (req, res) => {
  try {
    const { language, code, stdin = "", args = [] } = req.body;

    // Input validation
    if (!language || !code) {
      return res.status(400).json({
        success: false,
        error: "Language and code are required fields",
      });
    }

    // Validate language support
    const languageId = LANGUAGE_IDS[language];
    if (!languageId) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_IDS).join(", ")}`,
      });
    }

    // Prepare Judge0 submission payload
    const submission = {
      source_code: code,
      language_id: languageId,
      stdin: stdin,
      cpu_time_limit: 3,        // 3 seconds
      memory_limit: 128000,     // 128 MB
      max_file_size: 1000,      // 1 MB
      enable_network: false,    // Security: no network access
    };

    const useRapidApi = Boolean(JUDGE0_API_KEY && JUDGE0_API_KEY.trim());
    const commonHeaders = {
      "Content-Type": "application/json",
    };

    const submitHeaders = {
      ...commonHeaders,
      ...(useRapidApi
        ? {
            "X-RapidAPI-Key": JUDGE0_API_KEY,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          }
        : {}),
    };

    // Step 1: Submit the code
    const submitResponse = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`, {
      method: "POST",
      headers: submitHeaders,
      body: JSON.stringify(submission),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error("Judge0 submission failed:", errorText);
      return res.status(submitResponse.status).json({
        success: false,
        error: `Code submission failed: ${submitResponse.status} ${errorText}`,
      });
    }

    const submitData = await submitResponse.json();
    
    if (!submitData || !submitData.token) {
      return res.status(500).json({
        success: false,
        error: "Invalid submission response from Judge0",
      });
    }

    const token = submitData.token;

    // Step 2: Poll for results (Judge0 is asynchronous)
    let result;
    let attempts = 0;
    const maxAttempts = 20; // 20 seconds max wait time

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      try {
        const resultHeaders = {
          ...(useRapidApi
            ? {
                "X-RapidAPI-Key": JUDGE0_API_KEY,
                "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
              }
            : {}),
        };

        const resultResponse = await fetch(
          `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false&fields=stdout,stderr,compile_output,message,status,time,memory`,
          {
            headers: resultHeaders,
          }
        );

        if (!resultResponse.ok) {
          attempts++;
          continue;
        }

        result = await resultResponse.json();
        
        if (!result || !result.status) {
          attempts++;
          continue;
        }

        // Judge0 status codes: 1 = In Queue, 2 = Processing, 3+ = Final states
        if (result.status.id <= 2) {
          attempts++;
          continue;
        }
        
        break; // Got final result
      } catch (pollError) {
        attempts++;
        continue;
      }
    }

    // Handle timeout
    if (!result || !result.status || result.status.id <= 2) {
      return res.status(408).json({
        success: false,
        error: "Execution timeout (20 seconds)",
      });
    }

    // Step 3: Format response for frontend
    const stdout = (result.stdout || "").trim();
    const stderr = (result.stderr || "").trim();
    const compileOutput = (result.compile_output || "").trim();

    // Judge0 status 3 = Accepted = success. Everything else is a failure.
    const success = result.status.id === 3;

    // Build output: show stdout on success, compile/runtime errors on failure
    const output = success
      ? stdout
      : compileOutput || stderr || result.status.description || "Execution failed";

    return res.json({
      success,
      output: output || (success ? "(no output)" : ""),
      error: success ? null : output,
      time: result.time || 0,
      memory: result.memory || 0,
      status: {
        id: result.status.id,
        description: result.status.description || "Unknown",
      },
    });

  } catch (error) {
    console.error("Judge0 execution error:", error);
    return res.status(500).json({
      success: false,
      error: `Internal server error: ${error.message}`,
    });
  }
});

export default router;
