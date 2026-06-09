var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import imageCompression from "browser-image-compression";
import { instance } from "../services/api";
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const compressImage = /* @__PURE__ */ __name(async (file) => {
  const options = {
    maxSizeMB: 0.5,
    // 500KB
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    fileType: "image/webp"
    // WebP offers superior compression
  };
  try {
    const isStandardImage = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
    if (!isStandardImage) return file;
    const compressedBlob = await imageCompression(file, options);
    const fileName = file.name.split(".").slice(0, -1).join(".") + ".webp";
    try {
      if (typeof window !== "undefined" && window.File && typeof window.File === "function") {
        try {
          return new window.File([compressedBlob], fileName, { type: "image/webp" });
        } catch (innerError) {
          console.warn("Native File constructor failed, using fallback");
        }
      }
      const blob = compressedBlob;
      blob.lastModifiedDate = /* @__PURE__ */ new Date();
      blob.name = fileName;
      blob.lastModified = Date.now();
      return blob;
    } catch (e) {
      console.error("File creation exception:", e);
      return compressedBlob;
    }
  } catch (error) {
    console.error("Compression failed, using original file:", error);
    return file;
  }
}, "compressImage");
const uploadToCloudinary = /* @__PURE__ */ __name(async (file, onProgress) => {
  const formData = new FormData();
  formData.append("image", file);
  try {
    const response = await instance.post(
      `public/upload`,
      formData,
      {
        onUploadProgress: /* @__PURE__ */ __name((progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(progressEvent.loaded * 100 / progressEvent.total);
            onProgress(percentCompleted);
          }
        }, "onUploadProgress")
      }
    );
    if (response.data && response.data.success) {
      return response.data.data.url;
    } else {
      const errorMsg = response.data?.message || `Server returned success:false (Status: ${response.status})`;
      console.error("Public upload failed details:", {
        status: response.status,
        data: response.data,
        error: errorMsg
      });
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error("Backend upload failed:", error);
    const serverMessage = error.response?.data?.message;
    const axiosMessage = error.message;
    const finalMessage = serverMessage || axiosMessage || "Upload failed";
    throw new Error(finalMessage);
  }
}, "uploadToCloudinary");
const uploadMultipleImages = /* @__PURE__ */ __name(async (files, onProgress) => {
  const progressMap = /* @__PURE__ */ new Map();
  files.forEach((f) => progressMap.set(f.name, 0));
  const uploadPromises = files.map(async (file) => {
    try {
      const compressed = await compressImage(file);
      const url = await uploadToCloudinary(compressed, (progress) => {
        progressMap.set(file.name, progress);
        if (onProgress) {
          onProgress(Array.from(progressMap.entries()).map(([fileName, progress2]) => ({ fileName, progress: progress2 })));
        }
      });
      return url;
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      throw error;
    }
  });
  return Promise.all(uploadPromises);
}, "uploadMultipleImages");
export {
  compressImage,
  uploadMultipleImages,
  uploadToCloudinary
};
