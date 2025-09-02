import type { DocumentNode } from "graphql";
import { useQuery } from "@apollo/client/react";
import type { PrerenderStaticInternalContext } from "./prerenderStatic.cjs";
export declare const useSSRQuery: (this: PrerenderStaticInternalContext, query: DocumentNode, options?: useQuery.Options<any, any>) => useQuery.Result<any, any>;
//# sourceMappingURL=useSSRQuery.d.cts.map
