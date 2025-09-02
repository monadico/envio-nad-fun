import { equal } from "@wry/equality";
import * as React from "react";
export function useDeepMemo(memoFn, deps) {
    const ref = React.useRef(void 0);
    if (!ref.current || !equal(ref.current.deps, deps)) {
        ref.current = { value: memoFn(), deps };
    }
    return ref.current.value;
}
//# sourceMappingURL=useDeepMemo.js.map