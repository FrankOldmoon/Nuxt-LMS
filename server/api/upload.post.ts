import { blob } from "hub:blob";

export default eventHandler(async (event) => {
  // Make sure to check if the user can upload files before calling this function
  const result: any[] = await blob.handleUpload(event, {
    formKey: "files",
    multiple: false,
    ensure: {
      maxSize: "16MB",
      //types: ["image/jpeg", "image/png", "image/webp"],
    },
    put: {
      addRandomSuffix: true,
      //prefix: "images",
    },
  });
  return { url: '/api/file?pathname=' + result[0].pathname, id: result[0].pathname };
});
