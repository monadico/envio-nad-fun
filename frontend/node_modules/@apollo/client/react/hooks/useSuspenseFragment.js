import * as React from "react";
import { canonicalStringify } from "@apollo/client/cache";
import { getSuspenseCache } from "@apollo/client/react/internal";
import { __use } from "./internal/__use.js";
import { wrapHook } from "./internal/index.js";
import { useApolloClient } from "./useApolloClient.js";
const NULL_PLACEHOLDER = [];
export function useSuspenseFragment(options) {
    "use no memo";
    return wrapHook("useSuspenseFragment", 
    // eslint-disable-next-line react-compiler/react-compiler
    useSuspenseFragment_, useApolloClient(typeof options === "object" ? options.client : undefined))(options);
}
function useSuspenseFragment_(options) {
    const client = useApolloClient(options.client);
    const { from, variables } = options;
    const { cache } = client;
    const id = React.useMemo(() => typeof from === "string" ? from
        : from === null ? null
            : cache.identify(from), [cache, from]);
    const fragmentRef = id === null ? null : (getSuspenseCache(client).getFragmentRef([id, options.fragment, canonicalStringify(variables)], client, { ...options, variables: variables, from: id }));
    let [current, setPromise] = React.useState(fragmentRef === null ? NULL_PLACEHOLDER : ([fragmentRef.key, fragmentRef.promise]));
    React.useEffect(() => {
        if (fragmentRef === null) {
            return;
        }
        const dispose = fragmentRef.retain();
        const removeListener = fragmentRef.listen((promise) => {
            setPromise([fragmentRef.key, promise]);
        });
        return () => {
            dispose();
            removeListener();
        };
    }, [fragmentRef]);
    if (fragmentRef === null) {
        return { data: null };
    }
    if (current[0] !== fragmentRef.key) {
        // eslint-disable-next-line react-compiler/react-compiler
        current[0] = fragmentRef.key;
        current[1] = fragmentRef.promise;
    }
    const data = __use(current[1]);
    return { data };
}
//# sourceMappingURL=useSuspenseFragment.js.map