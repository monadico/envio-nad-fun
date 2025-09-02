"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQueryPreloader = createQueryPreloader;
const internal_1 = require("@apollo/client/react/internal");
const index_js_1 = require("../hooks/internal/index.cjs");
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
function createQueryPreloader(client) {
    return (0, index_js_1.wrapHook)("createQueryPreloader", _createQueryPreloader, client)(client);
}
const _createQueryPreloader = (client) => {
    function preloadQuery(query, options = {}) {
        const queryRef = new internal_1.InternalQueryReference(client.watchQuery({
            ...options,
            query,
            notifyOnNetworkStatusChange: false,
        }), {
            autoDisposeTimeoutMs: client.defaultOptions.react?.suspense?.autoDisposeTimeoutMs,
        });
        return (0, internal_1.wrapQueryRef)(queryRef);
    }
    return Object.assign(preloadQuery, {
        toPromise(queryRef) {
            (0, internal_1.assertWrappedQueryRef)(queryRef);
            return (0, internal_1.getWrappedPromise)(queryRef).then(() => queryRef);
        },
    });
};
//# sourceMappingURL=createQueryPreloader.cjs.map
