import { ApiError } from "./api";

export function assertExportsEnabled() {
  if (process.env.VERCEL === "1" || process.env.NETLIFY === "true") throw new ApiError(503, "SERVERLESS_EXPORT_UNSUPPORTED", "Runtime export packaging is disabled on serverless hosts. Use the documented CLI export in a clean Git checkout.");
  if (process.env.MEDIAMATRIX_EXPORTS_ENABLED !== "true") throw new ApiError(503, "EXPORTS_DISABLED", "Runtime exports are disabled. Set MEDIAMATRIX_EXPORTS_ENABLED=true only on a self-hosted deployment with Git, tar, a clean checkout, and durable external output storage.");
}
