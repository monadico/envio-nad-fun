import { isNonNullObject } from "./isNonNullObject.cjs";
type ReconcilerFunction<TContextArgs extends any[]> = (this: DeepMerger<TContextArgs>, target: Record<string | number, any>, source: Record<string | number, any>, property: string | number, ...context: TContextArgs) => any;
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare class DeepMerger<TContextArgs extends any[]> {
    private reconciler;
    constructor(reconciler?: ReconcilerFunction<TContextArgs>);
    merge(target: any, source: any, ...context: TContextArgs): any;
    isObject: typeof isNonNullObject;
    private pastCopies;
    shallowCopyForMerge<T>(value: T): T;
}
export {};
//# sourceMappingURL=DeepMerger.d.cts.map
