import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";

export const PLASMIC = initPlasmicLoader({
projects: [
    {
      id: process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID!,
      token: process.env.PLASMIC_PROJECT_API_TOKEN!,
    },
  ],
  platformOptions: {
    nextjs: {
      appDir: true,
    },
  },

  // If true, the loader fetches un-published visual drafts
  preview: process.env.PLASMIC_PREVIEW_MODE === 'true',
});
