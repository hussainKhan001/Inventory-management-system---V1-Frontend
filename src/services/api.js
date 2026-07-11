var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import axios from "axios";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const instance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 15_000,
});

// ── GET cache & deduplication ─────────────────────────────────────────────────
const _cache = new Map();   // key → { data, ts }
const _inflight = new Map(); // key → Promise (dedup concurrent identical GETs)
const CACHE_TTL = 30_000;   // 30 s

function _cacheKey(path, params) {
  return path + "|" + JSON.stringify(params || {});
}

function _bust(path) {
  // Remove leading slash and strip any trailing /:id segment so that
  // "pos/abc123" and "pos" both bust the "pos" cache bucket.
  const base = path.replace(/^\//, "").replace(/\/[^/]+$/, "");
  for (const k of _cache.keys()) {
    if (k.startsWith(base) || k.startsWith("/" + base)) _cache.delete(k);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

const deepTrim = (val) => {
  if (typeof val === "string") return val.trim();
  if (Array.isArray(val)) return val.map(deepTrim);
  if (val !== null && typeof val === "object") {
    return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, deepTrim(v)]));
  }
  return val;
};

// Request interceptor — auth token + deep-trim bodies
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data && !(config.data instanceof FormData)) {
    config.data = deepTrim(config.data);
  }
  return config;
});

// Response interceptor — single retry on pure network errors (not 4xx/5xx)
instance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const cfg = err.config;
    if (cfg && !cfg._retried && !err.response) {
      cfg._retried = true;
      await new Promise((r) => setTimeout(r, 600));
      return instance(cfg);
    }
    throw err;
  }
);

const HEALTH_URL = API_BASE.replace(/\/api$/, "") + "/api/health";
if (import.meta.env.PROD) {
  const ping = /* @__PURE__ */ __name(() => fetch(HEALTH_URL, { method: "GET" }).catch(() => {
  }), "ping");
  ping();
  setInterval(ping, 14 * 60 * 1e3);
}
const wakeServer = /* @__PURE__ */ __name(() => fetch(HEALTH_URL, { method: "GET" }).catch(() => {
}), "wakeServer");
const api = {
  get: /* @__PURE__ */ __name(async (path, params) => {
    const key = _cacheKey(path, params);

    // Return fresh cache hit
    const hit = _cache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

    // Deduplicate concurrent identical requests
    if (_inflight.has(key)) return _inflight.get(key);

    const req = instance.get(path, { params })
      .then((res) => {
        _cache.set(key, { data: res.data, ts: Date.now() });
        _inflight.delete(key);
        return res.data;
      })
      .catch((err) => {
        _inflight.delete(key);
        throw err;
      });

    _inflight.set(key, req);
    return req;
  }, "get"),
  post: /* @__PURE__ */ __name(async (path, data) => {
    try {
      const res = await instance.post(path, data);
      _bust(path);
      return res.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Request failed";
      throw new Error(message);
    }
  }, "post"),
  put: /* @__PURE__ */ __name(async (path, id, data) => {
    try {
      const res = await instance.put(`${path}/${encodeURIComponent(id)}`, data);
      _bust(path);
      return res.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Update failed";
      throw new Error(message);
    }
  }, "put"),
  putSimple: /* @__PURE__ */ __name(async (path, data) => {
    try {
      const res = await instance.put(path, data);
      _bust(path);
      return res.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Update failed";
      throw new Error(message);
    }
  }, "putSimple"),
  patch: /* @__PURE__ */ __name(async (path, data) => {
    try {
      const res = await instance.patch(path, data);
      _bust(path);
      return res.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Update failed";
      throw new Error(message);
    }
  }, "patch"),
  delete: /* @__PURE__ */ __name(async (path, id) => {
    try {
      const res = await instance.delete(`${path}/${encodeURIComponent(id)}`);
      _bust(path);
      return res.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Deletion failed";
      throw new Error(message);
    }
  }, "delete"),
  /** Manually bust the cache for a path prefix (e.g. after WebSocket push). */
  invalidate: _bust,
  seed: /* @__PURE__ */ __name(async (seedData) => {
    const res = await instance.post("seed", seedData);
    return res.data;
  }, "seed"),
  upload: /* @__PURE__ */ __name(async (file, path = "upload") => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (cloudName && uploadPreset && !cloudName.includes("your_") && !uploadPreset.includes("your_")) {
      try {
        const formData2 = new FormData();
        formData2.append("file", file);
        formData2.append("upload_preset", uploadPreset);
        const res = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          formData2
        );
        return { url: res.data.secure_url };
      } catch (error) {
        console.warn("Direct Cloudinary upload failed, falling back to backend:", error);
      }
    }
    const formData = new FormData();
    formData.append("image", file, file.name);
    try {
      const res = await instance.post(path, formData, { timeout: 60_000 });
      if (typeof res.data === "string" && res.data.trim().startsWith("<!DOCTYPE html>")) {
        throw new Error("Server returned HTML instead of JSON. The API endpoint might be configured incorrectly.");
      }
      console.log(`[API] Upload response for ${path}:`, {
        status: res.status,
        data: res.data
      });
      const success = res.data?.success !== false;
      const url = res.data?.data?.url || res.data?.url || res.data?.secure_url;
      if (!res.data || !success && !url) {
        const errorMsg = res.data?.message || `Server returned success:false (Status: ${res.status})`;
        console.error("Upload failed details:", {
          status: res.status,
          data: res.data,
          error: errorMsg
        });
        throw new Error(errorMsg);
      }
      return { url: url || "" };
    } catch (error) {
      console.error("API Upload Exception:", error);
      const serverMessage = error.response?.data?.message;
      const axiosMessage = error.message;
      const finalMessage = serverMessage || axiosMessage || "Upload failed";
      throw new Error(finalMessage);
    }
  }, "upload")
};
export {
  api,
  instance,
  wakeServer,
  _bust as bustCache,
};
