import { Injectable } from '@angular/core';
import * as i0 from "@angular/core";
export class JsonapiConfig {
    constructor() {
        this.url = 'http://yourdomain/api/v1/';
        this.params_separator = '?';
        this.unify_concurrency = true;
        this.cache_prerequests = true;
        this.cachestore_support = true;
        this.parameters = {
            page: {
                number: 'page[number]',
                size: 'page[size]'
            }
        };
    }
}
JsonapiConfig.ɵfac = function JsonapiConfig_Factory(t) { return new (t || JsonapiConfig)(); };
JsonapiConfig.ɵprov = i0.ɵɵdefineInjectable({ token: JsonapiConfig, factory: JsonapiConfig.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(JsonapiConfig, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], null, null); })();
//# sourceMappingURL=jsonapi-config.js.map