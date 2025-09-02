import { assertWrappedQueryRef, getWrappedPromise, InternalQueryReference, wrapQueryRef, } from "@apollo/client/react/internal";
import { wrapHook } from "../hooks/internal/index.js";
/**
 * A higher order function that returns a `preloadQuery` function which
 * can be used to begin loading a query with the given `client`. This is useful
 * when you want to start loading a query as early as possible outside of a
 * React component.
 *
 * > Refer to the [Suspense - Initiating queries outside React](https://www.apollographql.com/docs/react/data/suspense#initiating-queries-outside-react) section for a more in-depth overview.
 *
 * @param client - The `ApolloClient` instance that will be used to load queries
 * from the returned `preloadQuery` function.
 * @returns The `preloadQuery` function.
 *
 * @example
 *
 * ```js
 * const preloadQuery = createQueryPreloader(client);
 * ```
 */
export function createQueryPreloader(client) {
    return wrapHook("createQueryPreloader", _createQueryPreloader, client)(client);
}
const _createQueryPreloader = (client) => {
    function preloadQuery(query, options = {}) {
        const queryRef = new InternalQueryReference(client.watchQuery({
            ...options,
            query,
            notifyOnNetworkStatusChange: false,
        }), {
            autoDisposeTimeoutMs: client.defaultOptions.react?.suspense?.autoDisposeTimeoutMs,
        });
        return wrapQueryRef(queryRef);
    }
    return Object.assign(preloadQuery, {
        toPromise(queryRef) {
            assertWrappedQueryRef(queryRef);
            return getWrappedPromise(queryRef).then(() => queryRef);
        },
    });
};
//# sourceMappingURL=createQueryPreloader.js.map