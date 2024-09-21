import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import typeDefs from "./schema";
import resolvers from "./resolvers";
import { intIDScalar } from "./scalar";

interface Context {
  user: {
    id: number;
    userName: string;
  };
}

async function startApolloServer() {
  const server = new ApolloServer<Context>({
    typeDefs,
    // resolvers,
    resolvers: { ...resolvers, IntID: intIDScalar },
  });

  const { url } = await startStandaloneServer(server, {
    context: async ({ req }) => {
      // TODO: token: getToken(req.headers.authentication)
      //   const token = req.headers.authorization || "";
      return {
        user: {
          id: 1,
          userName: "Alicia",
        },
      };
    },
  });
  console.log(`
    🚀  Server is running!
    📭  Query at ${url}
  `);
}

startApolloServer();
