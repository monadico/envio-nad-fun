import { c as _c } from "@apollo/client/react/internal/compiler-runtime";
import * as React from "react";
import { canonicalStringify } from "@apollo/client/cache";
import { assertWrappedQueryRef, getSuspenseCache, unwrapQueryRef, updateWrappedQueryRef, wrapQueryRef, } from "@apollo/client/react/internal";
import { __DEV__ } from "@apollo/client/utilities/environment";
import { invariant } from "@apollo/client/utilities/invariant";
import { useDeepMemo, useRenderGuard } from "./internal/index.js";
import { validateSuspenseHookOptions } from "./internal/validateSuspenseHookOptions.js";
import { useApolloClient } from "./useApolloClient.js";
export function useLoadableQuery(query, t0) {
    const $ = _c(34);
    let t1;

    if ($[0] !== t0) {
        t1 = t0 === undefined ? {} : t0;
        $[0] = t0;
        $[1] = t1;
    } else {
        t1 = $[1];
    }

    const options = t1;
    const client = useApolloClient(options.client);
    let t2;

    if ($[2] !== client) {
        t2 = getSuspenseCache(client);
        $[2] = client;
        $[3] = t2;
    } else {
        t2 = $[3];
    }

    const suspenseCache = t2;
    let t3;

    if ($[4] !== client || $[5] !== options || $[6] !== query) {
        t3 = {
            client,
            query,
            options
        };
        $[4] = client;
        $[5] = options;
        $[6] = query;
        $[7] = t3;
    } else {
        t3 = $[7];
    }

    const watchQueryOptions = useWatchQueryOptions(t3);
    const {
        queryKey: t4
    } = options;
    let t5;

    if ($[8] !== t4) {
        t5 = t4 === undefined ? [] : t4;
        $[8] = t4;
        $[9] = t5;
    } else {
        t5 = $[9];
    }

    const queryKey = t5;
    const [queryRef, setQueryRef] = React.useState(null);
    assertWrappedQueryRef(queryRef);
    let t6;

    if ($[10] !== queryRef) {
        t6 = queryRef && unwrapQueryRef(queryRef);
        $[10] = queryRef;
        $[11] = t6;
    } else {
        t6 = $[11];
    }

    const internalQueryRef = t6;

    if (queryRef && internalQueryRef?.didChangeOptions(watchQueryOptions)) {
        const promise = internalQueryRef.applyOptions(watchQueryOptions);
        updateWrappedQueryRef(queryRef, promise);
    }

    const calledDuringRender = useRenderGuard();
    let t7;

    if ($[12] !== internalQueryRef) {
        t7 = options_0 => {
            if (!internalQueryRef) {
                throw new Error("The query has not been loaded. Please load the query.");
            }

            const promise_0 = internalQueryRef.fetchMore(options_0);
            setQueryRef(wrapQueryRef(internalQueryRef));
            return promise_0;
        };
        $[12] = internalQueryRef;
        $[13] = t7;
    } else {
        t7 = $[13];
    }

    const fetchMore = t7;
    let t8;

    if ($[14] !== internalQueryRef) {
        t8 = options_1 => {
            if (!internalQueryRef) {
                throw new Error("The query has not been loaded. Please load the query.");
            }

            const promise_1 = internalQueryRef.refetch(options_1);
            setQueryRef(wrapQueryRef(internalQueryRef));
            return promise_1;
        };
        $[14] = internalQueryRef;
        $[15] = t8;
    } else {
        t8 = $[15];
    }

    const refetch = t8;
    let t9;

    if ($[16] !== calledDuringRender || $[17] !== client || $[18] !== query || $[19] !== queryKey || $[20] !== suspenseCache || $[21] !== watchQueryOptions) {
        t9 = (...t10) => {
            const args = t10;
            invariant(!calledDuringRender(), 31);
            const [variables] = args;
            const cacheKey = [query, canonicalStringify(variables), ...[].concat(queryKey)];
            const queryRef_0 = suspenseCache.getQueryRef(cacheKey, () => client.watchQuery({
                ...watchQueryOptions,
                variables
            }));
            setQueryRef(wrapQueryRef(queryRef_0));
        };
        $[16] = calledDuringRender;
        $[17] = client;
        $[18] = query;
        $[19] = queryKey;
        $[20] = suspenseCache;
        $[21] = watchQueryOptions;
        $[22] = t9;
    } else {
        t9 = $[22];
    }

    const loadQuery = t9;
    let t10;

    if ($[23] !== internalQueryRef) {
        t10 = options_2 => {
            invariant(internalQueryRef, 32);
            return internalQueryRef.observable.subscribeToMore(options_2);
        };
        $[23] = internalQueryRef;
        $[24] = t10;
    } else {
        t10 = $[24];
    }

    const subscribeToMore = t10;
    let t11;

    if ($[25] === Symbol.for("react.memo_cache_sentinel")) {
        t11 = () => {
            setQueryRef(null);
        };
        $[25] = t11;
    } else {
        t11 = $[25];
    }

    const reset = t11;
    let t12;

    if ($[26] !== fetchMore || $[27] !== refetch || $[28] !== subscribeToMore) {
        t12 = {
            fetchMore,
            refetch,
            reset,
            subscribeToMore
        };
        $[26] = fetchMore;
        $[27] = refetch;
        $[28] = subscribeToMore;
        $[29] = t12;
    } else {
        t12 = $[29];
    }

    let t13;

    if ($[30] !== loadQuery || $[31] !== queryRef || $[32] !== t12) {
        t13 = [loadQuery, queryRef, t12];
        $[30] = loadQuery;
        $[31] = queryRef;
        $[32] = t12;
        $[33] = t13;
    } else {
        t13 = $[33];
    }

    return t13;
}
function useWatchQueryOptions(t0) {
    const $ = _c(5);
    const {
        client,
        query,
        options
    } = t0;
    let t1;
    let t2;

    if ($[0] !== client || $[1] !== options || $[2] !== query) {
        t1 = () => {
            const fetchPolicy = options.fetchPolicy || client.defaultOptions.watchQuery?.fetchPolicy || "cache-first";
            const watchQueryOptions = {
                ...options,
                fetchPolicy,
                query,
                notifyOnNetworkStatusChange: false,
                nextFetchPolicy: void 0
            };

            if (__DEV__) {
                validateSuspenseHookOptions(watchQueryOptions);
            }

            return watchQueryOptions;
        };t2 = [client, options, query];
        $[0] = client;
        $[1] = options;
        $[2] = query;
        $[3] = t1;
        $[4] = t2;
    } else {
        t1 = $[3];
        t2 = $[4];
    }

    return useDeepMemo(t1, t2);
}

//# sourceMappingURL=useLoadableQuery.js.map
