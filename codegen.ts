import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "http://localhost:4000",
  generates: {
    "src/generated/graphql.ts": {
      config: {
        mappers: {
          JournalEvent: "./src/prisma/prisma-client#Event",
          Activity: "./src/prisma/prisma-client#Activity",
          Icon: "./src/prisma/prisma-client#Icon",
          User: "./src/prisma/prisma-client#User",
          Group: "./src/prisma/prisma-client#Group",
          Mood: "./src/prisma/prisma-client#Mood",
          Journal: "./src/prisma/prisma-client#Journal",
          JournalCategory: "./src/prisma/prisma-client#Category",
          Track: "./src/prisma/prisma-client#Track",
          TrackDisplayType: "./src/prisma/prisma-client#TrackDisplayType",
        },
      },
      plugins: ["typescript", "typescript-resolvers"],
    },
    "./graphql.schema.json": {
      plugins: ["introspection"],
    },
  },
};

export default config;
