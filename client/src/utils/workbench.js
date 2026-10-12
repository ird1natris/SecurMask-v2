import Papa from "papaparse";
import { apiUrl } from "./api";
export async function request(path, body, method) {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    method: method || (body ? "POST" : "GET"),
    headers:
      body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : undefined,
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "Your session has expired. Sign out and sign in again."
        : data.message ||
            data.Error ||
            data.error ||
            "Something went wrong. Please try again.",
    );
  return data;
}
export function parse(content) {
  return Papa.parse(content, { header: true, skipEmptyLines: true }).data;
}
export function download(content, name) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportMasked(id, content) {
  const { signature } = await request("/generate-signature", {
    fileId: id,
    fileContent: content,
  });
  download(
    `${content}\n\n--DIGITAL-SIGNATURE--\n${signature}`,
    `masked-file-${id}.csv`,
  );
}
export const validUpload = (file) =>
  !file
    ? ""
    : !/\.(csv|xlsx)$/i.test(file.name)
      ? "Choose a CSV or Excel (.xlsx) file."
      : file.size > 5 * 1024 * 1024
        ? "This file exceeds 5 MiB. Choose a smaller file."
        : !file.size
          ? "This file is empty. Choose a file with data."
          : "";
