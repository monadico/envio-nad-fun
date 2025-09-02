import { invariant } from "@apollo/client/utilities/invariant";
export const checkFetcher = (fetcher) => {
    invariant(fetcher || typeof fetch !== "undefined", 59);
};
//# sourceMappingURL=checkFetcher.js.map
