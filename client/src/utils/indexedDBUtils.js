let cacheUser = null;
export function setCacheUser(userId) {
    if (cacheUser !== userId) sessionStorage.clear();
    cacheUser = userId;
}
const databaseName = () => {
    if (!cacheUser) throw new Error('Login is required to access cached files');
    return 'classifile-' + cacheUser;
};
export const cacheKey = key => 'classifile:' + (cacheUser || 'guest') + ':' + key;

// src/utils/indexedDBUtils.js

// Opens (or creates) a database named FileDB with version 1.
export const openIndexedDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName(), 1); // Open the database with version 1
  
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
  
        // Create object store if not already created
        if (!db.objectStoreNames.contains("files")) {
          const objectStore = db.createObjectStore("files", { keyPath: "id", autoIncrement: true });
          objectStore.createIndex("name", "name", { unique: false });
        }
      };
  
      request.onerror = (event) => {
        reject("Error opening IndexedDB: " + event.target.error);
      };
  
      request.onsuccess = (event) => {
        const db = event.target.result;
        resolve(db);
      };
    });
  };
  
  // Adds a file record to the files object store in the database
  export const addFileToIndexedDB = async (fileData) => {
    try {
      const db = await openIndexedDB();
      const transaction = db.transaction("files", "readwrite");
      const objectStore = transaction.objectStore("files");
  
      // Add a timestamp to the file data
      const dataWithTimestamp = { 
        ...fileData, 
        uploadedAt: Date.now() // Save the current timestamp
      };
  
      const request = objectStore.add(dataWithTimestamp);
  
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      console.error("Error adding file to IndexedDB:", error);
    }
  };
  
  
  // Fetches all files from IndexedDB
  export const getFilesFromIndexedDB = async () => {
    try {
      const db = await openIndexedDB();
      const transaction = db.transaction("files", "readonly");
      const objectStore = transaction.objectStore("files");
      const filesRequest = objectStore.getAll();
  
      return new Promise((resolve, reject) => {
        filesRequest.onsuccess = (event) => resolve(event.target.result);
        filesRequest.onerror = (event) => reject("Error fetching files: " + event.target.error);
      });
    } catch (error) {
      console.error("Error fetching files from IndexedDB:", error);
    }
  };
  
  // Deletes a file record from IndexedDB
  export const deleteFileFromIndexedDB = async (fileId) => {
    try {
      const db = await openIndexedDB();
      const transaction = db.transaction("files", "readwrite");
      const objectStore = transaction.objectStore("files");
      const request = objectStore.delete(fileId);
  
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      console.error("Error deleting file from IndexedDB:", error);
    }
  };
  

 // src/utils/indexedDBUtils.js

export const fetchFile = (fileId) => {
  return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName(), 1);
      request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['files'], 'readonly');
          const objectStore = transaction.objectStore('files');
          const fetchRequest = objectStore.get(fileId);
          fetchRequest.onsuccess = () => {
              const fileData = fetchRequest.result;
              if (fileData) {
                  resolve(fileData);
              } else {
                  reject(new Error(`No file found with id: ${fileId}`));
              }
          };
          fetchRequest.onerror = () => {
              reject(new Error('Failed to fetch the file from IndexedDB'));
          };
      };
      request.onerror = () => {
          reject(new Error('Failed to open IndexedDB'));
      };
  });
};

export const updateFileWithColumns = async (fileId, detectedColumns) => {
  try {
    // Fetch the file using the fileId
    const file = await fetchFile(fileId);

    if (!file) {
      throw new Error(`No file found with ID: ${fileId}`);
    }

    // Add the detected columns to the file object
    const updatedFile = {
      ...file,
      columns: detectedColumns, // Add the columns field
    };

    // Open IndexedDB and update the file record
    const db = await openIndexedDB();
    const transaction = db.transaction("files", "readwrite");
    const store = transaction.objectStore("files");

    // Save the updated file back to IndexedDB
    const updateRequest = store.put(updatedFile);

    return new Promise((resolve, reject) => {
      updateRequest.onsuccess = () => {
        resolve(updatedFile);
      };
      updateRequest.onerror = (event) => {
        reject(`Error updating file with columns: ${event.target.error}`);
      };
    });
  } catch (error) {
    console.error("Error updating file with detected columns:", error);
    throw error;
  }
};

export const updateFileWithMaskedContent = async (fileId, maskedContent) => {
  try {
    // Fetch only the file with the specified fileId
    const file = await fetchFile(fileId);  // Use fetchFile to get the specific file
    if (file) {
      // Update the content and status of the existing file
      const updatedFile = {
        ...file,
        status: 'mask', // Update the status to 'mask'
        content: maskedContent, // Update the content with the masked content
      };

      // Open IndexedDB and perform an update on the existing file by matching the fileId
      const db = await openIndexedDB();
      const transaction = db.transaction('files', 'readwrite');
      const store = transaction.objectStore('files');
      store.put(updatedFile); // This will update the existing file if the fileId matches
      await deleteFileObjectIfMasked(fileId);

      return updatedFile;
    } else {
      throw new Error('File not found in IndexedDB');
    }
  } catch (error) {
    console.error('Error updating file with masked content:', error);
    throw error;
  }
};


export const deleteFileObjectIfMasked = async (fileId) => {
  try {
    // Fetch the file with the specified fileId
    const file = await fetchFile(fileId);

    // Check if the file exists and its status is 'mask'
    if (file && file.status === 'mask') {
      // Update the file object with fileObject removed
      const updatedFile = {
        ...file,
        fileObject: null, // Remove the fileObject
      };

      // Open IndexedDB and perform the update
      const db = await openIndexedDB();
      const transaction = db.transaction('files', 'readwrite');
      const store = transaction.objectStore('files');
      store.put(updatedFile); // Update the file in the object store

      return updatedFile;
    } else if (!file) {
      console.warn(`No file found with fileId: ${fileId}`);
    } else {
      console.warn(`File status is not 'mask' for fileId: ${fileId}`);
    }
  } catch (error) {
    console.error('Error deleting fileObject for masked file:', error);
    throw error;
  }
};
export const fetchFileStatus = async (fileId) => {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction('files', 'readonly');
    const store = transaction.objectStore('files');
    const file = await store.get(fileId);

    return file?.status || null; // Return status or null if file not found
  } catch (error) {
    console.error('Error fetching file status from IndexedDB:', error);
    throw error;
  }
};
