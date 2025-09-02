"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSuspenseFragment = useSuspenseFragment;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const cache_1 = require("@apollo/client/cache");
const internal_1 = require("@apollo/client/react/internal");
const __use_js_1 = require("./internal/__use.cjs");
const index_js_1 = require("./internal/index.cjs");
const useApolloClient_js_1 = require("./useApolloClient.cjs");
const NULL_PLACEHOLDER = [];
function useSuspenseFragment(options) {
    "use no memo";
    return (0, index_js_1.wrapHook)("useSuspenseFragment", 
    // eslint-disable-next-line react-compiler/react-compiler
    useSuspenseFragment_, (0, useApolloClient_js_1.useApolloClient)(typeof options === "object" ? options.client : undefined))(options);
}
function useSuspenseFragment_(options) {
    const client = (0, useApolloClient_js_1.useApolloClient)(options.client);
    const { from, variables } = options;
    const { cache } = client;
    const id = React.useMemo(() => typeof from === "string" ? from
        : from === null ? null
            : cache.identify(from), [cache, from]);
    const fragmentRef = id === null ? null : ((0, internal_1.getSuspenseCache)(client).getFragmentRef([id, options.fragment, (0, cache_1.canonicalStringify)(variables)], client, { ...options, variables: variables, from: id }));
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
    const data = (0, __use_js_1.__use)(current[1]);
    return { data };
}
//# sourceMappingURL=useSuspenseFragment.cjs.map
