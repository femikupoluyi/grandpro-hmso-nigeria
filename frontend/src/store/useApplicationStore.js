import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useApplicationStore = create(
  persist(
    (set, get) => ({
      // Application data
      applicationData: null,
      applicationNumber: null,
      applicationId: null,
      applicationStatus: null,
      
      // Progress data
      progressData: null,
      progressPercentage: 0,
      
      // Contract data
      contractData: null,
      
      // Documents
      uploadedDocuments: [],
      
      // Actions
      setApplicationData: (data) => set({ applicationData: data }),
      
      setApplicationInfo: (info) => set({
        applicationNumber: info.applicationNumber,
        applicationId: info.applicationId,
        applicationStatus: info.status
      }),
      
      updateProgress: (progress) => set({ 
        progressData: progress,
        progressPercentage: progress.percentage 
      }),
      
      setContractData: (contract) => set({ contractData: contract }),
      
      addUploadedDocument: (doc) => set((state) => ({
        uploadedDocuments: [...state.uploadedDocuments, doc]
      })),
      
      clearApplication: () => set({
        applicationData: null,
        applicationNumber: null,
        applicationId: null,
        applicationStatus: null,
        progressData: null,
        progressPercentage: 0,
        contractData: null,
        uploadedDocuments: []
      }),
      
      // Getters
      getApplicationNumber: () => get().applicationNumber,
      getApplicationId: () => get().applicationId,
      getProgressPercentage: () => get().progressPercentage,
    }),
    {
      name: 'application-storage',
    }
  )
);

export default useApplicationStore;
