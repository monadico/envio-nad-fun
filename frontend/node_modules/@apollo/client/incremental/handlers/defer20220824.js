import { DeepMerger, hasDirectives, isNonEmptyArray, } from "@apollo/client/utilities/internal";
class DeferRequest {
    hasNext = true;
    errors = [];
    extensions = {};
    data = {};
    mergeIn(normalized, merger) {
        if (normalized.data !== undefined) {
            this.data = merger.merge(this.data, normalized.data);
        }
        if (normalized.errors) {
            this.errors.push(...normalized.errors);
        }
        Object.assign(this.extensions, normalized.extensions);
    }
    handle(
    // we'll get `undefined` here in case of a `no-cache` fetch policy,
    // so we'll continue with the last value this request had accumulated
    cacheData = this.data, chunk) {
        this.hasNext = chunk.hasNext;
        this.data = cacheData;
        this.mergeIn(chunk, new DeepMerger());
        if (hasIncrementalChunks(chunk)) {
            const merger = new DeepMerger();
            for (const incremental of chunk.incremental) {
                let { data, path, errors, extensions } = incremental;
                if (data && path) {
                    for (let i = path.length - 1; i >= 0; --i) {
                        const key = path[i];
                        const isNumericKey = !isNaN(+key);
                        const parent = isNumericKey ? [] : {};
                        parent[key] = data;
                        data = parent;
                    }
                }
                this.mergeIn({
                    errors,
                    extensions,
                    data: data ? data : undefined,
                }, merger);
            }
        }
        const result = { data: this.data };
        if (isNonEmptyArray(this.errors)) {
            result.errors = this.errors;
        }
        if (Object.keys(this.extensions).length > 0) {
            result.extensions = this.extensions;
        }
        return result;
    }
}
/**
 * This handler implements the `@defer` directive as specified in this historical commit:
 * https://github.com/graphql/graphql-spec/tree/48cf7263a71a683fab03d45d309fd42d8d9a6659/spec
 */
export class Defer20220824Handler {
    isIncrementalResult(result) {
        return "hasNext" in result;
    }
    extractErrors(result) {
        const acc = [];
        const push = ({ errors, }) => {
            if (errors) {
                acc.push(...errors);
            }
        };
        if (this.isIncrementalResult(result)) {
            push(result);
            if (hasIncrementalChunks(result)) {
                result.incremental.forEach(push);
            }
        }
        if (acc.length) {
            return acc;
        }
    }
    prepareRequest(request) {
        if (hasDirectives(["defer"], request.query)) {
            const context = request.context ?? {};
            const http = (context.http ??= {});
            http.accept = [
                "multipart/mixed;deferSpec=20220824",
                ...(http.accept || []),
            ];
        }
        return request;
    }
    startRequest(_) {
        return new DeferRequest();
    }
}
// only exported for use in tests
export function hasIncrementalChunks(result) {
    return isNonEmptyArray(result.incremental);
}
//# sourceMappingURL=defer20220824.js.map