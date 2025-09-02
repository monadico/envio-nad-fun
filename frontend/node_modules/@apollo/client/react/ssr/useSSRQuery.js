import { NetworkStatus } from "@apollo/client";
import { useApolloClient, useQuery } from "@apollo/client/react";
import { maybeDeepFreeze } from "@apollo/client/utilities/internal";
const skipStandbyResult = maybeDeepFreeze({
    loading: false,
    data: void 0,
    dataState: "empty",
    error: void 0,
    networkStatus: NetworkStatus.ready,
    partial: true,
});
export const useSSRQuery = function (query, options = {}) {
    function notAllowed() {
        throw new Error("This method cannot be called during SSR.");
    }
    const client = useApolloClient(options.client);
    const baseResult = {
        client,
        refetch: notAllowed,
        fetchMore: notAllowed,
        subscribeToMore: notAllowed,
        updateQuery: notAllowed,
        startPolling: notAllowed,
        stopPolling: notAllowed,
        variables: options?.variables,
        previousData: undefined,
    };
    if (options.skip || options.fetchPolicy === "standby") {
        return withoutObservableAccess({
            ...baseResult,
            ...skipStandbyResult,
        });
    }
    if (options.ssr === false) {
        return withoutObservableAccess({
            ...baseResult,
            ...useQuery.ssrDisabledResult,
        });
    }
    let observable = this.getObservableQuery(query, options.variables);
    if (!observable) {
        observable = client.watchQuery({
            query,
            ...options,
            fetchPolicy: (options.fetchPolicy === "network-only" ||
                options.fetchPolicy === "cache-and-network") ?
                "cache-first"
                : options.fetchPolicy,
        });
        this.onCreatedObservableQuery(observable, query, options.variables);
    }
    return {
        observable,
        ...observable.getCurrentResult(),
        ...baseResult,
    };
};
function withoutObservableAccess(value) {
    Object.defineProperty(value, "observable", {
        get() {
            throw new Error('"observable" property is not accessible on skipped hooks or hook calls with `ssr: false` during SSR');
        },
    });
    return value;
}
//# sourceMappingURL=useSSRQuery.js.map