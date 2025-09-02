import { isNonNullObject } from "./isNonNullObject.js";
const { hasOwnProperty } = Object.prototype;
const defaultReconciler = function (target, source, property) {
    return this.merge(target[property], source[property]);
};
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export class DeepMerger {
    reconciler;
    constructor(reconciler = defaultReconciler) {
        this.reconciler = reconciler;
    }
    merge(target, source, ...context) {
        if (isNonNullObject(source) && isNonNullObject(target)) {
            Object.keys(source).forEach((sourceKey) => {
                if (hasOwnProperty.call(target, sourceKey)) {
                    const targetValue = target[sourceKey];
                    if (source[sourceKey] !== targetValue) {
                        const result = this.reconciler(target, source, sourceKey, ...context);
                        // A well-implemented reconciler may return targetValue to indicate
                        // the merge changed nothing about the structure of the target.
                        if (result !== targetValue) {
                            target = this.shallowCopyForMerge(target);
                            target[sourceKey] = result;
                        }
                    }
                }
                else {
                    // If there is no collision, the target can safely share memory with
                    // the source, and the recursion can terminate here.
                    target = this.shallowCopyForMerge(target);
                    target[sourceKey] = source[sourceKey];
                }
            });
            return target;
        }
        // If source (or target) is not an object, let source replace target.
        return source;
    }
    isObject = isNonNullObject;
    pastCopies = new Set();
    shallowCopyForMerge(value) {
        if (isNonNullObject(value)) {
            if (!this.pastCopies.has(value)) {
                if (Array.isArray(value)) {
                    value = value.slice(0);
                }
                else {
                    value = {
                        __proto__: Object.getPrototypeOf(value),
                        ...value,
                    };
                }
                this.pastCopies.add(value);
            }
        }
        return value;
    }
}
//# sourceMappingURL=DeepMerger.js.map
