/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Safe fetch helper that validates response Content-Type and HTTP status before parsing JSON.
 * Prevents "Unexpected token '<'" errors when HTML is returned instead of JSON.
 */
export async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    if (!res.ok) {
      throw new Error(`Server returned HTTP status ${res.status}`);
    }
    throw new Error("Received an HTML response instead of JSON. The backend server may still be initializing.");
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed with HTTP status ${res.status}`);
  }

  return await res.json();
}
