var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import axios from "axios";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const instance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 3e4
});
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
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
    const res = await instance.get(path, { params });
    return res.data;
  }, "get"),
  post: /* @__PURE__ */ __name(async (path, data) => {
    try {
      const config = {};
      const res = await instance.post(path, data, config);
      return res.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Request failed";
      throw new Error(message);
    }
  }, "post"),
  put: /* @__PURE__ */ __name(async (path, id, data) => {
    try {
      const res = await instance.put(`${path}/${encodeURIComponent(id)}`, data);
      return res.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Update failed";
      throw new Error(message);
    }
  }, "put"),
  putSimple: /* @__PURE__ */ __name(async (path, data) => {
    try {
      const res = await instance.put(path, data);
      return res.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Update failed";
      throw new Error(message);
    }
  }, "putSimple"),
  patch: /* @__PURE__ */ __name(async (path, data) => {
    try {
      const res = await instance.patch(path, data);
      return res.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Update failed";
      throw new Error(message);
    }
  }, "patch"),
  delete: /* @__PURE__ */ __name(async (path, id) => {
    try {
      const res = await instance.delete(`${path}/${encodeURIComponent(id)}`);
      return res.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Deletion failed";
      throw new Error(message);
    }
  }, "delete"),
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
      const res = await instance.post(path, formData);
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
  wakeServer
};
