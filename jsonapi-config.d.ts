import * as i0 from "@angular/core";
export declare class JsonapiConfig {
    url: string;
    params_separator?: string | undefined;
    unify_concurrency?: boolean | undefined;
    cache_prerequests?: boolean | undefined;
    cachestore_support?: boolean | undefined;
    parameters?: {
        page: {
            number: string;
            size: string;
        };
    } | undefined;
    static ɵfac: i0.ɵɵFactoryDef<JsonapiConfig>;
    static ɵprov: i0.ɵɵInjectableDef<JsonapiConfig>;
}
